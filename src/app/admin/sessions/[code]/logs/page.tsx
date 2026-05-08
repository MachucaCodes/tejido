import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { requireAdmin } from "@/lib/admin-guard";
import { createAdmin } from "@/lib/supabase/admin";

type SearchParams = Promise<{
  status?: string;
  kind?: string;
  participant?: string;
}>;

const STATUS_BADGE: Record<string, string> = {
  success: "bg-green-100 text-green-800 border-green-200",
  error: "bg-red-100 text-red-800 border-red-200",
  parse_error: "bg-orange-100 text-orange-800 border-orange-200",
  stream_aborted: "bg-amber-100 text-amber-800 border-amber-200",
};

const KIND_LABEL: Record<string, string> = {
  facilitator_turn: "facilitator",
  extract_points: "extract",
  cluster_points: "cluster",
};

type LogRow = {
  id: string;
  created_at: string;
  duration_ms: number | null;
  call_kind: string;
  participant_id: string | null;
  turn_id: number | null;
  model: string;
  status: string;
  error_message: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cache_read_tokens: number | null;
  cache_creation_tokens: number | null;
  stop_reason: string | null;
  system_prompt: string | null;
  request_messages: unknown;
  request_params: unknown;
  raw_response: unknown;
  raw_response_text: string | null;
  parsed_output: unknown;
};

