/**
 * TONART administrative workspace.
 * Navigation inventory comes from the original admin SSOT, not a replacement menu.
 * Live figures come only from the existing production tables via the protected RPC.
 */
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { adminNavigationConfig, type NavigationItem } from "@/config/admin-navigation.config";
import { ADMIN_ROUTES, TONECOS_COMMERCIAL_ROUTES } from "@/config/routes";
import { getTonartAdminOverview, type TonartAdminCoinEntry, type TonartAdminOverview } from "@/services/admin/tonart-admin-workspace-service";
import { panelClass, secondaryClass } from "./CommercialPage";

const coinsEnabled = import.meta.env.VITE_TONECOS_COINS_ENABLED === "true";
const quotesEnabled = import.meta.env.VITE_CATALOG_QUOTES_ENABLED === "true";
const integer = new Intl.NumberFormat("pt-BR");
const dates = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" });
const coinLabels: Record<TonartAdminCoinEntry["type"], string> = {
  admin_credit: "Crédito", purchase_spend: "Utilização", refund: "Estorno",
};

function moduleState(id: string): "active" | "read-only" | "off" {
  if (id === "dashboard") return "active";
  if (id === "users") return "read-only";
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
  const users = overview?.recentProfiles.filter((profile) =>
    [profile.email, profile.fullName ?? ""].some((value) => value.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"))),
  ) ?? [];

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    getTonartAdminOverview()
      .then((snapshot) => { if (active) setOverview(snapshot); })
      .catch(() => { if (active) { setOverview(null); setError("Não foi possível carregar os dados administrativos. Confira a conexão e tente novamente."); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);

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
            <button className={secondaryClass} type="button" disabled={loading} onClick={() => setReload((v) => v + 1)}>
              Atualizar dados
            </button>
          </div>

          {error && (
            <div role="alert" className="mb-6 rounded-sm border border-red-500/40 bg-red-950/20 p-4 text-sm text-red-100">
              {error}
            </div>
          )}
          {loading && <p role="status" className="mb-6 text-sm text-white/60">Consultando dados administrativos...</p>}

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

          {isCatalog && (
            <section className={panelClass}>
              <h3 className="text-lg font-semibold">Catálogo de modelos</h3>
              <p className="mt-3 max-w-2xl text-sm text-white/65">
                O catálogo público continua conectado à sua origem canônica. A antiga edição administrativa
                de modelos depende da reconciliação de seus serviços de gestão; não será simulada.
              </p>
              <Link className={secondaryClass + " mt-5"} to="/modelos">Abrir catálogo</Link>
              <p className="mt-5 text-xs text-white/45">Gestão de produtos preservada no projeto · edição desativada</p>
            </section>
          )}

          {!isDashboard && !isUsers && !isCoins && !isCatalog && (
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
