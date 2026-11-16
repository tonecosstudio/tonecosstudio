import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { TONECOS_COMMERCIAL_ROUTES } from "@/config/routes";
import {
  answerCatalogQuoteRequest,
  answerTonartExtraOrder,
  cancelAdminTonartExtraOrder,
  changeCatalogQuoteStatus,
  loadAdminCatalogQuotePage,
  type AdminCatalogQuote,
  type AdminCatalogQuoteQuery,
} from "@/services/admin/config/catalog-quote-admin-service";
import {
  loadCatalogQuoteHistory,
  type CatalogQuoteEvent,
} from "@/services/quotes/catalog-quote-history-service";
import {
  actionClass,
  CommercialPage,
  fieldClass,
  panelClass,
  secondaryClass,
} from "./CommercialPage";
import { commercialQuoteErrorText } from "./commercial-quote-error-text";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
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
const statusLabels: Record<string, string> = {
  pending: "Novo",
  reviewing: "Em análise",
  answered: "Respondido",
  archived: "Arquivado",
};
/** Accept Brazilian currency grouping without silently turning R$ 1.234,56 into R$ 1,23. */
function parseQuoteAmount(input: string): number {
  const raw = input.trim();
  const br = /^(?:[1-9]\d{0,2}(?:\.\d{3})+|(?:0|[1-9]\d*))(?:,\d{1,2})?$/;
  const plain = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;
  if (!br.test(raw) && !plain.test(raw)) return NaN;
  return Number(br.test(raw) ? raw.replace(/\./g, "").replace(",", ".") : raw);
}
function parseDiscountPercent(input: string): number {
  const raw = input.trim();
  if (!/^(?:0|[1-9]\d?)$/.test(raw)) return NaN;
  const value = Number(raw);
  return value <= 50 ? value : NaN;
}
function discountedTotal(listAmount: number, discountPercent: number): number {
  const discountAmount = Math.round(
    ((listAmount * discountPercent) / 100 + Number.EPSILON) * 100,
  ) / 100;
  return Number((listAmount - discountAmount).toFixed(2));
}
function quotePricingLines(quote: AdminCatalogQuote): string[] {
  const lines: string[] = [];
  if (quote.discountAmount > 0 && quote.listAmount !== null) {
    lines.push(`Valor antes da Black Friday: ${brl.format(quote.listAmount)}`);
    lines.push(`Black Friday (${quote.discountPercent}%): −${brl.format(quote.discountAmount)}`);
  }
  lines.push(`${quote.discountAmount > 0 ? "Valor final com desconto" : "Valor informado"}: ${brl.format(quote.quotedAmount ?? 0)}`);
  return lines;
}
function quotedResponseEmail(quote: AdminCatalogQuote): string {
  if (quote.quotedAmount === null || !quote.responseMessage) {
    throw new Error("admin_catalog_quote_response_invalid");
  }
  const subject = `TONART Studio — resposta ao orçamento #${quote.id.slice(0, 8)}`;
  const body = [
    "Olá,",
    "",
    "Sua solicitação de orçamento foi analisada pela TONART Studio.",
    ...quotePricingLines(quote),
    "",
    quote.responseMessage,
    "",
    "Consulte o histórico na sua conta:",
    "https://tonartstudio.com.br/meus-orcamentos",
    "",
    "Atenciosamente,",
    "TONART Studio",
  ].join("\n");
  return `mailto:${encodeURIComponent(quote.customerEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
function quotedResponseWhatsApp(quote: AdminCatalogQuote): string | null {
  if (quote.quotedAmount === null || !quote.responseMessage) return null;
  const digits = (quote.whatsapp ?? "").replace(/\D/g, "");
  const phone = /^55[1-9][0-9]{9,10}$/.test(digits)
    ? digits
    : /^[1-9][0-9]{9,10}$/.test(digits)
      ? `55${digits}`
      : null;
  if (!phone) return null;
  const body = [
    "Olá! Aqui é a TONART Studio.",
    `Respondemos ao orçamento #${quote.id.slice(0, 8)}.`,
    ...quotePricingLines(quote),
    quote.responseMessage,
    "Detalhes disponíveis em https://tonartstudio.com.br/meus-orcamentos",
  ].join("\n");
  return `https://wa.me/${phone}?text=${encodeURIComponent(body)}`;
}
const PAGE_SIZE = 25;
type StatusFilter = "all" | "pending" | "reviewing" | "answered" | "archived";
export default function TonecosAdminQuotesPage() {
  const [params] = useSearchParams();
  const requestedId = params.get("quote");
  const selectedId =
    requestedId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      requestedId,
    )
      ? requestedId.toLowerCase()
      : null;
  const invalidSelection = requestedId !== null && !selectedId;
  const [quotes, setQuotes] = useState<AdminCatalogQuote[]>([]);
  const [history, setHistory] = useState<Record<string, CatalogQuoteEvent[]>>(
    {},
  );
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [price, setPrice] = useState<Record<string, string>>({});
  const [discountPercent, setDiscountPercent] = useState<Record<string, string>>({});
  const [responseMessage, setResponseMessage] = useState<
    Record<string, string>
  >({});
  const [cancelReason, setCancelReason] = useState<Record<string, string>>({});
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
          setOffset(Math.floor((result.total - 1) / PAGE_SIZE) * PAGE_SIZE);
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
    setBusyId(id);
    setError("");
    setNotice("");
    try {
      const message = (responseMessage[id] ?? "").trim();
      const quote = quotes.find((entry) => entry.id === id);
      if (quote?.commercialOfferSnapshot) {
        let shippingAmount = quote.commercialShippingAmountBrl;
        if (quote.commercialOfferSnapshot.shippingMode === "quote_required") {
          shippingAmount = parseQuoteAmount(price[id] ?? "");
        }
        if (
          shippingAmount === null ||
          !Number.isFinite(shippingAmount) ||
          shippingAmount < 0 ||
          shippingAmount > 99999999.99 ||
          message.length < 1
        ) {
          throw new Error("admin_catalog_quote_commercial_response_invalid");
        }
        await answerTonartExtraOrder(id, shippingAmount, message);
      } else {
        const amount = parseQuoteAmount(price[id] ?? "");
        const discount = parseDiscountPercent(discountPercent[id] ?? "0");
        if (!Number.isFinite(amount) || amount <= 0 || amount > 99999999.99 || !Number.isFinite(discount)) {
          throw new Error("admin_catalog_quote_response_invalid");
        }
        const finalAmount = discountedTotal(amount, discount);
        if (finalAmount <= 0) {
          throw new Error("admin_catalog_quote_response_invalid");
        }
        if (quote?.isPreorder && finalAmount <= (quote.depositAmount ?? 50)) {
          setError("O total da pré-venda precisa ser maior que a entrada fixa de R$50.");
          return;
        }
        await answerCatalogQuoteRequest(id, amount, message, discount);
      }
      setPrice((current) => ({ ...current, [id]: "" }));
      setDiscountPercent((current) => ({ ...current, [id]: "0" }));
      setResponseMessage((current) => ({ ...current, [id]: "" }));
      setNotice(
        "Resposta registrada e disponível na conta do cliente. Para avisá-lo, abra o e-mail ou WhatsApp e confirme o envio manualmente.",
      );
      setAttempt((current) => current + 1);
    } catch (err) {
      setError(commercialQuoteErrorText(err, "admin"));
    } finally {
      setBusyId(null);
    }
  }

  async function cancelExtraOrder(quoteId: string) {
    if (busyId) return;
    const reason = (cancelReason[quoteId] ?? "").trim();
    if (reason.length < 4) {
      setError("Informe um motivo com pelo menos quatro caracteres para o cancelamento.");
      return;
    }
    setBusyId(quoteId);
    setError("");
    setNotice("");
    try {
      await cancelAdminTonartExtraOrder(quoteId, reason);
      setCancelReason((current) => ({ ...current, [quoteId]: "" }));
      setNotice("Pedido cancelado; Coins vinculados foram revertidos. Nenhum valor em reais foi estornado automaticamente.");
      setAttempt((current) => current + 1);
    } catch (err) {
      setError(commercialQuoteErrorText(err, "admin"));
    } finally {
      setBusyId(null);
    }
  }

  async function updateStatus(
    quoteId: string,
    status: "pending" | "reviewing" | "archived",
  ) {
    if (busyId) return;
    setBusyId(quoteId);
    setError("");
    setNotice("");
    try {
      await changeCatalogQuoteStatus(quoteId, status);
      setNotice("Situação do orçamento atualizada.");
      setAttempt((current) => current + 1);
    } catch (err) {
      setError(commercialQuoteErrorText(err, "admin"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <CommercialPage
      title="Atendimento de orçamentos"
      intro="Área restrita da TONART Studio. Verifique os modelos no catálogo antes de informar um valor. Nenhuma cobrança é iniciada automaticamente."
    >
      <div className="mb-6 flex flex-wrap gap-3">
        <Link
          className={secondaryClass}
          to={TONECOS_COMMERCIAL_ROUTES.adminHome}
        >
          Voltar ao painel administrativo
        </Link>
        <button
          type="button"
          className={secondaryClass}
          disabled={loading || busyId !== null}
          onClick={() => setAttempt((current) => current + 1)}
        >
          {loading ? "Atualizando..." : "Atualizar solicitações"}
        </button>
        {requestedId !== null && (
          <Link
            className={secondaryClass}
            to={TONECOS_COMMERCIAL_ROUTES.adminQuotes}
          >
            Ver todos os orçamentos
          </Link>
        )}
      </div>
      {!requestedId && (
        <div className="mb-6 flex max-w-4xl flex-wrap items-end justify-between gap-3 border border-white/15 p-4">
          <label className="space-y-2 text-sm">
            <span className="block text-xs text-white/60">
              Filtrar por situação
            </span>
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
      {notice && (
        <p
          role="status"
          className="mb-5 max-w-3xl border border-white/20 p-4 text-sm"
        >
          {notice}
        </p>
      )}
      {error && (
        <div
          role="alert"
          className="mb-5 max-w-3xl border border-red-500/40 p-4 text-sm text-red-200"
        >
          <p>{error}</p>
          {error === "Acesso administrativo não autorizado." && (
            <p className="mt-3 text-xs text-white/70">
              Acesso administrativo restrito. A autorização deve ser
              provisionada pela equipe após verificar a titularidade da conta.
            </p>
          )}
          <button
            type="button"
            className={secondaryClass + " mt-3"}
            onClick={() => setAttempt((n) => n + 1)}
          >
            Tentar novamente
          </button>
        </div>
      )}
      {loading ? (
        <p role="status">Verificando autorização e orçamentos...</p>
      ) : null}
      {!loading && !error && invalidSelection && (
        <p role="alert" className={panelClass}>
          Referência de orçamento inválida. Consulte a lista completa.
        </p>
      )}
      {!loading &&
        !error &&
        !invalidSelection &&
        selectedId &&
        quotes.length === 0 && (
          <p role="status" className={panelClass}>
            Solicitação não encontrada.
          </p>
        )}
      {!loading && !error && !requestedId && quotes.length === 0 && (
        <p className={panelClass}>Nenhuma solicitação recebida.</p>
      )}
      {!loading && !error && (
        <ul className="grid max-w-4xl gap-4">
          {quotes.map((quote) => {
            const previewBase = parseQuoteAmount(price[quote.id] ?? "");
            const previewPercent = parseDiscountPercent(discountPercent[quote.id] ?? "0");
            const previewTotal = Number.isFinite(previewBase) && previewBase > 0 && Number.isFinite(previewPercent)
              ? brl.format(discountedTotal(previewBase, previewPercent))
              : null;
            return (
            <li key={quote.id} className={panelClass}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-semibold">
                  {quote.commercialOfferSnapshot ? "Pedido extra" : "Solicitação"} #{quote.id.slice(0, 8)}
                </h2>
                <span className="border border-white/20 px-3 py-1 text-xs">
                  {statusLabels[quote.status] ?? "Em atualização"}
                </span>
                {quote.isPreorder && (
                  <span className="border border-[hsl(var(--gold-accent)/0.4)] px-3 py-1 text-xs text-[hsl(var(--gold-accent))]">
                    Pré-venda · sinal {brl.format(quote.depositAmount ?? 50)}
                  </span>
                )}
                {quote.commercialOfferSnapshot && (
                  <span className="border border-[hsl(var(--gold-accent)/0.4)] px-3 py-1 text-xs text-[hsl(var(--gold-accent))]">
                    Oferta do catálogo · pagamento em análise manual
                  </span>
                )}
              </div>
              <p className="mb-1 text-sm text-white/80">
                {quote.customerName || "Cliente"}
              </p>
              <p className="mb-3 text-xs text-white/65">
                <a
                  href={"mailto:" + encodeURIComponent(quote.customerEmail)}
                  className="underline underline-offset-2 hover:text-white"
                >
                  {quote.customerEmail}
                </a>
                {" · "}
                {new Date(quote.createdAt).toLocaleDateString("pt-BR")}
              </p>
              <ul className="space-y-2 text-sm">
                {quote.items.map((item) => (
                  <li key={item.slug}>
                    <Link
                      to={"/modelos/" + encodeURIComponent(item.slug)}
                      className="text-[hsl(var(--gold-accent))] hover:underline"
                    >
                      {item.slug.replace(/-/g, " ")}
                    </Link>{" "}
                    · {item.quantity}{" "}
                    {item.quantity === 1 ? "unidade" : "unidades"}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-white/65">
                WhatsApp: {quote.whatsapp || "Não informado"} · CEP:{" "}
                {quote.postalCode || "Não informado"}
              </p>
              <p className="mt-1 text-xs text-white/65">
                Escala: {quote.scale || "A definir"} · Acabamento:{" "}
                {quote.finishing || "A definir"}
              </p>
              {quote.commercialOfferSnapshot && (
                <dl className="mt-3 grid gap-x-4 gap-y-2 border-l-2 border-[hsl(var(--gold-accent)/0.45)] pl-3 text-xs sm:grid-cols-2">
                  <div>
                    <dt className="text-white/50">Preço capturado da peça</dt>
                    <dd className="mt-1 font-medium text-white/85">
                      {brl.format(quote.commercialOfferSnapshot.itemPriceBrl)}
                    </dd>
                  </div>
                  {quote.commercialOfferSnapshot.itemDiscountBrl > 0 ? (
                    <div>
                      <dt className="text-white/50">Desconto do assinante capturado</dt>
                      <dd className="mt-1 font-medium text-[hsl(var(--gold-accent))]">
                        −{brl.format(quote.commercialOfferSnapshot.itemDiscountBrl)}
                      </dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="text-white/50">Coins reservados</dt>
                    <dd className="mt-1 font-medium text-[hsl(var(--gold-accent))]">
                      {brl.format(quote.commercialOfferSnapshot.coinsApplied)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-white/50">Frete</dt>
                    <dd className="mt-1 font-medium text-white/85">
                      {quote.commercialShippingAmountBrl === null
                        ? "A informar na resposta"
                        : brl.format(quote.commercialShippingAmountBrl)}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-white/50">Conteúdo e prazo da oferta</dt>
                    <dd className="mt-1 leading-relaxed text-white/75">
                      {quote.commercialOfferSnapshot.contentsDescription} · {quote.commercialOfferSnapshot.deliveryTerms}
                    </dd>
                  </div>
                </dl>
              )}
              {quote.notes && (
                <p className="mt-3 whitespace-pre-wrap text-sm text-white/65">
                  {quote.notes}
                </p>
              )}
              {(history[quote.id] ?? []).length > 0 && (
                <section className="mt-4 border-t border-white/15 pt-4">
                  <h3 className="text-sm font-semibold">
                    Histórico do atendimento
                  </h3>
                  <ol className="mt-3 space-y-2">
                    {(history[quote.id] ?? []).map((event) => (
                      <li key={event.id} className="text-xs text-white/65">
                        <span className="text-white/85">
                          {adminEventLabel(event)}
                        </span>
                        {" · "}
                        <time dateTime={event.createdAt}>
                          {eventDate.format(new Date(event.createdAt))}
                        </time>
                      </li>
                    ))}
                  </ol>
                </section>
              )}
              <div
                className="mt-4 flex flex-wrap gap-2"
                aria-label={"Andamento do orçamento " + quote.id.slice(0, 8)}
              >
                {quote.status === "pending" && (
                  <button
                    type="button"
                    className={secondaryClass}
                    disabled={busyId !== null}
                    onClick={() => {
                      void updateStatus(quote.id, "reviewing");
                    }}
                  >
                    Marcar em análise
                  </button>
                )}
                {quote.status === "reviewing" && (
                  <button
                    type="button"
                    className={secondaryClass}
                    disabled={busyId !== null}
                    onClick={() => {
                      void updateStatus(quote.id, "pending");
                    }}
                  >
                    Voltar para novo
                  </button>
                )}
                {quote.status !== "archived" && !quote.commercialOfferSnapshot && (
                  <button
                    type="button"
                    className={secondaryClass}
                    disabled={busyId !== null}
                    onClick={() => {
                      void updateStatus(quote.id, "archived");
                    }}
                  >
                    Arquivar
                  </button>
                )}
                {quote.commercialOfferSnapshot && quote.canCancelExtraOrder && (
                  <div className="grid w-full gap-2 border-t border-white/10 pt-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <label className="block space-y-1 text-xs text-white/60">
                      <span>Motivo para cancelar e reverter Coins</span>
                      <input
                        className={fieldClass}
                        value={cancelReason[quote.id] ?? ""}
                        maxLength={500}
                        onChange={(event) => setCancelReason((current) => ({
                          ...current,
                          [quote.id]: event.currentTarget.value,
                        }))}
                        placeholder="Informe o motivo do cancelamento"
                      />
                    </label>
                    <button
                      type="button"
                      className={secondaryClass + " self-end"}
                      disabled={busyId !== null}
                      onClick={() => void cancelExtraOrder(quote.id)}
                    >
                      {busyId === quote.id ? "Cancelando…" : "Cancelar pedido e reverter Coins"}
                    </button>
                  </div>
                )}
                {quote.commercialOfferSnapshot && !quote.canCancelExtraOrder && quote.status !== "archived" && (
                  <p className="w-full pt-2 text-xs text-white/50">
                    Há instrução ou pagamento em andamento. O cancelamento precisa de conferência manual.
                  </p>
                )}
              </div>
              <div className="mt-5 border-t border-white/15 pt-4">
                {quote.commercialOfferSnapshot && quote.status === "archived" ? (
                  <p className="text-sm text-white/60">
                    Pedido extra cancelado e Coins vinculados revertidos quando aplicável.
                    {quote.responseMessage ? ` Motivo: ${quote.responseMessage}` : ""}
                  </p>
                ) : quote.status === "archived" && quote.quotedAmount === null ? (
                  <p className="text-sm text-white/60">
                    Solicitação arquivada sem valor.
                  </p>
                ) : quote.quotedAmount !== null ? (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold">
                      {quote.discountAmount > 0 ? "Valor final com desconto" : "Valor informado"}: {brl.format(quote.quotedAmount)}
                    </p>
                    {quote.discountAmount > 0 && quote.listAmount !== null && (
                      <p className="text-xs leading-5 text-white/65">
                        Black Friday: {brl.format(quote.listAmount)} − {quote.discountPercent}% ({brl.format(quote.discountAmount)}) = {brl.format(quote.quotedAmount)}
                      </p>
                    )}
                    {quote.isPreorder && (
                      <p className="text-xs text-white/65">
                        Entrada: {brl.format(quote.depositAmount ?? 50)} · saldo na finalização: {quote.remainingAmount === null ? "aguardando cálculo" : brl.format(quote.remainingAmount)}
                      </p>
                    )}
                    {quote.responseMessage && (
                      <>
                        <div className="border-l-2 border-[hsl(var(--gold-accent)/0.55)] pl-3">
                          <p className="text-xs font-semibold uppercase tracking-wider text-white/55">
                            Mensagem ao cliente
                          </p>
                          <p className="mt-2 whitespace-pre-wrap text-sm text-white/80">
                            {quote.responseMessage}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <a
                            className={secondaryClass}
                            href={quotedResponseEmail(quote)}
                          >
                            Preparar e-mail de resposta
                          </a>
                          {quotedResponseWhatsApp(quote) && (
                            <a
                              className={secondaryClass}
                              href={quotedResponseWhatsApp(quote)!}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Preparar mensagem no WhatsApp
                            </a>
                          )}
                        </div>
                        <p className="text-xs text-white/55">
                          As mensagens abrem no aplicativo escolhido. Confirme o
                          envio manualmente; a TONART não registra notificações
                          não enviadas.
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <form
                    onSubmit={(event) => {
                      void reply(event, quote.id);
                    }}
                    className="grid gap-3 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)]"
                  >
                    {quote.commercialOfferSnapshot ? (
                      <div className="space-y-2 text-xs leading-5 text-white/65 sm:col-span-2">
                        <p>
                          O preço da peça e o desconto registrados nesta oferta não podem ser alterados. Os Coins já foram reservados; este atendimento calcula apenas o frete e o saldo final.
                        </p>
                        <p>
                          Peça após desconto: {brl.format(quote.commercialOfferSnapshot.itemPriceBrl)} · Coins: {brl.format(quote.commercialOfferSnapshot.coinsApplied)}
                        </p>
                      </div>
                    ) : quote.isPreorder && (
                      <p className="text-xs leading-5 text-white/65 sm:col-span-2">
                        Informe o valor-base antes da promoção. A Black Friday permite até 50% de desconto em todos os modelos; a entrada de R$50 e o saldo são calculados sobre o total final.
                      </p>
                    )}
                    {quote.commercialOfferSnapshot ? (
                      quote.commercialOfferSnapshot.shippingMode === "fixed" ? (
                        <p className="text-sm text-white/75">
                          Frete fixo da oferta: {brl.format(quote.commercialShippingAmountBrl ?? 0)}
                        </p>
                      ) : (
                        <label className="block space-y-2 text-sm">
                          <span>Frete a confirmar com o cliente (R$)</span>
                          <input
                            aria-label={"Frete do pedido extra (R$) " + quote.id.slice(0, 8)}
                            className={fieldClass}
                            type="text"
                            inputMode="decimal"
                            required
                            maxLength={12}
                            placeholder="Ex.: 24,90"
                            value={price[quote.id] ?? ""}
                            onChange={(event) => setPrice((current) => ({ ...current, [quote.id]: event.currentTarget.value }))}
                          />
                        </label>
                      )
                    ) : (
                      <>
                        <label className="block space-y-2 text-sm">
                          <span>Valor-base antes da promoção (R$)</span>
                          <input
                            aria-label={"Valor-base antes da promoção (R$) " + quote.id.slice(0, 8)}
                            className={fieldClass}
                            type="text"
                            inputMode="decimal"
                            required
                            maxLength={12}
                            placeholder={quote.isPreorder ? "Ex.: 300,00" : "Ex.: 1.249,90"}
                            value={price[quote.id] ?? ""}
                            onChange={(event) => setPrice((current) => ({ ...current, [quote.id]: event.target.value }))}
                          />
                        </label>
                        <label className="block space-y-2 text-sm">
                          <span>Desconto Black Friday (%)</span>
                          <input
                            aria-label={"Desconto Black Friday " + quote.id.slice(0, 8)}
                            className={fieldClass}
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={50}
                            step={1}
                            required
                            value={discountPercent[quote.id] ?? "0"}
                            onChange={(event) => setDiscountPercent((current) => ({ ...current, [quote.id]: event.currentTarget.value }))}
                          />
                          {previewTotal ? (
                            <p className="text-xs text-[hsl(var(--gold-accent))]" aria-live="polite">Total após desconto: {previewTotal}</p>
                          ) : (
                            <p className="text-xs text-white/50">Defina um desconto entre 0% e 50%.</p>
                          )}
                        </label>
                      </>
                    )}
                    <label className="block space-y-2 text-sm">
                      <span>Mensagem ao cliente</span>
                      <textarea
                        aria-label={
                          "Mensagem ao cliente " + quote.id.slice(0, 8)
                        }
                        className={fieldClass + " min-h-24 py-3 sm:col-span-2"}
                        required
                        maxLength={2000}
                        rows={3}
                        placeholder="Informe validade, prazo estimado ou observações relevantes."
                        value={responseMessage[quote.id] ?? ""}
                        onChange={(event) =>
                          setResponseMessage((current) => ({
                            ...current,
                            [quote.id]: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <div className="sm:col-span-2">
                      <button
                        type="submit"
                        disabled={busyId !== null}
                        className={actionClass}
                      >
                        {busyId === quote.id
                          ? "Salvando..."
                          : "Registrar resposta"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </li>
            );
          })}
        </ul>
      )}
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
            Página {Math.floor(offset / PAGE_SIZE) + 1} de{" "}
            {Math.ceil(total / PAGE_SIZE)}
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
