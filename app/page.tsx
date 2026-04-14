import Link from "next/link";
import { Brain, FileText, MessageSquare, ArrowRight } from "lucide-react";
import { Sparkle, StarCluster } from "@/components/sparkle";

export default function LandingPage() {
  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Decorative floating sparkles */}
      <Sparkle className="size-8 text-gloss-yellow absolute top-24 left-[12%] opacity-80" />
      <Sparkle className="size-5 text-gloss-pink absolute top-40 right-[18%] opacity-90" />
      <Sparkle className="size-4 text-gloss-cyan absolute top-[60%] left-[8%] opacity-80" />
      <Sparkle className="size-6 text-gloss-purple absolute top-[70%] right-[10%] opacity-80" />

      <header className="relative z-10 mx-auto max-w-6xl px-6 pt-8 flex items-center justify-between">
        <div className="card-pink !p-3 !px-5 inline-flex items-center gap-2 rounded-pill">
          <Sparkle className="size-3 text-white" />
          <span className="display text-xl">GLOSS</span>
        </div>
        <span className="badge-outline">v1.0 // Interview Sim</span>
      </header>

      <div className="relative z-10 mx-auto max-w-6xl px-6 pt-16 pb-12">
        <div className="text-center relative">
          <StarCluster className="left-1/2 -translate-x-[14rem] -top-4 hidden md:block" />

          <span className="badge-cyan mb-8 inline-flex items-center gap-1.5">
            <Sparkle className="size-2.5" /> AI INTERVIEW PREP
          </span>

          <h1 className="display text-6xl md:text-8xl text-balance">
            PRACTICE THE
            <br />
            <span className="text-gloss-pink">INTERVIEW.</span>
            <br />
            MASTER THE
            <br />
            <span className="text-gloss-cyan">MOMENT.</span>
          </h1>

          <p className="mt-10 text-lg text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Generate behavioral, case, and situational interview questions tailored to your background.
            Get detailed AI feedback on every answer.
          </p>

          <div className="mt-10 flex items-center justify-center gap-3">
            <Link href="/practice" className="btn-primary text-base px-7 py-3.5">
              <Sparkle className="size-4" /> START PRACTICING <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>

        {/* Feature cards — colored sticker grid */}
        <div className="mt-28 grid gap-5 md:grid-cols-3">
          <FeatureCard
            variant="pink"
            icon={<Brain className="size-6" />}
            tag="01 // GENERATE"
            title="Smart Questions"
            body="Behavioral (STAR), open-ended case, and situational judgment. Easy, Medium, Hard."
          />
          <FeatureCard
            variant="cyan"
            icon={<FileText className="size-6" />}
            tag="02 // TARGETED"
            title="Job Description Mode"
            body="Paste a JD URL or text and get questions tailored to that exact role."
          />
          <FeatureCard
            variant="purple"
            icon={<MessageSquare className="size-6" />}
            tag="03 // FEEDBACK"
            title="AI Critique"
            body="Strengths, gaps, and a STAR breakdown — scored 1-10 by Claude."
          />
        </div>

        {/* Palette strip — homage to the source design */}
        <div className="mt-20 card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500 font-bold">PALETTE</p>
              <p className="display text-2xl mt-1">SIGNATURE COLORS</p>
            </div>
            <Sparkle className="size-4 text-gloss-yellow" />
          </div>
          <div className="grid grid-cols-5 gap-3">
            <Swatch hex="#FF2E93" label="PINK" />
            <Swatch hex="#4EE2F0" label="CYAN" />
            <Swatch hex="#A855F7" label="PURPLE" />
            <Swatch hex="#FDE047" label="YELLOW" />
            <Swatch hex="#FB923C" label="ORANGE" />
          </div>
        </div>

        <p className="mt-16 text-center text-[11px] uppercase tracking-[0.14em] text-zinc-600">
          PERSONALIZE BY EDITING <code className="text-gloss-cyan">CLAUDE.md</code>
        </p>
      </div>
    </main>
  );
}

type Variant = "pink" | "cyan" | "purple";

function FeatureCard({
  variant,
  icon,
  tag,
  title,
  body,
}: {
  variant: Variant;
  icon: React.ReactNode;
  tag: string;
  title: string;
  body: string;
}) {
  const cls = variant === "pink" ? "card-pink" : variant === "cyan" ? "card-cyan" : "card-purple";
  return (
    <div className={`${cls} relative overflow-hidden`}>
      <Sparkle className="size-3 absolute top-4 right-4 opacity-60" />
      <div className="flex size-12 items-center justify-center rounded-2xl bg-black/15 backdrop-blur">
        {icon}
      </div>
      <p className="mt-5 text-[10px] font-bold tracking-[0.18em] opacity-70">{tag}</p>
      <h3 className="mt-1 display text-2xl">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed opacity-90">{body}</p>
    </div>
  );
}

function Swatch({ hex, label }: { hex: string; label: string }) {
  return (
    <div>
      <div
        className="h-20 rounded-2xl border border-white/10"
        style={{ backgroundColor: hex, boxShadow: `0 12px 32px -12px ${hex}99` }}
      />
      <p className="mt-2 text-[10px] font-bold tracking-[0.14em] text-zinc-400">{label}</p>
      <p className="font-mono text-[10px] text-zinc-600">{hex}</p>
    </div>
  );
}
