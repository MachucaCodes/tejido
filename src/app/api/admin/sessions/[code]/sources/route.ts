import { z } from "zod";

import { requireOrganizer } from "@/lib/admin-guard";
import { CLUSTERING_MODEL, getAnthropic } from "@/lib/anthropic";
import { createAdmin } from "@/lib/supabase/admin";
import { voiceLabels } from "@/lib/voice-labels";

export const maxDuration = 120;

const SYSTEM =
  "You trace lines in a written summary of a group conversation back to the participant answers they came from.";

const ResultSchema = z.object({
  matches: z.array(z.object({ n: z.number().int(), why: z.string() })),
});

const RESULT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["matches"],
  properties: {
    matches: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["n", "why"],
        properties: {
          n: { type: "integer" },
          why: { type: "string" },
        },
      },
    },
  },
} as const;

type PointRow = {
  id: string;
  participant_id: string;
  surface_phrase: string | null;
  want: string | null;
  context: string | null;
  created_at: string;
};

// Given a line from a summary, find the answers it most likely came from.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const guard = await requireOrganizer();
  if (!guard.ok) return new Response("unauthenticated", { status: 401 });

  const { code } = await params;
  const admin = createAdmin();

  // Admins can look into any session; everyone else only the ones they created.
  if (!guard.isAdmin) {
    const { data: owned } = await admin
      .from("sessions")
      .select("id")
      .eq("id", code)
      .eq("created_by", guard.user.id)
      .maybeSingle();
    if (!owned) return new Response("not your session", { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as { line?: unknown } | null;
  const line = typeof body?.line === "string" ? body.line.trim() : "";
  if (!line) return new Response("paste a line from a summary", { status: 400 });
  if (line.length > 2000) return new Response("line too long", { status: 400 });

  const { data: pointRows } = await admin
    .from("extracted_points")
    .select(
      "id, participant_id, surface_phrase, want, context, created_at, participants!inner(session_id)",
    )
    .eq("participants.session_id", code)
    .order("created_at", { ascending: true })
    .range(0, 9999);

  const points = (pointRows ?? []).filter(
    (p) => p.participant_id && p.surface_phrase?.trim(),
  ) as PointRow[];
  if (points.length === 0) return Response.json({ matches: [] });

  const labels = voiceLabels(points);

  // Number the answers so the model returns short ids instead of UUIDs.
  const listing = points
    .map((p, i) => {
      const extra = [
        p.want && `wants: ${p.want}`,
        p.context && `context: ${p.context}`,
      ]
        .filter(Boolean)
        .join("; ");
      return `[${i + 1}] "${p.surface_phrase!.trim()}"${extra ? ` (${extra})` : ""}`;
    })
    .join("\n");

  const prompt = `This line comes from a summary of a group conversation:

"${line}"

Here is every answer people gave, numbered:

${listing}

Which answers is this line most likely drawing on? Include every answer that clearly feeds a part of the line, and skip ones that only loosely fit. For each, say in a few words which part of the line it supports. Order them from strongest match to weakest. If nothing fits, return an empty list.`;

  let response;
  try {
    response = await getAnthropic().messages.create({
      model: CLUSTERING_MODEL,
      max_tokens: 4000,
      system: SYSTEM,
      messages: [{ role: "user", content: prompt }],
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: RESULT_JSON_SCHEMA },
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(message, { status: 500 });
  }
  if (response.stop_reason === "refusal") {
    return new Response("model refused", { status: 500 });
  }

  const text = response.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("");
  let parsed;
  try {
    parsed = ResultSchema.parse(JSON.parse(text));
  } catch {
    return new Response("couldn't read the model's answer", { status: 500 });
  }

  const seen = new Set<number>();
  const matches = parsed.matches
    .filter((m) => m.n >= 1 && m.n <= points.length && !seen.has(m.n) && seen.add(m.n))
    .map((m) => {
      const p = points[m.n - 1];
      return {
        id: p.id,
        voice: labels.get(p.participant_id) ?? "Voice ?",
        phrase: p.surface_phrase!.trim(),
        at: p.created_at,
        why: m.why,
      };
    });

  return Response.json({ matches });
}
