"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, RefreshCw, Sparkles, Trophy } from "lucide-react";
import {
  DIFFICULTY_LABELS,
  QUESTION_TYPE_LABELS,
  type Difficulty,
  type Feedback,
  type GeneratedQuestion,
  type QuestionType,
} from "@/lib/types";

type Phase = "setup" | "answering" | "feedback";
type AnswerMode = "freeform" | "multipleChoice";

interface PersistedState {
  phase: Phase;
  type: QuestionType;
  difficulty: Difficulty;
  jdText: string;
  wantMultipleChoice: boolean;
  question: GeneratedQuestion | null;
  answer: string;
  selectedChoice: string | null;
  feedback: Feedback | null;
}

const STORAGE_KEY = "interview-simulator-state";

const DEFAULT_STATE: PersistedState = {
  phase: "setup",
  type: "behavioral",
  difficulty: "medium",
  jdText: "",
  wantMultipleChoice: false,
  question: null,
  answer: "",
  selectedChoice: null,
  feedback: null,
};

export default function PracticePage() {
  const [state, setState] = useState<PersistedState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jdUrl, setJdUrl] = useState("");
  const [jdLoading, setJdLoading] = useState(false);
  const [answerMode, setAnswerMode] = useState<AnswerMode>("freeform");

  // Hydrate from sessionStorage
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...DEFAULT_STATE, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const update = (patch: Partial<PersistedState>) => setState((s) => ({ ...s, ...patch }));

  async function handleFetchJd() {
    if (!jdUrl.trim()) return;
    setJdLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/fetch-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: jdUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch URL");
      update({ jdText: data.text });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch URL");
    } finally {
      setJdLoading(false);
    }
  }

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: state.type,
          difficulty: state.difficulty,
          jdText: state.jdText || undefined,
          wantMultipleChoice: state.wantMultipleChoice,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate question");
      update({
        question: data,
        answer: "",
        selectedChoice: null,
        feedback: null,
        phase: "answering",
      });
      setAnswerMode(state.wantMultipleChoice && data.multipleChoice ? "multipleChoice" : "freeform");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate question");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitAnswer() {
    if (!state.question) return;
    const finalAnswer = answerMode === "freeform" ? state.answer : state.selectedChoice || "";
    if (!finalAnswer.trim()) {
      setError("Please provide an answer first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/evaluate-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: state.question.question,
          answer: finalAnswer,
          type: state.type,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to evaluate answer");
      update({ feedback: data, phase: "feedback" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to evaluate answer");
    } finally {
      setLoading(false);
    }
  }

  function resetAll() {
    update({
      phase: "setup",
      question: null,
      answer: "",
      selectedChoice: null,
      feedback: null,
    });
    setError(null);
  }

  function retrySameQuestion() {
    update({ phase: "answering", answer: "", selectedChoice: null, feedback: null });
    setError(null);
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900">
            <ArrowLeft className="size-4" />
            Home
          </Link>
          <span className="font-serif text-lg font-semibold">Interview Simulator</span>
          <span className="w-12" />
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10">
        {error && (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {state.phase === "setup" && (
          <SetupView
            state={state}
            update={update}
            jdUrl={jdUrl}
            setJdUrl={setJdUrl}
            jdLoading={jdLoading}
            onFetchJd={handleFetchJd}
            loading={loading}
            onGenerate={handleGenerate}
          />
        )}

        {state.phase === "answering" && state.question && (
          <AnsweringView
            question={state.question}
            answer={state.answer}
            selectedChoice={state.selectedChoice}
            onAnswerChange={(answer) => update({ answer })}
            onChoiceChange={(c) => update({ selectedChoice: c })}
            answerMode={answerMode}
            setAnswerMode={setAnswerMode}
            type={state.type}
            difficulty={state.difficulty}
            loading={loading}
            onSubmit={handleSubmitAnswer}
            onCancel={resetAll}
          />
        )}

        {state.phase === "feedback" && state.feedback && state.question && (
          <FeedbackView
            feedback={state.feedback}
            question={state.question.question}
            type={state.type}
            onTryAnother={resetAll}
            onRetry={retrySameQuestion}
          />
        )}
      </div>
    </main>
  );
}

/* ----------------------- SetupView ----------------------- */

function SetupView({
  state,
  update,
  jdUrl,
  setJdUrl,
  jdLoading,
  onFetchJd,
  loading,
  onGenerate,
}: {
  state: PersistedState;
  update: (p: Partial<PersistedState>) => void;
  jdUrl: string;
  setJdUrl: (v: string) => void;
  jdLoading: boolean;
  onFetchJd: () => void;
  loading: boolean;
  onGenerate: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold">Set up your practice session</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Pick a question type, difficulty, and (optionally) target a specific job.
        </p>
      </div>

      <div className="card space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Question type</label>
            <select
              className="input"
              value={state.type}
              onChange={(e) => update({ type: e.target.value as QuestionType })}
            >
              {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map((t) => (
                <option key={t} value={t}>
                  {QUESTION_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Difficulty</label>
            <select
              className="input"
              value={state.difficulty}
              onChange={(e) => update({ difficulty: e.target.value as Difficulty })}
            >
              {(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((d) => (
                <option key={d} value={d}>
                  {DIFFICULTY_LABELS[d]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={state.wantMultipleChoice}
            onChange={(e) => update({ wantMultipleChoice: e.target.checked })}
            className="size-4 rounded border-zinc-300 text-accent focus:ring-accent"
          />
          Generate multiple-choice answer options
        </label>
      </div>

      <div className="card space-y-4">
        <div>
          <h2 className="font-semibold text-zinc-900">Job description (optional)</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Paste a URL or text. Questions will be tailored to the role.
          </p>
        </div>

        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="https://jobs.example.com/posting/123"
            value={jdUrl}
            onChange={(e) => setJdUrl(e.target.value)}
          />
          <button
            type="button"
            className="btn-secondary"
            disabled={jdLoading || !jdUrl.trim()}
            onClick={onFetchJd}
          >
            {jdLoading ? <Loader2 className="size-4 animate-spin" /> : "Fetch"}
          </button>
        </div>

        <textarea
          className="input min-h-[140px] font-mono text-xs"
          placeholder="Or paste the job description text here..."
          value={state.jdText}
          onChange={(e) => update({ jdText: e.target.value })}
        />
        {state.jdText && (
          <button
            type="button"
            className="text-xs text-zinc-500 hover:text-zinc-700 underline"
            onClick={() => update({ jdText: "" })}
          >
            Clear job description
          </button>
        )}
      </div>

      <button
        className="btn-primary w-full py-3 text-base"
        disabled={loading}
        onClick={onGenerate}
      >
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Generating...
          </>
        ) : (
          <>
            <Sparkles className="size-4" /> Generate Question
          </>
        )}
      </button>
    </div>
  );
}

/* ----------------------- AnsweringView ----------------------- */

function AnsweringView({
  question,
  answer,
  selectedChoice,
  onAnswerChange,
  onChoiceChange,
  answerMode,
  setAnswerMode,
  type,
  difficulty,
  loading,
  onSubmit,
  onCancel,
}: {
  question: GeneratedQuestion;
  answer: string;
  selectedChoice: string | null;
  onAnswerChange: (v: string) => void;
  onChoiceChange: (v: string) => void;
  answerMode: AnswerMode;
  setAnswerMode: (m: AnswerMode) => void;
  type: QuestionType;
  difficulty: Difficulty;
  loading: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const hasMc = !!question.multipleChoice && question.multipleChoice.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs">
        <span className="badge">{QUESTION_TYPE_LABELS[type]}</span>
        <span className="badge">{DIFFICULTY_LABELS[difficulty]}</span>
      </div>

      <div className="card">
        <p className="font-serif text-2xl leading-snug text-zinc-900">{question.question}</p>
      </div>

      {hasMc && (
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => setAnswerMode("freeform")}
            className={`btn ${answerMode === "freeform" ? "bg-zinc-900 text-white" : "btn-ghost"}`}
          >
            Free-form
          </button>
          <button
            type="button"
            onClick={() => setAnswerMode("multipleChoice")}
            className={`btn ${answerMode === "multipleChoice" ? "bg-zinc-900 text-white" : "btn-ghost"}`}
          >
            Multiple choice
          </button>
        </div>
      )}

      {answerMode === "multipleChoice" && hasMc ? (
        <div className="space-y-3">
          {question.multipleChoice!.map((opt, i) => {
            const letter = String.fromCharCode(65 + i);
            const checked = selectedChoice === opt;
            return (
              <label
                key={i}
                className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition ${
                  checked ? "border-accent bg-accent-light" : "border-zinc-200 bg-white hover:border-zinc-300"
                }`}
              >
                <input
                  type="radio"
                  name="mc"
                  className="mt-1"
                  checked={checked}
                  onChange={() => onChoiceChange(opt)}
                />
                <div className="text-sm">
                  <span className="font-semibold mr-2">{letter}.</span>
                  <span>{opt}</span>
                </div>
              </label>
            );
          })}
        </div>
      ) : (
        <textarea
          className="input min-h-[260px] text-sm leading-relaxed"
          placeholder={
            type === "behavioral"
              ? "Structure your answer with Situation, Task, Action, Result..."
              : "Walk through your reasoning step by step..."
          }
          value={answer}
          onChange={(e) => onAnswerChange(e.target.value)}
        />
      )}

      <div className="flex gap-3">
        <button className="btn-primary flex-1 py-3" disabled={loading} onClick={onSubmit}>
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Evaluating...
            </>
          ) : (
            "Submit for feedback"
          )}
        </button>
        <button className="btn-secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ----------------------- FeedbackView ----------------------- */

function FeedbackView({
  feedback,
  question,
  type,
  onTryAnother,
  onRetry,
}: {
  feedback: Feedback;
  question: string;
  type: QuestionType;
  onTryAnother: () => void;
  onRetry: () => void;
}) {
  const scoreColor =
    feedback.overallScore >= 8 ? "text-emerald-600" : feedback.overallScore >= 5 ? "text-amber-600" : "text-red-600";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="badge">{QUESTION_TYPE_LABELS[type]}</span>
          <h1 className="mt-3 font-serif text-3xl font-semibold">Feedback</h1>
        </div>
        <div className="flex items-center gap-2">
          <Trophy className={`size-6 ${scoreColor}`} />
          <span className={`font-serif text-4xl font-semibold ${scoreColor}`}>
            {feedback.overallScore}
          </span>
          <span className="text-zinc-400 text-lg">/10</span>
        </div>
      </div>

      <div className="card">
        <p className="text-xs uppercase tracking-wide text-zinc-500 mb-2">Question</p>
        <p className="text-sm text-zinc-800 leading-relaxed">{question}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h3 className="font-semibold text-emerald-700 mb-3">Strengths</h3>
          <ul className="space-y-2 text-sm text-zinc-700">
            {feedback.strengths.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-emerald-600">✓</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h3 className="font-semibold text-amber-700 mb-3">Areas for improvement</h3>
          <ul className="space-y-2 text-sm text-zinc-700">
            {feedback.improvements.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-amber-600">→</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {feedback.starBreakdown && (
        <div className="card">
          <h3 className="font-semibold text-zinc-900 mb-4">STAR Breakdown</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <StarItem label="Situation" value={feedback.starBreakdown.situation} />
            <StarItem label="Task" value={feedback.starBreakdown.task} />
            <StarItem label="Action" value={feedback.starBreakdown.action} />
            <StarItem label="Result" value={feedback.starBreakdown.result} />
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button className="btn-primary flex-1 py-3" onClick={onTryAnother}>
          <Sparkles className="size-4" /> New question
        </button>
        <button className="btn-secondary py-3" onClick={onRetry}>
          <RefreshCw className="size-4" /> Retry this one
        </button>
      </div>
    </div>
  );
}

function StarItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-accent mb-1">{label}</p>
      <p className="text-sm text-zinc-700 leading-relaxed">{value}</p>
    </div>
  );
}
