/** Pure navigation view shared by public-readonly and commercial modes. Auth state comes from the commercial controller. */
import { useEffect, useRef, useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Bell, Menu, X } from "lucide-react";
import { CoinCounter } from "@/components/arcade/CoinCounter";
import { BRAND_SHORT_NAME } from "@/config/brand";
import { isCatalogPublicMvpEnabled } from "@/config/catalog-public-mvp";
import {
  ADMIN_ROUTES,
  AUTH_ROUTES,
  PUBLIC_COLLECTIONS_ENABLED,
  PUBLIC_ROUTES,
  PUBLIC_SUBSCRIPTIONS_ENABLED,
} from "@/config/routes";

const PREVIEW_READ_ONLY = import.meta.env.VITE_PREVIEW_READ_ONLY === "true";

const navLinks: Array<{ to: string; label: string }> = [
  { to: PUBLIC_ROUTES.home, label: "INÍCIO" },
  { to: PUBLIC_ROUTES.catalog, label: "UNIVERSO" },
  { to: PUBLIC_ROUTES.catalogHub, label: "CATÁLOGOS" },
  { to: PUBLIC_ROUTES.about, label: "SOBRE" },
  { to: PUBLIC_ROUTES.contact, label: "CONTATO" },
];

if (PUBLIC_COLLECTIONS_ENABLED) {
  navLinks.splice(2, 0, { to: PUBLIC_ROUTES.collections, label: "COLEÇÕES" });
}
if (PUBLIC_SUBSCRIPTIONS_ENABLED) {
  navLinks.splice(3, 0, { to: PUBLIC_ROUTES.plans, label: "ASSINATURAS" });
}

const authNavLinks: Array<{ to: string; label: string }> = [
  { to: AUTH_ROUTES.profile, label: "CONTA" },
];

export type ArcadeNavViewProps = {
  visibleUser?: boolean;
  isAdmin?: boolean;
  userBalance?: number;
  balanceLoading?: boolean;
  signupEnabled?: boolean;
};

