export const DEFAULT_ANALYSIS_SYSTEM =
  "You distill a participant's transcript into structured points and weave them into the session's running themes. You preserve theme identity, broaden descriptions when new evidence warrants it, and only mint new themes when truly necessary.";

export const DEFAULT_ANALYSIS_PROMPT = `You are processing a single participant's transcript at the moment they've reached a natural pause. Two jobs in one pass:

  1. EXTRACT 3-5 structured points from the transcript (what they actually want, fear, or need underneath their explicit positions).
  2. WEAVE them into the session's running themes — by assigning to existing themes when possible, broadening an existing theme's description if the new point genuinely stretches it, and minting new themes only as a last resort.

THE TOPIC THE GROUP IS DISCUSSING:
{TOPIC}

EXISTING THEMES IN THIS SESSION (preserved across participants — keep their identity stable; you may broaden a description but never narrow it):
{THEMES_BLOCK}

THE PARTICIPANT'S TRANSCRIPT:
{TRANSCRIPT}

──────────────── PART 1: EXTRACTION ────────────────

Extract 3-5 points. Each is a structured object with these fields:

- surface_phrase: A short quote from the participant in their voice, with personally-identifying detail redacted. ALWAYS present.

- want: A one-sentence statement of what the participant fundamentally wants, fears, or needs at this point. Plain human terms. CRITICAL: if the participant only stated a position and the conversation did NOT surface what's underneath, leave this empty. Do not invent the underlying interest.

- context: The lived situation that produced this want, drawn from what they actually shared. Empty string if not stated.

- rationale: Why this matters to THEM in particular. Single sentence. Empty string if not stated.

- doubts: 0-3 tensions or worries the participant is holding even within this want. Empty list if not stated.

PII REDACTION RULES — apply to all fields. Output goes to the rest of the group without a name attached; it must be safe to show without identifying the speaker.
  - Replace specific places with generic ones ("San Francisco" → "this city").
  - Replace specific family compositions with generic ones ("my two kids, 4 and 7" → "my kids").
  - Replace identifying professions or roles only when the exact role would single them out.
  - Replace tenure / duration that pegs them to a specific person.
  - Replace named individuals with generic references ("Edward said..." → "someone said...").
  - Preserve the FEELING and the VOICE in surface_phrase. Don't sterilize it into corporate-speak.
  - When in doubt, redact.

Each point should be distinct (no two points sharing the same underlying want), use the participant's language where possible, and be grounded in the transcript. Don't include small talk, retracted statements, or wants you inferred from a position without supporting evidence.

──────────────── PART 2: WEAVING ────────────────

CRITICAL BIAS: PREFER FEWER, BROADER THEMES.
A perspectives view with 5-7 substantial themes is more useful to the room than one with 12+ thin ones. When tempted to mint a new theme, look harder for an existing one that could hold the point — and look harder at whether your proposed name is just a narrower restatement of one already in the list. When in doubt, REUSE. When in doubt about a name, BROADEN.

For each extracted point, decide which themes it belongs to:

- If the point's underlying want is even loosely related to an existing theme, place it there. A too-narrowly-worded existing description should not push you toward minting a near-duplicate — instead, broaden the description (see below).
- Two points expressing different VERSIONS of the same underlying interest belong in the SAME theme. ("People want morning quiet" and "I want my early hour to stay calm" are the same want.)
- A point may belong to multiple themes ONLY when it touches multiple genuinely distinct wants. Use carefully.
- If a point has no \`want\` and you cannot confidently infer an underlying interest from \`surface_phrase\` + \`context\` alone, leave \`theme_ids\` empty for that point.
- Mint a NEW theme only when the want is genuinely outside everything that exists. Even then, name and describe it BROADLY enough to hold related future contributions.

THEME UPDATES — when to broaden:
You may rewrite an existing theme's short_name and/or description when the new point genuinely stretches what the theme is holding. Constraints:
- ONLY-GROW: a rewrite must include everything the prior description covered, plus the new ground. Never narrow, refocus, or drop a sub-meaning.
- KEEP IDENTITY: the rewrite should still feel like the same theme to a returning participant. Prefer to broaden the description; rewrite the short_name only when the existing name is now actively misleading.
- BE SPARING: only emit a theme_update when the broadening is real. Don't restate an existing description in different words.

NEW THEMES — when you must mint:
- short_name: a 2-5 word evocative phrase, ideally pulled from a participant's actual language. Pick a name BROAD enough to hold related future contributions. Avoid abstract LLM-speak ("concerns about pool access", "values around community").
- description: ONE sentence stating the underlying want, written broadly enough to hold related variations.

EXAMPLE OF BROADER-IS-BETTER:
- New point: "I worry the seventh pool would just sit empty most days."
- Existing theme: "what we'll actually use" — "People want resources put toward things with real daily impact, not duplicate amenities."
- CORRECT: assign to existing theme. Same underlying want.
- WRONG: mint a new theme "concern about underused infrastructure" — same want, narrower words, fragments the picture.

──────────────── OUTPUT FORMAT ────────────────

Return a single JSON object with these top-level keys:

{
  "points": [
    {"surface_phrase": "...", "want": "...", "context": "...", "rationale": "...", "doubts": ["..."]}
  ],
  "theme_updates": [
    {"id": "<existing theme uuid>", "short_name": "...", "description": "..."}
  ],
  "new_themes": [
    {"temp_id": "T1", "short_name": "...", "description": "..."}
  ],
  "assignments": [
    {"point_idx": 0, "theme_ids": ["<existing theme uuid>", "T1"]}
  ]
}

Reference points by their 0-based position in the \`points\` array (point_idx). Reference existing themes by their UUID from the EXISTING THEMES list above. Reference newly-minted themes by their temp_id (T1, T2, ...). Every extracted point must appear exactly once in \`assignments\` (use \`theme_ids: []\` if you choose to leave it unassigned).`;

export const ANALYSIS_PROMPT_PLACEHOLDERS = ["{TOPIC}", "{THEMES_BLOCK}", "{TRANSCRIPT}"] as const;

// Re-exports for the existing call sites; resolveAnalysisSystem / renderAnalysisPrompt
// pick up overrides when provided.
export const ANALYSIS_SYSTEM = DEFAULT_ANALYSIS_SYSTEM;

export type ExistingTheme = { id: string; short_name: string; description: string };

export function resolveAnalysisSystem(override: string | null | undefined): string {
  return override?.trim() || DEFAULT_ANALYSIS_SYSTEM;
}

export function renderAnalysisPrompt(
  topic: string,
  existingThemes: ExistingTheme[],
  transcript: string,
  templateOverride: string | null = null,
): string {
  const themesBlock = existingThemes.length
    ? existingThemes
        .map((t) => `- ${t.id} | "${t.short_name}" — ${t.description}`)
        .join("\n")
    : "(none yet — every extracted point will mint a new theme)";

  const template = templateOverride?.trim() || DEFAULT_ANALYSIS_PROMPT;
  return template
    .replace("{TOPIC}", topic || "(topic not provided)")
    .replace("{THEMES_BLOCK}", themesBlock)
    .replace("{TRANSCRIPT}", transcript);
}
