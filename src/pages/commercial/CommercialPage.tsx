import type { PropsWithChildren } from "react";
import SEOHead from "@/components/SEOHead";

export const fieldClass = "min-h-11 w-full rounded-sm border border-white/20 bg-black/20 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-[hsl(var(--gold-accent))]";
export const actionClass = "inline-flex min-h-11 items-center justify-center rounded-sm border border-[hsl(var(--gold-accent))] bg-[hsl(var(--gold-accent))] px-5 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40";
export const secondaryClass = "inline-flex min-h-11 items-center justify-center rounded-sm border border-white/30 px-5 py-2 text-sm text-white/85 hover:border-white/60";
export const panelClass = "rounded-sm border border-white/15 bg-[hsl(0,0%,8%)] p-5 sm:p-7";

export function CommercialPage({ title, intro, children }: PropsWithChildren<{title: string; intro: string}>) {
  return (
    <>
      <SEOHead title={title} description={intro} noindex />
      <section className="mx-auto min-h-[65vh] w-full max-w-5xl px-4 pb-20 pt-12 sm:px-6 sm:pt-16">
      <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.25em] text-[hsl(var(--gold-accent))]">TONART Studio · Atendimento</p>
      <h1 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mb-8 max-w-2xl text-sm leading-relaxed text-white/60">{intro}</p>
        {children}
      </section>
    </>
  );
}
