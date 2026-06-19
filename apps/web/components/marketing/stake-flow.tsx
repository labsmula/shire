"use client";

import * as React from "react";
import {
  Briefcase as BriefcaseIcon,
  Lock as LockIcon,
  Unlock as UnlockIcon,
  Users as UsersIcon,
} from "lucide-react";
import { useReducedMotion } from "motion/react";
import { SectionHeading } from "@/components/marketing/section-heading";
import { Reveal } from "@/components/marketing/reveal";
import { cn } from "@/lib/utils";

type Phase = "match" | "lock" | "release";
type PhaseIcon = typeof LockIcon;

const phases: { id: Phase; label: string; detail: string; icon: PhaseIcon }[] = [
  {
    id: "match",
    label: "Match",
    detail: "Candidate stakes 250 cUSD when applying to a role.",
    icon: BriefcaseIcon,
  },
  {
    id: "lock",
    label: "Lock",
    detail: "The stake sits in escrow while the company reviews the application.",
    icon: LockIcon,
  },
  {
    id: "release",
    label: "Release",
    detail:
      "Once the application is officially accepted or rejected, the stake returns to the candidate.",
    icon: UnlockIcon,
  },
];

export function StakeFlow() {
  const reduce = useReducedMotion();
  const [phase, setPhase] = React.useState<Phase>("match");
  const [touched, setTouched] = React.useState(false);

  React.useEffect(() => {
    if (touched || reduce) return;
    const order: Phase[] = ["match", "lock", "release"];
    const id = window.setInterval(() => {
      setPhase((current) => order[(order.indexOf(current) + 1) % order.length]);
    }, 2600);
    return () => window.clearInterval(id);
  }, [touched, reduce]);

  function select(id: Phase) {
    setTouched(true);
    setPhase(id);
  }

  const chipAt = phase === "match" ? "left" : phase === "lock" ? "center" : "right";

  return (
    <section id="how-it-works" className="scroll-mt-20">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <SectionHeading
          eyebrow="How it works"
          title="Watch a stake move through Shire"
          description="Candidate stake, escrow review, returned stake - the commitment cycle in three steps. Tap a phase to play it."
        />

        <Reveal>
          <div className="mx-auto mt-12 flex max-w-md items-center justify-center gap-2 rounded-full border border-border bg-card p-1.5 shadow-sm">
            {phases.map((item) => {
              const active = phase === item.id;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => select(item.id)}
                  aria-pressed={active}
                  className={cn(
                    "inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="relative mx-auto mt-12 max-w-4xl rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-10">
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(2rem,0.7fr)_minmax(0,1fr)_minmax(2rem,0.7fr)_minmax(0,1fr)] items-start gap-2 sm:gap-4">
              <Actor label="Candidate" icon={UsersIcon} active={phase !== "release"} />
              <Connector active />
              <EscrowNode active={phase === "lock"} />
              <Connector active={phase === "lock" || phase === "release"} />
              <Actor label="Company" icon={BriefcaseIcon} active={phase !== "match"} />
            </div>

            <div className="relative mt-8 h-10 sm:mt-10">
              <div
                className={cn(
                  "pointer-events-none absolute top-1/2 z-10 -translate-y-1/2 transition-[left] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
                  chipAt === "left"
                    ? "left-[13%]"
                    : chipAt === "center"
                      ? "left-1/2 -translate-x-1/2"
                      : "left-[87%] -translate-x-full",
                )}
              >
                <span
                  className={cn(
                    "inline-flex whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors duration-500",
                    phase === "lock"
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : phase === "release"
                        ? "border-success/40 bg-success/10 text-success"
                        : "border-border bg-background text-muted-foreground",
                  )}
                >
                  250 cUSD
                </span>
              </div>
            </div>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {phases.find((item) => item.id === phase)?.detail}
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Connector({ active }: { active: boolean }) {
  return (
    <div className="flex h-16 items-center sm:h-20" aria-hidden="true">
      <div
        className={cn(
          "h-px w-full rounded-full transition-colors duration-300",
          active ? "bg-primary/40" : "bg-border",
        )}
      />
    </div>
  );
}

function Actor({
  label,
  icon: Icon,
  active,
}: {
  label: string;
  icon: typeof UsersIcon;
  active: boolean;
}) {
  return (
    <div className="z-20 flex flex-col items-center gap-2">
      <div
        className={cn(
          "grid size-14 place-items-center rounded-2xl border transition-colors duration-300 sm:size-16",
          active
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-border bg-background text-muted-foreground",
        )}
      >
        <Icon className="size-6" aria-hidden="true" />
      </div>
      <span className="text-xs font-medium text-foreground/80 sm:text-sm">{label}</span>
    </div>
  );
}

function EscrowNode({ active }: { active: boolean }) {
  return (
    <div className="z-20 flex flex-col items-center gap-2">
      <div
        className={cn(
          "grid size-16 place-items-center rounded-full border-2 transition-all duration-300 sm:size-20",
          active
            ? "scale-105 border-primary bg-primary/10 text-primary shadow-lg shadow-primary/20"
            : "border-border bg-background text-muted-foreground",
        )}
      >
        <LockIcon className="size-6 sm:size-7" aria-hidden="true" />
      </div>
      <span className="text-xs font-medium text-foreground/80 sm:text-sm">Escrow</span>
    </div>
  );
}
