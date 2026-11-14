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
// form's current values so the model sees any edits the organizer made.
// Before any draft, what the organizer typed into the form rides along with
// their latest message instead.
export function toApiMessages(messages: BuilderMessage[], currentDraft: SessionDraft | null) {
  const out: MessageParam[] = [];
  let pendingToolId: string | null = null;
  const everDrafted = messages.some((m) => m.draft);
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
      // An empty reply (a failed turn) is not a valid assistant turn.
      if (content.length) out.push({ role: "assistant", content });
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
              ? `Draft shown. The form now holds (with any organizer edits):\n${JSON.stringify(shown, null, 2)}`
              : "Draft shown to the organizer.",
          },
          { type: "text", text: m.content },
        ],
      });
      pendingToolId = null;
      return;
    }
    if (!everDrafted && currentDraft && i === messages.length - 1) {
      out.push({
        role: "user",
        content: [
          {
            type: "text",
            text: `The organizer has typed this into the form so far:\n${JSON.stringify(currentDraft, null, 2)}`,
          },
          { type: "text", text: m.content },
        ],
      });
      return;
    }
    out.push({ role: "user", content: m.content });
  });
  return out;
}
