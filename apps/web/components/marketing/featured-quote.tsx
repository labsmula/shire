import Image from "next/image";
import { Quote } from "lucide-react";
import { Parallax, Reveal } from "@/components/marketing/reveal";
import { featuredQuote } from "@/lib/marketing";

export function FeaturedQuote() {
  return (
    <section className="relative overflow-hidden bg-card">
      <Parallax
        range={30}
        className="pointer-events-none absolute -left-20 top-1/2 size-[26rem] -translate-y-1/2 rounded-full bg-primary/10 blur-[120px]"
      >
        <div className="size-full rounded-full" />
      </Parallax>
      <div className="relative mx-auto max-w-4xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
        <Quote className="size-10 text-primary" aria-hidden="true" />
        <Reveal>
          <blockquote className="mt-8 text-2xl font-medium leading-snug tracking-tight text-balance text-foreground sm:text-3xl lg:text-[2.5rem] lg:leading-tight">
            “{featuredQuote.quote}”
          </blockquote>
        </Reveal>
        <figcaption className="mt-10 flex items-center gap-4">
          <Image
            src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=facearea&facepad=3&w=120&h=120&q=80"
            alt={featuredQuote.name}
            width={48}
            height={48}
            className="size-12 rounded-full border border-border object-cover"
          />
          <div>
            <p className="text-sm font-semibold">{featuredQuote.name}</p>
            <p className="text-sm text-muted-foreground">{featuredQuote.role}</p>
          </div>
        </figcaption>
      </div>
    </section>
  );
}
