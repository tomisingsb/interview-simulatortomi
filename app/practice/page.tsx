"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, RefreshCw, Trophy } from "lucide-react";
import { Sparkle } from "@/components/sparkle";
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
    <main className="min-h-screen relative">
      {/* Decorative sparkles */}
      <Sparkle className="size-5 text-gloss-yellow absolute top-32 right-[10%] opacity-70" />
      <Sparkle className="size-3 text-gloss-pink absolute top-[40%] left-[6%] opacity-70" />
      <Sparkle className="size-4 text-gloss-cyan absolute bottom-32 right-[8%] opacity-70" />

      <header className="relative z-10 border-b border-ink-600/60 bg-ink-900/50 backdrop-blur">
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-zinc-400 hover:text-white transition"
          >
            <ArrowLeft className="size-4" />
            HOME
          </Link>
          <div className="flex items-center gap-2">
            <Sparkle className="size-3 text-gloss-pink" />
            <span className="display text-base">GLOSS</span>
          </div>
          <span className="badge-outline">PRACTICE</span>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-3xl px-6 py-12">
        {error && (
          <div className="mb-6 rounded-2xl border-2 border-gloss-pink/40 bg-gloss-pink/10 px-4 py-3 text-sm text-gloss-pink font-medium">
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
        <span className="badge-yellow">SETUP</span>
        <h1 className="display text-4xl md:text-5xl mt-3">
          NEW
          <br />
          <span className="text-gloss-pink">SESSION.</span>
        </h1>
        <p className="mt-3 text-sm text-zinc-400">
          Pick a question type, difficulty, and (optionally) target a specific job.
        </p>
      </div>

      <div className="card space-y-6">
        <div className="grid gap-5 md:grid-cols-2">
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

        <label className="flex items-center gap-3 text-sm text-zinc-300 cursor-pointer">
          <input
            type="checkbox"
            checked={state.wantMultipleChoice}
            onChange={(e) => update({ wantMultipleChoice: e.target.checked })}
            className="size-5 rounded-md border-ink-500 bg-ink-900 text-gloss-pink focus:ring-gloss-pink"
          />
          Generate multiple-choice answer options
        </label>
      </div>

      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="label !mb-1">Job description</p>
            <p className="text-xs text-zinc-500">Optional — paste a URL or text to tailor questions.</p>
          </div>
          <Sparkle className="size-3 text-gloss-cyan" />
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
            className="btn-cyan"
            disabled={jdLoading || !jdUrl.trim()}
            onClick={onFetchJd}
          >
            {jdLoading ? <Loader2 className="size-4 animate-spin" /> : "FETCH"}
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
            className="text-[11px] uppercase tracking-[0.14em] font-bold text-zinc-500 hover:text-gloss-pink transition"
            onClick={() => update({ jdText: "" })}
          >
            CLEAR
          </button>
        )}
      </div>

      <button
        className="btn-primary w-full !py-4 text-base"
        disabled={loading}
        onClick={onGenerate}
      >
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" /> GENERATING...
          </>
        ) : (
          <>
            <Sparkle className="size-4" /> GENERATE QUESTION
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
  const typeBadgeCls =
    type === "behavioral" ? "badge-pink" : type === "case" ? "badge-cyan" : "badge-purple";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <span className={typeBadgeCls}>{QUESTION_TYPE_LABELS[type]}</span>
        <span className="badge-yellow">{DIFFICULTY_LABELS[difficulty]}</span>
      </div>

      <div className="card relative">
        <Sparkle className="size-4 text-gloss-yellow absolute top-5 right-5 opacity-80" />
        <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-zinc-500 mb-3">QUESTION</p>
        <p className="display text-2xl md:text-3xl leading-tight text-white normal-case">
          {question.question}
        </p>
      </div>

      {hasMc && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setAnswerMode("freeform")}
            className={answerMode === "freeform" ? "btn-pink" : "btn-ghost"}
          >
            FREE-FORM
          </button>
          <button
            type="button"
            onClick={() => setAnswerMode("multipleChoice")}
            className={answerMode === "multipleChoice" ? "btn-pink" : "btn-ghost"}
          >
            MULTIPLE CHOICE
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
                className={`flex items-start gap-4 rounded-chunk border-2 p-5 cursor-pointer transition-all ${
                  checked
                    ? "border-gloss-cyan bg-gloss-cyan/10 glow-cyan"
                    : "border-ink-600 bg-ink-800 hover:border-ink-500"
                }`}
              >
                <input
                  type="radio"
                  name="mc"
                  className="mt-1 size-5 accent-gloss-cyan"
                  checked={checked}
                  onChange={() => onChoiceChange(opt)}
                />
                <div className="text-sm text-zinc-200">
                  <span className="display text-gloss-cyan mr-3 text-lg">{letter}.</span>
                  <span>{opt}</span>
                </div>
              </label>
            );
          })}
        </div>
      ) : (
        <textarea
          className="input min-h-[280px] text-sm leading-relaxed"
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
        <button className="btn-primary flex-1 !py-4" disabled={loading} onClick={onSubmit}>
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" /> EVALUATING...
            </>
          ) : (
            <>
              <Sparkle className="size-4" /> SUBMIT FOR FEEDBACK
            </>
          )}
        </button>
        <button className="btn-ghost !py-4" onClick={onCancel} disabled={loading}>
          CANCEL
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
    feedback.overallScore >= 8
      ? "text-gloss-lime"
      : feedback.overallScore >= 5
      ? "text-gloss-yellow"
      : "text-gloss-pink";
  const scoreCardCls =
    feedback.overallScore >= 8 ? "card-cyan" : feedback.overallScore >= 5 ? "card-yellow" : "card-pink";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="badge-purple">{QUESTION_TYPE_LABELS[type]}</span>
          <h1 className="display text-5xl mt-3">
            FEED
            <br />
            <span className="text-gloss-cyan">BACK.</span>
          </h1>
        </div>
        <div className={`${scoreCardCls} !p-5 text-center min-w-[120px]`}>
          <Trophy className="size-5 mx-auto opacity-80" />
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase mt-2 opacity-80">SCORE</p>
          <p className="display text-5xl mt-1">
            {feedback.overallScore}
            <span className="text-2xl opacity-60">/10</span>
          </p>
        </div>
      </div>

      <div className="card">
        <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-zinc-500 mb-2">QUESTION</p>
        <p className="text-sm text-zinc-300 leading-relaxed">{question}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card border-2 border-gloss-lime/40">
          <div className="flex items-center gap-2 mb-4">
            <Sparkle className="size-3 text-gloss-lime" />
            <h3 className="display text-gloss-lime text-lg">STRENGTHS</h3>
          </div>
          <ul className="space-y-3 text-sm text-zinc-300">
            {feedback.strengths.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="text-gloss-lime font-bold">+</span>
                <span className="leading-relaxed">{s}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card border-2 border-gloss-orange/40">
          <div className="flex items-center gap-2 mb-4">
            <Sparkle className="size-3 text-gloss-orange" />
            <h3 className="display text-gloss-orange text-lg">IMPROVE</h3>
          </div>
          <ul className="space-y-3 text-sm text-zinc-300">
            {feedback.improvements.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="text-gloss-orange font-bold">→</span>
                <span className="leading-relaxed">{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {feedback.starBreakdown && (
        <div className="card">
          <div className="flex items-center gap-2 mb-5">
            <Sparkle className="size-3 text-gloss-pink" />
            <h3 className="display text-gloss-pink text-lg">STAR BREAKDOWN</h3>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <StarItem label="SITUATION" color="text-gloss-pink" value={feedback.starBreakdown.situation} />
            <StarItem label="TASK" color="text-gloss-cyan" value={feedback.starBreakdown.task} />
            <StarItem label="ACTION" color="text-gloss-yellow" value={feedback.starBreakdown.action} />
            <StarItem label="RESULT" color="text-gloss-lime" value={feedback.starBreakdown.result} />
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button className="btn-primary flex-1 !py-4" onClick={onTryAnother}>
          <Sparkle className="size-4" /> NEW QUESTION
        </button>
        <button className="btn-cyan !py-4" onClick={onRetry}>
          <RefreshCw className="size-4" /> RETRY
        </button>
      </div>

      {/* Score color marker (used by scoreColor classnames so Tailwind purge keeps them) */}
      <span className={`hidden ${scoreColor}`} />
    </div>
  );
}

function StarItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <p className={`text-[11px] font-bold uppercase tracking-[0.14em] mb-1.5 ${color}`}>{label}</p>
      <p className="text-sm text-zinc-300 leading-relaxed">{value}</p>
    </div>
  );
}
