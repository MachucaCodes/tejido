import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { requireAdmin } from "@/lib/admin-guard";
import { createAdmin } from "@/lib/supabase/admin";
import SessionHeader from "../session-header";
import { formatDateTime } from "@/lib/format-date";
import LogsFilter from "./logs-filter";

type SearchParams = Promise<{
  status?: string;
  kind?: string;
  participant?: string;
  before?: string;
}>;

const PAGE_SIZE = 200;
const STATUSES = ["success", "error", "parse_error", "stream_aborted"] as const;

const STATUS_BADGE: Record<string, string> = {
  success: "bg-green-100 text-green-800 border-green-200",
  error: "bg-red-100 text-red-800 border-red-200",
  parse_error: "bg-orange-100 text-orange-800 border-orange-200",
  stream_aborted: "bg-amber-100 text-amber-800 border-amber-200",
};

const STATUS_LABEL: Record<string, string> = {
  success: "Success",
  error: "Error",
  parse_error: "Couldn't read reply",
  stream_aborted: "Cut off",
};

const KIND_LABEL: Record<string, string> = {
  facilitator_turn: "Facilitator",
  analyze_participant: "Analyze",
  summarize_session: "Summary",
  extract_points: "Extract",
  cluster_points: "Cluster",
};

// Every kind the app can log. The filter only offers the ones this session
// actually has, so a choice never points at calls that don't exist.
const KINDS = Object.keys(KIND_LABEL);

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
  const { status, kind, participant, before } = await searchParams;
  const admin = createAdmin();

  const { data: session } = await admin
    .from("sessions")
    .select("id, topic, status, archived_at, created_at")
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
    .limit(PAGE_SIZE);

  if (status && status !== "all") query = query.eq("status", status);
  if (kind && kind !== "all") query = query.eq("call_kind", kind);
  if (participant) query = query.eq("participant_id", participant);
  if (before) query = query.lt("created_at", before);

  // Real totals, not counts of the page we fetched. Chips count the whole
  // session; "matching" counts the current filters across all pages.
  const countRows = (f: { status?: string; kind?: string; participant?: string }) => {
    let q = admin
      .from("llm_call_logs")
      .select("id", { count: "exact", head: true })
      .eq("session_id", code);
    if (f.status && f.status !== "all") q = q.eq("status", f.status);
    if (f.kind && f.kind !== "all") q = q.eq("call_kind", f.kind);
    if (f.participant) q = q.eq("participant_id", f.participant);
    return q.then(({ count }) => count ?? 0);
  };

  const [{ data: rows, error }, kindCounts, statusCounts, matching] = await Promise.all([
    query,
    Promise.all(KINDS.map(async (k) => [k, await countRows({ kind: k })] as const)),
    Promise.all(STATUSES.map(async (s) => [s, await countRows({ status: s })] as const)),
    countRows({ status, kind, participant }),
  ]);
  const kindsPresent = kindCounts.filter(([k, n]) => n > 0 || k === kind);
  const statusesPresent = statusCounts.filter(([s, n]) => n > 0 || s === status);
  const logs = (rows ?? []) as LogRow[];
  const olderCursor = logs.length === PAGE_SIZE ? logs[logs.length - 1].created_at : null;

  // Changing a filter starts again from the newest rows; paging keeps filters.
  function filterHref(next: {
    status?: string;
    kind?: string;
    participant?: string;
    before?: string;
  }) {
    const params = new URLSearchParams();
    const merged = { status, kind, participant, before: undefined, ...next };
    if (merged.status && merged.status !== "all") params.set("status", merged.status);
    if (merged.kind && merged.kind !== "all") params.set("kind", merged.kind);
    if (merged.participant) params.set("participant", merged.participant);
    if (merged.before) params.set("before", merged.before);
    const qs = params.toString();
    return `/admin/sessions/${code}/logs${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="space-y-5">
      <SessionHeader session={session} current="logs" isAdmin />

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error.message}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {logs.length === 0
            ? `0 of ${matching} matching calls`
            : `Showing ${logs.length} of ${matching} matching calls${before ? " (older page)" : ", newest first"}`}
        </p>
        <LogsFilter
          groups={[
            {
              label: "Status",
              current: status ?? "all",
              options: statusesPresent.length
                ? [
                    { value: "all", label: "All", count: 0, href: filterHref({ status: "all" }) },
                    ...statusesPresent.map(([s, n]) => ({
                      value: s,
                      label: STATUS_LABEL[s] ?? s,
                      count: n,
                      href: filterHref({ status: s }),
                    })),
                  ]
                : [],
            },
            {
              label: "Kind",
              current: kind ?? "all",
              options: kindsPresent.length
                ? [
                    { value: "all", label: "All", count: 0, href: filterHref({ kind: "all" }) },
                    ...kindsPresent.map(([k, n]) => ({
                      value: k,
                      label: KIND_LABEL[k] ?? k,
                      count: n,
                      href: filterHref({ kind: k }),
                    })),
                  ]
                : [],
            },
          ]}
          chips={[
            ...(status && status !== "all"
              ? [{ label: STATUS_LABEL[status] ?? status, removeHref: filterHref({ status: "all" }) }]
              : []),
            ...(kind && kind !== "all"
              ? [{ label: KIND_LABEL[kind] ?? kind, removeHref: filterHref({ kind: "all" }) }]
              : []),
            ...(participant
              ? [{ label: `Participant ${participant.slice(0, 8)}`, removeHref: filterHref({ participant: undefined }) }]
              : []),
          ]}
        />
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
                    {STATUS_LABEL[row.status] ?? row.status}
                  </span>
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    {KIND_LABEL[row.call_kind] ?? row.call_kind}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(row.created_at)}
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

      {(before || olderCursor) && (
        <nav className="flex items-center justify-between text-xs">
          {before ? (
            <Link
              href={filterHref({})}
              className="rounded border border-border bg-card px-2 py-1 hover:bg-accent"
            >
              ← Newest
            </Link>
          ) : (
            <span />
          )}
          {olderCursor && (
            <Link
              href={filterHref({ before: olderCursor })}
              className="rounded border border-border bg-card px-2 py-1 hover:bg-accent"
            >
              Older →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
