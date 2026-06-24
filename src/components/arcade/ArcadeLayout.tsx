/**
 * Shared Arcade/Gaming UI Components
 * Used across all public-facing pages for consistent Metal Slug aesthetic.
 */

import { useNavigate, Link, useLocation } from "react-router-dom";
import { Coins, Menu, Bell, X } from "lucide-react";
import { useCoinsBalance } from "@/hooks/coins/useCoinsBalance";
import { useEffect, useState, type PropsWithChildren } from "react";
import { useAuth } from "@/lib/auth";
import { useCurrentUserIsAdmin } from "@/lib/roles";
import {
  ADMIN_ROUTES,
  AUTH_ROUTES,
  PUBLIC_COLLECTIONS_ENABLED,
  PUBLIC_ROUTES,
} from "@/config/routes";

// ─── SCANLINE OVERLAY ────────────────────────────────────────────────

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

// ─── GLITCH TEXT ─────────────────────────────────────────────────────

export function GlitchText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
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

// ─── FLOATING PARTICLES ──────────────────────────────────────────────

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

// ─── COIN COUNTER ────────────────────────────────────────────────────

export function CoinCounter({
  balance,
  isLoading,
}: {
  balance: number;
  isLoading: boolean;
}) {
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
      <Coins
        className={`w-5 h-5 text-[hsl(var(--gold-accent))] ${sparkle ? "animate-bounce" : ""}`}
      />
      <span className="font-mono text-lg font-bold text-[hsl(var(--gold-accent))] tracking-wider tabular-nums">
        {isLoading ? "---" : displayed.toLocaleString("pt-BR")}
      </span>
      <span className="font-mono text-[10px] text-[hsl(var(--gold-accent)/0.6)] tracking-widest uppercase">
        coins
      </span>
    </div>
  );
}

// ─── ANIMATED GRID BG ────────────────────────────────────────────────

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

// ─── TOP HUD NAV ─────────────────────────────────────────────────────

const navLinks: Array<{ to: string; label: string }> = [
  { to: PUBLIC_ROUTES.home, label: "INICIO" },
  { to: PUBLIC_ROUTES.catalog, label: "UNIVERSO" },
];

if (PUBLIC_COLLECTIONS_ENABLED) {
  navLinks.push({ to: PUBLIC_ROUTES.collections, label: "COLECOES" });
}

const authNavLinks: Array<{ to: string; label: string }> = [
  { to: PUBLIC_ROUTES.catalog, label: "PERSONAGENS" },
  { to: AUTH_ROUTES.profile, label: "CONTA" },
];

