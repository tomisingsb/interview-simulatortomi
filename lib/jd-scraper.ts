import "server-only";
import * as cheerio from "cheerio";

const MAX_CHARS = 8000;
const TIMEOUT_MS = 10_000;

export async function fetchJobDescription(url: string): Promise<string> {
  const parsed = new URL(url); // throws on invalid
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only http(s) URLs are supported");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let html: string;
  try {
    const res = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; InterviewSimulator/1.0; +https://example.com/bot)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) {
      throw new Error(`Fetch failed with status ${res.status}`);
    }
    html = await res.text();
  } finally {
    clearTimeout(timer);
  }

  const $ = cheerio.load(html);
  $("script, style, nav, footer, header, noscript, svg").remove();

  const main = $("main").first();
  const root = main.length ? main : $("body");
  const text = root
    .text()
    .replace(/\s+/g, " ")
    .trim();

  if (!text) {
    throw new Error("No readable text extracted from page");
  }

  return text.slice(0, MAX_CHARS);
}
