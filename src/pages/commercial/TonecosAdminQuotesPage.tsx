import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { TONECOS_COMMERCIAL_ROUTES } from "@/config/routes";
import {
  answerCatalogQuoteRequest,
  changeCatalogQuoteStatus,
  loadAdminCatalogQuotePage,
  type AdminCatalogQuote,
  type AdminCatalogQuoteQuery,
} from "@/services/admin/config/catalog-quote-admin-service";
import {
  loadCatalogQuoteHistory,
  type CatalogQuoteEvent,
} from "@/services/quotes/catalog-quote-history-service";
import { actionClass, CommercialPage, fieldClass, panelClass, secondaryClass } from "./CommercialPage";
import { commercialQuoteErrorText } from "./commercial-quote-error-text";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const eventDate = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

function adminEventLabel(event: CatalogQuoteEvent): string {
  if (event.type === "submitted") return "Solicitação recebida";
  if (event.type === "answered")
    return event.amount === null
      ? "Orçamento respondido"
      : `Valor respondido: ${brl.format(event.amount)}`;
  if (event.toStatus === "reviewing") return "Marcado em análise";
  if (event.toStatus === "archived") return "Atendimento arquivado";
  if (event.toStatus === "pending") return "Retornado para novo";
  return "Situação atualizada";
}
const statusLabels: Record<string,string> = {
  pending: "Novo", reviewing: "Em análise",
  answered: "Respondido", archived: "Arquivado",
};
/** Accept Brazilian currency grouping without silently turning R$ 1.234,56 into R$ 1,23. */
function parseQuoteAmount(input: string): number {
  const raw = input.trim();
  const br = /^(?:[1-9]\d{0,2}(?:\.\d{3})+|(?:0|[1-9]\d*))(?:,\d{1,2})?$/;
  const plain = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;
  if (!br.test(raw) && !plain.test(raw)) return NaN;
  return Number(br.test(raw) ? raw.replace(/\./g, "").replace(",", ".") : raw);
}
const PAGE_SIZE = 25;
type StatusFilter = "all" | "pending" | "reviewing" | "answered" | "archived";
export default function TonecosAdminQuotesPage() {
  const [params] = useSearchParams();
  const requestedId = params.get("quote");
  const selectedId = requestedId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestedId)
    ? requestedId.toLowerCase() : null;
  const invalidSelection = requestedId !== null && !selectedId;
  const [quotes, setQuotes] = useState<AdminCatalogQuote[]>([]);
  const [history, setHistory] = useState<Record<string, CatalogQuoteEvent[]>>({});
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [price, setPrice] = useState<Record<string, string>>({});
  const [responseMessage, setResponseMessage] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (invalidSelection) {
      setQuotes([]);
      setHistory({});
      setTotal(0);
      setLoading(false);
      setError("");
      return;
    }

    let active = true;
    setQuotes([]);
    setHistory({});
    setLoading(true);
    setError("");

    const query: AdminCatalogQuoteQuery = selectedId
      ? { quoteId: selectedId, limit: 1, offset: 0 }
      : {
          status: statusFilter === "all" ? null : statusFilter,
          limit: PAGE_SIZE,
          offset,
        };

    loadAdminCatalogQuotePage(query)
      .then(async (result) => ({
        result,
        history: await loadCatalogQuoteHistory(
          result.rows.map((quote) => quote.id),
        ),
      }))
      .then(({ result, history: quoteHistory }) => {
        if (!active) return;
        if (!selectedId && result.total > 0 && offset >= result.total) {
          setOffset(
            Math.floor((result.total - 1) / PAGE_SIZE) * PAGE_SIZE,
          );
          return;
        }
        setQuotes(result.rows);
        setTotal(result.total);
        setHistory(quoteHistory);
      })
      .catch((err: unknown) => {
        if (active) {
          setError(commercialQuoteErrorText(err, "admin"));
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [attempt, invalidSelection, offset, selectedId, statusFilter]);

  async function reply(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    if (busyId) return;
    setBusyId(id); setError(""); setNotice("");
    try {
      const amount = parseQuoteAmount(price[id] ?? "");
      const message = (responseMessage[id] ?? "").trim();
      if (!Number.isFinite(amount) || amount <= 0 || amount > 99999999.99) {
        throw new Error("admin_catalog_quote_response_invalid");
      }
      await answerCatalogQuoteRequest(id, amount, message);
      setPrice((current) => ({ ...current, [id]: "" }));
      setResponseMessage((current) => ({ ...current, [id]: "" }));
      setNotice("Resposta e valor registrados. A solicitação foi marcada como respondida.");
      setAttempt((current) => current + 1);
    } catch (err) {
      setError(commercialQuoteErrorText(err, "admin"));
    } finally { setBusyId(null); }
  }

  async function updateStatus(quoteId: string, status: "pending" | "reviewing" | "archived") {
    if (busyId) return;
    setBusyId(quoteId); setError(""); setNotice("");
    try {
      await changeCatalogQuoteStatus(quoteId, status);
      setNotice("Situação do orçamento atualizada.");
      setAttempt((current) => current + 1);
    } catch (err) {
      setError(commercialQuoteErrorText(err, "admin"));
    } finally { setBusyId(null); }
  }

  return (
    <CommercialPage title="Atendimento de orçamentos" intro="Área restrita da TONART Studio. Verifique os modelos no catálogo antes de informar um valor. Nenhuma cobrança é iniciada automaticamente.">
      <div className="mb-6 flex flex-wrap gap-3">
        <Link className={secondaryClass} to={TONECOS_COMMERCIAL_ROUTES.adminHome}>Voltar ao painel administrativo</Link>
        <button
          type="button"
          className={secondaryClass}
          disabled={loading || busyId !== null}
          onClick={() => setAttempt((current) => current + 1)}
        >
          {loading ? "Atualizando..." : "Atualizar solicitações"}
        </button>
        {requestedId !== null && <Link className={secondaryClass} to={TONECOS_COMMERCIAL_ROUTES.adminQuotes}>Ver todos os orçamentos</Link>}
      </div>
      {!requestedId && (
        <div className="mb-6 flex max-w-4xl flex-wrap items-end justify-between gap-3 border border-white/15 p-4">
          <label className="space-y-2 text-sm">
            <span className="block text-xs text-white/60">Filtrar por situação</span>
            <select
              aria-label="Filtrar orçamentos por situação"
              className={fieldClass}
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as StatusFilter);
                setOffset(0);
              }}
            >
              <option value="all">Todas</option>
              <option value="pending">Novas</option>
              <option value="reviewing">Em análise</option>
              <option value="answered">Respondidas</option>
              <option value="archived">Arquivadas</option>
            </select>
          </label>
          <p className="text-xs text-white/55">
            {total === 0
              ? "Nenhuma solicitação"
              : `Mostrando ${offset + 1}–${Math.min(offset + quotes.length, total)} de ${total}`}
          </p>
        </div>
      )}
      {notice && <p role="status" className="mb-5 max-w-3xl border border-white/20 p-4 text-sm">{notice}</p>}
      {error && <div role="alert" className="mb-5 max-w-3xl border border-red-500/40 p-4 text-sm text-red-200">
        <p>{error}</p>
        {error === "Acesso administrativo não autorizado." && <p className="mt-3 text-xs text-white/70">
          Acesso administrativo restrito. A autorização deve ser provisionada
          pela equipe após verificar a titularidade da conta.
        </p>}
        <button type="button" className={secondaryClass + " mt-3"}
          onClick={() => setAttempt((n) => n + 1)}>Tentar novamente</button>
      </div>}
      {loading ? <p role="status">Verificando autorização e orçamentos...</p> : null}
      {!loading && !error && invalidSelection && (
        <p role="alert" className={panelClass}>Referência de orçamento inválida. Consulte a lista completa.</p>
      )}
      {!loading && !error && !invalidSelection && selectedId && quotes.length === 0 && (
        <p role="status" className={panelClass}>
          Solicitação não encontrada.
        </p>
      )}
      {!loading && !error && !requestedId && quotes.length === 0 && (
        <p className={panelClass}>Nenhuma solicitação recebida.</p>
      )}
      {!loading && !error && <ul className="grid max-w-4xl gap-4">
        {quotes.map((quote) => (
          <li key={quote.id} className={panelClass}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold">Solicitação #{quote.id.slice(0, 8)}</h2>
              <span className="border border-white/20 px-3 py-1 text-xs">{statusLabels[quote.status] ?? "Em atualização"}</span>
            </div>
            <p className="mb-1 text-sm text-white/80">{quote.customerName || "Cliente"}</p>
            <p className="mb-3 text-xs text-white/65">
              <a href={"mailto:" + encodeURIComponent(quote.customerEmail)} className="underline underline-offset-2 hover:text-white">
                {quote.customerEmail}
              </a>
              {" · "}{new Date(quote.createdAt).toLocaleDateString("pt-BR")}
            </p>
            <ul className="space-y-2 text-sm">
              {quote.items.map((item) => (
                <li key={item.slug}>
                  <Link to={"/modelos/" + encodeURIComponent(item.slug)} className="text-[hsl(var(--gold-accent))] hover:underline">
                    {item.slug.replace(/-/g, " ")}
                  </Link> · {item.quantity} {item.quantity === 1 ? "unidade" : "unidades"}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-white/65">
              WhatsApp: {quote.whatsapp || "Não informado"} · CEP: {quote.postalCode || "Não informado"}
            </p>
            <p className="mt-1 text-xs text-white/65">
              Escala: {quote.scale || "A definir"} · Acabamento: {quote.finishing || "A definir"}
            </p>
            {quote.notes && <p className="mt-3 whitespace-pre-wrap text-sm text-white/65">{quote.notes}</p>}
            {(history[quote.id] ?? []).length > 0 && (
              <section className="mt-4 border-t border-white/15 pt-4">
                <h3 className="text-sm font-semibold">Histórico do atendimento</h3>
                <ol className="mt-3 space-y-2">
                  {(history[quote.id] ?? []).map((event) => (
                    <li key={event.id} className="text-xs text-white/65">
                      <span className="text-white/85">{adminEventLabel(event)}</span>
                      {" · "}
                      <time dateTime={event.createdAt}>
                        {eventDate.format(new Date(event.createdAt))}
                      </time>
                    </li>
                  ))}
                </ol>
              </section>
            )}
            <div className="mt-4 flex flex-wrap gap-2" aria-label={"Andamento do orçamento " + quote.id.slice(0,8)}>
              {quote.status === "pending" && (
                <button type="button" className={secondaryClass} disabled={busyId !== null}
                  onClick={() => { void updateStatus(quote.id, "reviewing"); }}>Marcar em análise</button>
              )}
              {quote.status === "reviewing" && (
                <button type="button" className={secondaryClass} disabled={busyId !== null}
                  onClick={() => { void updateStatus(quote.id, "pending"); }}>Voltar para novo</button>
              )}
              {quote.status !== "archived" && (
                <button type="button" className={secondaryClass} disabled={busyId !== null}
                  onClick={() => { void updateStatus(quote.id, "archived"); }}>Arquivar</button>
              )}
            </div>
            <div className="mt-5 border-t border-white/15 pt-4">
              {quote.status === "archived" && quote.quotedAmount === null ? (
                <p className="text-sm text-white/60">Solicitação arquivada sem valor.</p>
              ) : quote.quotedAmount !== null ? (
                <div className="space-y-3">
                  <p className="text-sm font-semibold">Valor informado: {brl.format(quote.quotedAmount)}</p>
                  {quote.responseMessage && (
                    <div className="border-l-2 border-[hsl(var(--gold-accent)/0.55)] pl-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-white/55">Mensagem ao cliente</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-white/80">{quote.responseMessage}</p>
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={(event) => { void reply(event, quote.id); }} className="grid gap-3 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)]">
                  <label className="block space-y-2 text-sm">
                    <span>Valor total (R$)</span>
                    <input aria-label={"Valor do orçamento " + quote.id.slice(0, 8)}
                      className={fieldClass} type="text" inputMode="decimal" required maxLength={12}
                      placeholder="Ex.: 1.249,90" value={price[quote.id] ?? ""}
                      onChange={(event) => setPrice((current) => ({ ...current, [quote.id]: event.target.value }))} />
                  </label>
                  <label className="block space-y-2 text-sm">
                    <span>Mensagem ao cliente</span>
                    <textarea aria-label={"Mensagem ao cliente " + quote.id.slice(0, 8)}
                      className={fieldClass + " min-h-24 py-3"} required maxLength={2000} rows={3}
                      placeholder="Informe validade, prazo estimado ou observações relevantes."
                      value={responseMessage[quote.id] ?? ""}
                      onChange={(event) => setResponseMessage((current) => ({ ...current, [quote.id]: event.target.value }))} />
                  </label>
                  <div className="sm:col-span-2">
                    <button type="submit" disabled={busyId !== null} className={actionClass}>
                      {busyId === quote.id ? "Salvando..." : "Enviar resposta"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </li>
        ))}
      </ul>}
      {!loading && !error && !requestedId && total > PAGE_SIZE && (
        <div className="mt-6 flex max-w-4xl items-center justify-between gap-3">
          <button
            type="button"
            className={secondaryClass}
            disabled={offset === 0}
            onClick={() => setOffset((value) => Math.max(0, value - PAGE_SIZE))}
          >
            Anterior
          </button>
          <span className="text-xs text-white/55">
            Página {Math.floor(offset / PAGE_SIZE) + 1} de {Math.ceil(total / PAGE_SIZE)}
          </span>
          <button
            type="button"
            className={secondaryClass}
            disabled={offset + quotes.length >= total}
            onClick={() => setOffset((value) => value + PAGE_SIZE)}
          >
            Próxima
          </button>
        </div>
      )}
    </CommercialPage>
  );
}
