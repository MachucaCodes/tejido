import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { headers } from "next/headers";
import { z } from "zod";

import { verifyMcpToken } from "@/lib/mcp-auth";
import { createAdmin } from "@/lib/supabase/admin";

const CODE_RE = /^[a-z0-9][a-z0-9_-]{0,62}$/;

function text(s: string) {
  return { content: [{ type: "text" as const, text: s }] };
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
        },
      },
      async ({ code, topic, intro_message, context, instructions }, extra) => {
        const userId = extra.authInfo?.extra?.userId as string | undefined;
        if (!userId) return text("Error: unauthenticated");

        const admin = createAdmin();
        const { error } = await admin.from("sessions").insert({
          id: code,
          topic: topic.trim(),
          intro_message: intro_message?.trim() || null,
          context: context?.trim() || null,
          instructions: instructions?.trim() || null,
          created_by: userId,
        });
        if (error) {
          return text(
            error.code === "23505"
              ? `Error: code "${code}" is already taken`
              : `Error: ${error.message}`,
          );
        }
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
        description: "List Tejido sessions, newest first.",
        inputSchema: {
          status: z
            .enum(["open", "closed"])
            .optional()
            .describe("Filter by status; omit for all"),
          limit: z.number().int().min(1).max(100).optional().describe("Max rows, default 25"),
        },
      },
      async ({ status, limit }) => {
        const admin = createAdmin();
        let q = admin
          .from("sessions")
          .select("id, topic, status, created_at")
          .order("created_at", { ascending: false })
          .limit(limit ?? 25);
        if (status) q = q.eq("status", status);
        const { data, error } = await q;
        if (error) return text(`Error: ${error.message}`);
        return text(JSON.stringify(data, null, 2));
      },
    );

    server.registerTool(
      "update_session",
      {
        title: "Update session",
        description:
          "Update a session's topic, status, or facilitator setup. Pass an empty string to clear an optional field.",
        inputSchema: {
          code: z.string().describe("Session code"),
          topic: z.string().optional().describe("New topic (cannot be empty)"),
          status: z.enum(["open", "closed"]).optional().describe("Open or close the session"),
          intro_message: z.string().optional(),
          context: z.string().optional(),
          instructions: z.string().optional(),
        },
      },
      async ({ code, topic, status, intro_message, context, instructions }) => {
        const update: Record<string, unknown> = {};
        if (typeof topic === "string") {
          const t = topic.trim();
          if (!t) return text("Error: topic cannot be empty");
          update.topic = t;
        }
        if (status) update.status = status;
        if (typeof intro_message === "string") update.intro_message = intro_message.trim() || null;
        if (typeof context === "string") update.context = context.trim() || null;
        if (typeof instructions === "string") update.instructions = instructions.trim() || null;
        if (Object.keys(update).length === 0) return text("Error: no fields to update");

        const admin = createAdmin();
        const { data, error } = await admin
          .from("sessions")
          .update(update)
          .eq("id", code)
          .select("id");
        if (error) return text(`Error: ${error.message}`);
        if (!data?.length) return text(`Error: no session with code "${code}"`);
        return text(`Session "${code}" updated.`);
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
