import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCoinsBalance } from "@/hooks/coins/useCoinsBalance";
import { useAuth } from "@/lib/auth";
import { LogIn, LogOut } from "lucide-react";
import {
  ArrowRight,
  ArrowLeft,
  Shield,
  Crosshair,
  Package,
  Coins,
  Zap,
  Star,
  Lock,
  Flame,
  Trophy,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { useEffect, useState, useRef } from "react";

// ─── ARCADE EFFECTS ──────────────────────────────────────────────────

function ScanlineOverlay() {
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

function GlitchText({ text, className = "" }: { text: string; className?: string }) {
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

function CoinCounter({ balance, isLoading }: { balance: number; isLoading: boolean }) {
  const [displayed, setDisplayed] = useState(0);
  const [sparkle, setSparkle] = useState(false);

  useEffect(() => {
    if (isLoading || balance === displayed) return;
    const step = Math.max(1, Math.floor(Math.abs(balance - displayed) / 20));
    const timer = setInterval(() => {
      setDisplayed((prev) => {
        if (prev < balance) return Math.min(prev + step, balance);
        if (prev > balance) return Math.max(prev - step, balance);
        return prev;
      });
    }, 30);
    return () => clearInterval(timer);
  }, [balance, isLoading, displayed]);

  useEffect(() => {
    if (displayed === balance && balance > 0) {
      setSparkle(true);
      const t = setTimeout(() => setSparkle(false), 600);
      return () => clearTimeout(t);
    }
  }, [displayed, balance]);

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 border border-[hsl(var(--gold-accent)/0.5)] bg-[hsl(var(--gold-accent)/0.08)] transition-all duration-300 ${
        sparkle ? "shadow-[0_0_20px_hsl(var(--gold-accent)/0.4)] scale-105" : ""
      }`}
    >
      <Coins className={`w-5 h-5 text-[hsl(var(--gold-accent))] ${sparkle ? "animate-bounce" : ""}`} />
      <span className="font-mono text-lg font-bold text-[hsl(var(--gold-accent))] tracking-wider tabular-nums">
        {isLoading ? "---" : displayed.toLocaleString("pt-BR")}
      </span>
      <span className="font-mono text-[10px] text-[hsl(var(--gold-accent)/0.6)] tracking-widest uppercase">
        coins
      </span>
    </div>
  );
}

function FloatingParticles() {
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

function RarityBadge({ characters }: { characters: number }) {
  if (characters >= 20) return (
    <div className="flex items-center gap-1 px-2 py-0.5 bg-[hsl(280,80%,55%)/0.15] border border-[hsl(280,80%,55%)/0.4] text-[hsl(280,80%,65%)]">
      <Star className="w-3 h-3" />
      <span className="font-mono text-[9px] tracking-widest uppercase">Lendária</span>
    </div>
  );
  if (characters >= 10) return (
    <div className="flex items-center gap-1 px-2 py-0.5 bg-[hsl(var(--gold-accent)/0.1)] border border-[hsl(var(--gold-accent)/0.4)] text-[hsl(var(--gold-accent))]">
      <Flame className="w-3 h-3" />
      <span className="font-mono text-[9px] tracking-widest uppercase">Épica</span>
    </div>
  );
  return (
    <div className="flex items-center gap-1 px-2 py-0.5 bg-[hsl(200,70%,50%)/0.1] border border-[hsl(200,70%,50%)/0.3] text-[hsl(200,70%,60%)]">
      <Shield className="w-3 h-3" />
      <span className="font-mono text-[9px] tracking-widest uppercase">Rara</span>
    </div>
  );
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────

export default function CollectionsShowcase() {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const { data: balanceData, isLoading: balanceLoading } = useCoinsBalance();

  const { data: collections, isLoading } = useQuery({
    queryKey: ["collections-showcase"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("id, name, slug, description, cover_image_url, total_characters, is_active")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const userBalance = balanceData?.balance ?? 0;

  return (
    <div className="min-h-screen bg-[hsl(0,0%,5%)] text-[hsl(0,0%,98%)] relative overflow-x-hidden">
      <SEOHead
        title="Coleções | ORDAX Collectibles Arsenal"
        description="Explore nossas coleções exclusivas de peças artesanais feitas à mão. Edição limitada."
      />

      <ScanlineOverlay />

      {/* ═══ ANIMATED GRID BACKGROUND ═══ */}
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

      {/* ═══ TOP HUD BAR ═══ */}
      <nav className="sticky top-0 z-40 border-b border-[hsl(var(--gold-accent)/0.15)] bg-[hsl(0,0%,5%)]/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 md:px-6 h-14">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-[hsl(0,0%,70%)] hover:text-[hsl(var(--gold-accent))] transition-colors font-mono uppercase tracking-wider text-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">BASE</span>
          </button>

          <Link
            to="/"
            className="font-black text-xl tracking-[0.3em] text-[hsl(var(--gold-accent))]"
            style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", textShadow: "0 0 20px hsl(var(--gold-accent) / 0.3)" }}
          >
            ORDAX
          </Link>

          {/* Coin HUD */}
          <CoinCounter balance={userBalance} isLoading={balanceLoading} />
        </div>
      </nav>

      {/* ═══ HERO SECTION ═══ */}
      <section className="relative py-16 md:py-24 px-6 overflow-hidden">
        <FloatingParticles />

        {/* Radial glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.06] pointer-events-none"
          style={{ background: "radial-gradient(circle, hsl(var(--gold-accent)), transparent 70%)" }}
        />

        <div className="relative max-w-5xl mx-auto text-center">
          {/* Mission badge */}
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 border border-[hsl(var(--gold-accent)/0.4)] bg-[hsl(var(--gold-accent)/0.05)] animate-fade-in">
            <div className="w-2 h-2 bg-[hsl(var(--gold-accent))] rounded-full animate-pulse" />
            <span
              className="text-[9px] text-[hsl(var(--gold-accent))] tracking-[0.3em] uppercase"
              style={{ fontFamily: "'Press Start 2P', monospace" }}
            >
              Selecione sua Missão
            </span>
          </div>

          <h1
            className="text-5xl md:text-7xl lg:text-8xl font-black tracking-[0.15em] mb-4 leading-none"
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              textShadow: "0 0 40px hsl(var(--gold-accent) / 0.15)",
            }}
          >
            <GlitchText text="COLEÇÕES" />
          </h1>

          <p
            className="text-[hsl(0,0%,50%)] text-[10px] md:text-xs max-w-lg mx-auto tracking-[0.15em] mb-8"
            style={{ fontFamily: "'Press Start 2P', monospace" }}
          >
            {">> ESCOLHA SUA COLEÇÃO. GANHE COINS. COLECIONE PEÇAS."}
          </p>

          {/* Stats HUD */}
          <div className="flex items-center justify-center gap-6 md:gap-10 font-mono text-xs">
            <div className="text-center">
              <p className="text-2xl md:text-3xl font-bold text-[hsl(var(--gold-accent))] tabular-nums">
                {isLoading ? "--" : collections?.length ?? 0}
              </p>
              <p className="text-[hsl(0,0%,40%)] text-[10px] tracking-widest uppercase mt-1">Coleções</p>
            </div>
            <div className="w-px h-10 bg-[hsl(0,0%,20%)]" />
            <div className="text-center">
              <p className="text-2xl md:text-3xl font-bold text-[hsl(0,0%,98%)] tabular-nums">
                {isLoading ? "--" : collections?.reduce((sum, c) => sum + c.total_characters, 0) ?? 0}
              </p>
              <p className="text-[hsl(0,0%,40%)] text-[10px] tracking-widest uppercase mt-1">Peças</p>
            </div>
            <div className="w-px h-10 bg-[hsl(0,0%,20%)]" />
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Coins className="w-4 h-4 text-[hsl(var(--gold-accent))]" />
                <p className="text-2xl md:text-3xl font-bold text-[hsl(var(--gold-accent))] tabular-nums">
                  {balanceLoading ? "--" : userBalance.toLocaleString("pt-BR")}
                </p>
              </div>
              <p className="text-[hsl(0,0%,40%)] text-[10px] tracking-widest uppercase mt-1">Seus Coins</p>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="mt-12 animate-bounce">
            <ChevronDown className="w-5 h-5 text-[hsl(var(--gold-accent)/0.4)] mx-auto" />
          </div>
        </div>
      </section>

      {/* ═══ COLLECTIONS GRID ═══ */}
      <section ref={gridRef} className="max-w-7xl mx-auto px-4 md:px-6 pb-24 relative z-10">
        {/* Section title */}
        <div className="flex items-center gap-4 mb-8">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[hsl(var(--gold-accent)/0.3)]" />
          <h2
            className="text-sm tracking-[0.3em] text-[hsl(var(--gold-accent))] uppercase"
            style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "10px" }}
          >
            Escolha sua Arena
          </h2>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[hsl(var(--gold-accent)/0.3)]" />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="relative">
                <div className="aspect-[4/5] bg-[hsl(0,0%,8%)] border border-[hsl(0,0%,12%)] animate-pulse" />
                {/* Fake loading scan line */}
                <div
                  className="absolute inset-0 opacity-30"
                  style={{
                    background: "linear-gradient(transparent 40%, hsl(var(--gold-accent) / 0.1) 50%, transparent 60%)",
                    animation: "scan-down 2s ease-in-out infinite",
                  }}
                />
              </div>
            ))}
          </div>
        ) : collections && collections.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {collections.map((collection, index) => {
              const isHovered = hoveredCard === collection.id;
              return (
                <Link
                  key={collection.id}
                  to={`/colecoes/${collection.slug}`}
                  className="group relative flex flex-col border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,7%)] hover:border-[hsl(var(--gold-accent)/0.6)] transition-all duration-500 overflow-hidden"
                  onMouseEnter={() => setHoveredCard(collection.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                  style={{
                    animationDelay: `${index * 100}ms`,
                    animation: "fade-in 0.5s ease-out both",
                  }}
                >
                  {/* ── Corner brackets (arcade style) ── */}
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[hsl(var(--gold-accent)/0.3)] group-hover:border-[hsl(var(--gold-accent))] transition-colors z-10" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[hsl(var(--gold-accent)/0.3)] group-hover:border-[hsl(var(--gold-accent))] transition-colors z-10" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[hsl(var(--gold-accent)/0.3)] group-hover:border-[hsl(var(--gold-accent))] transition-colors z-10" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[hsl(var(--gold-accent)/0.3)] group-hover:border-[hsl(var(--gold-accent))] transition-colors z-10" />

                  {/* ── Hover scan line ── */}
                  <div
                    className="absolute inset-0 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                      background: "linear-gradient(transparent 40%, hsl(var(--gold-accent) / 0.04) 50%, transparent 60%)",
                      backgroundSize: "100% 200%",
                      animation: isHovered ? "scan-down 2.5s ease-in-out infinite" : "none",
                    }}
                  />

                  {/* ── Image ── */}
                  <div className="relative aspect-[16/10] bg-[hsl(0,0%,9%)] overflow-hidden">
                    {collection.cover_image_url ? (
                      <img
                        src={collection.cover_image_url}
                        alt={collection.name}
                        className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700 ease-out"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center relative">
                        <Crosshair className="w-20 h-20 text-[hsl(0,0%,12%)] group-hover:text-[hsl(var(--gold-accent)/0.2)] transition-colors duration-700 group-hover:animate-spin" style={{ animationDuration: "8s" }} />
                        {/* Grid pattern inside placeholder */}
                        <div
                          className="absolute inset-0 opacity-[0.05]"
                          style={{
                            backgroundImage:
                              "linear-gradient(hsl(var(--gold-accent)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--gold-accent)) 1px, transparent 1px)",
                            backgroundSize: "20px 20px",
                          }}
                        />
                      </div>
                    )}

                    {/* Index + Rarity */}
                    <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                      <div className="font-mono text-[10px] text-[hsl(var(--gold-accent))] bg-[hsl(0,0%,5%)]/90 px-2 py-1 tracking-widest border border-[hsl(var(--gold-accent)/0.3)]">
                        #{String(index + 1).padStart(2, "0")}
                      </div>
                      <RarityBadge characters={collection.total_characters} />
                    </div>

                    {/* Coin price indicator */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-[hsl(0,0%,5%)]/90 px-2.5 py-1 border border-[hsl(var(--gold-accent)/0.3)] z-10">
                      <Coins className="w-3.5 h-3.5 text-[hsl(var(--gold-accent))]" />
                      <span className="font-mono text-xs font-bold text-[hsl(var(--gold-accent))] tabular-nums">
                        {(collection.total_characters * 100).toLocaleString("pt-BR")}
                      </span>
                    </div>

                    {/* Bottom gradient */}
                    <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[hsl(0,0%,7%)] via-[hsl(0,0%,7%)]/60 to-transparent" />
                  </div>

                  {/* ── Info panel ── */}
                  <div className="flex-1 p-5 flex flex-col justify-between relative">
                    <div>
                      <h2
                        className="text-2xl font-black tracking-[0.1em] mb-2 group-hover:text-[hsl(var(--gold-accent))] transition-colors duration-300"
                        style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
                      >
                        {collection.name}
                      </h2>
                      {collection.description && (
                        <p className="text-[hsl(0,0%,45%)] text-xs leading-relaxed line-clamp-2 font-mono tracking-wide">
                          {collection.description}
                        </p>
                      )}
                    </div>

                    {/* Stats bar */}
                    <div className="mt-4 pt-3 border-t border-[hsl(0,0%,12%)] flex items-center justify-between">
                      <div className="flex items-center gap-4 text-[10px] font-mono text-[hsl(0,0%,40%)] tracking-wider">
                        <span className="flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5" />
                          {collection.total_characters}
                          <span className="hidden sm:inline">peças</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-[hsl(var(--gold-accent)/0.5)]" />
                          ATIVA
                        </span>
                      </div>

                      {/* CTA */}
                      <span className="flex items-center gap-1.5 text-[10px] font-mono text-[hsl(var(--gold-accent))] tracking-[0.15em] uppercase opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                        ENTRAR
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>

                  {/* ── Bottom power bar ── */}
                  <div className="h-[3px] relative overflow-hidden">
                    <div className="absolute inset-0 bg-[hsl(0,0%,10%)]" />
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-[hsl(var(--gold-accent))] to-[hsl(var(--gold-accent)/0.5)] transition-all duration-700 ease-out"
                      style={{ width: isHovered ? "100%" : "0%" }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          /* ── Empty state (Insert Coin) ── */
          <div className="text-center py-24 border border-dashed border-[hsl(0,0%,15%)] relative overflow-hidden">
            <FloatingParticles />

            <div className="relative z-10">
              <div className="w-20 h-20 mx-auto mb-6 border-2 border-[hsl(var(--gold-accent)/0.3)] flex items-center justify-center animate-pulse">
                <Trophy className="w-10 h-10 text-[hsl(var(--gold-accent)/0.4)]" />
              </div>

              <h2
                className="text-4xl font-black tracking-[0.2em] mb-3"
                style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
              >
                <GlitchText text="INSERT COIN" />
              </h2>

              <p
                className="text-[hsl(0,0%,40%)] text-[9px] tracking-[0.15em] mb-8 max-w-sm mx-auto"
                style={{ fontFamily: "'Press Start 2P', monospace" }}
              >
                Coleções sendo carregadas... Volte em breve para novas missões.
              </p>

              <div className="flex items-center justify-center gap-4">
                <Button
                  onClick={() => navigate("/")}
                  className="bg-[hsl(var(--gold-accent))] text-[hsl(0,0%,7%)] hover:brightness-110 font-mono uppercase tracking-[0.15em] text-xs h-11 px-8 rounded-none border-0"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  VOLTAR À BASE
                </Button>
                <Button
                  onClick={() => navigate("/catalogo")}
                  variant="outline"
                  className="border-[hsl(var(--gold-accent)/0.3)] text-[hsl(var(--gold-accent))] hover:bg-[hsl(var(--gold-accent)/0.1)] font-mono uppercase tracking-[0.15em] text-xs h-11 px-8 rounded-none"
                >
                  VER CATÁLOGO
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ═══ COINS CTA SECTION ═══ */}
      <section className="relative border-t border-[hsl(var(--gold-accent)/0.1)] bg-[hsl(0,0%,4%)] overflow-hidden">
        <FloatingParticles />

        <div className="relative max-w-4xl mx-auto text-center py-16 px-6">
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 border border-[hsl(var(--gold-accent)/0.3)] bg-[hsl(var(--gold-accent)/0.05)]">
            <Coins className="w-3.5 h-3.5 text-[hsl(var(--gold-accent))]" />
            <span className="font-mono text-[9px] text-[hsl(var(--gold-accent))] tracking-[0.2em] uppercase">
              Sistema de Coins
            </span>
          </div>

          <h2
            className="text-3xl md:text-5xl font-black tracking-[0.1em] mb-4"
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              textShadow: "0 0 30px hsl(var(--gold-accent) / 0.1)",
            }}
          >
            GANHE COINS. COLECIONE TUDO.
          </h2>

          <p className="text-[hsl(0,0%,45%)] font-mono text-xs tracking-wider mb-8 max-w-md mx-auto leading-relaxed">
            Assine um plano e receba coins mensais. Use para desbloquear peças exclusivas de qualquer coleção.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              onClick={() => navigate("/planos")}
              className="bg-[hsl(var(--gold-accent))] text-[hsl(0,0%,7%)] hover:brightness-110 font-mono uppercase tracking-[0.15em] text-sm h-12 px-10 rounded-none border-0 shadow-[0_0_20px_hsl(var(--gold-accent)/0.2)] hover:shadow-[0_0_30px_hsl(var(--gold-accent)/0.4)] transition-all"
            >
              <Zap className="w-4 h-4 mr-2" />
              VER PLANOS
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            {userBalance > 0 && (
              <div className="flex items-center gap-2 text-[hsl(0,0%,50%)] font-mono text-xs">
                <Lock className="w-3.5 h-3.5" />
                Você já tem {userBalance.toLocaleString("pt-BR")} coins
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══ INLINE STYLES FOR CUSTOM ANIMATIONS ═══ */}
      <style>{`
        @keyframes float-particle {
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.15; }
          25% { transform: translateY(-20px) translateX(10px); opacity: 0.3; }
          50% { transform: translateY(-10px) translateX(-5px); opacity: 0.1; }
          75% { transform: translateY(-30px) translateX(15px); opacity: 0.25; }
        }
        @keyframes scan-down {
          0% { background-position: 0% 0%; }
          50% { background-position: 0% 100%; }
          100% { background-position: 0% 0%; }
        }
        @keyframes glitch1 {
          0%, 100% { clip-path: inset(0 0 95% 0); transform: translateX(2px); }
          20% { clip-path: inset(30% 0 40% 0); transform: translateX(-2px); }
          40% { clip-path: inset(60% 0 10% 0); transform: translateX(1px); }
          60% { clip-path: inset(80% 0 5% 0); transform: translateX(-1px); }
          80% { clip-path: inset(10% 0 70% 0); transform: translateX(2px); }
        }
        @keyframes glitch2 {
          0%, 100% { clip-path: inset(95% 0 0 0); transform: translateX(-2px); }
          20% { clip-path: inset(40% 0 30% 0); transform: translateX(2px); }
          40% { clip-path: inset(10% 0 60% 0); transform: translateX(-1px); }
          60% { clip-path: inset(5% 0 80% 0); transform: translateX(1px); }
          80% { clip-path: inset(70% 0 10% 0); transform: translateX(-2px); }
        }
      `}</style>
    </div>
  );
}
