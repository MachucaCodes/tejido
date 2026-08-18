"use client";

import { ArrowUpIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { SpeechInput, type SpeechInputHandle } from "@/components/ai-elements/speech-input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { logEvent, setLogContext } from "@/lib/client-log";
import { cn } from "@/lib/utils";

import { PhoneGate } from "./phone-gate";
import { ThemesPanel, type Theme, type Point } from "./themes-panel";

const READY_TOKEN = "[READY_TO_SHARE]";

// Message keys for the three sense-making notes, in order. The copy itself
// lives in messages/*.json.
const SENSE_MAKING_NOTE_KEYS = [
  "senseMakingNote1",
  "senseMakingNote2",
  "senseMakingNote3",
] as const;

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type Status = "idle" | "streaming" | "error";

// Window of participant silence after [READY_TO_SHARE] before we fire
// analysis. Lets a quick double-message defer the run; reset on any new
// user input within the window.
const READY_DEBOUNCE_MS = 8000;

function newId() {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function ChatClient({
  sessionCode,
  topic,
  introMessage,
  hasPhone: initialHasPhone,
  initialHasAnalyzed,
  initialMessages,
  initialThemes,
  initialSummary,
  initialPoints,
  isAdmin,
  archived,
}: {
  sessionCode: string;
  topic: string;
  introMessage: string | null;
  hasPhone: boolean;
  initialHasAnalyzed: boolean;
  initialMessages: ChatMessage[];
  initialThemes: Theme[];
  initialSummary: { text: string | null; generatedAt: string | null };
  initialPoints: Point[];
  isAdmin: boolean;
  archived: boolean;
}) {
  const t = useTranslations("session");
  const intro = introMessage?.trim() ?? "";
  const router = useRouter();
  // Admin-only: lets an admin peek at the room view (the panel participants
  // see after [READY_TO_SHARE]) on demand, even if they haven't shared
  // anything themselves.
  const [resultsOpen, setResultsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [introOpen, setIntroOpen] = useState(false);
  // hasAnalyzed gates the perspectives panel. Server-seeded from whether
  // the participant has any extracted_points; client-flipped after the
  // first successful finalize (the auto-finalize path; the PhoneGate path
  // calls router.refresh() to re-seed from the server).
  const [hasAnalyzed, setHasAnalyzed] = useState(initialHasAnalyzed);
  const [hasPhone, setHasPhone] = useState(initialHasPhone);
  // True while a /api/finalize call is in flight — drives the loader on
  // the perspectives panel.
  const [analyzing, setAnalyzing] = useState(false);
  // Set when the last /api/finalize attempt failed. Drives a retry banner
  // above the composer so the participant has a clear path back to a
  // successful share — without it they sit in the room view with stale
  // themes and no signal their contribution didn't land. Cleared when a
  // retry kicks off or a new conversation turn starts (which will re-arm
  // finalize anyway).
  const [finalizeFailed, setFinalizeFailed] = useState(false);
  // Briefly true after a successful PhoneGate submission while we wait
  // for router.refresh() to deliver fresh themes/points. The analyze
  // itself is already done by then, but `initialThemes` arrives via a
  // prop on the next render — without this flag the panel flashes
  // "No themes yet" for a beat.
  const [postSubmitSettling, setPostSubmitSettling] = useState(false);
  const settlingTimerRef = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (settlingTimerRef.current !== null) {
        window.clearTimeout(settlingTimerRef.current);
      }
    },
    [],
  );
  // Clear the post-submit loader as soon as fresh themes arrive from the
  // server (router.refresh resolved). Falls back to the timer below in
  // case the refresh is unusually slow.
  useEffect(() => {
    if (postSubmitSettling && initialThemes.length > 0) {
      logEvent("chat.settling.clear", {
        reason: "themes_arrived",
        themeCount: initialThemes.length,
      });
      setPostSubmitSettling(false);
    }
  }, [initialThemes, postSubmitSettling]);
  const showAnalyzing = analyzing || postSubmitSettling;
  const introAckKey = `tejido:s:${sessionCode}:intro-acked`;

  // Tag every subsequent client log with this session.
  useEffect(() => {
    setLogContext({ sessionCode });
    logEvent("chat.mount", {
      hasPhone: initialHasPhone,
      hasAnalyzed: initialHasAnalyzed,
      initialMessageCount: initialMessages.length,
      initialThemeCount: initialThemes.length,
      initialPointCount: initialPoints.length,
    });
  }, [
    sessionCode,
    initialHasPhone,
    initialHasAnalyzed,
    initialMessages.length,
    initialThemes.length,
    initialPoints.length,
  ]);

  // Visibility of the major UI state flips.
  useEffect(() => {
    logEvent("chat.state", {
      hasPhone,
      hasAnalyzed,
      analyzing,
      postSubmitSettling,
      showAnalyzing,
      initialThemeCount: initialThemes.length,
    });
  }, [
    hasPhone,
    hasAnalyzed,
    analyzing,
    postSubmitSettling,
    showAnalyzing,
    initialThemes.length,
  ]);

  // Show the sense-making note on the first visit to a session, only
  // before they've shared anything. Persisted per-session so a returning
  // participant isn't re-prompted.
  useEffect(() => {
    if (hasAnalyzed) return;
    if (initialMessages.length > 0) return;
    try {
      if (window.localStorage.getItem(introAckKey) !== "1") setIntroOpen(true);
    } catch {
      setIntroOpen(true);
    }
  }, [introAckKey, hasAnalyzed, initialMessages.length]);

  const acknowledgeIntro = () => {
    try {
      window.localStorage.setItem(introAckKey, "1");
    } catch { }
    setIntroOpen(false);
  };

  const lastAssistantText =
    [...messages].reverse().find((m) => m.role === "assistant")?.content ?? "";
  const ready = lastAssistantText.includes(READY_TOKEN);
  // Phone gate appears only on the FIRST share. After the participant has
  // analyzed at least once their phone is on file, so subsequent
  // [READY_TO_SHARE] tokens fire analysis silently in the background.
  const showPhoneGate =
    ready && !hasPhone && !hasAnalyzed && status !== "streaming";

  // Re-armable, debounced auto-finalize:
  //  - First [READY_TO_SHARE] for a returning participant (phone already on
  //    file) → fires after READY_DEBOUNCE_MS of silence.
  //  - Every subsequent [READY_TO_SHARE] (model decides there's enough new
  //    material to update the picture) → same debounce, fires again.
  //  - PhoneGate handles the very first share for new participants directly.
  const analyzingRef = useRef(false);
  const debounceRef = useRef<number | null>(null);
  // Identifies the assistant message that triggered the current pending
  // timer, so a new ready token (from a later assistant turn) can re-arm
  // without colliding with the in-flight schedule.
  const armedForRef = useRef<string | null>(null);

  const runFinalize = useCallback(async () => {
    if (analyzingRef.current) {
      logEvent("chat.runFinalize.skipped_in_flight", {});
      return;
    }
    analyzingRef.current = true;
    setAnalyzing(true);
    // Clear any prior failure marker — a retry tap (or a fresh
    // [READY_TO_SHARE]-driven arm) is committing to another attempt.
    setFinalizeFailed(false);
    // hasAnalyzed for returning users now flips at the moment the token
    // appears (see the arming effect below) so the room renders the
    // instant the sign-off message finishes streaming, not 8s later when
    // the debounce timer fires. Belt-and-suspenders for the retry path
    // where this callback is invoked directly without going through the
    // arming effect.
    if (hasPhone) {
      setHasAnalyzed(true);
    }
    const startedAt = Date.now();
    logEvent("chat.runFinalize.begin", { hasPhone });
    try {
      const res = await fetch("/api/finalize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionCode }),
      });
      const body = res.ok
        ? ((await res.json().catch(() => null)) as
            | { ok: true; skipped?: boolean }
            | null)
        : null;
      logEvent("chat.runFinalize.response", {
        status: res.status,
        ok: res.ok,
        skipped: body?.skipped ?? false,
        duration_ms: Date.now() - startedAt,
      });
      if (res.ok && !body?.skipped) {
        // hasAnalyzed already flipped above for hasPhone users; just
        // refresh so the panel picks up the freshly-written themes,
        // summary, and points (including this participant's new ones).
        router.refresh();
      } else if (!res.ok) {
        setFinalizeFailed(true);
      }
    } catch (err) {
      logEvent("chat.runFinalize.error", {
        message: err instanceof Error ? err.message : String(err),
        duration_ms: Date.now() - startedAt,
      });
      // Network blip / abort. The room view (if hasPhone flipped
      // hasAnalyzed early) is still correct as a snapshot, but the
      // participant's contribution didn't land — surface a retry path
      // via the banner rather than silently moving on.
      setFinalizeFailed(true);
    } finally {
      analyzingRef.current = false;
      setAnalyzing(false);
    }
  }, [sessionCode, router, hasPhone]);

  useEffect(() => {
    // Cancel any pending timer if conditions change in a way that means
    // we shouldn't fire (still streaming, etc.).
    const cancel = () => {
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
        armedForRef.current = null;
      }
    };

    if (!ready || status === "streaming") {
      cancel();
      return;
    }

    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    if (!lastAssistant) return;
    // Already armed for this exact message — leave the existing timer in
    // place. (The effect re-runs on unrelated state changes too.)
    if (armedForRef.current === lastAssistant.id) return;

    cancel();
    armedForRef.current = lastAssistant.id;
    if (!hasPhone) {
      // First-share path: PhoneGate is about to mount (or just did).
      // Kick off analysis now so it runs in parallel with the ~20-30s
      // the participant spends on phone/OTP/details. No debounce — they
      // can't keep chatting from the gate, so there's no follow-up to
      // wait for.
      logEvent("chat.runFinalize.armed", {
        trigger: "ready_token_no_phone",
        debounce_ms: 0,
      });
      void runFinalize();
    } else {
      // Returning user: render the room view the instant the sign-off
      // message finishes streaming. Decoupled from the debounce so the
      // visible "From the room" section doesn't wait 8s behind the LLM
      // coalesce window. The debounce still gates the actual analyze
      // call below.
      if (!hasAnalyzed) setHasAnalyzed(true);
      logEvent("chat.runFinalize.armed", {
        trigger: "ready_token_with_phone",
        debounce_ms: READY_DEBOUNCE_MS,
      });
      debounceRef.current = window.setTimeout(() => {
        debounceRef.current = null;
        void runFinalize();
      }, READY_DEBOUNCE_MS);
    }

    return cancel;
  }, [ready, hasPhone, hasAnalyzed, status, messages, runFinalize]);

  const send = useCallback(
    async (text: string) => {
      if (status === "streaming") return;
      const userMsg: ChatMessage = { id: newId(), role: "user", content: text };
      const assistantId = newId();
      setMessages((prev) => [
        ...prev,
        userMsg,
        { id: assistantId, role: "assistant", content: "" },
      ]);
      setStatus("streaming");

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sessionCode, message: text }),
        });
        if (!res.ok || !res.body) {
          setStatus("error");
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: acc } : m)),
          );
        }
        setStatus("idle");
      } catch {
        setStatus("error");
      }
    },
    [sessionCode, status],
  );

  const speechInputRef = useRef<SpeechInputHandle>(null);
  // Mirror of the controlled input, updated every render. Lets submit
  // read the latest value AFTER awaiting a flush — React's setInput from
  // a trailing speech final may not have committed by the time submit
  // resumes from `await`, so reading the closure's `input` would lose
  // those words.
  const inputRef = useRef(input);
  inputRef.current = input;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Mic may still be armed — the Web Speech API streams final results
    // into the input while listening, so users routinely hit Send before
    // tapping Stop. Wait for the recognizer to flush any in-flight final
    // so trailing words land in `input` before we read it. Caps at 500ms
    // inside stopAndFlush; an additional rAF lets React commit.
    if (speechInputRef.current?.isListening) {
      await speechInputRef.current.stopAndFlush();
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
    }
    const text = inputRef.current.trim();
    if (!text) return;
    setInput("");
    void send(text);
  };

  const cleanText = (text: string) => text.replace(READY_TOKEN, "").trim();

  const transcribeAudio = async (blob: Blob): Promise<string> => {
    const fd = new FormData();
    fd.append("file", blob, "audio.webm");
    const res = await fetch("/api/transcribe", { method: "POST", body: fd });
    if (!res.ok) return "";
    const { text } = (await res.json()) as { text: string };
    return text;
  };

  const hasAnyMessages = intro.length > 0 || messages.length > 0 || hasAnalyzed;

  return (
    <div className="relative flex h-[calc(100dvh-4rem)] w-full flex-col">
      {isAdmin && (
        <AdminToolbar
          sessionCode={sessionCode}
          onShowResults={() => setResultsOpen(true)}
        />
      )}

      <SenseMakingModal open={introOpen} onAcknowledge={acknowledgeIntro} />

      {isAdmin && (
        <AdminResultsModal
          open={resultsOpen}
          onOpenChange={setResultsOpen}
          sessionCode={sessionCode}
          initialThemes={initialThemes}
          initialSummary={initialSummary}
          initialPoints={initialPoints}
        />
      )}

      {/* Conversation column + composer, both bound by the same column. */}
      <div className="mx-auto flex w-full max-w-3xl min-h-0 flex-1 flex-col px-5 sm:px-8">
        <Conversation className="tejido-fade-top flex-1 min-h-0">
          <ConversationContent className="flex flex-col gap-7 pl-0 pr-3 pt-0 pb-6 sm:gap-8 sm:pr-4 sm:pb-8">
            {/* Hero scrolls with the conversation: it anchors the editorial
                first impression but yields vertical real estate to the chat
                as messages accumulate. */}
            <Hero topic={topic} />
            {intro && <FacilitatorOpener text={intro} />}
            {(() => {
              // Anchor the panel + open-thread note to the LATEST
              // [READY_TO_SHARE] emission — every "share what you have so
              // far" signal republishes the room view at that moment in
              // the conversation. As the participant continues and the
              // model re-emits the token, the panel slides down to the
              // newest position so the user (typically scrolled to the
              // bottom) actually sees the snapshot appear in their
              // viewport, just like the first time.
              const readyIdx = messages.findLastIndex(
                (m) => m.role === "assistant" && m.content.includes(READY_TOKEN),
              );
              const splitAt = readyIdx >= 0 ? readyIdx + 1 : messages.length;
              const lastId = messages[messages.length - 1]?.id;
              const renderMsg = (m: ChatMessage) => {
                // Only strip [READY_TO_SHARE] from assistant content. If a
                // user happens to paste the literal token, we want to keep
                // it visible — silently mutating their words is worse than
                // a rare odd-looking message.
                const cleaned = m.role === "assistant" ? cleanText(m.content) : m.content;
                const isStreaming = status === "streaming" && m.id === lastId;
                // A token-only assistant message renders as nothing here —
                // the panel sliding in directly below is the visible
                // response, so a duplicate placeholder would just be
                // noise.
                if (m.role === "assistant" && !cleaned && !isStreaming) return null;
                return (
                  <EditorialMessage
                    key={m.id}
                    role={m.role}
                    content={cleaned}
                    isStreaming={isStreaming}
                  />
                );
              };
              return (
                <>
                  {messages.slice(0, splitAt).map(renderMsg)}
                  {!hasAnalyzed && showAnalyzing && <AnalyzingPlaceholder />}
                  {hasAnalyzed && (
                    <ThemesPanel
                      sessionCode={sessionCode}
                      initialThemes={initialThemes}
                      initialSummary={initialSummary}
                      initialPoints={initialPoints}
                      analyzing={showAnalyzing}
                    />
                  )}
                  {hasAnalyzed && <OpenThreadNote />}
                  {messages.slice(splitAt).map(renderMsg)}
                </>
              );
            })()}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        {finalizeFailed && !analyzing && (
          <FinalizeErrorBanner onRetry={() => void runFinalize()} />
        )}

        <div className="border-t border-border/70 pt-4 pb-[max(env(safe-area-inset-bottom),1.25rem)] sm:pb-[max(env(safe-area-inset-bottom),1.75rem)]">
          {archived ? (
            // Archived is read-only, not gone: the transcript above and the
            // room's themes stay readable, only the ways to add more are
            // withdrawn. The chat route rejects writes independently.
            <p className="px-1 text-center text-xs text-muted-foreground">
              {t("archived")}
            </p>
          ) : showPhoneGate ? (
            <PhoneGate
              sessionCode={sessionCode}
              onComplete={() => {
                const analyzeInFlight = analyzingRef.current;
                logEvent("chat.gate_complete", {
                  analyzeInFlight,
                  initialThemeCount: initialThemes.length,
                });
                setHasPhone(true);
                // Flip hasAnalyzed so ThemesPanel takes over with
                // whatever the room has so far. Analyze was kicked off
                // as soon as [READY_TO_SHARE] landed — by now it's
                // either already done (initialThemes is fresh from the
                // post-finalize router.refresh) or still in flight.
                setHasAnalyzed(true);
                // Only show the "Updating" bridge if analyze is still
                // running. When it's already done, the room is whatever
                // initialThemes says it is — slapping an Updating
                // indicator on top reads as "still loading…" with no
                // payoff and was the UX they flagged.
                if (analyzeInFlight) {
                  setPostSubmitSettling(true);
                  if (settlingTimerRef.current !== null) {
                    window.clearTimeout(settlingTimerRef.current);
                  }
                  // Safety net: drop the loader after a few seconds
                  // even if the refresh stalls — better than spinning
                  // forever.
                  settlingTimerRef.current = window.setTimeout(() => {
                    logEvent("chat.settling.clear", { reason: "timeout" });
                    setPostSubmitSettling(false);
                    settlingTimerRef.current = null;
                  }, 8000);
                }
                router.refresh();
              }}
            />
          ) : (
            <ComposerForm
              input={input}
              setInput={setInput}
              onSubmit={submit}
              onAudio={transcribeAudio}
              disabled={status === "streaming"}
              status={status}
              speechInputRef={speechInputRef}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Sense-making modal ───────────────────────── */

function SenseMakingModal({
  open,
  onAcknowledge,
}: {
  open: boolean;
  onAcknowledge: () => void;
}) {
  const t = useTranslations("session");
  return (
    <Dialog open={open} disablePointerDismissal>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "!max-w-[30rem] !gap-0 !rounded-2xl !bg-card !p-0 ring-1 ring-[var(--accent)]/15",
          "shadow-[0_24px_60px_-30px_oklch(22%_0.02_145_/0.35),0_2px_8px_-3px_oklch(22%_0.02_145_/0.12)]",
        )}
      >
        {/* Stitched corner ticks — same vocabulary as the composer. */}
        <span
          className="pointer-events-none absolute -left-px -top-px h-2.5 w-2.5 border-l border-t border-[var(--accent)]/55"
          aria-hidden
        />
        <span
          className="pointer-events-none absolute -right-px -top-px h-2.5 w-2.5 border-r border-t border-[var(--accent)]/55"
          aria-hidden
        />
        <span
          className="pointer-events-none absolute -left-px -bottom-px h-2.5 w-2.5 border-l border-b border-[var(--accent)]/55"
          aria-hidden
        />
        <span
          className="pointer-events-none absolute -right-px -bottom-px h-2.5 w-2.5 border-r border-b border-[var(--accent)]/55"
          aria-hidden
        />

        <div className="flex flex-col gap-5 px-7 pt-7 pb-6 sm:px-9 sm:pt-9 sm:pb-7">
          <div className="flex items-center gap-3">
            <svg
              width="22"
              height="22"
              viewBox="0 0 22 22"
              fill="none"
              aria-hidden
              className="shrink-0"
            >
              <path
                d="M2 11 C 5 5, 8 17, 11 11 S 17 5, 20 11"
                stroke="var(--accent)"
                strokeWidth="1.4"
                strokeLinecap="round"
                opacity="0.85"
              />
              <path
                d="M2 11 C 5 17, 8 5, 11 11 S 17 17, 20 11"
                stroke="var(--primary)"
                strokeWidth="1.1"
                strokeLinecap="round"
                opacity="0.55"
              />
            </svg>
            <h2
              className="font-display text-[1.65rem] leading-none italic text-foreground sm:text-[1.85rem]"
              style={{ fontVariationSettings: '"opsz" 144, "SOFT" 90, "WONK" 0' }}
            >
              {t("senseMakingTitle")}
            </h2>
          </div>

          <div className="space-y-4">
            {SENSE_MAKING_NOTE_KEYS.map((key) => (
              <div key={key}>
                <p className="font-sans text-[15px] leading-[1.65] text-foreground/85">
                  {t(key)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-border/70 px-7 py-4 sm:px-9 sm:py-5">
          <button
            type="button"
            onClick={onAcknowledge}
            className={cn(
              "group/btn relative inline-flex h-10 w-full items-center justify-center gap-2 rounded-full",
              "bg-[var(--accent)] text-[var(--accent-foreground)]",
              "font-mono text-[10px] uppercase tracking-[0.24em]",
              "shadow-[0_1px_0_oklch(100%_0_0_/0.4)_inset]",
              "transition-all hover:translate-y-[-1px] hover:shadow-[0_6px_14px_oklch(58%_0.135_38_/0.32)]",
              "active:translate-y-0",
            )}
          >
            {t("senseMakingAck")}
            <span
              className="ml-0.5 transition-transform group-hover/btn:translate-x-0.5"
              aria-hidden
            >
              →
            </span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────── Admin toolbar ───────────────────────── */

function AdminToolbar({
  sessionCode,
  onShowResults,
}: {
  sessionCode: string;
  onShowResults: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-3xl items-center justify-end gap-2 px-5 pt-3 sm:px-8">
      <AdminResultsButton onClick={onShowResults} />
      <AdminResetButton sessionCode={sessionCode} />
    </div>
  );
}

function AdminResultsButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border border-border/80 bg-background/60 px-2.5 py-1",
        "font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground",
        "transition-colors hover:border-[var(--accent)]/60 hover:text-foreground",
      )}
      title="Admin only: view what participants see (the room results)"
    >
      Results
    </button>
  );
}

/* ───────────────────────── Admin results modal ───────────────────────── */

function AdminResultsModal({
  open,
  onOpenChange,
  sessionCode,
  initialThemes,
  initialSummary,
  initialPoints,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionCode: string;
  initialThemes: Theme[];
  initialSummary: { text: string | null; generatedAt: string | null };
  initialPoints: Point[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "!max-w-2xl !gap-0 !rounded-2xl !bg-card !p-0",
          "max-h-[85dvh] overflow-y-auto ring-1 ring-[var(--accent)]/15",
        )}
      >
        <div className="border-b border-border/70 px-6 py-4">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.24em] text-[var(--accent)]">
            Admin preview
          </p>
          <p className="mt-1 font-display text-[1.05rem] italic leading-none text-foreground">
            What participants see
          </p>
        </div>
        <div className="px-6 py-6">
          <ThemesPanel
            sessionCode={sessionCode}
            initialThemes={initialThemes}
            initialSummary={initialSummary}
            initialPoints={initialPoints}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AdminResetButton({ sessionCode }: { sessionCode: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    if (busy) return;
    const ok = window.confirm(
      "Reset your responses for this session?\n\nThis clears your conversation, extracted points, and LLM logs. Themes and summaries stay.",
    );
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/sessions/${encodeURIComponent(sessionCode)}/reset-mine`,
        { method: "POST" },
      );
      if (!res.ok) {
        setError((await res.text()) || `failed (${res.status})`);
        setBusy(false);
        return;
      }
      // Hard reload so the chat client fully re-seeds from the freshly
      // emptied tables — router.refresh() alone wouldn't reset the
      // client component's local message/analyzed state.
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-0.5">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className={cn(
          "rounded-full border border-border/80 bg-background/60 px-2.5 py-1",
          "font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground",
          "transition-colors hover:border-[var(--accent)]/60 hover:text-foreground",
          "disabled:opacity-50 disabled:cursor-default",
        )}
        title="Admin only: clear your responses for this session"
      >
        {busy ? "Resetting…" : "Reset mine"}
      </button>
      {error && (
        <span className="font-mono text-[9px] text-destructive">{error}</span>
      )}
    </div>
  );
}

/* ───────────────────────── Hero ───────────────────────── */

function Hero({ topic }: { topic: string }) {
  const t = useTranslations("session");
  return (
    <section className="mx-auto w-full max-w-3xl px-5 pt-10 pb-5 sm:px-8 sm:pt-14 sm:pb-7">
      <div className="tejido-stagger">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--accent)]">
          <span aria-hidden>¶ </span>
          {t("heroEyebrow")}
        </p>
        <h1
          className="mt-4 font-display text-[clamp(2.05rem,5.4vw,3.6rem)] leading-[1.04] tracking-[-0.012em] text-balance text-foreground sm:mt-5"
          style={{ fontVariationSettings: '"opsz" 144, "SOFT" 80, "WONK" 0' }}
        >
          {topic}
        </h1>
        <div className="mt-6 flex items-center gap-4 sm:mt-7">
          <ThreadDivider />
          <p className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-muted-foreground/90">
            <em className="font-display not-italic text-muted-foreground" style={{ fontVariationSettings: '"opsz" 14' }}>
              {t("heroConversation")}
            </em>{" "}
            {t("heroAmongNeighbors")}
          </p>
        </div>
      </div>
    </section>
  );
}

function ThreadDivider() {
  return (
    <svg
      width="84"
      height="14"
      viewBox="0 0 84 14"
      fill="none"
      aria-hidden
      className="tejido-thread shrink-0"
    >
      <path
        d="M1 7 C 6 1, 11 13, 17 7 S 28 1, 34 7 45 13, 51 7 62 1, 68 7 79 13, 83 7"
        stroke="var(--accent)"
        strokeWidth="1.25"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path
        d="M1 7 C 6 13, 11 1, 17 7 S 28 13, 34 7 45 1, 51 7 62 13, 68 7 79 1, 83 7"
        stroke="var(--primary)"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}

/* ───────────────────────── Messages ───────────────────────── */

function FacilitatorOpener({ text }: { text: string }) {
  const t = useTranslations("session");
  const quoted = text.startsWith("“") ? text : `“${text}”`;
  return (
    <div className="flex w-full max-w-[40rem] flex-col gap-3">
      <div className="flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.24em] text-muted-foreground">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <circle cx="7" cy="7" r="6" stroke="var(--accent)" strokeWidth="1.1" />
          <circle cx="7" cy="7" r="2.4" fill="var(--accent)" />
        </svg>
        <span>{t("fromTheFacilitator")}</span>
      </div>
      <p
        className="font-display text-[1.45rem] italic leading-[1.4] text-foreground/90 sm:text-[1.6rem] sm:leading-[1.36]"
        style={{ fontVariationSettings: '"opsz" 144, "SOFT" 100, "WONK" 0' }}
      >
        {renderWithLinks(quoted)}
      </p>
    </div>
  );
}

function renderWithLinks(text: string) {
  // Match http(s) URLs and bare www.* URLs; stop before whitespace and trim trailing punctuation.
  const urlRegex = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = urlRegex.exec(text)) !== null) {
    const raw = match[0];
    // Trim trailing punctuation that's unlikely to be part of the URL.
    const trimmed = raw.replace(/[.,;:!?)\]}'"”’]+$/, "");
    const trailing = raw.slice(trimmed.length);
    const start = match.index;
    if (start > lastIndex) nodes.push(text.slice(lastIndex, start));
    const href = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    nodes.push(
      <a
        key={`lnk-${key++}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="underline decoration-[var(--accent)]/60 underline-offset-[3px] transition-colors hover:text-[var(--accent)] hover:decoration-[var(--accent)]"
      >
        {trimmed}
      </a>,
    );
    if (trailing) nodes.push(trailing);
    lastIndex = start + raw.length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes.length > 0 ? nodes : text;
}

function FinalizeErrorBanner({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations("session");
  return (
    <div
      role="alert"
      className={cn(
        "mb-3 flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/[0.06] px-4 py-2.5",
      )}
    >
      <span className="size-1.5 shrink-0 rounded-full bg-destructive" aria-hidden />
      <p className="flex-1 font-sans text-[0.88rem] leading-[1.4] text-foreground/85">
        {t("finalizeFailed")}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className={cn(
          "shrink-0 rounded-full border border-destructive/50 bg-background/60 px-3 py-1",
          "font-mono text-[9.5px] uppercase tracking-[0.22em] text-destructive",
          "transition-colors hover:bg-destructive/10",
        )}
      >
        {t("retry")}
      </button>
    </div>
  );
}

function OpenThreadNote() {
  const t = useTranslations("session");
  return (
    <section className="flex w-full max-w-[40rem] flex-col gap-3">
      <div className="flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.24em] text-muted-foreground">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <circle cx="7" cy="7" r="6" stroke="var(--accent)" strokeWidth="1.1" />
        </svg>
        <span>{t("openThread")}</span>
      </div>
      <p className="font-display text-[1rem] italic leading-[1.55] text-foreground/80 sm:text-[1.05rem]">
        {t("openThreadBody")}
      </p>
    </section>
  );
}

function AnalyzingPlaceholder() {
  const t = useTranslations("session");
  return (
    <section className="flex w-full max-w-[40rem] flex-col gap-3">
      <div className="flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.24em] text-muted-foreground">
        <span className="relative flex size-1.5" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-70" />
          <span className="relative inline-flex size-1.5 rounded-full bg-[var(--accent)]" />
        </span>
        <span>{t("fromTheRoom")}</span>
      </div>
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-[var(--accent)]/30 bg-[var(--accent)]/5 px-4 py-3.5">
        <span
          className="size-2 animate-pulse rounded-full bg-[var(--accent)]"
          aria-hidden
        />
        <p className="font-display text-[0.98rem] italic leading-relaxed text-foreground/80 sm:text-[1.02rem]">
          {t("pullingIn")}
        </p>
      </div>
    </section>
  );
}

function EditorialMessage({
  role,
  content,
  isStreaming,
}: {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}) {
  const t = useTranslations("session");
  if (role === "user") {
    return (
      <div className="ml-auto flex w-full max-w-[36rem] flex-col items-end gap-1.5">
        <span className="font-mono text-[9px] uppercase tracking-[0.26em] text-muted-foreground/80">
          {t("youWrote")}
        </span>
        <Message
          from="user"
          className="!max-w-full data-[role=user]:!ml-auto"
        >
          <MessageContent
            className={cn(
              // Drop the secondary bubble fill in favor of an editorial pull-quote.
              "group-[.is-user]:!ml-auto group-[.is-user]:!rounded-none",
              "group-[.is-user]:!bg-transparent group-[.is-user]:!px-0 group-[.is-user]:!py-0",
              "border-r-2 border-[var(--accent)] pr-4",
            )}
          >
            <MessageResponse className="font-display text-[1rem] italic leading-relaxed text-foreground/90 sm:text-[1.05rem] [&_p]:text-right">
              {content}
            </MessageResponse>
          </MessageContent>
        </Message>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-[40rem] flex-col gap-2">
      <span className="font-mono text-[9px] uppercase tracking-[0.26em] text-muted-foreground/80">
        Tejido
        {isStreaming && (
          <span className="ml-2 inline-flex items-center gap-1 align-middle">
            <span className="block h-1 w-1 animate-pulse rounded-full bg-[var(--accent)]" />
            <span
              className="block h-1 w-1 animate-pulse rounded-full bg-[var(--accent)]"
              style={{ animationDelay: "0.15s" }}
            />
            <span
              className="block h-1 w-1 animate-pulse rounded-full bg-[var(--accent)]"
              style={{ animationDelay: "0.3s" }}
            />
          </span>
        )}
      </span>
      <Message from="assistant" className="!max-w-full">
        <MessageContent className="!w-full !max-w-full">
          <MessageResponse className="font-sans text-[1.02rem] leading-[1.7] text-foreground [&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0">
            {content}
          </MessageResponse>
        </MessageContent>
      </Message>
    </div>
  );
}

/* ───────────────────────── Composer ───────────────────────── */

function ComposerForm({
  input,
  setInput,
  onSubmit,
  onAudio,
  disabled,
  status,
  speechInputRef,
}: {
  input: string;
  setInput: (v: string | ((p: string) => string)) => void;
  onSubmit: (e: React.FormEvent) => void;
  onAudio: (blob: Blob) => Promise<string>;
  disabled: boolean;
  status: Status;
  speechInputRef: React.RefObject<SpeechInputHandle | null>;
}) {
  const t = useTranslations("session");
  const trimmed = input.trim();
  const canSend = trimmed.length > 0 && !disabled;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Last known max scrollTop (scrollHeight - clientHeight) captured at
  // the end of the previous render. Lets us tell whether the user was
  // pinned to the bottom *before* this update grew scrollHeight — if we
  // compared post-growth scrollHeight, any non-trivial speech append
  // would falsely look like "user scrolled up."
  const lastMaxScrollRef = useRef(0);

  // Auto-grow the textarea to fit content (capped) and keep the latest
  // characters in view when the user is following along. Speech
  // transcription appends to `input` from outside the field, so the
  // cursor doesn't naturally scroll the view — without this, mobile
  // users see only the first line of a multi-line reply they're
  // dictating. Only pin to bottom if the user was already at the bottom
  // of the *previous* content, so editing earlier lines in a long draft
  // doesn't yank them back.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const wasAtBottom = el.scrollTop >= lastMaxScrollRef.current - 1;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
    if (wasAtBottom) {
      el.scrollTop = el.scrollHeight;
    }
    lastMaxScrollRef.current = el.scrollHeight - el.clientHeight;
  }, [input]);

  return (
    <form onSubmit={onSubmit} className="group relative">
      <div
        className={cn(
          "relative flex items-end gap-2 rounded-2xl border bg-card px-2.5 py-2 shadow-[0_1px_0_oklch(100%_0_0_/0.6)_inset,0_1px_2px_oklch(22%_0.02_145_/0.04)]",
          "transition-shadow focus-within:shadow-[0_0_0_3px_oklch(58%_0.135_38_/0.14),0_1px_2px_oklch(22%_0.02_145_/0.06)]",
          "focus-within:border-[var(--accent)]/45",
        )}
      >
        {/* Hand-tucked corner mark — a hint of stitched binding. */}
        <span
          className="pointer-events-none absolute -left-px -top-px h-2 w-2 border-l border-t border-[var(--accent)]/60"
          aria-hidden
        />
        <span
          className="pointer-events-none absolute -right-px -bottom-px h-2 w-2 border-r border-b border-[var(--accent)]/60"
          aria-hidden
        />

        <SpeechInput
          ref={speechInputRef}
          variant="ghost"
          size="icon"
          onTranscriptionChange={(t) =>
            setInput((prev) => (prev ? `${prev} ${t}` : t))
          }
          onAudioRecorded={onAudio}
        />

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSubmit(e);
            }
          }}
          placeholder={t("composerPlaceholder")}
          rows={1}
          aria-label={t("composerAria")}
          className={cn(
            "min-h-[2.5rem] max-h-[12rem] flex-1 resize-none overflow-y-auto bg-transparent px-2 py-2",
            "font-sans text-[16px] leading-[1.55] text-foreground",
            "placeholder:font-display placeholder:italic placeholder:text-muted-foreground/70",
            "focus:outline-none",
          )}
        />

        <button
          type="submit"
          disabled={!canSend}
          aria-label={t("send")}
          className={cn(
            "relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
            "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[0_1px_0_oklch(100%_0_0_/0.4)_inset]",
            "transition-all hover:translate-y-[-1px] hover:shadow-[0_4px_10px_oklch(58%_0.135_38_/0.32)]",
            "active:translate-y-0",
            "disabled:bg-muted disabled:text-muted-foreground/60 disabled:translate-y-0 disabled:shadow-none disabled:cursor-default",
          )}
        >
          <ArrowUpIcon className="size-[16px]" strokeWidth={2.25} />
        </button>
      </div>

      {status === "error" && (
        <p className="mt-2 font-mono text-[9.5px] uppercase tracking-[0.22em] text-destructive">
          {t("sendFailed")}
        </p>
      )}
    </form>
  );
}
