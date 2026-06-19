import { Counter, Reveal } from "@/components/marketing/reveal";
import { stats } from "@/lib/marketing";

export function Stats() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <dl className="grid grid-cols-2 gap-x-8 gap-y-10 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <Reveal key={stat.label} delay={(i % 4) * 0.08} className="text-center">
            <dd className="bg-gradient-to-br from-primary to-primary/60 bg-clip-text font-mono text-4xl font-semibold tracking-tight tabular-nums text-transparent sm:text-5xl">
              <Counter value={stat.value} />
            </dd>
            <dt className="mx-auto mt-3 max-w-[14rem] text-sm text-muted-foreground">
              {stat.label}
            </dt>
          </Reveal>
        ))}
      </dl>
    </section>
  );
}
