export function CatalogHero() {
  return (
    <section className="bg-foreground text-background border-b border-white/10">
      <div className="container px-4 py-12 sm:px-8 sm:py-20 md:px-12 md:py-28">
        <div className="flex flex-col items-center text-center">
          <h1 className="font-sans text-4xl font-bold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl text-background">
            ORDAX
          </h1>
          <div className="mt-3 sm:mt-4 flex items-center gap-3 sm:gap-4 text-xs sm:text-sm font-light text-background/70">
            <span className="h-px w-8 sm:w-12 bg-background/40"></span>
            <span
              className="inline-block overflow-hidden whitespace-nowrap border-r-2 border-background/70 pr-1"
              style={{
                animation: "typewriter 2s steps(17) 0.5s forwards, blink 0.75s step-end infinite",
                width: "0",
              }}
            >
              by Tonecos Studios
            </span>
            <span className="h-px w-8 sm:w-12 bg-background/40"></span>
          </div>
        </div>
      </div>
    </section>
  );
}
