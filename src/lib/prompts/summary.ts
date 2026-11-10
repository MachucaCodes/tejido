export const DEFAULT_SUMMARY_SYSTEM =
  "You write short editorial syntheses of what's surfacing in facilitated group conversations. You name where the room is gathering and where it's pulling apart, in plain human language.";

export const DEFAULT_SUMMARY_PROMPT = `You are reading the perspectives that have surfaced so far in a facilitated group conversation about a shared question. Your job: write ONE short paragraph (3-5 sentences, ~80-110 words) that names the SHAPE of the room across everyone who has spoken.

THE TOPIC THE GROUP IS DISCUSSING:
{TOPIC}

THEMES, RANKED BY HOW MANY PEOPLE LANDED ON EACH:
{THEMES_BLOCK}

PHRASES PEOPLE ACTUALLY USED, GROUPED BY THEME (anonymous — every voice, not a sample):
{SAMPLES_BLOCK}

What to write:
- Lead with what the largest group is pointing at, in concrete terms. NOT a category that "captures" what they want.
  BAD (abstract, generic, could fit any room): "The room is gathering around expansion that actually lives the community's values." / "People want a thoughtful approach to growth." / "There's strong alignment around community-aligned development."
- Concrete means the room's own words for what it cares about. If people are talking about places and amenities, name the specific ones. If they are talking about values, use their values language, like "meet people where they are" or "presence, trust and abundance". Don't turn values into logistics.
- Give each idea space in line with how many people raised it. The top two or three themes should carry most of the paragraph.
- Then name the main tension — where do views pull in different directions? Only call something the main split if a real share of the room is on each side. Otherwise mention it as a smaller thread. If there's no real tension, name the biggest unresolved question or the most surprising minority thread instead.
- Don't end on the split. Close on the larger themes.
- Anchor in the participants' own language where possible.
- The reader hasn't seen the phrases above. Don't drop a detail in without the context that makes it make sense.
- Weigh every voice equally, no matter when it arrived. The phrases are in random order, not time order. Don't favor whatever sounds newest or freshest; a thread many people raised still belongs in the summary.
- Avoid these LLM tells: "X that Y" framings ("expansion that lives its values," "growth that honors community"), the word "actually" used to add weight ("actually deliver," "actually lives"), nominalizations ("stakeholders express concerns about…," "values around community"), and any sentence that would read the same in a summary of any other room.
- Don't list every theme. Don't recite counts or percentages. Don't preview what comes next.
- One paragraph. No headings, no bullets, no preamble, no quotation marks around the whole thing.

Return ONLY a JSON object exactly in this shape — no other text:
{
  "summary": "<one paragraph>"
}`;

export const SUMMARY_PROMPT_PLACEHOLDERS = ["{TOPIC}", "{THEMES_BLOCK}", "{SAMPLES_BLOCK}"] as const;

// Compat re-export so existing call sites continue to import { SUMMARY_SYSTEM }.
export const SUMMARY_SYSTEM = DEFAULT_SUMMARY_SYSTEM;

export type ThemeForSummary = {
  id: string;
  short_name: string;
  description: string;
  count: number;
  share: number;
  samples: string[];
};

export function resolveSummarySystem(override: string | null | undefined): string {
  return override?.trim() || DEFAULT_SUMMARY_SYSTEM;
}

export function renderSummaryPrompt(
  topic: string,
  themes: ThemeForSummary[],
  templateOverride: string | null = null,
): string {
  const sorted = [...themes].sort((a, b) => b.count - a.count);

  const themesBlock = sorted.length
    ? sorted
        .map((t) => {
          const pct = Math.round(t.share * 100);
          const voices = t.count === 1 ? "voice" : "voices";
          return `- "${t.short_name}" (${t.count} ${voices} — ${pct}%) — ${t.description}`;
        })
        .join("\n")
    : "(none yet)";

  const samplesBlock = sorted
    .filter((t) => t.samples.length > 0)
    .map((t) => {
      const phrases = t.samples
        .map((s) => `  • "${s}"`)
        .join("\n");
      return `Under "${t.short_name}":\n${phrases}`;
    })
    .join("\n");

  const template = templateOverride?.trim() || DEFAULT_SUMMARY_PROMPT;
  return template
    .replace("{TOPIC}", topic || "(topic not provided)")
    .replace("{THEMES_BLOCK}", themesBlock)
    .replace("{SAMPLES_BLOCK}", samplesBlock || "(none)");
}
