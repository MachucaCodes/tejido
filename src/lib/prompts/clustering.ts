export const CLUSTERING_SYSTEM =
  "You group perspectives from facilitated conversations into coherent interest-level themes. You preserve existing themes and only mint new ones when truly necessary.";

const CLUSTERING_PROMPT = `You are clustering perspectives that emerged from facilitated conversations about a shared question. Your job is to group new points into coherent INTEREST-LEVEL themes that surface what people fundamentally want, fear, or need underneath their explicit positions.

CRITICAL BIAS: PREFER FEWER, BROADER THEMES.
A perspectives view with 5-7 substantial themes is more useful to the room than one with 12+ thin ones. Every time you're tempted to mint a new theme, look harder for an existing one that could hold this point — and look harder at whether your new theme name is just a narrower restatement of one already in the list. When in doubt, REUSE. When in doubt about a name, BROADEN it.

THE QUESTION THE GROUP IS DISCUSSING:
{QUESTION}

EXISTING THEMES (preserved across participants — don't rename or reshape these; assign new points to them when the underlying want fits):
{THEMES_BLOCK}

NEW POINTS FROM A PARTICIPANT WHO JUST FINISHED:
{POINTS_BLOCK}

For each new point:
- If the point's underlying want is even loosely related to an existing theme, place it there. Don't let a too-narrowly-worded existing description push you toward minting a near-duplicate — the description was written when the theme was younger and can absorb a slightly broader read.
- Two points expressing different VERSIONS of the same underlying interest belong in the SAME theme.
- A point may belong to multiple themes ONLY when it touches multiple genuinely distinct wants. When in doubt, place it in the single best theme.
- Mint a NEW theme only when the want is genuinely outside everything that exists. Even then, name and describe it BROADLY enough that future related points can land there too.
- If a point has no \`want\` and you cannot confidently infer an underlying interest from \`surface_phrase\` + \`context\` alone, leave \`theme_ids\` empty.

For new themes:
- short_name: a 2-5 word evocative phrase, ideally pulled from a participant's actual language. Avoid abstract LLM-speak ("concerns about pool access", "values around community").
- description: ONE sentence stating the underlying want, written broadly enough to hold related variations.

Return ONLY a JSON object exactly in this shape — no other text, no preamble:
{
  "new_themes": [
    {"temp_id": "T1", "short_name": "morning quiet", "description": "People want quiet morning use of shared space"}
  ],
  "assignments": [
    {"point_id": "<point uuid>", "theme_ids": ["<existing theme uuid>", "T1"]}
  ]
}

Use temp ids \`T1\`, \`T2\`, ... only for new themes you propose in this response. Existing theme ids are 36-character UUIDs from the EXISTING THEMES list above. Every new point must appear exactly once in \`assignments\` (use \`theme_ids: []\` if you choose to leave it unassigned).`;

export type ExistingTheme = { id: string; short_name: string; description: string };
export type NewPoint = {
  id: string;
  surface_phrase: string;
  want: string;
  context: string;
  rationale: string;
  doubts: string[];
};

export function renderClusteringPrompt(
  question: string,
  existingThemes: ExistingTheme[],
  newPoints: NewPoint[],
): string {
  const themesBlock = existingThemes.length
    ? existingThemes
        .map((t) => `- ${t.id} | "${t.short_name}" — ${t.description}`)
        .join("\n")
    : "(none yet — every point will mint a new theme)";

  const pointsBlock = newPoints
    .map((p) => {
      const doubts = p.doubts.length ? p.doubts.join("; ") : "(none)";
      return `- ${p.id}
    surface_phrase: "${p.surface_phrase}"
    want: "${p.want || "(empty — conversation did not surface an underlying interest)"}"
    context: "${p.context || "(none)"}"
    rationale: "${p.rationale || "(none)"}"
    doubts: ${doubts}`;
    })
    .join("\n");

  return CLUSTERING_PROMPT
    .replace("{QUESTION}", question || "(question not provided)")
    .replace("{THEMES_BLOCK}", themesBlock)
    .replace("{POINTS_BLOCK}", pointsBlock);
}
