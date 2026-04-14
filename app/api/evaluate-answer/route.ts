import { NextResponse } from "next/server";
import { z } from "zod";
import { callClaude, extractJson } from "@/lib/anthropic";
import { getProfile } from "@/lib/profile";
import { buildSystemBlocks, evaluationPrompt } from "@/lib/prompts";
import type { Feedback } from "@/lib/types";

export const runtime = "nodejs";

const BodySchema = z.object({
  question: z.string().min(1).max(4000),
  answer: z.string().min(1).max(8000),
  type: z.enum(["behavioral", "case", "situational"]),
});

export async function POST(request: Request) {
  let parsed;
  try {
    const body = await request.json();
    parsed = BodySchema.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const profile = await getProfile();
    const systemBlocks = buildSystemBlocks(profile);
    const userText = evaluationPrompt(parsed);
    const raw = await callClaude({ systemBlocks, userText, maxTokens: 1500 });

    let feedback: Feedback;
    try {
      feedback = extractJson<Feedback>(raw);
    } catch {
      return NextResponse.json({ error: "Model returned invalid JSON", raw }, { status: 502 });
    }

    return NextResponse.json(feedback);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