export function ArcadeNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { data: isAdmin } = useCurrentUserIsAdmin({ currentUserId: user?.id });
  const { data: balanceData, isLoading: balanceLoading } = useCoinsBalance();
  const userBalance = balanceData?.balance ?? 0;
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const linkClass = (path: string) =>
    `text-[10px] tracking-[0.2em] uppercase transition-colors font-mono ${
      isActive(path)
        ? "text-[hsl(var(--gold-accent))]"
        : "text-[hsl(0,0%,55%)] hover:text-[hsl(var(--gold-accent))]"
    }`;

  return (
    <>
      <nav className="sticky top-0 z-40 border-b border-[hsl(var(--gold-accent)/0.15)] bg-[hsl(0,0%,5%)]/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 md:px-6 h-14">
          {/* Logo */}
          <Link
            to={PUBLIC_ROUTES.home}
            className="font-black text-xl tracking-[0.3em] text-[hsl(var(--gold-accent))] shrink-0"
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              textShadow: "0 0 20px hsl(var(--gold-accent) / 0.3)",
            }}
          >
            ORDAX
          </Link>

          {/* Desktop links */}
          <div className="hidden lg:flex items-center gap-5">
            {navLinks.map((l) => (
              <Link key={l.to} to={l.to} className={linkClass(l.to)}>
                {l.label}
              </Link>
            ))}
            {user &&
              authNavLinks.map((l) => (
                <Link key={l.to} to={l.to} className={linkClass(l.to)}>
                  {l.label}
                </Link>
              ))}
            {isAdmin && (
              <Link
                to={ADMIN_ROUTES.home}
                className="text-[10px] tracking-[0.2em] uppercase font-mono text-red-500 hover:text-red-400 transition-colors"
              >
                ADMIN
              </Link>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {user && (
              <button
                onClick={() => navigate(AUTH_ROUTES.notifications)}
                className="relative text-[hsl(0,0%,55%)] hover:text-[hsl(var(--gold-accent))] transition-colors"
              >
                <Bell className="w-4 h-4" />
              </button>
            )}
            <CoinCounter balance={userBalance} isLoading={balanceLoading} />
            {!user && (
              <button
                onClick={() => navigate(PUBLIC_ROUTES.login)}
                className="text-[10px] tracking-[0.2em] uppercase font-mono border border-[hsl(var(--gold-accent)/0.4)] px-3 py-1.5 text-[hsl(var(--gold-accent))] hover:bg-[hsl(var(--gold-accent)/0.1)] transition-colors"
              >
                ENTRAR
              </button>
            )}
            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden text-[hsl(0,0%,55%)] hover:text-[hsl(var(--gold-accent))] transition-colors"
            >
              {mobileOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-[hsl(var(--gold-accent)/0.1)] bg-[hsl(0,0%,5%)]/98 backdrop-blur-md px-4 py-4 space-y-3 animate-fade-in">
            {navLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setMobileOpen(false)}
                className={`block py-2 ${linkClass(l.to)}`}
              >
                {l.label}
              </Link>
            ))}
            {user &&
              authNavLinks.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setMobileOpen(false)}
                  className={`block py-2 ${linkClass(l.to)}`}
                >
                  {l.label}
                </Link>
              ))}
            {user && (
              <Link
                to={AUTH_ROUTES.notifications}
                onClick={() => setMobileOpen(false)}
                className={`block py-2 ${linkClass(AUTH_ROUTES.notifications)}`}
              >
                🔔 NOTIFICAÇÕES
              </Link>
            )}
            {isAdmin && (
              <Link
                to={ADMIN_ROUTES.home}
                onClick={() => setMobileOpen(false)}
                className="block py-2 text-[10px] tracking-[0.2em] uppercase font-mono text-red-500"
              >
                ADMIN
              </Link>
            )}
          </div>
        )}
      </nav>
    </>
  );
}

// ─── SECTION TITLE ───────────────────────────────────────────────────

export function ArcadeSectionTitle({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-4 mb-8">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[hsl(var(--gold-accent)/0.3)]" />
      <h2
        className="text-sm tracking-[0.3em] text-[hsl(var(--gold-accent))] uppercase"
        style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "10px" }}
      >
        {children}
      </h2>
      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[hsl(var(--gold-accent)/0.3)]" />
    </div>
  );
}

// ─── HERO SECTION ────────────────────────────────────────────────────

interface ArcadeHeroProps {
  badge: string;
  title: string;
  subtitle: string;
  stats?: { value: string | number; label: string }[];
}

