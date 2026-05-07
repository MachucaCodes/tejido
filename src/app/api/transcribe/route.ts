export const maxDuration = 30;

export async function POST(req: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return new Response("GROQ_API_KEY missing", { status: 500 });

  const incoming = await req.formData();
  const file = incoming.get("file");
  if (!(file instanceof Blob)) {
    return new Response("expected multipart 'file' field", { status: 400 });
  }

  const upstream = new FormData();
  upstream.append("file", file, "audio.webm");
  upstream.append("model", "whisper-large-v3-turbo");
  upstream.append("response_format", "json");

  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: upstream,
  });
  if (!res.ok) {
    return new Response(`upstream: ${res.status} ${await res.text()}`, { status: 502 });
  }
  const json = (await res.json()) as { text?: string };
  return Response.json({ text: json.text ?? "" });
}
