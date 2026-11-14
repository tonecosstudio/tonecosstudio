/**
 * TONART administrative workspace.
 * Navigation inventory comes from the original admin SSOT, not a replacement menu.
 * Live figures come only from the existing production tables via the protected RPC.
 */
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  adminNavigationConfig,
  type NavigationItem,
} from "@/config/admin-navigation.config";
import { ADMIN_ROUTES, TONECOS_COMMERCIAL_ROUTES } from "@/config/routes";
import {
  getTonartAdminOverview,
  type TonartAdminCoinEntry,
  type TonartAdminQuote,
  type TonartAdminOverview,
} from "@/services/admin/overview/tonart-admin-workspace-service";
import {
  listTonartAdminProfiles,
  type TonartAdminProfilesPage,
} from "@/services/admin/overview/tonart-admin-profiles-service";
import { panelClass, secondaryClass } from "./CommercialPage";
import TonartAdminCatalogReview from "./TonartAdminCatalogReview";
import TonartAdminOriginalSection from "./TonartAdminOriginalSection";

const coinsEnabled = true;
const quotesEnabled = true;
const USER_PAGE_SIZE = 25;
const integer = new Intl.NumberFormat("pt-BR");
const dates = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" });
const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const quoteLabels: Record<TonartAdminQuote["status"], string> = {
  pending: "Recebido",
  reviewing: "Em análise",
  answered: "Respondido",
  archived: "Arquivado",
};
const coinLabels: Record<TonartAdminCoinEntry["type"], string> = {
  admin_credit: "Crédito",
  purchase_spend: "Utilização",
  refund: "Estorno",
};

const originalAdminSubpages = [
  { parent: "catalog-hub", path: ADMIN_ROUTES.catalogCollections, label: "Coleções do catálogo" },
  { parent: "production-dashboard", path: ADMIN_ROUTES.productionKanban, label: "Quadro de produção" },
  { parent: "production-dashboard", path: ADMIN_ROUTES.productionList, label: "Lista de produção" },
  { parent: "production-dashboard", path: ADMIN_ROUTES.productionCalendar, label: "Calendário de produção" },
  { parent: "production-dashboard", path: ADMIN_ROUTES.productionAnalytics, label: "Análises de produção" },
  { parent: "production-dashboard", path: ADMIN_ROUTES.productionChoices, label: "Escolhas de produção" },
  { parent: "financial-hub", path: ADMIN_ROUTES.financialCollections, label: "Financeiro de coleções" },
  { parent: "payments", path: ADMIN_ROUTES.preorders, label: "Pré-vendas" },
  { parent: "payments", path: ADMIN_ROUTES.paymentMethods, label: "Métodos de pagamento" },
  { parent: "payments", path: ADMIN_ROUTES.paymentKeys, label: "Chaves de pagamento" },
  { parent: "payments", path: ADMIN_ROUTES.paymentCalculator, label: "Calculadora financeira" },
  { parent: "communication", path: ADMIN_ROUTES.communicationQuickReplies, label: "Respostas rápidas" },
  { parent: "communication", path: ADMIN_ROUTES.communicationTemplates, label: "Modelos de mensagem" },
  { parent: "communication", path: ADMIN_ROUTES.communicationNotifications, label: "Configuração de notificações" },
  { parent: "communication", path: ADMIN_ROUTES.communicationHistory, label: "Histórico de comunicações" },
  { parent: "system", path: ADMIN_ROUTES.settingsOperational, label: "Configuração operacional" },
  { parent: "system", path: ADMIN_ROUTES.settingsHolidays, label: "Feriados" },
  { parent: "system", path: ADMIN_ROUTES.settingsLegal, label: "Conformidade legal" },
  { parent: "users", path: ADMIN_ROUTES.groupDetails, label: "Grupos de usuários" },
].filter((section) => !section.path.includes(":"));

function moduleState(id: string): "active" | "read-only" | "off" {
  if (id === "dashboard") return "active";
  if (
    id === "users" ||
    id === "orders" ||
    id === "financial-hub" ||
    id === "communication" ||
    id === "production-dashboard" ||
    id === "analytics"
  )
    return "read-only";
  if (id === "quote-intake") return quotesEnabled ? "active" : "off";
  if (id === "credits-hub") return coinsEnabled ? "active" : "off";
  if (id === "catalog-hub") return "read-only";
  return "off";
}
function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: number | undefined;
  detail: string;
}) {
  return (
    <div className={panelClass + " min-w-0"}>
      <p className="font-mono text-[10px] uppercase tracking-wider text-white/55">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tabular-nums text-[hsl(var(--gold-accent))]">
        {value === undefined ? "—" : integer.format(value)}
      </p>
      <p className="mt-2 text-xs text-white/55">{detail}</p>
    </div>
  );
}