function fmtDuration(ms: number | null) {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function fmtTokens(row: LogRow) {
  const parts: string[] = [];
  if (row.input_tokens != null) parts.push(`in ${row.input_tokens}`);
  if (row.output_tokens != null) parts.push(`out ${row.output_tokens}`);
  if (row.cache_read_tokens) parts.push(`cache ${row.cache_read_tokens}`);
  return parts.join(" · ") || "—";
}

export default async function SessionLogsPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: SearchParams;
}) {
  const guard = await requireAdmin();
  if (!guard.ok) redirect("/admin/login");

  const { code } = await params;
  const { status, kind, participant } = await searchParams;
  const admin = createAdmin();

  const { data: session } = await admin
    .from("sessions")
    .select("id, topic")
    .eq("id", code)
    .single();
  if (!session) notFound();

  let query = admin
    .from("llm_call_logs")
    .select(
      "id, created_at, duration_ms, call_kind, participant_id, turn_id, model, status, error_message, input_tokens, output_tokens, cache_read_tokens, cache_creation_tokens, stop_reason, system_prompt, request_messages, request_params, raw_response, raw_response_text, parsed_output",
    )
    .eq("session_id", code)
    .order("created_at", { ascending: false })
    .limit(200);

  if (status && status !== "all") query = query.eq("status", status);
  if (kind && kind !== "all") query = query.eq("call_kind", kind);
  if (participant) query = query.eq("participant_id", participant);

  const { data: rows, error } = await query;
  const logs = (rows ?? []) as LogRow[];

  const counts = logs.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  function filterHref(next: { status?: string; kind?: string; participant?: string }) {
    const params = new URLSearchParams();
    const merged = { status, kind, participant, ...next };
    if (merged.status && merged.status !== "all") params.set("status", merged.status);
    if (merged.kind && merged.kind !== "all") params.set("kind", merged.kind);
    if (merged.participant) params.set("participant", merged.participant);
    const qs = params.toString();
    return `/admin/sessions/${code}/logs${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {session.id} · LLM call logs
        </p>
        <p className="text-sm text-muted-foreground">{session.topic}</p>
        <Link
          href={`/admin/sessions/${code}`}
          className="text-xs text-muted-foreground underline-offset-2 hover:underline"
        >
          ← Back to session
        </Link>
      </header>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error.message}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">Status:</span>
        {(["all", "success", "error", "parse_error", "stream_aborted"] as const).map(
          (s) => (
            <Link
              key={s}
              href={filterHref({ status: s })}
              className={`rounded border px-2 py-0.5 ${
                (status ?? "all") === s
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card hover:bg-accent"
              }`}
            >
              {s}
              {s !== "all" && counts[s] != null && (
                <span className="ml-1 text-muted-foreground">{counts[s]}</span>
              )}
            </Link>
          ),
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">Kind:</span>
        {(["all", "facilitator_turn", "extract_points", "cluster_points"] as const).map(
          (k) => (
            <Link
              key={k}
              href={filterHref({ kind: k })}
              className={`rounded border px-2 py-0.5 ${
                (kind ?? "all") === k
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card hover:bg-accent"
              }`}
            >
              {k === "all" ? "all" : (KIND_LABEL[k] ?? k)}
            </Link>
          ),
        )}
        {participant && (
          <Link
            href={filterHref({ participant: undefined })}
            className="rounded border border-border bg-card px-2 py-0.5 hover:bg-accent"
          >
            ✕ participant: {participant.slice(0, 8)}
          </Link>
        )}
      </div>

      {logs.length === 0 ? (
        <p className="rounded border bg-card p-6 text-center text-sm text-muted-foreground">
          No log rows match these filters.
        </p>
      ) : (
        <ul className="space-y-2">
          {logs.map((row) => (
            <li
              key={row.id}
              className="overflow-hidden rounded-lg border bg-card text-sm"
            >
              <details>
                <summary className="flex cursor-pointer flex-wrap items-center gap-3 px-3 py-2 hover:bg-accent">
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${
                      STATUS_BADGE[row.status] ?? "bg-muted text-foreground"
                    }`}
                  >
                    {row.status}
                  </span>
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    {KIND_LABEL[row.call_kind] ?? row.call_kind}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(row.created_at).toLocaleString()}
                  </span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {fmtDuration(row.duration_ms)}
                  </span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {fmtTokens(row)}
                  </span>
                  {row.stop_reason && (
                    <span className="text-xs text-muted-foreground">
                      stop:{row.stop_reason}
                    </span>
                  )}
                  {row.participant_id && (
                    <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                      {row.participant_id.slice(0, 8)}
                    </span>
                  )}
                </summary>

                <div className="space-y-3 border-t px-3 py-3">
                  {row.error_message && (
                    <div className="rounded bg-red-50 px-2 py-1 text-xs text-red-800">
                      <span className="font-medium">Error: </span>
                      {row.error_message}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <div>
                      <span className="font-medium">Model: </span>
                      <span className="font-mono">{row.model}</span>
                    </div>
                    <div>
                      <span className="font-medium">Log id: </span>
                      <span className="font-mono">{row.id.slice(0, 8)}</span>
                    </div>
                    {row.turn_id != null && (
                      <div>
                        <span className="font-medium">Turn id: </span>
                        {row.turn_id}
                      </div>
                    )}
                    {row.participant_id && (
                      <div>
                        <span className="font-medium">Participant: </span>
                        <Link
                          href={filterHref({ participant: row.participant_id })}
                          className="font-mono underline-offset-2 hover:underline"
                        >
                          {row.participant_id}
                        </Link>
                      </div>
                    )}
                  </div>

                  {row.system_prompt && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        System prompt ({row.system_prompt.length} chars)
                      </summary>
                      <pre className="mt-1 max-h-96 overflow-auto whitespace-pre-wrap rounded border bg-background p-2 text-[11px]">
                        {row.system_prompt}
                      </pre>
                    </details>
                  )}

                  {row.request_messages != null && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        Request messages
                      </summary>
                      <pre className="mt-1 max-h-96 overflow-auto rounded border bg-background p-2 text-[11px]">
                        {JSON.stringify(row.request_messages, null, 2)}
                      </pre>
                    </details>
                  )}

                  {row.request_params != null && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        Request params
                      </summary>
                      <pre className="mt-1 overflow-auto rounded border bg-background p-2 text-[11px]">
                        {JSON.stringify(row.request_params, null, 2)}
                      </pre>
                    </details>
                  )}

                  {row.raw_response != null && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        Raw response
                      </summary>
                      <pre className="mt-1 max-h-96 overflow-auto rounded border bg-background p-2 text-[11px]">
                        {JSON.stringify(row.raw_response, null, 2)}
                      </pre>
                    </details>
                  )}

                  {row.raw_response_text && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        Raw response text (pre-parse)
                      </summary>
                      <pre className="mt-1 max-h-96 overflow-auto whitespace-pre-wrap rounded border bg-background p-2 text-[11px]">
                        {row.raw_response_text}
                      </pre>
                    </details>
                  )}

                  {row.parsed_output != null && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        Parsed output
                      </summary>
                      <pre className="mt-1 max-h-96 overflow-auto rounded border bg-background p-2 text-[11px]">
                        {JSON.stringify(row.parsed_output, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
