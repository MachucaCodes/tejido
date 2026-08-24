import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { headers } from "next/headers";
import { after } from "next/server";
import { z } from "zod";

import { verifyMcpToken } from "@/lib/mcp-auth";
import { ANALYSIS_PROMPT_PLACEHOLDERS } from "@/lib/prompts/analysis";
import { PERSPECTIVES_PLACEHOLDER } from "@/lib/prompts/facilitator";
import { SUMMARY_PROMPT_PLACEHOLDERS } from "@/lib/prompts/summary";
import { CODE_RE, renameSession } from "@/lib/rename-session";
import { createAdmin } from "@/lib/supabase/admin";
import {
  backfillSessionTranslation,
  staleSpanishFields,
} from "@/lib/translate-session";

function text(s: string) {
  return { content: [{ type: "text" as const, text: s }] };
}

// The facilitator/analysis prompts every session inherits from code. A session
// row only stores a value here when the setup deliberately overrides it, so a
// null column means "using the built-in default", not "unset".
const PROMPT_FIELDS = [
  "prompt_task_framing",
  "prompt_mechanics",
  "prompt_pacing",
  "prompt_perspectives_instructions",
  "prompt_analysis_system",
  "prompt_analysis_prompt",
  "prompt_summary_system",
  "prompt_summary_prompt",
] as const;
type PromptField = (typeof PROMPT_FIELDS)[number];

// Three of the overrides are templates whose placeholders get .replace()d with
// the topic/transcript/themes at render time. A template missing one silently
// drops that data instead of failing, so reject it up front — same rule the
// admin PATCH route enforces.
const TEMPLATE_PLACEHOLDERS: Partial<Record<PromptField, readonly string[]>> = {
  prompt_perspectives_instructions: [PERSPECTIVES_PLACEHOLDER],
  prompt_analysis_prompt: ANALYSIS_PROMPT_PLACEHOLDERS,
  prompt_summary_prompt: SUMMARY_PROMPT_PLACEHOLDERS,
};

const PROMPT_INPUT_SCHEMA = {
  prompt_task_framing: z
    .string()
    .optional()
    .describe("Override the facilitator's role framing. Empty string restores the default."),
  prompt_mechanics: z
    .string()
    .optional()
    .describe("Override the facilitator's approach/tone/structure block."),
  prompt_pacing: z.string().optional().describe("Override the conversation pacing target."),
  prompt_perspectives_instructions: z
    .string()
    .optional()
    .describe(`Override how cross-participant themes are used. Must contain ${PERSPECTIVES_PLACEHOLDER}.`),
  prompt_analysis_system: z
    .string()
    .optional()
    .describe("Override the system prompt for point extraction / theming."),
  prompt_analysis_prompt: z
    .string()
    .optional()
    .describe(`Override the analysis template. Must contain ${ANALYSIS_PROMPT_PLACEHOLDERS.join(" ")}.`),
  prompt_summary_system: z
    .string()
    .optional()
    .describe("Override the system prompt for the session summary."),
  prompt_summary_prompt: z
    .string()
    .optional()
    .describe(`Override the summary template. Must contain ${SUMMARY_PROMPT_PLACEHOLDERS.join(" ")}.`),
};

type PromptArgs = Partial<Record<PromptField, string | undefined>>;

// Fold any supplied prompt overrides into `update`. Trimmed-empty clears the
// override (back to the code default); templates are placeholder-checked.
function applyPromptOverrides(
  args: PromptArgs,
  update: Record<string, unknown>,
): string | null {
  for (const field of PROMPT_FIELDS) {
    const raw = args[field];
    if (typeof raw !== "string") continue;
    const value = raw.trim();
    if (!value) {
      update[field] = null;
      continue;
    }
    const required = TEMPLATE_PLACEHOLDERS[field];
    if (required) {
      const missing = required.filter((p) => !value.includes(p));
      if (missing.length) {
        return `Error: ${field} is missing required placeholder(s): ${missing.join(", ")}`;
      }
    }
    update[field] = value;
  }
  return null;
}

