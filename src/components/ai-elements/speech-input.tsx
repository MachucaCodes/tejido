"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { logEvent } from "@/lib/client-log";
import { cn } from "@/lib/utils";
import { MicIcon, SquareIcon } from "lucide-react";
import type { ComponentProps, Ref } from "react";
import { useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onresult:
    | ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void)
    | null;
  onerror:
    | ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void)
    | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

type SpeechInputMode = "speech-recognition" | "media-recorder" | "none";

export type SpeechInputHandle = {
  /** Stop recording/recognition if currently listening. No-op otherwise. */
  stop: () => void;
  /**
   * Stop the recognizer and resolve once any in-flight final transcript
   * has been delivered (i.e. the next `onend` has fired). Use this from
   * a submit handler so trailing words don't get truncated when the user
   * hits Send mid-utterance. In media-recorder mode the audio is held
   * until the server transcribes it, so this returns immediately and the
   * transcript will land asynchronously through onTranscriptionChange.
   */
  stopAndFlush: () => Promise<void>;
  isListening: boolean;
};

export type SpeechInputProps = Omit<ComponentProps<typeof Button>, "ref"> & {
  onTranscriptionChange?: (text: string) => void;
  /**
   * Callback for when audio is recorded using MediaRecorder fallback.
   * This is called in browsers that don't support the Web Speech API (Firefox, Safari).
   * The callback receives an audio Blob that should be sent to a transcription service.
   * Return the transcribed text, which will be passed to onTranscriptionChange.
   */
  onAudioRecorded?: (audioBlob: Blob) => Promise<string>;
  lang?: string;
  ref?: Ref<SpeechInputHandle>;
};

// Number of consecutive zero-audio auto-restart cycles before the
// circuit breaker trips and we stop restarting. Each cycle is roughly
// 5s of silence-timeout + 250ms restart delay, so ~30s total before we
// give up and let the participant re-arm the mic themselves.
const MAX_EMPTY_RESTART_CYCLES = 6;

const sampleHead = (s: string, n: number): string =>
  s.length <= n ? s : `${s.slice(0, n)}…`;

const sampleTail = (s: string, n: number): string =>
  s.length <= n ? s : `…${s.slice(-n)}`;

// Crude repetition score: scan all 4-word sliding windows and report the
// fraction that are duplicates. Healthy speech sits near 0; the Android
// cumulative-final bug produces scores well above 0.5 because phrases like
// "I'm sad we're losing" repeat verbatim across the input.
const repetitionScore = (text: string): number => {
  const words = text.toLowerCase().match(/\S+/g) ?? [];
  if (words.length < 8) return 0;
  const seen = new Map<string, number>();
  let dupes = 0;
  for (let i = 0; i <= words.length - 4; i += 1) {
    const window = words.slice(i, i + 4).join(" ");
    const count = (seen.get(window) ?? 0) + 1;
    seen.set(window, count);
    if (count > 1) dupes += 1;
  }
  return Math.round((dupes / (words.length - 3)) * 100) / 100;
};

const detectSpeechInputMode = (): SpeechInputMode => {
  if (typeof window === "undefined") {
    return "none";
  }

  if ("SpeechRecognition" in window || "webkitSpeechRecognition" in window) {
    return "speech-recognition";
  }

  if ("MediaRecorder" in window && "mediaDevices" in navigator) {
    return "media-recorder";
  }

  return "none";
};

