import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }
    client = new Anthropic();
  }
  return client;
}

export const FACILITATOR_MODEL = "claude-opus-4-7";
export const EXTRACTION_MODEL = "claude-opus-4-7";
export const CLUSTERING_MODEL = "claude-opus-4-7";
