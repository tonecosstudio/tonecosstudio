/**
 * TONART administrative workspace.
 * Navigation inventory comes from the original admin SSOT, not a replacement menu.
 * Live figures come only from the existing production tables via the protected RPC.
 */
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { adminNavigationConfig, type NavigationItem } from "@/config/admin-navigation.config";
import { ADMIN_ROUTES, TONECOS_COMMERCIAL_ROUTES } from "@/config/routes";
import { getTonartAdminOverview, type TonartAdminCoinEntry, type TonartAdminQuote, type TonartAdminOverview } from "@/services/admin/overview/tonart-admin-workspace-service";
import { panelClass, secondaryClass } from "./CommercialPage";
import TonartAdminCatalogReview from "./TonartAdminCatalogReview";

const coinsEnabled = import.meta.env.VITE_TONECOS_COINS_ENABLED === "true";
const quotesEnabled = import.meta.env.VITE_CATALOG_QUOTES_ENABLED === "true";
const integer = new Intl.NumberFormat("pt-BR");
const dates = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" });
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const quoteLabels: Record<TonartAdminQuote["status"], string> = {
  pending: "Recebido", reviewing: "Em análise", answered: "Respondido", archived: "Arquivado",
};
const coinLabels: Record<TonartAdminCoinEntry["type"], string> = {
  admin_credit: "Crédito", purchase_spend: "Utilização", refund: "Estorno",
};