export const SpeechInput = ({
  className,
  onTranscriptionChange,
  onAudioRecorded,
  lang = "en-US",
  ref,
  ...props
}: SpeechInputProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mode, setMode] = useState<SpeechInputMode>(detectSpeechInputMode);
  const [isRecognitionReady, setIsRecognitionReady] = useState(false);
  // Log the detected mode once per mount so we can see what each
  // participant's browser actually decided. Visible UI behavior diverges
  // sharply between speech-recognition and media-recorder paths.
  useEffect(() => {
    logEvent("mic.detected_mode", {
      mode,
      ua: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
  }, [mode]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  // Cumulative final transcript we've already emitted for the current
  // recognition session. Used to dedupe Android Chrome's cumulative-final
  // behavior (see handleResult).
  const emittedFinalRef = useRef("");
  const resultEventCountRef = useRef(0);
  // True when the recognizer is in a "user-stopped" state — either it's
  // never been started, or the user explicitly tapped the mic / submitted
  // the composer. False while the user has the mic armed (we want
  // auto-restart on natural Android silence-timeouts in that window).
  const userStoppedRef = useRef(true);
  const restartTimerRef = useRef<number | null>(null);
  // Counts consecutive auto-restart cycles that captured zero result
  // events (i.e. the engine started, heard nothing, and ended). A muted
  // mic / dead audio path produces an immediate no-speech → end loop;
  // without this we'd auto-restart forever at 250ms intervals. Reset on
  // any cycle that captures audio, or on a user-initiated start.
  const consecutiveEmptyCyclesRef = useRef(0);
  // Resolver for an in-flight stopAndFlush() promise. Set when the
  // submit handler asks the recognizer to wind down; called from
  // handleEnd (or the safety timer) so submit can read the input field
  // after any trailing final has landed.
  const flushResolverRef = useRef<(() => void) | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const onTranscriptionChangeRef = useRef<
    SpeechInputProps["onTranscriptionChange"]
  >(onTranscriptionChange);
  const onAudioRecordedRef =
    useRef<SpeechInputProps["onAudioRecorded"]>(onAudioRecorded);

  // Keep refs in sync
  onTranscriptionChangeRef.current = onTranscriptionChange;
  onAudioRecordedRef.current = onAudioRecorded;

  // Initialize Speech Recognition when mode is speech-recognition
  useEffect(() => {
    if (mode !== "speech-recognition") {
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const speechRecognition = new SpeechRecognition();

    speechRecognition.continuous = true;
    speechRecognition.interimResults = true;
    speechRecognition.lang = lang;

    const handleStart = () => {
      emittedFinalRef.current = "";
      resultEventCountRef.current = 0;
      setIsListening(true);
      logEvent("mic.start", { mode: "speech-recognition", lang });
    };

    const handleEnd = () => {
      // Notify any submit() awaiting a flush — the engine has finished
      // dispatching results for this cycle, so the input field reflects
      // every final the recognizer was going to deliver.
      const flushResolver = flushResolverRef.current;
      flushResolverRef.current = null;
      flushResolver?.();

      const userInitiated = userStoppedRef.current;
      const final = emittedFinalRef.current;
      const cycleHadAudio = resultEventCountRef.current > 0;
      if (cycleHadAudio || userInitiated) {
        consecutiveEmptyCyclesRef.current = 0;
      } else {
        consecutiveEmptyCyclesRef.current += 1;
      }

      logEvent("mic.session_summary", {
        mode: "speech-recognition",
        userInitiated,
        events: resultEventCountRef.current,
        finalChars: final.length,
        head: sampleHead(final, 60),
        tail: sampleTail(final, 60),
        repetitionScore: repetitionScore(final),
        consecutiveEmptyCycles: consecutiveEmptyCyclesRef.current,
      });

      // Circuit breaker: if the engine has fired N consecutive cycles
      // with no audio captured at all (muted mic, dead audio path,
      // browser quirk), stop auto-restarting and let the user decide
      // whether to retry. ~MAX_EMPTY × 5s of silence before tripping.
      if (
        !userInitiated &&
        consecutiveEmptyCyclesRef.current >= MAX_EMPTY_RESTART_CYCLES
      ) {
        logEvent("mic.empty_cycle_breaker", {
          cycles: consecutiveEmptyCyclesRef.current,
        });
        userStoppedRef.current = true;
        setIsListening(false);
        return;
      }

      // Android Chrome auto-ends the recognizer after ~5s of silence even
      // with continuous=true. If the user hasn't tapped stop, restart so
      // they don't have to re-tap between phrases. Tiny delay to avoid a
      // tight loop if the engine immediately ends again with no audio.
      if (!userInitiated) {
        restartTimerRef.current = window.setTimeout(() => {
          restartTimerRef.current = null;
          // Re-check inside the callback: clearTimeout from stop/error
          // races with the scheduled fire. Spec says event ordering is
          // undefined, so a late error/stop can land between the timer
          // being scheduled and it firing.
          if (userStoppedRef.current) {
            setIsListening(false);
            return;
          }
          try {
            speechRecognition.start();
            logEvent("mic.auto_restart", {});
          } catch (err) {
            // InvalidStateError if it's already starting; ignore.
            logEvent("mic.auto_restart_error", {
              message: err instanceof Error ? err.message : String(err),
            });
            setIsListening(false);
          }
        }, 250);
      } else {
        setIsListening(false);
      }
    };

    const handleResult = (event: Event) => {
      const speechEvent = event as SpeechRecognitionEvent;
      resultEventCountRef.current += 1;
      let totalFinals = 0;
      const finalParts: string[] = [];
      for (let i = 0; i < speechEvent.results.length; i += 1) {
        const result = speechEvent.results[i];
        if (!result.isFinal) continue;
        totalFinals += 1;
        finalParts.push(result[0]?.transcript ?? "");
      }

      // Two platform shapes to reconcile:
      //   - Desktop Chrome: each finalized utterance appears once at its own
      //     index with that utterance's text. Concatenating all finals is the
      //     full transcript so far.
      //   - Android Chrome: each new event adds a *new* final entry whose
      //     transcript is the running cumulative phrase (e.g. "I'm" → "I'm
      //     sad" → "I'm sad we're"). Concatenating those would duplicate
      //     prefixes; emitting only the newest entry would lose context if
      //     two independent utterances landed in the same session.
      // Strategy: build a single growing buffer per session. For each final
      // part, if it extends the buffer (its transcript starts with what we've
      // already absorbed), replace the tail; otherwise treat it as a fresh
      // utterance and append. Then emit only the diff vs. what we've already
      // sent to the parent.
      let buffer = "";
      const partLens: number[] = [];
      let extended = 0;
      let dropped = 0;
      let appended = 0;
      for (const part of finalParts) {
        partLens.push(part.length);
        if (!part) {
          dropped += 1;
          continue;
        }
        if (part.startsWith(buffer)) {
          // Cumulative growth (Android) or first part — replace.
          buffer = part;
          extended += 1;
        } else if (!buffer.startsWith(part)) {
          // Distinct utterance — append. (Older restatements that match
          // a prefix of the buffer fall through both branches and are
          // intentionally dropped.)
          buffer = buffer ? `${buffer} ${part}` : part;
          appended += 1;
        } else {
          dropped += 1;
        }
      }

      let delta = "";
      let divergent = false;
      if (buffer.startsWith(emittedFinalRef.current)) {
        delta = buffer.slice(emittedFinalRef.current.length);
      } else if (buffer) {
        // Buffer diverged from what we emitted (rare: late-arriving correction
        // that doesn't share a prefix). Treat as a separate utterance so we
        // don't drop content.
        delta = emittedFinalRef.current ? ` ${buffer}` : buffer;
        divergent = true;
      }
      const trimmedDelta = delta.replace(/^\s+/, "");

      logEvent("mic.result", {
        resultIndex: speechEvent.resultIndex,
        length: speechEvent.results.length,
        totalFinals,
        bufferChars: buffer.length,
        emittedSoFar: emittedFinalRef.current.length,
        deltaChars: trimmedDelta.length,
        partLens,
        branches: { extended, appended, dropped },
        divergent,
        bufferTail: sampleTail(buffer, 30),
        delta: sampleHead(trimmedDelta, 60),
      });

      if (trimmedDelta) {
        emittedFinalRef.current = buffer;
        onTranscriptionChangeRef.current?.(trimmedDelta);
      }
    };

    const handleError = (event: Event) => {
      const errorEvent = event as SpeechRecognitionErrorEvent;
      console.warn("[SpeechInput] recognition error:", errorEvent.error);
      logEvent("mic.error", {
        mode: "speech-recognition",
        error: errorEvent.error,
      });

      // Fatal errors: pin userStopped so the upcoming `end` event doesn't
      // spin us into an auto-restart loop. `not-allowed` means the user
      // denied permission; the others trigger the MediaRecorder fallback
      // below and don't want a stale recognition restart racing it.
      // `aborted` per spec is UA-initiated cancellation (e.g. browser
      // dismissed the speech UI) — also a stop signal.
      const fatal =
        errorEvent.error === "not-allowed" ||
        errorEvent.error === "service-not-allowed" ||
        errorEvent.error === "audio-capture" ||
        errorEvent.error === "network" ||
        errorEvent.error === "aborted";
      if (fatal) {
        userStoppedRef.current = true;
        if (restartTimerRef.current !== null) {
          window.clearTimeout(restartTimerRef.current);
          restartTimerRef.current = null;
        }
        setIsListening(false);
      }

      // Brave and some privacy-hardened Chromium browsers expose
      // webkitSpeechRecognition but block the Google cloud endpoint it relies
      // on, producing an immediate `network` error. Fall back to MediaRecorder
      // + server-side transcription for the rest of the session.
      const apiUnavailable =
        errorEvent.error === "network" ||
        errorEvent.error === "service-not-allowed" ||
        errorEvent.error === "audio-capture";
      if (
        apiUnavailable &&
        onAudioRecordedRef.current &&
        typeof window !== "undefined" &&
        "MediaRecorder" in window
      ) {
        logEvent("mic.fallback", {
          from: "speech-recognition",
          to: "media-recorder",
          reason: errorEvent.error,
        });
        setMode("media-recorder");
      }
    };

    speechRecognition.addEventListener("start", handleStart);
    speechRecognition.addEventListener("end", handleEnd);
    speechRecognition.addEventListener("result", handleResult);
    speechRecognition.addEventListener("error", handleError);

    recognitionRef.current = speechRecognition;
    setIsRecognitionReady(true);

    return () => {
      userStoppedRef.current = true;
      if (restartTimerRef.current !== null) {
        window.clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
      // Resolve any in-flight flush so an awaiter doesn't hang past unmount.
      const pending = flushResolverRef.current;
      flushResolverRef.current = null;
      pending?.();
      speechRecognition.removeEventListener("start", handleStart);
      speechRecognition.removeEventListener("end", handleEnd);
      speechRecognition.removeEventListener("result", handleResult);
      speechRecognition.removeEventListener("error", handleError);
      speechRecognition.stop();
      recognitionRef.current = null;
      setIsRecognitionReady(false);
    };
  }, [mode, lang]);

  // Cleanup MediaRecorder and stream on unmount
  useEffect(
    () => () => {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) {
          track.stop();
        }
      }
    },
    []
  );

  // Start MediaRecorder recording
  const startMediaRecorder = useCallback(async () => {
    if (!onAudioRecordedRef.current) {
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      const handleDataAvailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      const handleStop = async () => {
        for (const track of stream.getTracks()) {
          track.stop();
        }
        streamRef.current = null;

        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });

        logEvent("mic.recorder.stop", { bytes: audioBlob.size });

        if (audioBlob.size > 0 && onAudioRecordedRef.current) {
          setIsProcessing(true);
          const startedAt = Date.now();
          try {
            const transcript = await onAudioRecordedRef.current(audioBlob);
            logEvent("mic.recorder.transcribed", {
              chars: transcript.length,
              duration_ms: Date.now() - startedAt,
            });
            if (transcript) {
              onTranscriptionChangeRef.current?.(transcript);
            }
          } catch (err) {
            logEvent("mic.recorder.transcribe_error", {
              message: err instanceof Error ? err.message : String(err),
              duration_ms: Date.now() - startedAt,
            });
            // Error handling delegated to the onAudioRecorded caller
          } finally {
            setIsProcessing(false);
          }
        }
      };

      const handleError = () => {
        setIsListening(false);
        logEvent("mic.recorder.error", {});
        for (const track of stream.getTracks()) {
          track.stop();
        }
        streamRef.current = null;
      };

      mediaRecorder.addEventListener("dataavailable", handleDataAvailable);
      mediaRecorder.addEventListener("stop", handleStop);
      mediaRecorder.addEventListener("error", handleError);

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsListening(true);
      logEvent("mic.start", { mode: "media-recorder" });
    } catch (err) {
      setIsListening(false);
      logEvent("mic.getUserMedia_error", {
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  // Stop MediaRecorder recording
  const stopMediaRecorder = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    logEvent("mic.toggle", { mode, wasListening: isListening });
    if (mode === "speech-recognition" && recognitionRef.current) {
      if (isListening) {
        userStoppedRef.current = true;
        if (restartTimerRef.current !== null) {
          window.clearTimeout(restartTimerRef.current);
          restartTimerRef.current = null;
        }
        recognitionRef.current.stop();
      } else {
        userStoppedRef.current = false;
        // User explicitly armed the mic — fresh slate for the breaker
        // even if the prior session(s) tripped it.
        consecutiveEmptyCyclesRef.current = 0;
        recognitionRef.current.start();
      }
    } else if (mode === "media-recorder") {
      if (isListening) {
        stopMediaRecorder();
      } else {
        startMediaRecorder();
      }
    }
  }, [mode, isListening, startMediaRecorder, stopMediaRecorder]);

  // Parent calls this when the user submits the composer mid-recording. We
  // stop the active recognizer/recorder so the mic UI doesn't stay armed
  // after the message has been sent.
  const stop = useCallback(() => {
    if (!isListening) return;
    logEvent("mic.stop_via_submit", { mode });
    if (mode === "speech-recognition" && recognitionRef.current) {
      userStoppedRef.current = true;
      if (restartTimerRef.current !== null) {
        window.clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
      recognitionRef.current.stop();
    } else if (mode === "media-recorder") {
      stopMediaRecorder();
    }
  }, [mode, isListening, stopMediaRecorder]);

  const stopAndFlush = useCallback((): Promise<void> => {
    if (!isListening) return Promise.resolve();
    logEvent("mic.stop_via_submit", { mode, awaitingFlush: true });

    if (mode !== "speech-recognition" || !recognitionRef.current) {
      // Media-recorder path holds audio until the server transcribes it;
      // we don't make submit wait that long. The transcript will arrive
      // through onTranscriptionChange after the request resolves.
      if (mode === "media-recorder") stopMediaRecorder();
      return Promise.resolve();
    }

    userStoppedRef.current = true;
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    return new Promise<void>((resolve) => {
      let safetyTimer: number | null = null;
      const finalize = () => {
        if (safetyTimer !== null) {
          window.clearTimeout(safetyTimer);
          safetyTimer = null;
        }
        if (flushResolverRef.current === finalize) {
          flushResolverRef.current = null;
        }
        resolve();
      };
      // Replace any prior pending resolver so we don't leak it.
      const prior = flushResolverRef.current;
      flushResolverRef.current = finalize;
      prior?.();
      // Safety net: don't block submit forever if onend somehow doesn't fire.
      safetyTimer = window.setTimeout(finalize, 500);
      try {
        recognitionRef.current?.stop();
      } catch {
        // If stop() throws, resolve immediately so submit isn't stuck.
        finalize();
      }
    });
  }, [mode, isListening, stopMediaRecorder]);

  useImperativeHandle(
    ref,
    () => ({ stop, stopAndFlush, isListening }),
    [stop, stopAndFlush, isListening],
  );

  // Determine if button should be disabled
  const isDisabled =
    mode === "none" ||
    (mode === "speech-recognition" && !isRecognitionReady) ||
    (mode === "media-recorder" && !onAudioRecorded) ||
    isProcessing;

  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Animated pulse rings */}
      {isListening &&
        [0, 1, 2].map((index) => (
          <div
            className="absolute inset-0 animate-ping rounded-full border-2 border-red-400/30"
            key={index}
            style={{
              animationDelay: `${index * 0.3}s`,
              animationDuration: "2s",
            }}
          />
        ))}

      {/* Main record button */}
      <Button
        className={cn(
          "relative z-10 rounded-full transition-all duration-300",
          isListening
            ? "bg-destructive text-white hover:bg-destructive/80 hover:text-white"
            : "bg-primary text-primary-foreground hover:bg-primary/80 hover:text-primary-foreground",
          className
        )}
        disabled={isDisabled}
        onClick={toggleListening}
        {...props}
      >
        {isProcessing && <Spinner />}
        {!isProcessing && isListening && <SquareIcon className="size-4" />}
        {!(isProcessing || isListening) && <MicIcon className="size-4" />}
      </Button>
    </div>
  );
};
