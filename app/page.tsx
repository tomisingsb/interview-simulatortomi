import Link from "next/link";
import { Brain, FileText, MessageSquare, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-5xl px-6 pt-20 pb-12">
        <div className="text-center">
          <span className="badge mb-6">AI-powered interview prep</span>
          <h1 className="font-serif text-5xl md:text-6xl font-semibold tracking-tight text-zinc-900">
            Practice the interview.
            <br />
            <span className="text-accent">Master the moment.</span>
          </h1>
          <p className="mt-6 text-lg text-zinc-600 max-w-2xl mx-auto">
            Generate behavioral, case, and situational interview questions tailored to your background.
            Get detailed AI feedback on every answer.
          </p>
          <div className="mt-10 flex items-center justify-center gap-3">
            <Link href="/practice" className="btn-primary text-base px-6 py-3">
              Start practicing <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>

        <div className="mt-24 grid gap-6 md:grid-cols-3">
          <FeatureCard
            icon={<Brain className="size-5" />}
            title="Smart Question Generation"
            body="Behavioral (STAR), open-ended case, and situational judgment questions across Easy, Medium, and Hard difficulty."
          />
          <FeatureCard
            icon={<FileText className="size-5" />}
            title="Job Description Mode"
            body="Paste a JD URL or text and get questions tailored to that exact role and seniority."
          />
          <FeatureCard
            icon={<MessageSquare className="size-5" />}
            title="Detailed AI Feedback"
            body="Strengths, gaps, and a STAR breakdown for behavioral answers — scored 1-10 by Claude."
          />
        </div>

        <p className="mt-20 text-center text-xs text-zinc-500">
          Personalize your experience by editing <code className="rounded bg-zinc-100 px-1.5 py-0.5">CLAUDE.md</code> in the project root.
        </p>
      </div>
    </main>
  );
}

function FeatureCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="card">
      <div className="flex size-10 items-center justify-center rounded-lg bg-accent-light text-accent">
        {icon}
      </div>
      <h3 className="mt-4 font-semibold text-zinc-900">{title}</h3>
      <p className="mt-2 text-sm text-zinc-600 leading-relaxed">{body}</p>
    </div>
  );
}
