import type { MessageParam, Tool } from "@anthropic-ai/sdk/resources/messages";

import { SESSION_SETUP_GUIDE } from "@/lib/prompts/session-setup";

export type SessionDraft = {
  code: string;
  topic: string;
  intro_message?: string;
  context?: string;
  instructions?: string;
  prompt_summary_system?: string;
};

export type BuilderMessage = {
  role: "user" | "assistant";
  content: string;
  // Set on an assistant message whose turn ended by proposing a draft.
  draft?: SessionDraft;
};


export const SESSION_BUILDER_SYSTEM = `${SESSION_SETUP_GUIDE}

You are in the Tejido admin page. You can't create the session yourself. When you have a draft, call propose_session: the organizer sees it as an editable form with a Create button. To revise, call propose_session again with the full updated draft. Keep your chat messages short.`;

export const PROPOSE_TOOL: Tool = {
  name: "propose_session",
  description: "Show the organizer a full session draft they can edit and create.",
  input_schema: {
    type: "object",
    properties: {
      code: { type: "string", description: "Lowercase letters, digits, - and _" },
      topic: { type: "string" },
      intro_message: { type: "string" },
      context: { type: "string" },
      instructions: { type: "string" },
      prompt_summary_system: { type: "string" },
    },
    required: ["code", "topic", "intro_message", "instructions"],
  },
};

// Each draft the model proposed was a tool_use; the API needs it paired with a
// tool_result at the start of the next user turn. The result carries the
// panel's current draft so the model sees any edits the organizer made.
export function toApiMessages(messages: BuilderMessage[], currentDraft: SessionDraft | null) {
  const out: MessageParam[] = [];
  let pendingToolId: string | null = null;
  messages.forEach((m, i) => {
    if (m.role === "assistant") {
      const content: MessageParam["content"] = [];
      if (m.content) content.push({ type: "text", text: m.content });
      if (m.draft) {
        pendingToolId = `draft_${i}`;
        content.push({
          type: "tool_use",
          id: pendingToolId,
          name: PROPOSE_TOOL.name,
          input: m.draft,
        });
      }
      out.push({ role: "assistant", content });
      return;
    }
    if (pendingToolId) {
      const isLatest = !messages.slice(i).some((n) => n.draft);
      const shown = isLatest && currentDraft ? currentDraft : null;
      out.push({
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: pendingToolId,
            content: shown
              ? `Draft shown. The panel now holds (with any organizer edits):\n${JSON.stringify(shown, null, 2)}`
              : "Draft shown to the organizer.",
          },
          { type: "text", text: m.content },
        ],
      });
      pendingToolId = null;
      return;
    }
    out.push({ role: "user", content: m.content });
  });
  return out;
}
