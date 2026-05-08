export const SUMMARY_SYSTEM =
  "You write short editorial syntheses of what's surfacing in facilitated group conversations. You name where the room is gathering and where it's pulling apart, in plain human language.";

const SUMMARY_PROMPT = `You are reading the perspectives that have surfaced so far in a facilitated group conversation about a shared question. Your job: write ONE short paragraph (3-5 sentences, ~80-110 words) that names the SHAPE of the room as it stands now.

THE TOPIC THE GROUP IS DISCUSSING:
{TOPIC}

THEMES, RANKED BY HOW MANY PEOPLE LANDED ON EACH:
{THEMES_BLOCK}

SAMPLE PHRASES PEOPLE ACTUALLY USED (anonymous):
{SAMPLES_BLOCK}

What to write:
- Lead with the center of gravity — where is the room pulling? Don't just name the biggest theme; explain what underlying want is gathering people.
- Then name the main tension — where do views actually pull in different directions? If there's no real tension, name the biggest unresolved question or the most surprising minority thread instead.
- Anchor in the participants' own language where possible. Avoid abstract LLM-speak ("stakeholders express concerns about…", "values around community").
- Don't list every theme. Don't recite counts or percentages. Don't preview what comes next.
- One paragraph. No headings, no bullets, no preamble, no quotation marks around the whole thing.

Return ONLY a JSON object exactly in this shape — no other text:
{
  "summary": "<one paragraph>"
}`;

export type ThemeForSummary = {
  id: string;
  short_name: string;
  description: string;
  count: number;
  share: number;
  samples: string[];
};

export function renderSummaryPrompt(
  topic: string,
  themes: ThemeForSummary[],
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
        .slice(0, 3)
        .map((s) => `  • "${s}"`)
        .join("\n");
      return `Under "${t.short_name}":\n${phrases}`;
    })
    .join("\n");

  return SUMMARY_PROMPT
    .replace("{TOPIC}", topic || "(topic not provided)")
    .replace("{THEMES_BLOCK}", themesBlock)
    .replace("{SAMPLES_BLOCK}", samplesBlock || "(none)");
}
