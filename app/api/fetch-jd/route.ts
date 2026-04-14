import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchJobDescription } from "@/lib/jd-scraper";

export const runtime = "nodejs";

const BodySchema = z.object({ url: z.string().url() });

export async function POST(request: Request) {
  let parsed;
  try {
    const body = await request.json();
    parsed = BodySchema.parse(body);
  } catch {
    return NextResponse.json({ error: "A valid URL is required" }, { status: 400 });
  }

  try {
    const text = await fetchJobDescription(parsed.url);
    return NextResponse.json({ text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch URL";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
