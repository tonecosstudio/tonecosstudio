/** Commercial navigation is isolated from the public catalog's read-only bundle. */
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { BRAND_SHORT_NAME } from "@/config/brand";
import { TONECOS_COMMERCIAL_ROUTES } from "@/config/routes";
import { useCatalogBrowsing } from "@/services/catalog/catalog-browsing-context";

const links = [
  { href: "/", label: "Início" },
  { href: "/modelos", label: "Modelos" },
  ...(import.meta.env.VITE_CATALOG_QUOTES_ENABLED === "true"
    ? [
        {
          href: TONECOS_COMMERCIAL_ROUTES.request,
          label: "Solicitar orçamento",
        },
        { href: TONECOS_COMMERCIAL_ROUTES.history, label: "Meus orçamentos" },
      ]
    : []),
  { href: TONECOS_COMMERCIAL_ROUTES.account, label: "Minha conta" },
];
if (import.meta.env.VITE_TONECOS_COINS_ENABLED === "true") {
  links.push({ href: TONECOS_COMMERCIAL_ROUTES.coins, label: "Minhas moedas" });
}

export default function TonecosCommercialNav() {
  const { selectedModels } = useCatalogBrowsing();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.search]);
  return (
    <nav
      aria-label="Navegação TONART Studio"
      className="relative z-40 border-b border-white/10 bg-[hsl(0,0%,5%)]/95 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 px-4 py-3 sm:px-6">
        <Link
          to="/"
          className="min-h-11 py-1 text-2xl font-black tracking-widest text-[hsl(var(--gold-accent))]"
        >
          {BRAND_SHORT_NAME}
        </Link>
        <button
          type="button"
          aria-expanded={menuOpen}
          aria-controls="tonart-commercial-nav-links"
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          onClick={() => setMenuOpen((open) => !open)}
          className="inline-flex min-h-11 items-center rounded-sm border border-white/30 px-4 py-2 font-mono text-xs uppercase tracking-wider text-white/85 hover:border-[hsl(var(--gold-accent))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[hsl(var(--gold-accent))] lg:hidden"
        >
          {menuOpen ? "Fechar" : "Menu"}
        </button>
        <div
          id="tonart-commercial-nav-links"
          className={
            (menuOpen ? "flex" : "hidden") +
            " w-full flex-col gap-1 border-t border-white/10 pt-3 lg:flex lg:w-auto lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-5 lg:gap-y-1 lg:border-0 lg:pt-0"
          }
        >
          {links.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              onClick={() => setMenuOpen(false)}
              className="inline-flex min-h-11 items-center whitespace-nowrap px-2 py-2 font-mono text-[10px] uppercase tracking-wider text-white/70 hover:text-[hsl(var(--gold-accent))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 lg:px-0 lg:py-0"
            >
              {item.label}
              {item.href === TONECOS_COMMERCIAL_ROUTES.request &&
              selectedModels.length > 0
                ? " (" + selectedModels.length + ")"
                : ""}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
