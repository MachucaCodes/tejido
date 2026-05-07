const EXTRACTION_PROMPT = `You are reviewing a transcript of a facilitated conversation. Your job is to identify the 3-5 main things the participant brought to this conversation — but at the level of WHAT THEY ACTUALLY WANT, FEAR, OR NEED UNDERNEATH THE SURFACE, not at the level of what they explicitly proposed.

This distinction matters. People often state a position ("I want exclusive neighborhood access to the pool") that is one possible solution to a more specific underlying want ("quiet morning swims without it being crowded"). Two people can hold the same position for completely different underlying reasons; two people with the same underlying want can propose opposite solutions. The level of underlying wants is where common ground gets found.

TRANSCRIPT:
{TRANSCRIPT}

Extract between 3 and 5 points. Each point is a structured object:

- surface_phrase: A short quote from the participant that prompted this point — in their voice, but with personally-identifying detail redacted. ALWAYS present.

PII REDACTION RULES — APPLY TO ALL OUTPUT FIELDS. The output will be shown to the rest of the group without a name attached. It must be safe to show without identifying the speaker.
  - Replace specific places with generic ones: "San Francisco" → "this city", "the Mission" → "my neighborhood".
  - Replace specific family compositions with generic ones: "my two kids, 4 and 7" → "my kids".
  - Replace identifying professions or roles with generic equivalents only when the exact role would identify them in a small group.
  - Replace tenure / duration that pegs them to a specific person.
  - Replace named individuals with generic references: "Edward said..." → "someone said..."
  - Preserve the FEELING and the VOICE in surface_phrase. Don't sterilize it into corporate-speak.
  - When in doubt, redact.

- want: A one-sentence statement of what the participant fundamentally wants, fears, or needs at this point in the conversation. Plain human terms.
  CRITICAL: If the participant only ever stated a position and the conversation did NOT surface what's underneath, leave this empty. Do not invent the underlying interest from the position alone.

- context: The lived situation that produced this want, drawn from what they actually shared. Empty string if not stated.

- rationale: Why this matters to THEM in particular. Usually a single sentence. Empty string if not stated.

- doubts: A list of 0-3 tensions or worries the participant is holding EVEN WITHIN this want. Empty list if not stated.

Each point should:
- Be distinct from the others (no two points sharing the same underlying want)
- Use the participant's language where possible — paraphrase only for clarity
- Be grounded in the transcript: if a field wasn't surfaced, leave it empty

Do NOT include:
- Small talk or meta-comments about the conversation itself
- Things the participant explicitly retracted or walked back
- Generic value-framings ("they value community") not actually expressed
- Underlying wants you inferred from a position without supporting evidence

Output a JSON array of 3-5 objects with keys: surface_phrase, want, context, rationale, doubts. Output ONLY the JSON array, no other text.`;

export function renderExtractionPrompt(transcript: string): string {
  return EXTRACTION_PROMPT.replace("{TRANSCRIPT}", transcript);
}
