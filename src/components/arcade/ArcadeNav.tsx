/**
 * ArcadeNav - Navegacao principal estilo arcade
 */

import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Bell, Menu, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useIsAdmin } from "@/lib/roles";
import { useCoinsBalance } from "@/hooks/coins/useCoinsBalance";
import { CoinCounter } from "@/components/arcade/CoinCounter";
import {
  ADMIN_ROUTES,
  AUTH_ROUTES,
  PUBLIC_COLLECTIONS_ENABLED,
  PUBLIC_ROUTES,
} from "@/config/routes";

const navLinks: Array<{ to: string; label: string }> = [
  { to: PUBLIC_ROUTES.home, label: "INICIO" },
  { to: PUBLIC_ROUTES.catalog, label: "UNIVERSO" },
  { to: PUBLIC_ROUTES.characterSelect, label: "PERSONAGENS" },
  { to: PUBLIC_ROUTES.catalogModels, label: "MODELOS" },
];

if (PUBLIC_COLLECTIONS_ENABLED) {
  navLinks.splice(2, 0, { to: PUBLIC_ROUTES.collections, label: "COLECOES" });
}

const authNavLinks: Array<{ to: string; label: string }> = [
  { to: AUTH_ROUTES.profile, label: "CONTA" },
];

export function ArcadeNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin(user?.id);
  const { data: balanceData, isLoading: balanceLoading } = useCoinsBalance();
  const userBalance = balanceData?.balance ?? 0;
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === PUBLIC_ROUTES.home) {
      return location.pathname === path;
    }

    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const linkClass = (path: string) =>
    `text-[10px] tracking-[0.2em] uppercase transition-colors font-mono ${
      isActive(path)
        ? "text-[hsl(var(--gold-accent))]"
        : "text-[hsl(0,0%,55%)] hover:text-[hsl(var(--gold-accent))]"
    }`;

  return (
    <nav className="sticky top-0 z-40 border-b border-[hsl(var(--gold-accent)/0.15)] bg-[hsl(0,0%,5%)]/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 md:px-6">
        <Link
          to={PUBLIC_ROUTES.home}
          className="shrink-0 text-xl font-black tracking-[0.3em] text-[hsl(var(--gold-accent))]"
          style={{
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            textShadow: "0 0 20px hsl(var(--gold-accent) / 0.3)",
          }}
        >
          ORDAX
        </Link>

        <div className="hidden items-center gap-5 lg:flex">
          {navLinks.map((link) => (
            <Link key={link.to} to={link.to} className={linkClass(link.to)}>
              {link.label}
            </Link>
          ))}
          {user &&
            authNavLinks.map((link) => (
              <Link key={link.to} to={link.to} className={linkClass(link.to)}>
                {link.label}
              </Link>
            ))}
          {isAdmin && (
            <Link
              to={ADMIN_ROUTES.home}
              className="font-mono text-[10px] uppercase tracking-[0.2em] text-red-500 transition-colors hover:text-red-400"
            >
              ADMIN
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <button
              onClick={() => navigate(AUTH_ROUTES.notifications)}
              className="relative text-[hsl(0,0%,55%)] transition-colors hover:text-[hsl(var(--gold-accent))]"
            >
              <Bell className="h-4 w-4" />
            </button>
          )}
          <CoinCounter balance={userBalance} isLoading={balanceLoading} />
          {!user && (
            <button
              onClick={() => navigate(PUBLIC_ROUTES.login)}
              className="border border-[hsl(var(--gold-accent)/0.4)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--gold-accent))] transition-colors hover:bg-[hsl(var(--gold-accent)/0.1)]"
            >
              ENTRAR
            </button>
          )}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="text-[hsl(0,0%,55%)] transition-colors hover:text-[hsl(var(--gold-accent))] lg:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="animate-fade-in space-y-3 border-t border-[hsl(var(--gold-accent)/0.1)] bg-[hsl(0,0%,5%)]/98 px-4 py-4 backdrop-blur-md lg:hidden">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className={`block py-2 ${linkClass(link.to)}`}
            >
              {link.label}
            </Link>
          ))}
          {user &&
            authNavLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={`block py-2 ${linkClass(link.to)}`}
              >
                {link.label}
              </Link>
            ))}
          {user && (
            <Link
              to={AUTH_ROUTES.notifications}
              onClick={() => setMobileOpen(false)}
              className={`block py-2 ${linkClass(AUTH_ROUTES.notifications)}`}
            >
              NOTIFICACOES
            </Link>
          )}
          {isAdmin && (
            <Link
              to={ADMIN_ROUTES.home}
              onClick={() => setMobileOpen(false)}
              className="block py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-red-500"
            >
              ADMIN
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
