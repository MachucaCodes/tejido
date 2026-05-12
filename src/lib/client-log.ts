"use client";

// Lightweight client-side event log. Buffers in memory, flushes via
// sendBeacon on visibility change and pagehide so we keep tail events
// when the user backgrounds or closes the tab. All calls are
// non-blocking; failures are swallowed.

type Event = {
  kind: string;
  data?: unknown;
  client_ts: string;
  session_code?: string;
  participant_id?: string;
};

const FLUSH_INTERVAL_MS = 2000;
const MAX_BUFFER = 100;
const CLIENT_ID_KEY = "tejido:client-id";

let buffer: Event[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let sessionCode: string | undefined;
let participantId: string | undefined;
let listenersBound = false;

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Last-resort fallback for ancient browsers — only used to tag rows,
  // not security-sensitive.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getClientId(): string {
  if (typeof window === "undefined") return "00000000-0000-0000-0000-000000000000";
  try {
    let v = window.localStorage.getItem(CLIENT_ID_KEY);
    if (!v) {
      v = uuid();
      window.localStorage.setItem(CLIENT_ID_KEY, v);
    }
    return v;
  } catch {
    return uuid();
  }
}

function flush(useBeacon = false) {
  if (typeof window === "undefined" || buffer.length === 0) return;
  const events = buffer;
  buffer = [];
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  const body = JSON.stringify({ client_id: getClientId(), events });
  try {
    if (useBeacon && "sendBeacon" in navigator) {
      const ok = navigator.sendBeacon(
        "/api/log",
        new Blob([body], { type: "application/json" }),
      );
      if (ok) return;
    }
    void fetch("/api/log", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Swallow.
  }
}

function scheduleFlush() {
  if (timer || typeof window === "undefined") return;
  timer = setTimeout(() => {
    timer = null;
    flush(false);
  }, FLUSH_INTERVAL_MS);
}

function bindLifecycleListeners() {
  if (listenersBound || typeof window === "undefined") return;
  listenersBound = true;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush(true);
  });
  window.addEventListener("pagehide", () => flush(true));
}

export function setLogContext(ctx: {
  sessionCode?: string;
  participantId?: string;
}) {
  if (ctx.sessionCode !== undefined) sessionCode = ctx.sessionCode || undefined;
  if (ctx.participantId !== undefined)
    participantId = ctx.participantId || undefined;
}

export function logEvent(kind: string, data?: unknown) {
  if (typeof window === "undefined") return;
  bindLifecycleListeners();
  buffer.push({
    kind,
    data,
    client_ts: new Date().toISOString(),
    session_code: sessionCode,
    participant_id: participantId,
  });
  if (process.env.NODE_ENV !== "production") {
    // Mirror to devtools so the dev loop is observable without querying
    // the table. Production stays silent to avoid leaking PII to consoles.
    // eslint-disable-next-line no-console
    console.debug(`[tejido] ${kind}`, data ?? "");
  }
  if (buffer.length >= MAX_BUFFER) {
    flush(false);
  } else {
    scheduleFlush();
  }
}
