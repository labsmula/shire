import { Reveal } from "@/components/marketing/reveal";
import { trustLogos } from "@/lib/marketing";

export function Logos() {
  return (
    <section className="border-y border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Reveal>
          <p className="text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Teams and candidates hiring better with Shire — hover for the numbers
          </p>
        </Reveal>
        <div className="mt-6 grid grid-cols-2 items-center gap-x-6 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
          {trustLogos.map((logo, i) => (
            <Reveal key={logo.name} delay={(i % 6) * 0.06}>
              <div className="group/logo relative h-8">
                {/* name — fades out on hover */}
                <span className="absolute inset-0 flex items-center justify-center text-base font-semibold tracking-tight text-muted-foreground/70 transition-opacity duration-200 group-hover/logo:opacity-0 sm:text-lg">
                  {logo.name}
                </span>
                {/* metric — fades in on hover */}
                <span className="absolute inset-0 flex items-center justify-center text-center text-[11px] font-medium text-primary opacity-0 transition-opacity duration-200 group-hover/logo:opacity-100 sm:text-xs">
                  {logo.metric}
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
