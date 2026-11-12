/**
 * Commercial entry for the canonical administrative workspace.
 * Reuses the legacy navigation inventory while keeping unavailable operations
 * disabled until their original backends are reconciled with the current DB.
 * No duplicate accounts, administrator memberships or business tables.
 */
import { Link } from "react-router-dom";
import { adminNavigationConfig } from "@/config/admin-navigation.config";
import { TONECOS_COMMERCIAL_ROUTES } from "@/config/routes";
import { CommercialPage, panelClass, secondaryClass } from "./CommercialPage";

const quotesEnabled = import.meta.env.VITE_CATALOG_QUOTES_ENABLED === "true";
const coinsEnabled = import.meta.env.VITE_TONECOS_COINS_ENABLED === "true";

export default function TonecosAdminHomePage() {
  return (
    <CommercialPage
      title="Painel administrativo"
      intro="Administração da TONART Studio. Os recursos existentes permanecem organizados aqui, sem liberar operações que ainda não estão conectadas à base de produção."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <section className={panelClass}>
          <h2 className="mb-2 text-lg font-semibold">Atendimento de orçamentos</h2>
          <p className="mb-5 text-sm text-white/65">Receber, analisar e responder solicitações de clientes.</p>
          {quotesEnabled ? (
            <Link className={secondaryClass} to={TONECOS_COMMERCIAL_ROUTES.adminQuotes}>
              Abrir atendimento
            </Link>
          ) : (
            <span className="text-sm text-white/55">Desativado nesta etapa</span>
          )}
        </section>
        <section className={panelClass}>
          <h2 className="mb-2 text-lg font-semibold">Coins · Moedas</h2>
          <p className="mb-5 text-sm text-white/65">
            Módulo de créditos virtuais já existente. Créditos e movimentações só ficam
            disponíveis quando a operação estiver habilitada.
          </p>
          {coinsEnabled ? (
            <Link className={secondaryClass} to={TONECOS_COMMERCIAL_ROUTES.adminCoins}>
              Administrar moedas
            </Link>
          ) : (
            <span className="text-sm text-white/55">Preservado · operações desativadas</span>
          )}
        </section>
      </div>

      <section className="mt-8" aria-label="Módulos administrativos existentes">
        <h2 className="mb-2 text-xl font-semibold">Áreas do sistema original</h2>
        <p className="mb-5 text-sm text-white/65">
          Estas áreas continuam preservadas no projeto. A integração operacional delas
          depende de suas tabelas e serviços canônicos; não são links ativos nesta implantação.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {adminNavigationConfig.map((section) => (
            <div className={panelClass} key={section.id}>
              <h3 className="mb-3 text-sm font-semibold text-[hsl(var(--gold-accent))]">
                {section.title}
              </h3>
              <ul className="space-y-3">
                {section.items.filter((item) => item.path !== "/admin").map((item) => (
                  <li key={item.id} className="flex items-start justify-between gap-3 text-xs">
                    <span className="text-white/80">{item.label}</span>
                    <span className="shrink-0 text-white/45">Em integração</span>
                  </li>
                ))}
                {section.items.every((item) => item.path === "/admin") && (
                  <li className="text-xs text-white/60">Painel disponível nesta página</li>
                )}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link className={secondaryClass} to={TONECOS_COMMERCIAL_ROUTES.account}>Minha conta</Link>
        <Link className={secondaryClass} to="/modelos">Ver catálogo</Link>
      </div>
    </CommercialPage>
  );
}
