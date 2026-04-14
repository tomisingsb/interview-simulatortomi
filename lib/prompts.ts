import "server-only";
import type { Difficulty, QuestionType } from "./types";

export function buildSystemBlocks(profile: string) {
  const framework = `You are a senior interview coach helping a candidate practice for high-stakes interviews. You specialize in:
- Behavioral interviews using the STAR (Situation, Task, Action, Result) framework
- Open-ended case interviews (market sizing, investment thesis, business judgment)
- Situational judgment questions

You always:
- Tailor questions and feedback to the candidate's profile below
- Return STRICT JSON when asked, with no surrounding prose or markdown fences
- Push for specificity, quantified impact, and crisp structure
- Are direct and substantive — no fluff, no over-praise

CANDIDATE PROFILE:
---
${profile}
---`;

  return [
    {
      type: "text" as const,
      text: framework,
      cache_control: { type: "ephemeral" as const },
    },
  ];
}

interface QuestionGenArgs {
  type: QuestionType;
  difficulty: Difficulty;
  jdText?: string;
  wantMultipleChoice: boolean;
}

export function questionGenPrompt({ type, difficulty, jdText, wantMultipleChoice }: QuestionGenArgs): string {
  const typeGuidance: Record<QuestionType, string> = {
    behavioral:
      "Generate ONE behavioral interview question that should be answered using the STAR framework. Focus on leadership, conflict, failure, ambiguity, or impact.",
    case:
      "Generate ONE open-ended case-style question. Examples: investment thesis on a company/sector, market sizing, deal evaluation, or strategic judgment. The question should require structured reasoning.",
    situational:
      "Generate ONE situational judgment question describing a hypothetical workplace scenario the candidate must respond to.",
  };

  const difficultyGuidance: Record<Difficulty, string> = {
    easy: "Keep the question approachable — common, well-known territory.",
    medium: "Make the question moderately challenging with some nuance or ambiguity.",
    hard: "Make the question genuinely difficult: edgy scenario, multi-layered, or requires sophisticated judgment.",
  };

  const mcInstruction = wantMultipleChoice
    ? `Also generate exactly 4 plausible multiple-choice answer options labeled A, B, C, D. Each option should be a distinct, realistic candidate response (not obviously wrong). Return them in a "multipleChoice" array of 4 strings.`
    : `Do not generate multiple-choice options. Return only the question.`;

  const jdSection = jdText
    ? `\n\nThe question MUST be tailored to this job description:\n---\n${jdText.slice(0, 6000)}\n---`
    : "";

  return `${typeGuidance[type]}

Difficulty: ${difficulty.toUpperCase()}. ${difficultyGuidance[difficulty]}

${mcInstruction}${jdSection}

Return STRICT JSON in this exact shape (no markdown, no prose):
{
  "question": "the full interview question text",
  "multipleChoice": ${wantMultipleChoice ? '["option A", "option B", "option C", "option D"]' : "null"}
}`;
}

interface EvalArgs {
  question: string;
  answer: string;
  type: QuestionType;
}

export function evaluationPrompt({ question, answer, type }: EvalArgs): string {
  const typeFraming: Record<QuestionType, string> = {
    behavioral:
      "Evaluate this answer against the STAR framework (Situation, Task, Action, Result). Score each STAR component qualitatively in the starBreakdown field.",
    case:
      "Evaluate this answer for structured reasoning, hypothesis-driven thinking, quantification, and conclusion clarity. Do NOT include a starBreakdown.",
    situational:
      "Evaluate this answer for judgment, prioritization, stakeholder awareness, and decisiveness. Do NOT include a starBreakdown.",
  };

  return `${typeFraming[type]}

QUESTION:
${question}

CANDIDATE ANSWER:
${answer}

Provide:
- An overall score from 1 to 10 (be honest, not generous)
- 2-4 specific strengths (what the candidate did well)
- 2-4 specific improvements (key points missed or weak areas)
${type === "behavioral" ? '- A starBreakdown object with one short paragraph each for "situation", "task", "action", "result" — note what was covered well and what was missing in each' : ""}

Return STRICT JSON in this exact shape (no markdown, no prose):
{
  "overallScore": <1-10 integer>,
  "strengths": ["...", "..."],
  "improvements": ["...", "..."]${type === "behavioral" ? ',\n  "starBreakdown": { "situation": "...", "task": "...", "action": "...", "result": "..." }' : ""}
}`;
}
