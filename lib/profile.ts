import "server-only";
import { promises as fs } from "fs";
import path from "path";

const FALLBACK_PROFILE = `# Candidate Profile

No CLAUDE.md found at project root. Using a generic profile.

## Background
- General professional preparing for interviews
`;

let cached: { value: string; mtimeMs: number } | null = null;

export async function getProfile(): Promise<string> {
  const filePath = path.join(process.cwd(), "CLAUDE.md");
  try {
    const stat = await fs.stat(filePath);
    if (cached && cached.mtimeMs === stat.mtimeMs) {
      return cached.value;
    }
    const value = await fs.readFile(filePath, "utf-8");
    cached = { value, mtimeMs: stat.mtimeMs };
    return value;
  } catch {
    return FALLBACK_PROFILE;
  }
}
