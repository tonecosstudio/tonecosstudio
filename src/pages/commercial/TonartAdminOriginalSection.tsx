import { Link } from "react-router-dom";
import { ADMIN_ROUTES, TONECOS_COMMERCIAL_ROUTES } from "@/config/routes";
import type {
  TonartAdminOverview,
  TonartAdminQuote,
} from "@/services/admin/overview/tonart-admin-workspace-service";
import { panelClass, secondaryClass } from "./CommercialPage";

type OriginalSection = {
  parent: string;
  path: string;
  label: string;
};

const number = new Intl.NumberFormat("pt-BR");
const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const statusNames: Record<TonartAdminQuote["status"], string> = {
  pending: "Recebido",
  reviewing: "Em análise",
  answered: "Respondido",
  archived: "Arquivado",
};

const guidance: Record<string, string> = {
  "catalog-hub": "As coleções e os modelos pertencem ao catálogo Cloudflare existente. Revise as referências no catálogo, sem duplicá-las no Supabase.",
  "production-dashboard": "Visão preparatória das solicitações recebidas. Um orçamento não representa ordem de fabricação, prazo confirmado nem produção iniciada.",
  "financial-hub": "Valores de propostas comerciais. Não representam recebimentos, faturamento, vendas concluídas ou conciliação financeira.",
  payments: "O sistema original contempla métodos de pagamento, chaves e cálculo financeiro. Nenhuma cobrança pode ser criada aqui antes da ligação com a autoridade de pagamentos.",
  communication: "Use as respostas dos orçamentos já registradas. O histórico abaixo não afirma que e-mails ou mensagens externas foram enviados.",
  system: "As configurações antigas estão preservadas no repositório. Não serão gravadas alterações até existir uma autoridade operacional validada.",
  users: "Os grupos históricos ainda não estão associados ao controle de permissões da TONART. Consulte as contas atuais pela lista protegida.",
};

function SnapshotMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border border-white/15 p-4">
      <p className="text-xs text-white/55">{label}</p>
      <p className="mt-2 text-xl font-semibold tabular-nums text-[hsl(var(--gold-accent))]">
        {value}
      </p>
    </div>
  );
}

/**
 * One presentation adapter for historical administrative routes. It consumes
 * the existing protected overview, never creates another store or RPC.
 */
export default function TonartAdminOriginalSection({
  section,
  overview,
  loading,
  quotesEnabled,
  parentPath,
}: {
  section: OriginalSection;
  overview: TonartAdminOverview | null;
  loading: boolean;
  quotesEnabled: boolean;
  parentPath: string;
}) {
  const production = section.parent === "production-dashboard";
  const communication = section.parent === "communication";
  const financial = section.parent === "financial-hub";
  const hasSnapshot = production || communication || financial;
  const responsesOnly = communication && section.path === ADMIN_ROUTES.communicationHistory;
  const recentQuotes = (overview?.recentQuotes ?? []).filter(
    (quote) =>
      !responsesOnly ||
      quote.status === "answered" ||
      quote.status === "archived",
  );
  const nextPath =
    section.parent === "catalog-hub"
      ? ADMIN_ROUTES.catalog
      : section.parent === "users"
        ? ADMIN_ROUTES.users
        : section.parent === "payments"
          ? ADMIN_ROUTES.financialHub
          : hasSnapshot
            ? TONECOS_COMMERCIAL_ROUTES.adminQuotes
            : parentPath;
  const nextLabel =
    section.parent === "catalog-hub"
      ? "Revisar catálogo"
      : section.parent === "users"
        ? "Consultar usuários"
        : section.parent === "payments"
          ? "Ver valores orçados"
          : hasSnapshot
            ? "Abrir atendimento de orçamentos"
            : "Voltar ao módulo";

  return (
    <section className={panelClass} aria-label={section.label}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{section.label}</h3>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/65">
            {guidance[section.parent] ??
              "Página do sistema original preservada. Os dados e as permissões desta operação serão vinculados à autoridade existente antes de habilitar alterações."}
          </p>
        </div>
        <span className="border border-white/20 px-3 py-1 text-xs text-white/60">
          {hasSnapshot ? "Consulta real" : "Interface em integração"}
        </span>
      </div>

      {hasSnapshot && loading && (
        <p className="mt-6 text-sm text-white/60" role="status">
          Carregando dados administrativos...
        </p>
      )}
      {hasSnapshot && !loading && overview && (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {financial ? (
              <>
                <SnapshotMetric
                  label="Valor total das propostas"
                  value={currency.format(overview.quotedTotalCents / 100)}
                />
                <SnapshotMetric
                  label="Orçamentos com preço"
                  value={number.format(overview.pricedQuoteCount)}
                />
                <SnapshotMetric
                  label="Orçamentos respondidos"
                  value={number.format(overview.answeredQuoteCount)}
                />
              </>
            ) : (
              <>
                <SnapshotMetric
                  label="Solicitações recebidas"
                  value={number.format(overview.pendingQuoteCount)}
                />
                <SnapshotMetric
                  label="Em análise"
                  value={number.format(overview.reviewingQuoteCount)}
                />
                <SnapshotMetric
                  label="Respondidas"
                  value={number.format(overview.answeredQuoteCount)}
                />
              </>
            )}
          </div>
          {section.path !== ADMIN_ROUTES.productionCalendar && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold">
                {responsesOnly
                  ? "Respostas registradas nas solicitações recentes"
                  : "Solicitações recentes"}
              </h4>
              <p className="mt-1 text-xs text-white/50">
                Exibindo somente os registros recebidos da consulta administrativa protegida.
              </p>
              {recentQuotes.length === 0 ? (
                <p className="mt-4 text-sm text-white/60">
                  Nenhuma solicitação correspondente entre os registros recentes.
                </p>
              ) : (
                <div className="mt-4 space-y-2">
                  {recentQuotes.slice(0, 10).map((quote) => (
                    <div
                      key={quote.id}
                      className="flex flex-wrap items-center justify-between gap-3 border border-white/10 px-4 py-3 text-sm"
                    >
                      <div>
                        <p>Solicitação #{quote.id.slice(0, 8)}</p>
                        <p className="mt-1 break-all text-xs text-white/55">
                          {quote.customerEmail ?? "Cliente sem e-mail disponível"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-white/60">
                          {statusNames[quote.status]}
                        </span>
                        {quotesEnabled && (
                          <Link
                            className="text-xs text-[hsl(var(--gold-accent))] underline-offset-4 hover:underline"
                            to={
                              TONECOS_COMMERCIAL_ROUTES.adminQuotes +
                              "?quote=" +
                              encodeURIComponent(quote.id)
                            }
                          >
                            Abrir orçamento
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {section.path === ADMIN_ROUTES.productionCalendar && (
            <p className="mt-6 text-sm text-white/60">
              Nenhuma data de produção é inferida de solicitações ou de prazos de proposta. A agenda será preenchida somente com eventos efetivamente cadastrados.
            </p>
          )}
        </>
      )}

      {!hasSnapshot && (
        <p className="mt-6 border-l-2 border-white/25 pl-4 text-sm text-white/60">
          A estrutura de navegação está pronta. Nenhum pagamento, mensagem, chave, configuração ou registro de produção será criado sem a integração canônica correspondente.
        </p>
      )}
      <div className="mt-6 border-t border-white/15 pt-5">
        <Link
          className={secondaryClass}
          to={hasSnapshot && !quotesEnabled ? parentPath : nextPath}
        >
          {hasSnapshot && !quotesEnabled ? "Voltar ao módulo" : nextLabel}
        </Link>
      </div>
    </section>
  );
}
