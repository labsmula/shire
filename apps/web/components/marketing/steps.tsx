import { ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/marketing/section-heading";
import { Reveal } from "@/components/marketing/reveal";
import { SpotlightCard } from "@/components/marketing/spotlight-card";
import { steps } from "@/lib/marketing";

export function Steps() {
  return (
    <section id="how-it-works" className="scroll-mt-20">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <SectionHeading
          eyebrow="How it works"
          title="From upload to settled offer"
          description="Three steps, no long forms, no crypto setup. Shire keeps every move yours to approve."
        />

        <div className="relative mt-16 grid gap-6 md:grid-cols-3">
          {steps.map((step, i) => (
            <Reveal key={step.num} delay={i * 0.12}>
              <div className="group relative h-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-[box-shadow,transform] duration-200 hover:-translate-y-1 hover:shadow-xl">
                <SpotlightCard className="h-full p-8">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-full bg-primary/5 transition-transform duration-300 group-hover:scale-150"
                  />
                  <span className="relative font-mono text-5xl font-semibold tabular-nums text-primary/20 transition-colors duration-200 group-hover:text-primary/40">
                    {step.num}
                  </span>
                  <h3 className="relative mt-5 text-lg font-semibold tracking-tight">{step.title}</h3>
                  <p className="relative mt-2.5 text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </SpotlightCard>

                {i < steps.length - 1 && (
                  <ArrowRight
                    aria-hidden="true"
                    className="absolute -right-3 top-1/2 hidden size-6 -translate-y-1/2 text-border md:block"
                  />
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
