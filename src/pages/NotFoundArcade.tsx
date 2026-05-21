import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { FloatingParticles, GlitchText } from "@/components/arcade/ArcadeEffects";
import { ArcadeCard } from "@/components/arcade/ArcadeLayout";
import { Page } from "@/components/layouts/Page";
import { AlertTriangle, Home, ArrowLeft, RotateCcw } from "lucide-react";
import { log } from "@/lib/logger";

export default function NotFoundArcade() {
  const location = useLocation();
  const navigate = useNavigate();
  const [glitchActive, setGlitchActive] = useState(false);

  const handleRetry = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/", { replace: true });
  };

  useEffect(() => {
    log.warn("Rota inexistente acessada", { pathname: location.pathname });
  }, [location.pathname]);

  useEffect(() => {
    const interval = setInterval(() => {
      setGlitchActive(true);
      setTimeout(() => setGlitchActive(false), 200);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Page title="404 - Não Encontrado" description="Página não encontrada">
      <section className="relative min-h-[80vh] flex items-center justify-center px-6 overflow-hidden">
        <FloatingParticles />

        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-[0.04] pointer-events-none"
          style={{ background: "radial-gradient(circle, hsl(0, 70%, 50%), transparent 70%)" }}
        />

        <div className="relative max-w-lg w-full text-center">
          {/* Big 404 */}
          <div className="mb-8">
            <h1
              className={`text-[120px] md:text-[180px] font-black leading-none tracking-[0.2em] transition-all ${
                glitchActive ? "text-[hsl(0,100%,50%)]" : "text-[hsl(var(--gold-accent))]"
              }`}
              style={{
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                textShadow: glitchActive
                  ? "3px 0 hsl(200,100%,50%), -3px 0 hsl(0,100%,50%)"
                  : "0 0 60px hsl(var(--gold-accent) / 0.2)",
              }}
            >
              <GlitchText text="404" />
            </h1>
          </div>

          <ArcadeCard>
            <div className="p-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-[hsl(0,70%,50%)] animate-pulse" />
                <span
                  className="text-[hsl(0,70%,50%)] text-[10px] tracking-[0.3em] uppercase"
                  style={{ fontFamily: "'Press Start 2P', monospace" }}
                >
                  GAME OVER
                </span>
                <AlertTriangle className="w-6 h-6 text-[hsl(0,70%,50%)] animate-pulse" />
              </div>

              <p className="text-[hsl(0,0%,50%)] font-mono text-xs tracking-wider mb-2">
                ROTA NÃO ENCONTRADA
              </p>
              <p className="text-[hsl(0,0%,25%)] font-mono text-[10px] mb-6 break-all">
                {location.pathname}
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => navigate("/")}
                  className="inline-flex items-center gap-2 bg-[hsl(var(--gold-accent))] text-[hsl(0,0%,5%)] font-mono uppercase tracking-[0.15em] text-xs h-11 px-8 hover:brightness-110 shadow-[0_0_15px_hsl(var(--gold-accent)/0.2)] transition-all"
                >
                  <Home className="w-4 h-4" />
                  VOLTAR À BASE
                </button>
                <button
                  onClick={() => navigate(-1)}
                  className="inline-flex items-center gap-2 border border-[hsl(var(--gold-accent)/0.3)] text-[hsl(var(--gold-accent))] hover:bg-[hsl(var(--gold-accent)/0.05)] font-mono uppercase tracking-wider text-[10px] h-11 px-6 transition-all"
                >
                  <ArrowLeft className="w-3 h-3" />
                  VOLTAR
                </button>
                <button
                  onClick={handleRetry}
                  className="inline-flex items-center gap-2 border border-[hsl(0,0%,18%)] text-[hsl(0,0%,45%)] hover:text-[hsl(var(--gold-accent))] hover:border-[hsl(var(--gold-accent)/0.3)] font-mono uppercase tracking-wider text-[10px] h-11 px-6 transition-all"
                >
                  <RotateCcw className="w-3 h-3" />
                  RETRY
                </button>
              </div>

              {/* Continue? countdown */}
              <div className="mt-8 pt-6 border-t border-[hsl(0,0%,12%)]">
                <ContinueCountdown />
              </div>
            </div>
          </ArcadeCard>
        </div>
      </section>
    </Page>
  );
}

function ContinueCountdown() {
  const navigate = useNavigate();
  const [count, setCount] = useState(9);

  useEffect(() => {
    if (count <= 0) {
      navigate("/");
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count, navigate]);

  return (
    <div className="text-center">
      <p
        className="text-[hsl(var(--gold-accent))] text-[9px] tracking-[0.2em] uppercase mb-2 animate-pulse"
        style={{ fontFamily: "'Press Start 2P', monospace" }}
      >
        CONTINUE?
      </p>
      <span className="text-3xl font-black text-[hsl(var(--gold-accent))] font-mono tabular-nums">
        {count}
      </span>
    </div>
  );
}
