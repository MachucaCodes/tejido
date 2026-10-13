import type { Locale } from "@/i18n/locales";

/**
 * Speech to text via Groq Whisper. `language` is a hint — Whisper
 * auto-detects, but an explicit hint measurably improves accuracy.
 */
export async function transcribeAudio(
  file: Blob,
  filename: string,
  language: Locale | null,
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY missing");

  const upstream = new FormData();
  upstream.append("file", file, filename);
  upstream.append("model", "whisper-large-v3-turbo");
  upstream.append("response_format", "json");
  if (language) upstream.append("language", language);

  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: upstream,
  });
  if (!res.ok) throw new Error(`upstream: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { text?: string };
  return json.text ?? "";
}
