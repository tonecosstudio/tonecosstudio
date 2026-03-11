/**
 * ArcadeNav - Navegação principal estilo arcade
 */

import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Bell, Menu, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useIsAdmin } from "@/lib/roles";
import { useCoinsBalance } from "@/hooks/coins/useCoinsBalance";
import { CoinCounter } from "@/components/arcade/CoinCounter";

const navLinks = [
  { to: "/", label: "INÍCIO" },
  { to: "/catalogo", label: "CATÁLOGO" },
  { to: "/colecoes", label: "COLEÇÕES" },
  { to: "/planos", label: "PLANOS" },
];

const authNavLinks = [
  { to: "/catalogo-personagens", label: "PERSONAGENS" },
  { to: "/perfil", label: "CONTA" },
];

export function ArcadeNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin(user?.id);
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
    <nav className="sticky top-0 z-40 border-b border-[hsl(var(--gold-accent)/0.15)] bg-[hsl(0,0%,5%)]/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 md:px-6 h-14">
        {/* Logo */}
        <Link
          to="/"
          className="font-black text-xl tracking-[0.3em] text-[hsl(var(--gold-accent))] shrink-0"
          style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", textShadow: "0 0 20px hsl(var(--gold-accent) / 0.3)" }}
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
          {user && authNavLinks.map((l) => (
            <Link key={l.to} to={l.to} className={linkClass(l.to)}>
              {l.label}
            </Link>
          ))}
          {isAdmin && (
            <Link to="/admin" className="text-[10px] tracking-[0.2em] uppercase font-mono text-red-500 hover:text-red-400 transition-colors">
              ADMIN
            </Link>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {user && (
            <button
              onClick={() => navigate("/notificacoes")}
              className="relative text-[hsl(0,0%,55%)] hover:text-[hsl(var(--gold-accent))] transition-colors"
            >
              <Bell className="w-4 h-4" />
            </button>
          )}
          <CoinCounter balance={userBalance} isLoading={balanceLoading} />
          {!user && (
            <button
              onClick={() => navigate("/login")}
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
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
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
          {user && authNavLinks.map((l) => (
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
              to="/notificacoes"
              onClick={() => setMobileOpen(false)}
              className={`block py-2 ${linkClass("/notificacoes")}`}
            >
              🔔 NOTIFICAÇÕES
            </Link>
          )}
          {isAdmin && (
            <Link
              to="/admin"
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-[10px] tracking-[0.2em] uppercase font-mono text-red-500"
            >
              ADMIN
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