// Public origin of this deployment, from the proxy-forwarded host headers, so
// tool output can carry clickable absolute URLs.
async function publicOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "create_session",
      {
        title: "Create session",
        description:
          "Create a new Tejido deliberation session. Participants join at /s/<code>.",
        inputSchema: {
          code: z
            .string()
            .regex(CODE_RE, "lowercase letters, digits, - and _; max 63 chars")
            .describe("Unique session code, used in the join URL (/s/<code>)"),
          topic: z.string().min(1).describe("The question or topic the group deliberates on"),
          intro_message: z
            .string()
            .optional()
            .describe("Optional custom first message participants see"),
          context: z
            .string()
            .optional()
            .describe("Optional background context given to the facilitator"),
          instructions: z
            .string()
            .optional()
            .describe("Optional extra instructions for the facilitator"),
          ...PROMPT_INPUT_SCHEMA,
        },
      },
      async ({ code, topic, intro_message, context, instructions, ...prompts }, extra) => {
        const userId = extra.authInfo?.extra?.userId as string | undefined;
        if (!userId) return text("Error: unauthenticated");

        const trimmedTopic = topic.trim();
        const trimmedIntro = intro_message?.trim() || null;
        const row: Record<string, unknown> = {
          id: code,
          topic: trimmedTopic,
          intro_message: trimmedIntro,
          context: context?.trim() || null,
          instructions: instructions?.trim() || null,
          created_by: userId,
        };
        const promptError = applyPromptOverrides(prompts, row);
        if (promptError) return text(promptError);

        const admin = createAdmin();
        const { error } = await admin.from("sessions").insert(row);
        if (error) {
          return text(
            error.code === "23505"
              ? `Error: code "${code}" is already taken`
              : `Error: ${error.message}`,
          );
        }
        after(() =>
          backfillSessionTranslation(
            code,
            { topic: trimmedTopic, intro_message: trimmedIntro },
            { topic: true, intro_message: Boolean(trimmedIntro) },
          ),
        );

        const origin = await publicOrigin();
        return text(
          `Session "${code}" created.\nJoin link: ${origin}/s/${code}\nAdmin view: ${origin}/admin/sessions/${code}`,
        );
      },
    );

    server.registerTool(
      "list_sessions",
      {
        title: "List sessions",
        description:
          "List Tejido sessions, newest first. Archived sessions are excluded unless you ask for them. Returns an overview only — use get_session for a session's full configuration.",
        inputSchema: {
          status: z
            .enum(["open", "closed"])
            .optional()
            .describe("Filter by status; omit for all"),
          archived: z
            .enum(["exclude", "include", "only"])
            .optional()
            .describe("Archived sessions: exclude (default), include, or only"),
          limit: z.number().int().min(1).max(100).optional().describe("Max rows, default 25"),
        },
      },
      async ({ status, archived, limit }) => {
        const admin = createAdmin();
        let q = admin
          .from("sessions")
          .select("id, topic, status, created_at, archived_at")
          .order("created_at", { ascending: false })
          .limit(limit ?? 25);
        if (status) q = q.eq("status", status);
        if (archived === "only") q = q.not("archived_at", "is", null);
        else if (archived !== "include") q = q.is("archived_at", null);
        const { data, error } = await q;
        if (error) return text(`Error: ${error.message}`);
        return text(JSON.stringify(data, null, 2));
      },
    );

    server.registerTool(
      "get_session",
      {
        title: "Get session",
        description:
          "Read one session's full configuration: topic, status, intro message, context, facilitator instructions, every prompt override, and its links. Use this before editing or cloning a session.",
        inputSchema: {
          code: z.string().describe("Session code"),
        },
      },
      async ({ code }) => {
        const admin = createAdmin();
        const { data, error } = await admin
          .from("sessions")
          .select("*")
          .eq("id", code)
          .maybeSingle();
        if (error) return text(`Error: ${error.message}`);
        if (!data) return text(`Error: no session with code "${code}"`);

        const { count } = await admin
          .from("participants")
          .select("id", { count: "exact", head: true })
          .eq("session_id", code);

        const origin = await publicOrigin();
        // Split the prompt columns out: nulls there mean "inherits the built-in
        // default", which reads as missing data if left inline with the config.
        const overrides: Record<string, string> = {};
        const defaults: string[] = [];
        for (const field of PROMPT_FIELDS) {
          const value = data[field] as string | null;
          if (value) overrides[field] = value;
          else defaults.push(field);
        }

        return text(
          JSON.stringify(
            {
              id: data.id,
              topic: data.topic,
              status: data.status,
              archived: Boolean(data.archived_at),
              archived_at: data.archived_at,
              created_at: data.created_at,
              intro_message: data.intro_message,
              context: data.context,
              instructions: data.instructions,
              participant_count: count ?? 0,
              join_url: `${origin}/s/${data.id}`,
              admin_url: `${origin}/admin/sessions/${data.id}`,
              summary_generated_at: data.summary_generated_at,
              summary_text: data.summary_text,
              prompt_overrides: overrides,
              prompts_using_defaults: defaults,
            },
            null,
            2,
          ),
        );
      },
    );

    server.registerTool(
      "update_session",
      {
        title: "Update session",
        description:
          "Update a session's code, topic, status, facilitator setup, or prompt overrides. Only the fields you pass change. Pass an empty string to clear an optional field or restore a prompt default.",
        inputSchema: {
          code: z.string().describe("Session code"),
          new_code: z
            .string()
            .regex(CODE_RE, "lowercase letters, digits, - and _; max 63 chars")
            .optional()
            .describe(
              "Rename the session to this code. Participants and their answers move with it, but existing /s/<old-code> links stop working.",
            ),
          topic: z.string().optional().describe("New topic (cannot be empty)"),
          status: z.enum(["open", "closed"]).optional().describe("Open or close the session"),
          archived: z
            .boolean()
            .optional()
            .describe(
              "Archive (true) or un-archive (false). Archiving hides the session from the front-end and makes it read-only. It never deletes anything — responses, transcripts and themes are kept, and it is fully reversible.",
            ),
          intro_message: z.string().optional(),
          context: z.string().optional(),
          instructions: z.string().optional(),
          ...PROMPT_INPUT_SCHEMA,
        },
      },
      async ({
        code,
        new_code,
        topic,
        status,
        archived,
        intro_message,
        context,
        instructions,
        ...prompts
      }) => {
        const update: Record<string, unknown> = {};
        if (typeof topic === "string") {
          const t = topic.trim();
          if (!t) return text("Error: topic cannot be empty");
          update.topic = t;
        }
        if (status) update.status = status;
        if (typeof archived === "boolean") {
          update.archived_at = archived ? new Date().toISOString() : null;
        }
        if (typeof intro_message === "string") update.intro_message = intro_message.trim() || null;
        if (typeof context === "string") update.context = context.trim() || null;
        if (typeof instructions === "string") update.instructions = instructions.trim() || null;
        const promptError = applyPromptOverrides(prompts, update);
        if (promptError) return text(promptError);

        const renameTo =
          typeof new_code === "string" && new_code !== code ? new_code : null;
        if (Object.keys(update).length === 0 && !renameTo) {
          return text("Error: no fields to update");
        }

        const changed = Object.keys(update);
        let stale = { topic: false, intro_message: false };
        if (changed.length) {
          const admin = createAdmin();

          // Clear any Spanish this edit invalidates in the same write, so the
          // room falls back to English rather than showing a translation of
          // copy that no longer exists.
          const { data: previous } = await admin
            .from("sessions")
            .select("topic, intro_message")
            .eq("id", code)
            .maybeSingle();
          if (previous) {
            stale = staleSpanishFields(previous, {
              topic: update.topic as string | undefined,
              intro_message: update.intro_message as string | null | undefined,
            });
            if (stale.topic) update.topic_es = null;
            if (stale.intro_message) update.intro_message_es = null;
          }

          const { data, error } = await admin
            .from("sessions")
            .update(update)
            .eq("id", code)
            .select("id");
          if (error) return text(`Error: ${error.message}`);
          if (!data?.length) return text(`Error: no session with code "${code}"`);
        }

        // Rename last — a rejected code doesn't discard the other edits, which
        // are already saved under the old code.
        if (renameTo) {
          const result = await renameSession(code, renameTo);
          if (!result.ok) return text(`Error: ${result.error}`);
          changed.push("code");
        }

        // Keyed to the post-rename code — the row has already moved.
        if (stale.topic || stale.intro_message) {
          const finalCode = renameTo ?? code;
          after(() =>
            backfillSessionTranslation(
              finalCode,
              {
                topic: update.topic as string | undefined,
                intro_message: update.intro_message as string | null | undefined,
              },
              stale,
            ),
          );
        }

        if (!renameTo) {
          return text(`Session "${code}" updated: ${changed.join(", ")}.`);
        }
        const origin = await publicOrigin();
        return text(
          `Session "${renameTo}" updated: ${changed.join(", ")}.\n` +
            `Renamed from "${code}" — old /s/${code} links no longer work.\n` +
            `Join link: ${origin}/s/${renameTo}\n` +
            `Admin view: ${origin}/admin/sessions/${renameTo}`,
        );
      },
    );
  },
  {
    serverInfo: { name: "tejido", version: "1.0.0" },
  },
  {
    basePath: "/api",
    maxDuration: 60,
    disableSse: true,
  },
);

const authHandler = withMcpAuth(handler, verifyMcpToken, {
  required: true,
  resourceMetadataPath: "/.well-known/oauth-protected-resource",
});

export { authHandler as GET, authHandler as POST, authHandler as DELETE };
