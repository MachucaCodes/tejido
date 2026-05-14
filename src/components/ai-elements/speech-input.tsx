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
      setIsListening(false);
      const final = emittedFinalRef.current;
      logEvent("mic.session_summary", {
        mode: "speech-recognition",
        events: resultEventCountRef.current,
        finalChars: final.length,
        head: sampleHead(final, 60),
        tail: sampleTail(final, 60),
        repetitionScore: repetitionScore(final),
      });
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
      setIsListening(false);
      logEvent("mic.error", {
        mode: "speech-recognition",
        error: errorEvent.error,
      });

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
        recognitionRef.current.stop();
      } else {
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
      recognitionRef.current.stop();
    } else if (mode === "media-recorder") {
      stopMediaRecorder();
    }
  }, [mode, isListening, stopMediaRecorder]);

  useImperativeHandle(ref, () => ({ stop, isListening }), [stop, isListening]);

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