export function ArcadeHero({ badge, title, subtitle, stats }: ArcadeHeroProps) {
  return (
    <section className="relative py-16 md:py-24 px-6 overflow-hidden">
      <FloatingParticles />

      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.06] pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, hsl(var(--gold-accent)), transparent 70%)",
        }}
      />

      <div className="relative max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 border border-[hsl(var(--gold-accent)/0.4)] bg-[hsl(var(--gold-accent)/0.05)] animate-fade-in">
          <div className="w-2 h-2 bg-[hsl(var(--gold-accent))] rounded-full animate-pulse" />
          <span
            className="text-[9px] text-[hsl(var(--gold-accent))] tracking-[0.3em] uppercase"
            style={{ fontFamily: "'Press Start 2P', monospace" }}
          >
            {badge}
          </span>
        </div>

        <h1
          className="text-5xl md:text-7xl lg:text-8xl font-black tracking-[0.15em] mb-4 leading-none"
          style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            textShadow: "0 0 40px hsl(var(--gold-accent) / 0.15)",
          }}
        >
          <GlitchText text={title} />
        </h1>

        <p
          className="text-[hsl(0,0%,50%)] text-[10px] md:text-xs max-w-lg mx-auto tracking-[0.15em] mb-8"
          style={{ fontFamily: "'Press Start 2P', monospace" }}
        >
          {subtitle}
        </p>

        {stats && stats.length > 0 && (
          <div className="flex items-center justify-center gap-6 md:gap-10 font-mono text-xs">
            {stats.map((stat, i) => (
              <div key={i} className="flex items-center gap-6 md:gap-10">
                {i > 0 && <div className="w-px h-10 bg-[hsl(0,0%,20%)]" />}
                <div className="text-center">
                  <p className="text-2xl md:text-3xl font-bold text-[hsl(var(--gold-accent))] tabular-nums">
                    {stat.value}
                  </p>
                  <p className="text-[hsl(0,0%,40%)] text-[10px] tracking-widest uppercase mt-1">
                    {stat.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ─── CORNER BRACKETS CARD ────────────────────────────────────────────

export function ArcadeCard({
  children,
  className = "",
  hover = true,
}: PropsWithChildren<{ className?: string; hover?: boolean }>) {
  return (
    <div
      className={`group relative border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,7%)] ${hover ? "hover:border-[hsl(var(--gold-accent)/0.6)]" : ""} transition-all duration-500 overflow-hidden ${className}`}
    >
      {/* Corner brackets */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[hsl(var(--gold-accent)/0.3)] group-hover:border-[hsl(var(--gold-accent))] transition-colors z-10" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[hsl(var(--gold-accent)/0.3)] group-hover:border-[hsl(var(--gold-accent))] transition-colors z-10" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[hsl(var(--gold-accent)/0.3)] group-hover:border-[hsl(var(--gold-accent))] transition-colors z-10" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[hsl(var(--gold-accent)/0.3)] group-hover:border-[hsl(var(--gold-accent))] transition-colors z-10" />
      {children}
    </div>
  );
}

// ─── CTA SECTION ─────────────────────────────────────────────────────

interface ArcadeCTAProps {
  badge: string;
  title: string;
  description: string;
  primaryAction: { label: string; href: string; icon?: React.ReactNode };
  secondaryAction?: { label: string; href: string };
}

export function ArcadeCTA({
  badge,
  title,
  description,
  primaryAction,
  secondaryAction,
}: ArcadeCTAProps) {
  const navigate = useNavigate();

  return (
    <section className="relative border-t border-[hsl(var(--gold-accent)/0.1)] bg-[hsl(0,0%,4%)] overflow-hidden">
      <FloatingParticles />
      <div className="relative max-w-4xl mx-auto text-center py-16 px-6">
        <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 border border-[hsl(var(--gold-accent)/0.3)] bg-[hsl(var(--gold-accent)/0.05)]">
          <span className="font-mono text-[9px] text-[hsl(var(--gold-accent))] tracking-[0.2em] uppercase">
            {badge}
          </span>
        </div>

        <h2
          className="text-3xl md:text-5xl font-black tracking-[0.1em] mb-4"
          style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            textShadow: "0 0 30px hsl(var(--gold-accent) / 0.1)",
          }}
        >
          {title}
        </h2>

        <p className="text-[hsl(0,0%,45%)] font-mono text-xs tracking-wider mb-8 max-w-md mx-auto leading-relaxed">
          {description}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => navigate(primaryAction.href)}
            className="inline-flex items-center gap-2 bg-[hsl(var(--gold-accent))] text-[hsl(0,0%,7%)] hover:brightness-110 font-mono uppercase tracking-[0.15em] text-sm h-12 px-10 border-0 shadow-[0_0_20px_hsl(var(--gold-accent)/0.2)] hover:shadow-[0_0_30px_hsl(var(--gold-accent)/0.4)] transition-all"
          >
            {primaryAction.icon}
            {primaryAction.label}
          </button>
          {secondaryAction && (
            <button
              onClick={() => navigate(secondaryAction.href)}
              className="inline-flex items-center gap-2 border border-[hsl(var(--gold-accent)/0.3)] text-[hsl(var(--gold-accent))] hover:bg-[hsl(var(--gold-accent)/0.1)] font-mono uppercase tracking-[0.15em] text-xs h-11 px-8 transition-all"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── SHARED KEYFRAMES ────────────────────────────────────────────────

export function ArcadeAnimationStyles() {
  return (
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
  );
}