function moduleState(id: string): "active" | "read-only" | "off" {
  if (id === "dashboard") return "active";
  if (id === "users" || id === "orders" || id === "financial-hub" || id === "communication") return "read-only";
  if (id === "credits-hub") return coinsEnabled ? "active" : "read-only";
  if (id === "catalog-hub") return "read-only";
  return "off";
}
function Metric({ label, value, detail }: {label: string; value: number | undefined; detail: string}) {
  return (
    <div className={panelClass + " min-w-0"}>
      <p className="font-mono text-[10px] uppercase tracking-wider text-white/55">{label}</p>
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
  const allItems = adminNavigationConfig.flatMap((section) => section.items);
  const pathname = location.pathname.replace(/\/+$/, "") || "/";
  const activeItem = allItems.find((item) => item.path === pathname);
  const sectionId = pathname === TONECOS_COMMERCIAL_ROUTES.adminCoins
    ? "credits-hub"
    : activeItem?.id ?? (pathname === TONECOS_COMMERCIAL_ROUTES.adminHome ? "dashboard" : "unknown");
  const displayName = sectionId === "unknown" ? "Página não encontrada" : activeItem?.label ?? "Painel";
  const isUsers = sectionId === "users";
  const isDashboard = sectionId === "dashboard";
  const isCoins = sectionId === "credits-hub";
  const isCatalog = sectionId === "catalog-hub";
  const isOrders = sectionId === "orders";
  const isFinancial = sectionId === "financial-hub";
  const isCommunication = sectionId === "communication";
  // The catalog has its own Cloudflare authority. Do not fetch account,
  // quote or Coins aggregates when inspecting catalog media.
  const requiresOverview = isDashboard || isUsers || isCoins ||
    isOrders || isFinancial || isCommunication;
  const users = overview?.recentProfiles.filter((profile) =>
    [profile.email, profile.fullName ?? ""].some((value) => value.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"))),
  ) ?? [];

  useEffect(() => {
    if (!requiresOverview) {
      setLoading(false);
      setError("");
      return;
    }
    let active = true;
    setLoading(true);
    setError("");
    getTonartAdminOverview()
      .then((snapshot) => { if (active) setOverview(snapshot); })
      .catch(() => { if (active) { setOverview(null); setError("Não foi possível carregar os dados administrativos. Confira a conexão e tente novamente."); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload, requiresOverview]);

  const showItem = (item: NavigationItem) => {
    navigate(item.path);
    setSearch("");
  };

  return (
    <section className="mx-auto min-h-[78vh] w-full max-w-[1480px] px-4 py-8 text-white sm:px-6 lg:py-10" aria-label="Painel administrativo TONART">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-5 border-b border-white/15 pb-6">
        <div>
          <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-[hsl(var(--gold-accent))]">
            TONART Studio · Área administrativa
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Painel administrativo</h1>
          <p className="mt-3 max-w-2xl text-sm text-white/60">
            Gestão da conta e operações existentes. Recursos não conectados permanecem identificados e desativados.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={TONECOS_COMMERCIAL_ROUTES.account} className={secondaryClass}>Minha conta</Link>
          <Link to="/modelos" className={secondaryClass}>Ver catálogo</Link>
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[265px_minmax(0,1fr)]">
        <aside className="rounded-sm border border-white/15 bg-[hsl(0,0%,7%)] p-4 lg:sticky lg:top-6" aria-label="Navegação administrativa">
          <div className="mb-5 border-b border-white/10 pb-4">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--gold-accent))]">Backoffice</p>
            <p className="mt-1 text-xs text-white/45">Módulos do sistema original</p>
          </div>
          <nav aria-label="Módulos administrativos" className="space-y-5">
            {adminNavigationConfig.map((group) => (
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
                          "flex min-h-10 w-full items-center justify-between gap-3 rounded-sm border px-3 py-2 text-left text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[hsl(var(--gold-accent))] " +
                          (selected
                            ? "border-[hsl(var(--gold-accent)/0.4)] bg-[hsl(var(--gold-accent)/0.09)] text-[hsl(var(--gold-accent))]"
                            : "border-transparent text-white/70 hover:bg-white/5 hover:text-white")
                        }
                      >
                        <span>{item.label}</span>
                        <span className="shrink-0 text-[10px] text-white/40" aria-label={
                          state === "active" ? "Ativo" : state === "read-only" ? "Consulta" : "Desativado"
                        }>
                          {state === "active" ? "●" : state === "read-only" ? "Consulta" : "—"}
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
              <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-white/45">Administração / {displayName}</p>
              <h2 className="text-2xl font-semibold">{isDashboard ? "Visão operacional" : displayName}</h2>
            </div>
            {requiresOverview && (
              <button className={secondaryClass} type="button" disabled={loading} onClick={() => setReload((v) => v + 1)}>
                Atualizar dados
              </button>
            )}
          </div>

          {requiresOverview && error && (
            <div role="alert" className="mb-6 rounded-sm border border-red-500/40 bg-red-950/20 p-4 text-sm text-red-100">
              {error}
            </div>
          )}
          {requiresOverview && loading && <p role="status" className="mb-6 text-sm text-white/60">Consultando dados administrativos...</p>}

          {isDashboard && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Metric label="Perfis cadastrados" value={overview?.profileCount} detail="Perfis reais da base de produção" />
                <Metric label="Orçamentos recebidos" value={overview?.quoteCount} detail="Solicitações do catálogo" />
                <Metric label="Aguardando resposta" value={overview?.pendingQuoteCount} detail="Pedidos de orçamento pendentes" />
                <Metric label="Coins · lançamentos" value={overview?.coinEntryCount} detail="Registros do livro de moedas" />
              </div>
              <div className="mt-6 grid gap-4 xl:grid-cols-2">
                <section className={panelClass}>
                  <h3 className="text-lg font-semibold">Atendimento de orçamentos</h3>
                  <p className="mt-2 text-sm text-white/60">
                    {overview ? `${integer.format(overview.reviewingQuoteCount)} em análise e ${integer.format(overview.pendingQuoteCount)} aguardando resposta.` : "Acompanhe solicitações do catálogo."}
                  </p>
                  <div className="mt-5">
                    {quotesEnabled ? (
                      <Link to={TONECOS_COMMERCIAL_ROUTES.adminQuotes} className={secondaryClass}>Abrir atendimento</Link>
                    ) : (
                      <span className="text-sm text-white/50">Operação de orçamentos desativada</span>
                    )}
                  </div>
                </section>
                <section className={panelClass}>
                  <h3 className="text-lg font-semibold">Coins · Moedas</h3>
                  <p className="mt-2 text-sm text-white/60">
                    A estrutura de créditos permanece preservada. Não há liberação automática de compra, conversão ou emissão.
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <Link to={ADMIN_ROUTES.credits} className={secondaryClass}>Consultar movimentações</Link>
                    {coinsEnabled ? (
                      <Link to={TONECOS_COMMERCIAL_ROUTES.adminCoins} className={secondaryClass}>Operações autorizadas</Link>
                    ) : (
                      <span className="text-xs text-white/50">Emissão e utilização desativadas</span>
                    )}
                  </div>
                </section>
              </div>
              <section className={panelClass + " mt-6"}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold">Contas recentes</h3>
                  <button className="text-sm text-[hsl(var(--gold-accent))] underline underline-offset-4" onClick={() => navigate(ADMIN_ROUTES.users)} type="button">
                    Ver usuários
                  </button>
                </div>
                {overview && overview.recentProfiles.length === 0 && <p className="mt-4 text-sm text-white/55">Nenhum perfil cadastrado.</p>}
                {overview?.recentProfiles.slice(0, 5).map((p) => (
                  <div key={p.id} className="mt-4 flex flex-wrap justify-between gap-2 border-t border-white/10 pt-4 text-sm">
                    <span className="min-w-0 break-all">{p.fullName || p.email}</span>
                    <span className="text-xs text-white/55">{dates.format(new Date(p.createdAt))}</span>
                  </div>
                ))}
              </section>
            </>
          )}

          {isUsers && (
            <section className={panelClass}>
              <h3 className="text-lg font-semibold">Usuários cadastrados</h3>
              <p className="mt-2 max-w-2xl text-sm text-white/60">
                Consulta autorizada à base de perfis existente. Não cria contas e não altera permissões.
                {overview ? ` Total cadastrado: ${integer.format(overview.profileCount)}.` : ""}
              </p>
              <label className="mt-5 block max-w-md space-y-2 text-xs">
                <span>Buscar nos 25 perfis mais recentes</span>
                <input
                  className="min-h-11 w-full rounded-sm border border-white/25 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-[hsl(var(--gold-accent))]"
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nome ou e-mail"
                />
              </label>
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[440px] border-collapse text-left text-sm">
                  <thead className="border-b border-white/20 text-xs text-white/60">
                    <tr><th className="py-3 pr-3">Nome</th><th className="py-3 pr-3">E-mail</th><th className="py-3">Cadastro</th></tr>
                  </thead>
                  <tbody>
                    {users.map((p) => (
                      <tr key={p.id} className="border-b border-white/10">
                        <td className="py-3 pr-3">{p.fullName || "Não informado"}</td>
                        <td className="py-3 pr-3 break-all">{p.email}</td>
                        <td className="py-3 whitespace-nowrap text-white/60">{dates.format(new Date(p.createdAt))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {overview && users.length === 0 && <p className="py-6 text-sm text-white/55">Nenhum perfil correspondente.</p>}
              </div>
              <p className="mt-4 text-xs text-white/45">Somente leitura · autorização administrativa exigida no Supabase</p>
            </section>
          )}

          {isCoins && (
            <section className={panelClass}>
              <h3 className="text-lg font-semibold">Sistema de créditos · Coins</h3>
              <p className="mt-3 text-sm text-white/65">
                O livro de movimentações continua na base original, com emissão auditável e proteção contra lançamentos duplicados.
                Não representa saldo em reais.
              </p>
              <p className="mt-5 text-2xl font-semibold tabular-nums text-[hsl(var(--gold-accent))]">
                {overview ? integer.format(overview.coinEntryCount) : "—"} <span className="text-sm font-normal text-white/50">movimentações</span>
              </p>
              <div className="mt-6 border-t border-white/15 pt-5">
                <h4 className="mb-2 text-base font-semibold">Histórico de movimentações</h4>
                <p className="mb-4 text-xs text-white/55">Últimos 25 registros do livro canônico, somente para consulta administrativa.</p>
                {overview && overview.recentCoinEntries.length === 0 && (
                  <p className="py-3 text-sm text-white/60">Nenhuma movimentação registrada.</p>
                )}
                {overview && overview.recentCoinEntries.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[540px] border-collapse text-left text-sm">
                      <thead className="border-b border-white/20 text-xs text-white/60">
                        <tr><th className="py-3 pr-3">Data</th><th className="py-3 pr-3">Cliente</th><th className="py-3 pr-3">Tipo</th><th className="py-3 pr-3">Motivo</th><th className="py-3 text-right">Moedas</th></tr>
                      </thead>
                      <tbody>
                        {overview.recentCoinEntries.map((entry) => (
                          <tr key={entry.id} className="border-b border-white/10">
                            <td className="whitespace-nowrap py-3 pr-3 text-white/60">{dates.format(new Date(entry.createdAt))}</td>
                            <td className="break-all py-3 pr-3">{entry.userEmail ?? "Conta sem e-mail"}</td>
                            <td className="py-3 pr-3">{coinLabels[entry.type]}</td>
                            <td className="max-w-[280px] break-words py-3 pr-3 text-white/65">{entry.reason}</td>
                            <td className={"whitespace-nowrap py-3 text-right font-mono tabular-nums " + (entry.delta > 0 ? "text-[hsl(var(--gold-accent))]" : "text-white/80")}>{entry.delta > 0 ? "+" : ""}{integer.format(entry.delta)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              {coinsEnabled ? (
                <Link className={secondaryClass + " mt-5"} to={TONECOS_COMMERCIAL_ROUTES.adminCoins}>Abrir operações autorizadas</Link>
              ) : (
                <p className="mt-5 text-sm text-white/60">
                  Operações de emissão, utilização e estorno desativadas nesta implantação. O módulo não foi excluído.
                </p>
              )}
            </section>
          )}

          {isOrders && (
            <section className={panelClass}>
              <h3 className="text-lg font-semibold">Solicitações recebidas</h3>
              <p className="mt-2 text-sm leading-6 text-white/65">
                Esta área mostra as solicitações de orçamento já existentes. Solicitar um orçamento
                não equivale a confirmar um pedido ou realizar uma compra. Não há pedidos pagos cadastrados por este fluxo.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <Metric label="Solicitações" value={overview?.quoteCount} detail="Total recebido" />
                <Metric label="Em atendimento" value={overview ? overview.pendingQuoteCount + overview.reviewingQuoteCount : undefined} detail="Aguardando ou em análise" />
                <Metric label="Respondidas" value={overview?.answeredQuoteCount} detail="Orçamentos com resposta registrada" />
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-5">
                <h4 className="text-base font-semibold">Últimas solicitações</h4>
                {quotesEnabled ? (
                  <Link className={secondaryClass} to={TONECOS_COMMERCIAL_ROUTES.adminQuotes}>Abrir atendimento</Link>
                ) : (
                  <span className="text-xs text-white/55">Atendimento desativado</span>
                )}
              </div>
              {overview && overview.recentQuotes.length === 0 && (
                <p className="mt-4 text-sm text-white/60">Nenhuma solicitação recebida.</p>
              )}
              {overview && overview.recentQuotes.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[580px] border-collapse text-left text-sm">
                    <thead className="border-b border-white/20 text-xs text-white/55">
                      <tr><th className="py-3 pr-3">Solicitação</th><th className="py-3 pr-3">Cliente</th><th className="py-3 pr-3">Modelos</th><th className="py-3 pr-3">Estado</th><th className="py-3 text-right">Valor informado</th></tr>
                    </thead>
                    <tbody>
                      {overview.recentQuotes.map((q) => (
                        <tr key={q.id} className="border-b border-white/10">
                          <td className="py-3 pr-3"><span className="block">#{q.id.slice(0, 8)}</span><span className="text-xs text-white/50">{dates.format(new Date(q.createdAt))}</span></td>
                          <td className="break-all py-3 pr-3">{q.customerEmail ?? "E-mail não disponível"}</td>
                          <td className="py-3 pr-3 tabular-nums">{integer.format(q.modelCount)}</td>
                          <td className="py-3 pr-3">{quoteLabels[q.status]}</td>
                          <td className="whitespace-nowrap py-3 text-right tabular-nums">{q.quotedAmountCents === null ? "Em análise" : brl.format(q.quotedAmountCents / 100)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="mt-5 text-xs text-white/45">Consulta limitada às 25 solicitações mais recentes. Os totais abrangem toda a base de orçamentos do catálogo.</p>
            </section>
          )}

          {isFinancial && (
            <section className={panelClass}>
              <h3 className="text-lg font-semibold">Visão de valores orçados</h3>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/65">
                Valores extraídos das respostas a orçamentos, não de vendas. Não existe integração de
                recebimentos nesta implantação; valores informados não são faturamento, caixa,
                pagamentos aprovados nem receita realizada.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="border border-white/15 p-5">
                  <p className="text-xs uppercase tracking-wider text-white/55">Soma dos valores orçados</p>
                  <p className="mt-3 text-2xl font-semibold tabular-nums text-[hsl(var(--gold-accent))]">
                    {overview ? brl.format(overview.quotedTotalCents / 100) : "—"}
                  </p>
                  <p className="mt-2 text-xs text-white/50">Sem contabilização de pagamentos</p>
                </div>
                <Metric label="Orçamentos com valor" value={overview?.pricedQuoteCount} detail="Respondidos ou arquivados com preço" />
                <Metric label="Respondidos" value={overview?.answeredQuoteCount} detail="Respostas comerciais atuais" />
                <Metric label="Arquivados" value={overview?.archivedQuoteCount} detail="Solicitações encerradas ou descartadas" />
              </div>
              <div className="mt-6 flex flex-wrap gap-3 border-t border-white/15 pt-5">
                <button type="button" className={secondaryClass} onClick={() => navigate(ADMIN_ROUTES.orders)}>
                  Ver solicitações
                </button>
                <span className="self-center text-xs text-white/50">Pagamentos, assinaturas e conciliação bancária permanecem desativados.</span>
              </div>
            </section>
          )}

          {isCommunication && (
            <section className={panelClass}>
              <h3 className="text-lg font-semibold">Central de Comunicação</h3>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/65">
                Acompanhamento das solicitações do catálogo usando os dados de atendimento existentes.
                Esta página não armazena mensagens e não envia e-mails automaticamente.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Metric label="Aguardando atendimento" value={overview?.pendingQuoteCount} detail="Solicitações recebidas" />
                <Metric label="Em análise" value={overview?.reviewingQuoteCount} detail="Solicitações em atendimento" />
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-5">
                <h4 className="text-base font-semibold">Contatos com atendimento em aberto</h4>
                {quotesEnabled && (
                  <Link to={TONECOS_COMMERCIAL_ROUTES.adminQuotes} className={secondaryClass}>
                    Ver todos os orçamentos
                  </Link>
                )}
              </div>
              <p className="mt-2 text-xs text-white/50">
                Exibindo solicitações pendentes ou em análise entre as 25 solicitações recentes.
                As quantidades acima consideram a base completa.
              </p>
              {overview && overview.recentQuotes.filter((q) =>
                q.status === "pending" || q.status === "reviewing").length === 0 && (
                <p className="mt-5 text-sm text-white/60">
                  Não há atendimentos em aberto entre as últimas solicitações.
                </p>
              )}
              {overview?.recentQuotes.filter((q) =>
                q.status === "pending" || q.status === "reviewing").map((q) => (
                <article key={q.id} className="mt-4 border border-white/15 p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">Solicitação #{q.id.slice(0, 8)}</p>
                      <p className="mt-1 text-xs text-white/55">
                        {dates.format(new Date(q.createdAt))} · {integer.format(q.modelCount)} {q.modelCount === 1 ? "modelo" : "modelos"}
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
                        to={TONECOS_COMMERCIAL_ROUTES.adminQuotes + "?quote=" + encodeURIComponent(q.id)}
                      >
                        Abrir solicitação #{q.id.slice(0, 8)}
                      </Link>
                    )}
                    {q.customerEmail && (
                      <a
                        className={secondaryClass}
                        href={"mailto:" + encodeURIComponent(q.customerEmail) +
                          "?subject=" + encodeURIComponent("TONART Studio — orçamento #" + q.id.slice(0, 8))}
                      >
                        Preparar e-mail para {q.customerEmail}
                      </a>
                    )}
                  </div>
                </article>
              ))}
              <p className="mt-6 text-xs text-white/45">
                Preparar e-mail abre o aplicativo de correio do dispositivo. Envio e resposta não são
                registrados automaticamente no sistema; confirme a situação pelo atendimento.
              </p>
            </section>
          )}

          {isCatalog && (
            <section className={panelClass}>
              <TonartAdminCatalogReview />
            </section>
          )}

          {!isDashboard && !isUsers && !isCoins && !isCatalog && !isOrders && !isFinancial && !isCommunication && (
            <section className={panelClass}>
              <h3 className="text-lg font-semibold">{displayName}</h3>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/65">
                Este módulo integra o painel administrativo original e permanece preservado no repositório.
                Suas operações não estão habilitadas na base de produção atual. Nenhum dado foi apagado
                nem foram criadas funções substitutas.
              </p>
              <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-white/45">Módulo desativado nesta implantação</p>
              <button type="button" className={secondaryClass + " mt-5"} onClick={() => navigate(ADMIN_ROUTES.home)}>Voltar ao painel</button>
            </section>
          )}
        </main>
      </div>
    </section>
  );
}
