import { Reveal } from "@/components/marketing/reveal";
import { trustLogos } from "@/lib/marketing";

export function Logos() {
  return (
    <section className="overflow-hidden border-y border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Reveal>
          <p className="text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Teams and candidates hiring better with Shire - hover for the numbers
          </p>
        </Reveal>

        <Reveal>
          <div className="relative mt-6 overflow-hidden">
            <LogoMarquee />
            <div className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-card to-transparent sm:w-28" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-card to-transparent sm:w-28" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function LogoMarquee() {
  return (
    <div className="group/marquee flex overflow-hidden [--duration:26s] [--gap:1rem] sm:[--gap:1.25rem]">
      {Array.from({ length: 2 }).map((_, row) => (
        <div
          key={row}
          className="flex min-w-full shrink-0 animate-[logo-marquee_var(--duration)_linear_infinite] items-center justify-around gap-[var(--gap)] pr-[var(--gap)] group-hover/marquee:[animation-play-state:paused]"
          aria-hidden={row > 0}
        >
          {trustLogos.map((logo) => (
            <LogoPill key={`${row}-${logo.name}`} name={logo.name} metric={logo.metric} />
          ))}
        </div>
      ))}
    </div>
  );
}

function LogoPill({ name, metric }: { name: string; metric: string }) {
  return (
    <div className="group/logo relative flex h-12 min-w-44 items-center justify-center rounded-full border border-border bg-background/70 px-5 shadow-sm transition-colors duration-200 hover:border-primary/30 hover:bg-primary/5 sm:min-w-52">
      <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold tracking-tight text-muted-foreground/75 transition-opacity duration-200 group-hover/logo:opacity-0 sm:text-base">
        {name}
      </span>
      <span className="absolute inset-0 flex items-center justify-center px-4 text-center text-[11px] font-medium leading-4 text-primary opacity-0 transition-opacity duration-200 group-hover/logo:opacity-100 sm:text-xs">
        {metric}
      </span>
    </div>
  );
}
