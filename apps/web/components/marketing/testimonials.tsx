import Image from "next/image";
import { Quote } from "lucide-react";
import { SectionHeading } from "@/components/marketing/section-heading";
import { Reveal } from "@/components/marketing/reveal";
import { SpotlightCard } from "@/components/marketing/spotlight-card";
import { testimonials } from "@/lib/marketing";

const photos = [
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=facearea&facepad=3&w=120&h=120&q=80",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=facearea&facepad=3&w=120&h=120&q=80",
];

export function Testimonials() {
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <SectionHeading
          eyebrow="Testimonials"
          title="Teams that stopped losing hires to ghosting"
          description="The stake changed how both sides show up. Here's what that looks like in practice."
          align="left"
        />

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {testimonials.map((t, i) => (
            <Reveal
              as="figure"
              key={t.name}
              delay={i * 0.12}
              className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            >
              <SpotlightCard className="flex h-full flex-col justify-between p-8">
                <Quote className="size-7 text-primary/40" aria-hidden="true" />
                <blockquote className="mt-4 text-lg leading-relaxed text-foreground/90">
                  “{t.quote}”
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3">
                  <Image
                    src={photos[i % photos.length]}
                    alt={t.name}
                    width={40}
                    height={40}
                    className="size-10 rounded-full border border-border object-cover"
                  />
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-sm text-muted-foreground">{t.role}</p>
                  </div>
                </figcaption>
              </SpotlightCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
