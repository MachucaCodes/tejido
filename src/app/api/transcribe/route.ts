import { getLocale } from "next-intl/server";

import { isLocale } from "@/i18n/locales";
import { transcribeAudio } from "@/lib/transcribe";

export const maxDuration = 30;

export async function POST(req: Request) {
  if (!process.env.GROQ_API_KEY) return new Response("GROQ_API_KEY missing", { status: 500 });

  const incoming = await req.formData();
  const file = incoming.get("file");
  if (!(file instanceof Blob)) {
    return new Response("expected multipart 'file' field", { status: 400 });
  }

  // Voice is a first-class input here. The UI locale is the best signal we
  // have for which language the person is about to speak.
  const locale = await getLocale();
  try {
    const text = await transcribeAudio(file, "audio.webm", isLocale(locale) ? locale : null);
    return Response.json({ text });
  } catch (err) {
    return new Response(err instanceof Error ? err.message : String(err), { status: 502 });
  }
}
