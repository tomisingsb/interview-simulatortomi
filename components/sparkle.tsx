import { cn } from "@/lib/utils";

/** 4-point sparkle / star burst — decorative accent from the GLOSS aesthetic. */
export function Sparkle({ className, color = "currentColor" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("inline-block", className)} fill={color} aria-hidden>
      <path d="M12 0 L13.6 9.4 L24 12 L13.6 14.6 L12 24 L10.4 14.6 L0 12 L10.4 9.4 Z" />
    </svg>
  );
}

/** Decorative star cluster for hero corners. */
export function StarCluster({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute", className)}>
      <Sparkle className="size-6 text-gloss-yellow" />
      <Sparkle className="size-3 text-gloss-pink absolute -top-2 -right-3" />
      <Sparkle className="size-2 text-gloss-cyan absolute top-5 -left-3" />
    </div>
  );
}
