import { NextResponse } from "next/server";
import { z } from "zod";
import { callClaude, extractJson } from "@/lib/anthropic";
import { getProfile } from "@/lib/profile";
import { buildSystemBlocks, questionGenPrompt } from "@/lib/prompts";
import type { GeneratedQuestion } from "@/lib/types";

export const runtime = "nodejs";

const BodySchema = z.object({
  type: z.enum(["behavioral", "case", "situational"]),
  difficulty: z.enum(["easy", "medium", "hard"]),
  jdText: z.string().max(10_000).optional(),
  wantMultipleChoice: z.boolean(),
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
    const userText = questionGenPrompt(parsed);
    const raw = await callClaude({ systemBlocks, userText, maxTokens: 1200 });

    let result: GeneratedQuestion;
    try {
      const json = extractJson<{ question: string; multipleChoice?: string[] | null }>(raw);
      result = {
        question: json.question,
        multipleChoice: parsed.wantMultipleChoice && json.multipleChoice ? json.multipleChoice : undefined,
      };
    } catch {
      return NextResponse.json({ error: "Model returned invalid JSON", raw }, { status: 502 });
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
