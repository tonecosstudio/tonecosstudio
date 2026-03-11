/**
 * ArcadeEffects - Efeitos visuais do tema arcade
 */

export function ScanlineOverlay() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 opacity-[0.03]"
      style={{
        background:
          "repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(0 0% 0%) 2px, hsl(0 0% 0%) 4px)",
      }}
    />
  );
}

export function AnimatedGridBg({ scrollY = 0 }: { scrollY?: number }) {
  return (
    <div
      className="fixed inset-0 opacity-[0.03] pointer-events-none z-0"
      style={{
        backgroundImage: `
          linear-gradient(hsl(var(--gold-accent) / 0.4) 1px, transparent 1px),
          linear-gradient(90deg, hsl(var(--gold-accent) / 0.4) 1px, transparent 1px)
        `,
        backgroundSize: "50px 50px",
        transform: `translateY(${scrollY * 0.05}px)`,
      }}
    />
  );
}

export function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-[hsl(var(--gold-accent))] rounded-full opacity-20"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animation: `float-particle ${6 + Math.random() * 8}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 5}s`,
          }}
        />
      ))}
    </div>
  );
}

export function GlitchText({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span className={`relative inline-block ${className}`}>
      <span
        className="absolute top-0 left-[2px] text-[hsl(0,100%,50%)] opacity-30 animate-[glitch1_4s_infinite]"
        aria-hidden="true"
      >
        {text}
      </span>
      <span
        className="absolute top-0 left-[-2px] text-[hsl(200,100%,50%)] opacity-30 animate-[glitch2_4s_infinite]"
        aria-hidden="true"
      >
        {text}
      </span>
      <span className="relative">{text}</span>
    </span>
  );
}

export function ArcadeAnimationStyles() {
  return (
    <style>{`
      @keyframes float-particle {
        0%, 100% { transform: translateY(0) translateX(0); }
        25% { transform: translateY(-20px) translateX(10px); }
        50% { transform: translateY(-10px) translateX(-10px); }
        75% { transform: translateY(-30px) translateX(5px); }
      }
      @keyframes glitch1 {
        0%, 100% { clip-path: inset(0 0 0 0); }
        20% { clip-path: inset(20% 0 60% 0); }
        40% { clip-path: inset(60% 0 20% 0); }
        60% { clip-path: inset(40% 0 40% 0); }
        80% { clip-path: inset(10% 0 70% 0); }
      }
      @keyframes glitch2 {
        0%, 100% { clip-path: inset(0 0 0 0); }
        20% { clip-path: inset(60% 0 20% 0); }
        40% { clip-path: inset(20% 0 60% 0); }
        60% { clip-path: inset(70% 0 10% 0); }
        80% { clip-path: inset(40% 0 40% 0); }
      }
      @keyframes fade-in {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .animate-fade-in {
        animation: fade-in 0.3s ease-out;
      }
    `}</style>
  );
}
