export type QuestionType = "behavioral" | "case" | "situational";
export type Difficulty = "easy" | "medium" | "hard";

export interface GeneratedQuestion {
  question: string;
  multipleChoice?: string[];
}

export interface StarBreakdown {
  situation: string;
  task: string;
  action: string;
  result: string;
}

export interface Feedback {
  overallScore: number;
  strengths: string[];
  improvements: string[];
  starBreakdown?: StarBreakdown;
}

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  behavioral: "Behavioral (STAR)",
  case: "Open-ended Case",
  situational: "Situational Judgment",
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};
