/** Commercial navigation is isolated from the public catalog's read-only bundle. */
import { Link } from "react-router-dom";
import { BRAND_SHORT_NAME } from "@/config/brand";
import { TONECOS_COMMERCIAL_ROUTES } from "@/config/routes";
import { useCatalogBrowsing } from "@/services/catalog/catalog-browsing-context";

const links = [
  { href: "/", label: "Início" },
  { href: "/modelos", label: "Modelos" },
  { href: TONECOS_COMMERCIAL_ROUTES.request, label: "Solicitar orçamento" },
  { href: TONECOS_COMMERCIAL_ROUTES.history, label: "Meus orçamentos" },
  { href: TONECOS_COMMERCIAL_ROUTES.account, label: "Minha conta" },
];

export default function TonecosCommercialNav() {
  const { selectedModels } = useCatalogBrowsing();
  return (
    <nav aria-label="Navegação Tonecos Studio" className="relative z-40 border-b border-white/10 bg-[hsl(0,0%,5%)]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 px-4 py-3 sm:px-6">
        <Link to="/" className="min-h-11 py-1 text-2xl font-black tracking-widest text-[hsl(var(--gold-accent))]">
          {BRAND_SHORT_NAME}
        </Link>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          {links.map((item) => (
            <Link key={item.href} to={item.href} className="inline-flex min-h-11 items-center font-mono text-[10px] uppercase tracking-wider text-white/70 hover:text-[hsl(var(--gold-accent))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
              {item.label}
              {item.href === TONECOS_COMMERCIAL_ROUTES.request && selectedModels.length > 0 ? " (" + selectedModels.length + ")" : ""}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