export default function TonecosAdminHomePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [overview, setOverview] = useState<TonartAdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [userOffset, setUserOffset] = useState(0);
  const [userReload, setUserReload] = useState(0);
  const [userDirectory, setUserDirectory] =
    useState<TonartAdminProfilesPage | null>(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  // Add the existing TONART quote intake to the legacy navigation.
  // All original groups and destinations remain sourced from the canonical registry.
  const adminGroups = adminNavigationConfig
    .filter((section) => section.id !== "credits" || coinsEnabled)
    .map((section) =>
      section.id === "operations" && quotesEnabled
        ? {
            ...section,
            items: [
              section.items[0],
              {
                id: "quote-intake",
                label: "Atendimento de orçamentos",
                path: TONECOS_COMMERCIAL_ROUTES.adminQuotes,
              },
              ...section.items.slice(1),
            ],
          }
        : section,
    );
  const allItems = adminGroups.flatMap((section) => section.items);
  const pathname = location.pathname.replace(/\/+$/, "") || "/";
  const selectedSubpage = originalAdminSubpages.find((item) => item.path === pathname);
  const activeItem = allItems.find(
    (item) => item.path === pathname || item.id === selectedSubpage?.parent,
  );
  const sectionId =
    pathname === TONECOS_COMMERCIAL_ROUTES.adminCoins
      ? "credits-hub"
      : (activeItem?.id ??
        (pathname === TONECOS_COMMERCIAL_ROUTES.adminHome
          ? "dashboard"
          : "unknown"));
  const displayName =
    sectionId === "unknown"
      ? "Página não encontrada"
      : (selectedSubpage?.label ?? activeItem?.label ?? "Painel");
  const isUsers = sectionId === "users" && !selectedSubpage;
  const isDashboard = sectionId === "dashboard";
  const isCoins = coinsEnabled && sectionId === "credits-hub";
  const isCatalog = sectionId === "catalog-hub" && !selectedSubpage;
  const isOrders = sectionId === "orders" && !selectedSubpage;
  const isFinancial = sectionId === "financial-hub" && !selectedSubpage;
  const isCommunication = sectionId === "communication" && !selectedSubpage;
  const isProduction = sectionId === "production-dashboard" && !selectedSubpage;
  const isAnalytics = sectionId === "analytics" && !selectedSubpage;
  // The catalog has its own Cloudflare authority. Do not fetch account,
  // quote or Coins aggregates when inspecting catalog media.
  const requiresOverview =
    (isDashboard && !selectedSubpage) ||
    isCoins ||
    isOrders ||
    isFinancial ||
    isCommunication ||
    isProduction ||
    isAnalytics ||
    (selectedSubpage !== undefined &&
      ["production-dashboard", "communication", "financial-hub"].includes(
        selectedSubpage.parent,
      ));

  useEffect(() => {
    if (!requiresOverview) {
      setLoading(false);
      setError("");
      return;
    }
    let active = true;
    setLoading(true);
    setError("");
    setOverview(null);
    getTonartAdminOverview()
      .then((snapshot) => {
        if (active) setOverview(snapshot);
      })
      .catch(() => {
        if (active) {
          setOverview(null);
          setError(
            "Não foi possível carregar os dados administrativos. Confira a conexão e tente novamente.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reload, requiresOverview]);

  useEffect(() => {
    if (!isUsers) {
      setUsersLoading(false);
      setUsersError("");
      return;
    }
    let active = true;
    setUsersLoading(true);
    setUsersError("");
    listTonartAdminProfiles({
      search: appliedSearch,
      limit: USER_PAGE_SIZE,
      offset: userOffset,
    })
      .then((result) => {
        if (!active) return;
        if (result.total > 0 && userOffset >= result.total) {
          setUserOffset(
            Math.floor((result.total - 1) / USER_PAGE_SIZE) * USER_PAGE_SIZE,
          );
          return;
        }
        setUserDirectory(result);
      })
      .catch(() => {
        if (active) {
          setUserDirectory(null);
          setUsersError(
            "Não foi possível carregar a lista de usuários. Confira a conexão e tente novamente.",
          );
        }
      })
      .finally(() => {
        if (active) setUsersLoading(false);
      });
    return () => {
      active = false;
    };
  }, [appliedSearch, isUsers, userOffset, userReload]);

  // Only use the existing protected overview. Never treat this bounded list
  // as the full queue or an independent source of quote state.
  const attentionQuotes = (overview?.recentQuotes ?? [])
    .filter((quote) => quote.status === "pending" || quote.status === "reviewing")
    .sort(
      (left, right) =>
        (left.status === "pending" ? 0 : 1) -
          (right.status === "pending" ? 0 : 1) ||
        Date.parse(left.createdAt) - Date.parse(right.createdAt),
    )
    .slice(0, 4);
  const attentionTotal = overview
    ? overview.pendingQuoteCount + overview.reviewingQuoteCount
    : 0;

  const showItem = (item: NavigationItem) => {
    navigate(item.path);
    setSearch("");
    setAppliedSearch("");
    setUserOffset(0);
  };

  return (
    <section
      className="mx-auto min-h-[78vh] w-full max-w-[1480px] px-4 py-8 text-white sm:px-6 lg:py-10"
      aria-label="Painel administrativo TONART"
    >
      <header className="mb-8 flex flex-wrap items-end justify-between gap-5 border-b border-white/15 pb-6">
        <div>
          <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-[hsl(var(--gold-accent))]">
            TONART Studio · Área administrativa
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Painel administrativo
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-white/60">
            Gestão da conta e operações existentes. Recursos não conectados
            permanecem identificados e desativados.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={TONECOS_COMMERCIAL_ROUTES.account}
            className={secondaryClass}
          >
            Minha conta
          </Link>
          <Link to="/modelos" className={secondaryClass}>
            Ver catálogo
          </Link>
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[265px_minmax(0,1fr)]">
        <aside
          className="rounded-sm border border-white/15 bg-[hsl(0,0%,7%)] p-4 lg:sticky lg:top-6 lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto"
          aria-label="Navegação administrativa"
        >
          <div className="mb-5 border-b border-white/10 pb-4">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--gold-accent))]">
              Backoffice
            </p>
            <p className="mt-1 text-xs text-white/45">
              Módulos do sistema original
            </p>
          </div>
          <nav aria-label="Módulos administrativos" className="space-y-5">
            {adminGroups.map((group) => (
              <div key={group.id}>
                <h2 className="mb-2 px-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--gold-accent))]">
                  {group.title}
                </h2>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const state = moduleState(item.id);
                    const selected = sectionId === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => showItem(item)}
                        aria-current={selected ? "page" : undefined}
                        className={
                          "flex min-h-10 w-full items-center justify-between gap-3 rounded-sm border px-3 py-2 text-left text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[hsl(var(--gold-accent))] " +
                          (selected
                            ? "border-[hsl(var(--gold-accent)/0.4)] bg-[hsl(var(--gold-accent)/0.09)] text-[hsl(var(--gold-accent))]"
                            : "border-transparent text-white/70 hover:bg-white/5 hover:text-white")
                        }
                      >
                        <span>{item.label}</span>
                        <span
                          className="shrink-0 text-[10px] text-white/40"
                          aria-label={
                            state === "active"
                              ? "Ativo"
                              : state === "read-only"
                                ? "Consulta"
                                : "Em integração"
                          }
                        >
                          {state === "active"
                            ? "●"
                            : state === "read-only"
                              ? "Consulta"
                              : "Integração"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <main className="min-w-0" aria-label="Conteúdo administrativo">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-white/45">
                Administração / {displayName}
              </p>
              <h2 className="text-2xl font-semibold">
                {isDashboard ? "Visão operacional" : displayName}
              </h2>
            </div>
            {requiresOverview && (
              <button
                className={secondaryClass}
                type="button"
                disabled={loading}
                onClick={() => setReload((v) => v + 1)}
              >
                Atualizar dados
              </button>
            )}
          </div>

          {activeItem && originalAdminSubpages.some((item) => item.parent === activeItem.id) && (
            <nav aria-label="Páginas do módulo administrativo" className="mb-5 flex flex-wrap gap-2">
              {originalAdminSubpages
                .filter((item) => item.parent === activeItem.id && item.path !== activeItem.path)
                .map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    aria-current={selectedSubpage?.path === item.path ? "page" : undefined}
                    className={secondaryClass}
                  >
                    {item.label}
                  </Link>
                ))}
            </nav>
          )}
          {requiresOverview && error && (
            <div
              role="alert"
              className="mb-6 rounded-sm border border-red-500/40 bg-red-950/20 p-4 text-sm text-red-100"
            >
              {error}
            </div>
          )}
          {requiresOverview && loading && (
            <p role="status" className="mb-6 text-sm text-white/60">
              Consultando dados administrativos...
            </p>
          )}

          {selectedSubpage && (
            <TonartAdminOriginalSection
              section={selectedSubpage}
              overview={overview}
              loading={loading}
              quotesEnabled={quotesEnabled}
              parentPath={activeItem?.path ?? ADMIN_ROUTES.home}
            />
          )}
          {(isProduction || isAnalytics) && (
            <TonartAdminOriginalSection
              section={{
                parent: isProduction ? "production-dashboard" : "financial-hub",
                path: isProduction ? ADMIN_ROUTES.production : ADMIN_ROUTES.analytics,
                label: isProduction ? "Produção" : "Análises de orçamentos",
              }}
              overview={overview}
              loading={loading}
              quotesEnabled={quotesEnabled}
              parentPath={ADMIN_ROUTES.home}
            />
          )}
          {isDashboard && (
            <>
              <div
                className={
                  "grid gap-4 sm:grid-cols-2 " +
                  (coinsEnabled ? "xl:grid-cols-4" : "xl:grid-cols-3")
                }
              >
                <Metric
                  label="Perfis cadastrados"
                  value={overview?.profileCount}
                  detail="Perfis reais da base de produção"
                />
                <Metric
                  label="Orçamentos recebidos"
                  value={overview?.quoteCount}
                  detail="Solicitações do catálogo"
                />
                <Metric
                  label="Em atendimento"
                  value={
                    overview
                      ? overview.pendingQuoteCount + overview.reviewingQuoteCount
                      : undefined
                  }
                  detail="Aguardando resposta ou em análise"
                />
                {coinsEnabled && (
                  <Metric
                    label="Coins · lançamentos"
                    value={overview?.coinEntryCount}
                    detail="Registros do livro de moedas"
                  />
                )}
              </div>
              <div className="mt-6 grid gap-4 xl:grid-cols-2">
                <section className={panelClass}>
                  <h3 className="text-lg font-semibold">
                    Atendimento de orçamentos
                  </h3>
                  <p className="mt-2 text-sm text-white/60">
                    {overview
                      ? `${integer.format(overview.reviewingQuoteCount)} em análise e ${integer.format(overview.pendingQuoteCount)} aguardando resposta.`
                      : "Acompanhe solicitações do catálogo."}
                  </p>
                  {quotesEnabled && overview && (
                    <div className="mt-5 border-t border-white/15 pt-4">
                      <h4 className="text-sm font-semibold">
                        Prioridades entre as solicitações recentes
                      </h4>
                      {attentionQuotes.length > 0 ? (
                        <ul
                          className="mt-3 space-y-2"
                          aria-label="Solicitações para atendimento"
                        >
                          {attentionQuotes.map((quote) => (
                            <li
                              key={quote.id}
                              className="flex flex-wrap items-center justify-between gap-3 border border-white/10 px-3 py-3 text-sm"
                            >
                              <div className="min-w-0">
                                <p className="font-medium">
                                  #{quote.id.slice(0, 8)} ·{" "}
                                  {quoteLabels[quote.status]}
                                </p>
                                <p className="mt-1 break-all text-xs text-white/55">
                                  {quote.customerEmail ??
                                    "E-mail não disponível"}
                                </p>
                                <p className="mt-1 text-xs text-white/50">
                                  {dates.format(new Date(quote.createdAt))}
                                </p>
                              </div>
                              <Link
                                to={
                                  TONECOS_COMMERCIAL_ROUTES.adminQuotes +
                                  "?quote=" +
                                  encodeURIComponent(quote.id)
                                }
                                aria-label={
                                  "Abrir orçamento #" + quote.id.slice(0, 8)
                                }
                                className="text-xs text-[hsl(var(--gold-accent))] underline-offset-4 hover:underline"
                              >
                                Atender
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-3 text-xs text-white/60">
                          {attentionTotal > 0
                            ? "Existem solicitações em atendimento fora das 25 mais recentes. Consulte a fila completa."
                            : "Nenhuma solicitação aguardando atendimento."}
                        </p>
                      )}
                      {attentionQuotes.length > 0 && (
                        <p className="mt-3 text-xs text-white/50">
                          Esta lista usa somente as 25 solicitações mais recentes;
                          consulte a fila completa para ver todas.
                        </p>
                      )}
                    </div>
                  )}
                  <div className="mt-5">
                    {quotesEnabled ? (
                      <Link
                        to={TONECOS_COMMERCIAL_ROUTES.adminQuotes}
                        className={secondaryClass}
                      >
                        Abrir atendimento
                      </Link>
                    ) : (
                      <span className="text-sm text-white/50">
                        Operação de orçamentos desativada
                      </span>
                    )}
                  </div>
                </section>
                {coinsEnabled && <section className={panelClass}>
                  <h3 className="text-lg font-semibold">Coins · Moedas</h3>
                  <p className="mt-2 text-sm text-white/60">
                    A estrutura de créditos permanece preservada. Não há
                    liberação automática de compra, conversão ou emissão.
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <Link to={ADMIN_ROUTES.credits} className={secondaryClass}>
                      Consultar movimentações
                    </Link>
                    {coinsEnabled ? (
                      <Link
                        to={TONECOS_COMMERCIAL_ROUTES.adminCoins}
                        className={secondaryClass}
                      >
                        Operações autorizadas
                      </Link>
                    ) : (
                      <span className="text-xs text-white/50">
                        Emissão e utilização desativadas
                      </span>
                    )}
                  </div>
                </section>}
              </div>
              <section className={panelClass + " mt-6"}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">Contas recentes</h3>
                  <button
                    className="text-sm text-[hsl(var(--gold-accent))] underline underline-offset-4"
                    onClick={() => navigate(ADMIN_ROUTES.users)}
                    type="button"
                  >
                    Ver usuários
                  </button>
                </div>
                {overview && overview.recentProfiles.length === 0 && (
                  <p className="mt-4 text-sm text-white/55">
                    Nenhum perfil cadastrado.
                  </p>
                )}
                {overview?.recentProfiles.slice(0, 5).map((p) => (
                  <div
                    key={p.id}
                    className="mt-4 flex flex-wrap justify-between gap-2 border-t border-white/10 pt-4 text-sm"
                  >
                    <div className="min-w-0">
                      {p.fullName && (
                        <p className="break-words font-medium">{p.fullName}</p>
                      )}
                      <p className="mt-1 break-all text-xs text-white/55">
                        {p.email}
                      </p>
                    </div>
                    <span className="text-xs text-white/55">
                      {dates.format(new Date(p.createdAt))}
                    </span>
                  </div>
                ))}
              </section>
            </>
          )}

          {isUsers && (
            <section className={panelClass}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">Usuários cadastrados</h3>
                  <p className="mt-2 max-w-2xl text-sm text-white/60">
                    Consulta administrativa paginada à base completa de perfis.
                    Não cria contas e não altera permissões.
                    {userDirectory
                      ? ` Total correspondente: ${integer.format(userDirectory.total)}.`
                      : ""}
                  </p>
                </div>
                <button
                  type="button"
                  className={secondaryClass}
                  disabled={usersLoading}
                  onClick={() => setUserReload((value) => value + 1)}
                >
                  Atualizar lista
                </button>
              </div>

              <form
                className="mt-5 flex max-w-2xl flex-wrap items-end gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  setAppliedSearch(search.trim());
                  setUserOffset(0);
                }}
              >
                <label className="min-w-[240px] flex-1 space-y-2 text-xs">
                  <span>Buscar em todos os perfis</span>
                  <input
                    className="min-h-11 w-full rounded-sm border border-white/25 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-[hsl(var(--gold-accent))]"
                    type="search"
                    value={search}
                    maxLength={160}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Nome ou e-mail"
                  />
                </label>
                <button type="submit" className={secondaryClass}>
                  Buscar
                </button>
                {(search || appliedSearch) && (
                  <button
                    type="button"
                    className={secondaryClass}
                    onClick={() => {
                      setSearch("");
                      setAppliedSearch("");
                      setUserOffset(0);
                    }}
                  >
                    Limpar
                  </button>
                )}
              </form>

              {usersError && (
                <div
                  role="alert"
                  className="mt-5 rounded-sm border border-red-500/40 bg-red-950/20 p-4 text-sm text-red-100"
                >
                  {usersError}
                </div>
              )}
              {usersLoading && (
                <p role="status" className="mt-5 text-sm text-white/60">
                  Consultando usuários...
                </p>
              )}

              {!usersLoading && !usersError && userDirectory && (
                <>
                  <div className="mt-5 overflow-x-auto">
                    <table className="w-full min-w-[440px] border-collapse text-left text-sm">
                      <thead className="border-b border-white/20 text-xs text-white/60">
                        <tr>
                          <th className="py-3 pr-3">Nome</th>
                          <th className="py-3 pr-3">E-mail</th>
                          <th className="py-3">Cadastro</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userDirectory.rows.map((profile) => (
                          <tr key={profile.id} className="border-b border-white/10">
                            <td className="py-3 pr-3">
                              {profile.fullName || "Não informado"}
                            </td>
                            <td className="break-all py-3 pr-3">
                              {profile.email}
                            </td>
                            <td className="whitespace-nowrap py-3 text-white/60">
                              {dates.format(new Date(profile.createdAt))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {userDirectory.rows.length === 0 && (
                      <p className="py-6 text-sm text-white/55">
                        Nenhum perfil correspondente.
                      </p>
                    )}
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-white/55">
                      {userDirectory.total === 0
                        ? "Nenhum resultado"
                        : `Mostrando ${integer.format(userDirectory.offset + 1)}–${integer.format(
                            Math.min(
                              userDirectory.offset + userDirectory.rows.length,
                              userDirectory.total,
                            ),
                          )} de ${integer.format(userDirectory.total)}`}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className={secondaryClass}
                        disabled={userOffset === 0 || usersLoading}
                        onClick={() =>
                          setUserOffset((value) =>
                            Math.max(0, value - USER_PAGE_SIZE),
                          )
                        }
                      >
                        Anterior
                      </button>
                      <button
                        type="button"
                        className={secondaryClass}
                        disabled={
                          usersLoading ||
                          userDirectory.offset + userDirectory.rows.length >=
                            userDirectory.total
                        }
                        onClick={() =>
                          setUserOffset((value) => value + USER_PAGE_SIZE)
                        }
                      >
                        Próxima
                      </button>
                    </div>
                  </div>
                </>
              )}

              <p className="mt-4 text-xs text-white/45">
                Somente leitura · autorização administrativa exigida no Supabase
              </p>
            </section>
          )}

          {isCoins && (
            <section className={panelClass}>
              <h3 className="text-lg font-semibold">
                Sistema de créditos · Coins
              </h3>
              <p className="mt-3 text-sm text-white/65">
                O livro de movimentações continua na base original, com emissão
                auditável e proteção contra lançamentos duplicados. Não
                representa saldo em reais.
              </p>
              <p className="mt-5 text-2xl font-semibold tabular-nums text-[hsl(var(--gold-accent))]">
                {overview ? integer.format(overview.coinEntryCount) : "—"}{" "}
                <span className="text-sm font-normal text-white/50">
                  movimentações
                </span>
              </p>
              <div className="mt-6 border-t border-white/15 pt-5">
                <h4 className="mb-2 text-base font-semibold">
                  Histórico de movimentações
                </h4>
                <p className="mb-4 text-xs text-white/55">
                  Últimos 25 registros do livro canônico, somente para consulta
                  administrativa.
                </p>
                {overview && overview.recentCoinEntries.length === 0 && (
                  <p className="py-3 text-sm text-white/60">
                    Nenhuma movimentação registrada.
                  </p>
                )}
                {overview && overview.recentCoinEntries.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[540px] border-collapse text-left text-sm">
                      <thead className="border-b border-white/20 text-xs text-white/60">
                        <tr>
                          <th className="py-3 pr-3">Data</th>
                          <th className="py-3 pr-3">Cliente</th>
                          <th className="py-3 pr-3">Tipo</th>
                          <th className="py-3 pr-3">Motivo</th>
                          <th className="py-3 text-right">Moedas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overview.recentCoinEntries.map((entry) => (
                          <tr
                            key={entry.id}
                            className="border-b border-white/10"
                          >
                            <td className="whitespace-nowrap py-3 pr-3 text-white/60">
                              {dates.format(new Date(entry.createdAt))}
                            </td>
                            <td className="break-all py-3 pr-3">
                              {entry.userEmail ?? "Conta sem e-mail"}
                            </td>
                            <td className="py-3 pr-3">
                              {coinLabels[entry.type]}
                            </td>
                            <td className="max-w-[280px] break-words py-3 pr-3 text-white/65">
                              {entry.reason}
                            </td>
                            <td
                              className={
                                "whitespace-nowrap py-3 text-right font-mono tabular-nums " +
                                (entry.delta > 0
                                  ? "text-[hsl(var(--gold-accent))]"
                                  : "text-white/80")
                              }
                            >
                              {entry.delta > 0 ? "+" : ""}
                              {integer.format(entry.delta)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              {coinsEnabled ? (
                <Link
                  className={secondaryClass + " mt-5"}
                  to={TONECOS_COMMERCIAL_ROUTES.adminCoins}
                >
                  Abrir operações autorizadas
                </Link>
              ) : (
                <p className="mt-5 text-sm text-white/60">
                  Operações de emissão, utilização e estorno desativadas nesta
                  implantação. O módulo não foi excluído.
                </p>
              )}
            </section>
          )}

          {isOrders && (
            <section className={panelClass}>
              <h3 className="text-lg font-semibold">Solicitações recebidas</h3>
              <p className="mt-2 text-sm leading-6 text-white/65">
                Esta área mostra as solicitações de orçamento já existentes.
                Solicitar um orçamento não equivale a confirmar um pedido ou
                realizar uma compra. Não há pedidos pagos cadastrados por este
                fluxo.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <Metric
                  label="Solicitações"
                  value={overview?.quoteCount}
                  detail="Total recebido"
                />
                <Metric
                  label="Em atendimento"
                  value={
                    overview
                      ? overview.pendingQuoteCount +
                        overview.reviewingQuoteCount
                      : undefined
                  }
                  detail="Aguardando ou em análise"
                />
                <Metric
                  label="Respondidas"
                  value={overview?.answeredQuoteCount}
                  detail="Orçamentos com resposta registrada"
                />
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-5">
                <h4 className="text-base font-semibold">
                  Últimas solicitações
                </h4>
                {quotesEnabled ? (
                  <Link
                    className={secondaryClass}
                    to={TONECOS_COMMERCIAL_ROUTES.adminQuotes}
                  >
                    Abrir atendimento
                  </Link>
                ) : (
                  <span className="text-xs text-white/55">
                    Atendimento desativado
                  </span>
                )}
              </div>
              {overview && overview.recentQuotes.length === 0 && (
                <p className="mt-4 text-sm text-white/60">
                  Nenhuma solicitação recebida.
                </p>
              )}
              {overview && overview.recentQuotes.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[580px] border-collapse text-left text-sm">
                    <thead className="border-b border-white/20 text-xs text-white/55">
                      <tr>
                        <th className="py-3 pr-3">Solicitação</th>
                        <th className="py-3 pr-3">Cliente</th>
                        <th className="py-3 pr-3">Modelos</th>
                        <th className="py-3 pr-3">Estado</th>
                        <th className="py-3 text-right">Valor informado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.recentQuotes.map((q) => (
                        <tr key={q.id} className="border-b border-white/10">
                          <td className="py-3 pr-3">
                            <span className="block">#{q.id.slice(0, 8)}</span>
                            <span className="text-xs text-white/50">
                              {dates.format(new Date(q.createdAt))}
                            </span>
                          </td>
                          <td className="break-all py-3 pr-3">
                            {q.customerEmail ?? "E-mail não disponível"}
                          </td>
                          <td className="py-3 pr-3 tabular-nums">
                            {integer.format(q.modelCount)}
                          </td>
                          <td className="py-3 pr-3">{quoteLabels[q.status]}</td>
                          <td className="whitespace-nowrap py-3 text-right tabular-nums">
                            {q.quotedAmountCents === null
                              ? "Em análise"
                              : brl.format(q.quotedAmountCents / 100)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="mt-5 text-xs text-white/45">
                Consulta limitada às 25 solicitações mais recentes. Os totais
                abrangem toda a base de orçamentos do catálogo.
              </p>
            </section>
          )}

          {isFinancial && (
            <section className={panelClass}>
              <h3 className="text-lg font-semibold">
                Visão de valores orçados
              </h3>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/65">
                Valores extraídos das respostas a orçamentos, não de vendas. Não
                representam caixa ou receita realizada. Os pagamentos de pré-venda
                são acompanhados separadamente no fluxo de pedidos e comprovantes.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="border border-white/15 p-5">
                  <p className="text-xs uppercase tracking-wider text-white/55">
                    Soma dos valores orçados
                  </p>
                  <p className="mt-3 text-2xl font-semibold tabular-nums text-[hsl(var(--gold-accent))]">
                    {overview
                      ? brl.format(overview.quotedTotalCents / 100)
                      : "—"}
                  </p>
                  <p className="mt-2 text-xs text-white/50">
                    Sem contabilização de pagamentos
                  </p>
                </div>
                <Metric
                  label="Orçamentos com valor"
                  value={overview?.pricedQuoteCount}
                  detail="Respondidos ou arquivados com preço"
                />
                <Metric
                  label="Respondidos"
                  value={overview?.answeredQuoteCount}
                  detail="Respostas comerciais atuais"
                />
                <Metric
                  label="Arquivados"
                  value={overview?.archivedQuoteCount}
                  detail="Solicitações encerradas ou descartadas"
                />
              </div>
              <div className="mt-6 flex flex-wrap gap-3 border-t border-white/15 pt-5">
                <button
                  type="button"
                  className={secondaryClass}
                  onClick={() => navigate(ADMIN_ROUTES.orders)}
                >
                  Ver solicitações
                </button>
                <span className="self-center text-xs text-white/50">
                  Comprovantes de assinatura são revisados no fluxo dedicado.
                </span>
                <Link
                  className={secondaryClass}
                  to={TONECOS_COMMERCIAL_ROUTES.adminSubscriptions}
                >
                  Revisar assinaturas
                </Link>
                <Link className={secondaryClass} to={ADMIN_ROUTES.preorders}>
                  Gerenciar pré-vendas
                </Link>
              </div>
            </section>
          )}

          {isCommunication && (
            <section className={panelClass}>
              <h3 className="text-lg font-semibold">Central de Comunicação</h3>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/65">
                Acompanhamento das solicitações do catálogo usando a própria fila
                de orçamentos. A resposta comercial e o valor ficam registrados no
                orçamento e no histórico; esta página não cria uma caixa paralela.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <Metric
                  label="Aguardando atendimento"
                  value={overview?.pendingQuoteCount}
                  detail="Solicitações recebidas"
                />
                <Metric
                  label="Em análise"
                  value={overview?.reviewingQuoteCount}
                  detail="Solicitações em atendimento"
                />
                <Metric
                  label="Respondidos"
                  value={overview?.answeredQuoteCount}
                  detail="Respostas comerciais disponíveis ao cliente"
                />
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-5">
                <h4 className="text-base font-semibold">
                  Atividade comercial recente
                </h4>
                {quotesEnabled && (
                  <Link
                    to={TONECOS_COMMERCIAL_ROUTES.adminQuotes}
                    className={secondaryClass}
                  >
                    Ver todos os orçamentos
                  </Link>
                )}
              </div>
              <p className="mt-2 text-xs text-white/50">
                Exibindo solicitações pendentes, em análise ou respondidas entre as
                25 solicitações recentes. As quantidades acima consideram a base
                completa.
              </p>
              {overview &&
                overview.recentQuotes.filter(
                  (q) =>
                    q.status === "pending" ||
                    q.status === "reviewing" ||
                    q.status === "answered",
                ).length === 0 && (
                  <p className="mt-5 text-sm text-white/60">
                    Não há atividade recente de orçamento entre as últimas solicitações.
                  </p>
                )}
              {overview?.recentQuotes
                .filter(
                  (q) =>
                    q.status === "pending" ||
                    q.status === "reviewing" ||
                    q.status === "answered",
                )
                .map((q) => (
                  <article
                    key={q.id}
                    className="mt-4 border border-white/15 p-4 sm:p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">
                          Solicitação #{q.id.slice(0, 8)}
                        </p>
                        <p className="mt-1 text-xs text-white/55">
                          {dates.format(new Date(q.createdAt))} ·{" "}
                          {integer.format(q.modelCount)}{" "}
                          {q.modelCount === 1 ? "modelo" : "modelos"}
                        </p>
                      </div>
                      <span className="border border-white/20 px-3 py-1 text-xs">
                        {quoteLabels[q.status]}
                      </span>
                    </div>
                    <p className="mt-4 break-all text-sm text-white/80">
                      {q.customerEmail ?? "E-mail de contato indisponível"}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {quotesEnabled && (
                        <Link
                          className={secondaryClass}
                          to={
                            TONECOS_COMMERCIAL_ROUTES.adminQuotes +
                            "?quote=" +
                            encodeURIComponent(q.id)
                          }
                        >
                          Abrir solicitação #{q.id.slice(0, 8)}
                        </Link>
                      )}
                      {q.customerEmail && (
                        <a
                          className={secondaryClass}
                          href={
                            "mailto:" +
                            encodeURIComponent(q.customerEmail) +
                            "?subject=" +
                            encodeURIComponent(
                              "TONART Studio — orçamento #" + q.id.slice(0, 8),
                            )
                          }
                        >
                          Preparar e-mail para {q.customerEmail}
                        </a>
                      )}
                    </div>
                  </article>
                ))}
              <p className="mt-6 text-xs text-white/45">
                Preparar e-mail abre o aplicativo de correio do dispositivo e é
                opcional. A resposta comercial canônica deve ser registrada no
                próprio orçamento para permanecer visível ao cliente e no histórico.
              </p>
            </section>
          )}

          {isCatalog && (
            <section className={panelClass}>
              <TonartAdminCatalogReview />
            </section>
          )}

          {!selectedSubpage &&
            !isDashboard &&
            !isUsers &&
            !isCoins &&
            !isCatalog &&
            !isOrders &&
            !isFinancial &&
            !isCommunication &&
            !isProduction &&
            !isAnalytics &&
            sectionId !== "unknown" &&
            sectionId !== "credits-hub" && (
              <TonartAdminOriginalSection
                section={{
                  parent: sectionId,
                  path: pathname,
                  label: displayName,
                }}
                overview={null}
                loading={false}
                quotesEnabled={quotesEnabled}
                parentPath={ADMIN_ROUTES.home}
              />
            )}
          {(sectionId === "unknown" ||
            (!coinsEnabled && sectionId === "credits-hub")) && (
              <section className={panelClass}>
                <h3 className="text-lg font-semibold">{displayName}</h3>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-white/65">
                  Esta página não está disponível na implantação comercial atual.
                  Nenhuma operação foi executada.
                </p>
                <Link className={secondaryClass + " mt-5"} to={ADMIN_ROUTES.home}>
                  Voltar ao painel
                </Link>
              </section>
            )}
        </main>
      </div>
    </section>
  );
}
