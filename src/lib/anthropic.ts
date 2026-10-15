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

// Haiku for the live conversation: measured on real transcripts (2026-10-12),
// first word ~0.7s vs ~1.3s on Opus 5, full reply ~1.7s vs ~2.1s.
export const FACILITATOR_MODEL = "claude-haiku-5-5";
// Unused — nothing imports this. Kept in step with the others so it isn't a
// stale trap if something starts using it; delete it if extraction stays folded
// into the clustering pass.
export const EXTRACTION_MODEL = "claude-opus-5-5";
export const CLUSTERING_MODEL = "claude-opus-5-5";
// Admin-only and low volume; drafting a good session is worth the bigger model.
export const SESSION_BUILDER_MODEL = "claude-opus-5-5";
// Mechanical, well-specified, high-volume-if-it-ever-grows.
export const TRANSLATION_MODEL = "claude-haiku-5-5";
