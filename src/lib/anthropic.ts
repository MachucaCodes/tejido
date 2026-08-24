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

export const FACILITATOR_MODEL = "claude-opus-5";
// Unused — nothing imports this. Kept in step with the others so it isn't a
// stale trap if something starts using it; delete it if extraction stays folded
// into the clustering pass.
export const EXTRACTION_MODEL = "claude-opus-5";
export const CLUSTERING_MODEL = "claude-opus-5";
// Mechanical, well-specified, high-volume-if-it-ever-grows. Note that Haiku 4.5
// rejects `output_config.effort` — see translate-session.ts.
export const TRANSLATION_MODEL = "claude-haiku-4-5";
