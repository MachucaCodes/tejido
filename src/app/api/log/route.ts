import { createAdmin } from "@/lib/supabase/admin";
import { createClient as createServer } from "@/lib/supabase/server";

type Event = {
  kind?: unknown;
  data?: unknown;
  client_ts?: unknown;
  session_code?: unknown;
  participant_id?: unknown;
};

type Body = { events?: unknown; client_id?: unknown };

const MAX_EVENTS_PER_REQUEST = 100;
const MAX_DATA_BYTES = 8192;

function coerceString(v: unknown, max = 200): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.slice(0, max);
  return trimmed.length > 0 ? trimmed : null;
}

function coerceUuid(v: unknown): string | null {
  if (typeof v !== "string") return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
    ? v
    : null;
}

function coerceTimestamp(v: unknown): string {
  if (typeof v === "string" && !Number.isNaN(Date.parse(v))) return v;
  return new Date().toISOString();
}

// Fire-and-forget client diagnostics. Never blocks or 500s the caller —
// observability must not break the user flow. Auth lookup is best-effort
// so pre-OTP events still log (user_id null), then admin client writes.
export async function POST(req: Request) {
  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    return new Response(null, { status: 204 });
  }

  const events = Array.isArray(body.events)
    ? (body.events as Event[]).slice(0, MAX_EVENTS_PER_REQUEST)
    : [];
  if (events.length === 0) return new Response(null, { status: 204 });

  const clientId = coerceUuid(body.client_id);

  let userId: string | null = null;
  try {
    const supabase = await createServer();
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    // Auth check failed (no cookie, expired, etc.) — log anonymously.
  }

  const rows = events
    .map((evt) => {
      const kind = coerceString(evt.kind, 100);
      if (!kind) return null;
      let data: unknown = evt.data ?? null;
      if (data !== null) {
        try {
          const serialized = JSON.stringify(data);
          if (serialized.length > MAX_DATA_BYTES) {
            data = { truncated: true, bytes: serialized.length };
          }
        } catch {
          data = { unserializable: true };
        }
      }
      return {
        client_ts: coerceTimestamp(evt.client_ts),
        client_id: clientId,
        session_code: coerceString(evt.session_code, 100),
        participant_id: coerceUuid(evt.participant_id),
        user_id: userId,
        kind,
        data,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (rows.length === 0) return new Response(null, { status: 204 });

  const admin = createAdmin();
  const { error } = await admin.from("client_events").insert(rows);
  if (error) {
    console.error("[client-events] insert failed:", error.message);
  }

  return new Response(null, { status: 204 });
}
