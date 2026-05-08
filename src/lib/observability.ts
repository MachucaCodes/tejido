import type { Message, MessageParam } from "@anthropic-ai/sdk/resources/messages";

import { createAdmin } from "@/lib/supabase/admin";

export type LlmCallKind =
  | "facilitator_turn"
  | "extract_points"
  | "cluster_points"
  | "analyze_participant"
  | "summarize_session";

export type LlmCallStatus =
  | "success"
  | "error"
  | "parse_error"
  | "stream_aborted"
  | "refusal";

type Common = {
  kind: LlmCallKind;
  model: string;
  duration_ms: number;
  session_id?: string | null;
  participant_id?: string | null;
  turn_id?: number | null;
  system_prompt?: string | null;
  request_messages?: MessageParam[] | null;
  request_params?: Record<string, unknown> | null;
};

export type LlmCallLogInput =
  | (Common & {
      status: "success";
      raw_response: Message;
      parsed_output?: unknown;
    })
  | (Common & {
      status: "error";
      error_message: string;
      raw_response?: Message | null;
      raw_response_text?: string | null;
    })
  | (Common & {
      status: "parse_error";
      error_message: string;
      raw_response?: Message | null;
      raw_response_text: string;
    })
  | (Common & {
      status: "stream_aborted";
      error_message: string;
      raw_response_text?: string | null;
    })
  | (Common & {
      status: "refusal";
      raw_response: Message;
    });

function usageFrom(msg: Message | null | undefined) {
  const u = (msg?.usage ?? {}) as {
    input_tokens?: number;
    output_tokens?: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
  return {
    input_tokens: u.input_tokens ?? null,
    output_tokens: u.output_tokens ?? null,
    cache_read_tokens: u.cache_read_input_tokens ?? null,
    cache_creation_tokens: u.cache_creation_input_tokens ?? null,
    stop_reason: msg?.stop_reason ?? null,
  };
}

/**
 * Persist one LLM-call observation. Failures are swallowed and logged — observability
 * must never break the request path.
 */
export async function logLlmCall(input: LlmCallLogInput): Promise<void> {
  const admin = createAdmin();

  const finalMsg =
    input.status === "success" || input.status === "refusal"
      ? input.raw_response
      : "raw_response" in input
        ? (input.raw_response ?? null)
        : null;

  const row = {
    call_kind: input.kind,
    model: input.model,
    duration_ms: input.duration_ms,
    session_id: input.session_id ?? null,
    participant_id: input.participant_id ?? null,
    turn_id: input.turn_id ?? null,
    system_prompt: input.system_prompt ?? null,
    request_messages: input.request_messages ?? null,
    request_params: input.request_params ?? null,
    status: input.status,
    raw_response: finalMsg ? (finalMsg as unknown as object) : null,
    raw_response_text:
      "raw_response_text" in input ? (input.raw_response_text ?? null) : null,
    parsed_output:
      input.status === "success" ? (input.parsed_output ?? null) : null,
    error_message: "error_message" in input ? input.error_message : null,
    ...usageFrom(finalMsg),
  };

  const { error } = await admin.from("llm_call_logs").insert(row);
  if (error) {
    console.error("[observability] failed to insert llm_call_logs row:", error.message);
  }
}