export function ArcadeNavView({
  visibleUser = false,
  isAdmin = false,
  userBalance = 0,
  balanceLoading = false,
  signupEnabled = false,
}: ArcadeNavViewProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const showPublicSignup =
    !visibleUser && !PREVIEW_READ_ONLY && signupEnabled;

  // Navigation may happen outside the menu (browser Back, catalog cards,
  // footer links). Never leave an expanded mobile menu on the next page.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!mobileOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setMobileOpen(false);
      mobileMenuButtonRef.current?.focus();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileOpen]);

  const isActive = (path: string) => {
    if (path === PUBLIC_ROUTES.home) {
      return location.pathname === path;
    }

    return (
      location.pathname === path || location.pathname.startsWith(`${path}/`)
    );
  };

  const linkClass = (path: string) =>
    `inline-flex min-h-11 items-center font-mono text-[10px] uppercase tracking-[0.2em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--gold-accent))] ${
      isActive(path)
        ? "text-[hsl(var(--gold-accent))]"
        : "text-[hsl(0,0%,55%)] hover:text-[hsl(var(--gold-accent))]"
    }`;

  return (
    <nav
      aria-label="Navegação principal"
      className="sticky top-0 z-40 border-b border-[hsl(var(--gold-accent)/0.15)] bg-[hsl(0,0%,5%)]/95 backdrop-blur-md"
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 md:px-6">
        <Link
          to={PUBLIC_ROUTES.home}
          className="inline-flex min-h-11 shrink-0 items-center text-xl font-semibold tracking-[0.12em] text-white"
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
          }}
        >
          {BRAND_SHORT_NAME}
        </Link>

        <div className="hidden items-center gap-5 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              aria-current={isActive(link.to) ? "page" : undefined}
              className={linkClass(link.to)}
            >
              {link.label}
            </Link>
          ))}
          {visibleUser &&
            authNavLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                aria-current={isActive(link.to) ? "page" : undefined}
                className={linkClass(link.to)}
              >
                {link.label}
              </Link>
            ))}
          {!PREVIEW_READ_ONLY && isAdmin && (
            <Link
              to={ADMIN_ROUTES.home}
              className="font-mono text-[10px] uppercase tracking-[0.2em] text-red-500 transition-colors hover:text-red-400"
            >
              ADMIN
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          {visibleUser && (
            <button
              type="button"
              onClick={() => navigate(AUTH_ROUTES.notifications)}
              className="relative inline-flex h-11 w-11 items-center justify-center text-[hsl(0,0%,55%)] transition-colors hover:text-[hsl(var(--gold-accent))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--gold-accent))]"
              aria-label="Abrir notificações"
            >
              <Bell className="h-4 w-4" />
            </button>
          )}
          {visibleUser && (
            <CoinCounter balance={userBalance} isLoading={balanceLoading} />
          )}
          {!visibleUser && !PREVIEW_READ_ONLY && (
            <button
              type="button"
              onClick={() => navigate(PUBLIC_ROUTES.login)}
              className="inline-flex min-h-11 items-center justify-center border border-[hsl(var(--gold-accent)/0.4)] px-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--gold-accent))] transition-colors hover:bg-[hsl(var(--gold-accent)/0.1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--gold-accent))]"
            >
              ENTRAR
            </button>
          )}
          {showPublicSignup && (
            <Link
              to={`${PUBLIC_ROUTES.login}?mode=signup`}
              className="hidden sm:inline-flex min-h-10 items-center border border-[hsl(var(--gold-accent)/0.4)] px-3 font-mono text-[10px] uppercase tracking-[0.15em] text-[hsl(var(--gold-accent))] hover:bg-[hsl(var(--gold-accent)/0.08)]"
            >
              CRIAR CONTA
            </Link>
          )}
          {PREVIEW_READ_ONLY && (
            <span className="font-mono text-[10px] uppercase tracking-wider text-[hsl(0,0%,55%)]">
              {isCatalogPublicMvpEnabled() ? "CATÁLOGO" : "PRÉVIA"}
            </span>
          )}
          <button
            ref={mobileMenuButtonRef}
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center text-[hsl(0,0%,55%)] transition-colors hover:text-[hsl(var(--gold-accent))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--gold-accent))] lg:hidden"
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={mobileOpen}
            aria-controls="tonart-mobile-navigation"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      <div
        id="tonart-mobile-navigation"
        hidden={!mobileOpen}
        className="animate-fade-in space-y-3 border-t border-[hsl(var(--gold-accent)/0.1)] bg-[hsl(0,0%,5%)]/98 px-4 py-4 backdrop-blur-md lg:hidden"
      >
        {navLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            onClick={() => setMobileOpen(false)}
            aria-current={isActive(link.to) ? "page" : undefined}
            className={`flex min-h-11 items-center ${linkClass(link.to)}`}
          >
            {link.label}
          </Link>
        ))}
        {showPublicSignup && (
          <Link
            to={`${PUBLIC_ROUTES.login}?mode=signup`}
            onClick={() => setMobileOpen(false)}
            className={`flex min-h-11 items-center ${linkClass(PUBLIC_ROUTES.login)}`}
          >
            CRIAR CONTA
          </Link>
        )}
        {visibleUser &&
          authNavLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              aria-current={isActive(link.to) ? "page" : undefined}
              className={`flex min-h-11 items-center ${linkClass(link.to)}`}
            >
              {link.label}
            </Link>
          ))}
        {visibleUser && (
          <Link
            to={AUTH_ROUTES.notifications}
            onClick={() => setMobileOpen(false)}
            className={`flex min-h-11 items-center ${linkClass(AUTH_ROUTES.notifications)}`}
          >
            NOTIFICAÇÕES
          </Link>
        )}
        {!PREVIEW_READ_ONLY && isAdmin && (
          <Link
            to={ADMIN_ROUTES.home}
            onClick={() => setMobileOpen(false)}
            className="flex min-h-11 items-center font-mono text-[10px] uppercase tracking-[0.2em] text-red-500"
          >
            ADMIN
          </Link>
        )}
      </div>
    </nav>
  );
}
