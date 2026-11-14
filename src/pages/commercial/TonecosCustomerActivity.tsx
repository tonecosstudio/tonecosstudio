import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TONECOS_COMMERCIAL_ROUTES } from "@/config/routes";
import {
  loadMyCatalogQuotePage,
  type CustomerCatalogQuote,
} from "@/services/customer/catalog-quote-service";
import { commercialQuoteErrorText } from "./commercial-quote-error-text";
import { panelClass, secondaryClass } from "./CommercialPage";

const quoteStatusLabels: Record<string, string> = {
  pending: "Recebido",
  reviewing: "Em análise",
  answered: "Respondido",
  archived: "Arquivado",
};
const quoteValue = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const PAGE_SIZE = 5;

/** Read-only projection of the already-authorized quote history, not an order
 * or production store. The complete history remains in Meus orçamentos.
 */
export default function TonecosCustomerActivity({
  userId,
  area,
}: {
  userId: string;
  area: "pedidos" | "producao";
}) {
  const [rows, setRows] = useState<CustomerCatalogQuote[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const isProduction = area === "producao";

  useEffect(() => {
    let active = true;
    setRows([]);
    setTotal(null);
    setLoading(true);
    setError("");
    loadMyCatalogQuotePage(userId, { limit: PAGE_SIZE, offset: 0 })
      .then((page) => {
        if (!active) return;
        setRows(page.rows);
        setTotal(page.total);
      })
      .catch((failure: unknown) => {
        if (active) setError(commercialQuoteErrorText(failure));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId, attempt]);

  return (
    <section className={panelClass} aria-label="Atividade comercial da conta">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            {isProduction ? "Pré-produção e propostas" : "Suas solicitações"}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
            {isProduction
              ? "Acompanhe a análise comercial antes da fabricação. Uma proposta não é ordem de produção, e nenhuma etapa de fabricação é inferida do orçamento."
              : "Aqui estão as últimas solicitações vinculadas à sua conta. Orçamento não é compra confirmada ou pedido pago."}
          </p>
        </div>
        <Link
          className={secondaryClass}
          to={TONECOS_COMMERCIAL_ROUTES.history}
        >
          Consultar meus orçamentos
        </Link>
      </div>

      {loading && (
        <p role="status" className="mt-6 text-sm text-white/60">
          Carregando suas solicitações...
        </p>
      )}
      {error && (
        <div
          role="alert"
          className="mt-6 border border-red-500/40 p-4 text-sm text-red-200"
        >
          <p>{error}</p>
          {error ===
          "Sua sessão expirou. Entre novamente para continuar." ? (
            <Link
              className={secondaryClass + " mt-3"}
              to={
                TONECOS_COMMERCIAL_ROUTES.login +
                "?next=" +
                encodeURIComponent(TONECOS_COMMERCIAL_ROUTES.account)
              }
            >
              Entrar novamente
            </Link>
          ) : (
            <button
              type="button"
              className={secondaryClass + " mt-3"}
              onClick={() => setAttempt((value) => value + 1)}
            >
              Tentar novamente
            </button>
          )}
        </div>
      )}
      {!loading && !error && total === 0 && (
        <div className="mt-6 border-t border-white/15 pt-5">
          <p className="text-sm text-white/65">
            Você ainda não enviou solicitações de orçamento.
          </p>
          <Link className={secondaryClass + " mt-4"} to="/modelos">
            Explorar modelos
          </Link>
        </div>
      )}
      {!loading && !error && total !== null && total > 0 && (
        <div className="mt-6">
          <p className="mb-4 text-xs text-white/55">
            {total} {total === 1 ? "solicitação" : "solicitações"} na conta.
            Exibindo até {PAGE_SIZE} solicitações recentes.
          </p>
          <ul className="space-y-3">
            {rows.map((quote) => (
              <li
                key={quote.id}
                className="flex flex-wrap items-start justify-between gap-3 border border-white/15 p-4"
              >
                <div>
                  <p className="text-sm font-semibold">
                    Orçamento #{quote.id.slice(0, 8)}
                  </p>
                  <p className="mt-1 text-xs text-white/55">
                    {quote.items.length}{" "}
                    {quote.items.length === 1 ? "modelo" : "modelos"} ·{" "}
                    {new Date(quote.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                  <span className="mt-2 inline-block border border-white/25 px-2 py-1 text-xs text-white/70">
                    {quoteStatusLabels[quote.status] ?? "Em atualização"}
                  </span>
                </div>
                <div className="text-right text-xs text-white/75">
                  {quote.quotedAmount === null
                    ? "Valor em análise"
                    : quoteValue.format(quote.quotedAmount)}
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-xs text-white/50">
            O histórico completo, as respostas e os eventos ficam em Meus
            orçamentos. Nenhuma produção ou pagamento é iniciado nesta página.
          </p>
        </div>
      )}
    </section>
  );
}
