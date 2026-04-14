import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 25 * 1024 * 1024; // Whisper hard limit

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Transcription is not configured. Set OPENAI_API_KEY in your environment." },
      { status: 503 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const audio = formData.get("audio");
  if (!(audio instanceof File)) {
    return NextResponse.json({ error: "Missing 'audio' file field" }, { status: 400 });
  }

  if (audio.size === 0) {
    return NextResponse.json({ error: "Audio file is empty" }, { status: 400 });
  }
  if (audio.size > MAX_BYTES) {
    return NextResponse.json({ error: "Audio file exceeds 25MB limit" }, { status: 413 });
  }

  try {
    const transcription = await getClient().audio.transcriptions.create({
      file: audio,
      model: "whisper-1",
      response_format: "text",
    });
    // When response_format is "text", the SDK returns a plain string.
    const text = typeof transcription === "string" ? transcription : (transcription as { text?: string }).text ?? "";
    return NextResponse.json({ text: text.trim() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Transcription failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
