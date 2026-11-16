import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { TONECOS_COMMERCIAL_ROUTES } from "@/config/routes";
import {
  loadMyCatalogQuotePage,
  type CustomerCatalogQuote,
} from "@/services/customer/catalog-quote-service";
import { getTonecosCurrentUser } from "@/services/customer/tonecos-account-service";
import {
  loadCatalogQuoteHistory,
  type CatalogQuoteEvent,
} from "@/services/quotes/catalog-quote-history-service";
import { CommercialPage, panelClass, secondaryClass } from "./CommercialPage";
import { commercialQuoteErrorText } from "./commercial-quote-error-text";
import { customerQuoteEventLabel } from "./customer-quote-event-label";
import {
  ALLOWED_PAYMENT_VOUCHER_TYPES,
  MAX_PAYMENT_VOUCHER_SIZE,
  validatePaymentVoucher,
} from "@/services/payments/payment-voucher-storage-service";
import { submitCatalogPreorderVoucher } from "@/services/customer/catalog-quote-service";
import { cancelTonartExtraOrder } from "@/services/commercial/tonart-extra-order-service";

const labels: Record<string, string> = {
  pending: "Recebido",
  reviewing: "Em análise",
  answered: "Respondido",
  archived: "Arquivado",
};
const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const eventDate = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});
const PAGE_SIZE = 20;

function getSafePaymentUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function QuotePaymentPanel({
  row,
  onSuccess,
}: {
  row: CustomerCatalogQuote;
  onSuccess: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [cancelConfirmation, setCancelConfirmation] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const paymentStatus = row.paymentStatus ?? "pending";
  const finalPayment =
    paymentStatus === "deposit_paid" && row.readyForFinalPayment;
  const paymentType = row.isPreorder
    ? finalPayment
      ? "final"
      : "deposit"
    : "full";
  const amountDue = row.remainingAmount ?? row.quotedAmount;
  const amount = row.isPreorder
    ? finalPayment
      ? row.remainingAmount
      : row.depositAmount
    : amountDue;
  const safeLink = getSafePaymentUrl(row.paymentLink);
  const currentPaymentInstructions =
    paymentType !== "final" ||
    (Boolean(row.finalPaymentNotifiedAt && row.paymentLinkSentAt) &&
      Date.parse(row.paymentLinkSentAt ?? "") >=
        Date.parse(row.finalPaymentNotifiedAt ?? ""));
  const instructionsAvailable = Boolean(
    currentPaymentInstructions &&
    row.paymentLinkSentAt &&
    (safeLink || row.pixKey),
  );
  const canSubmit =
    (paymentStatus === "pending" || finalPayment) &&
    row.quotedAmount !== null &&
    row.status === "answered" &&
    amount !== null &&
    amount > 0 &&
    instructionsAvailable;
  const coinsOnlyFullyPaid =
    row.commercialOfferSnapshot !== null &&
    paymentStatus === "fully_paid" &&
    row.commercialOfferSnapshot.coinsApplied >=
      row.commercialOfferSnapshot.itemPriceBrl &&
    (row.commercialShippingAmountBrl ?? 0) === 0;
  const canCancelExtraOrder =
    row.commercialOfferSnapshot !== null &&
    row.status !== "archived" &&
    !["under_review", "deposit_paid"].includes(paymentStatus) &&
    (paymentStatus === "pending" || coinsOnlyFullyPaid) &&
    !row.paymentLinkSentAt &&
    (!row.paymentVoucherPath || Boolean(row.paymentVoucherRejectionReason));
  const preorderBalance =
    row.quotedAmount !== null && row.depositAmount !== null
      ? Math.max(0, row.quotedAmount - row.depositAmount)
      : null;

  async function sendVoucher() {
    if (!file || !canSubmit || busy) return;
    setBusy(true);
    setError("");
    try {
      await submitCatalogPreorderVoucher({
        quoteId: row.id,
        paymentType,
        file,
        previousVoucherPath: row.paymentVoucherPath,
      });
      setSubmitted(true);
      setFile(null);
      onSuccess();
    } catch (cause) {
      setError(commercialQuoteErrorText(cause));
      if (
        cause instanceof Error &&
        cause.message === "catalog_preorder_voucher_response_invalid"
      ) {
        setFile(null);
        onSuccess();
      }
    } finally {
      setBusy(false);
    }
  }

  async function cancelExtraOrder() {
    if (!row.commercialOfferSnapshot || cancelBusy) return;
    setCancelBusy(true);
    setCancelError("");
    try {
      await cancelTonartExtraOrder(row.id);
      setCancelConfirmation(false);
      onSuccess();
    } catch (cause) {
      setCancelError(commercialQuoteErrorText(cause));
    } finally {
      setCancelBusy(false);
    }
  }

  if (
    !row.isPreorder &&
    row.quotedAmount === null &&
    !row.commercialOfferSnapshot
  ) return null;

  return (
    <section className="mt-5 border border-[hsl(var(--gold-accent)/0.3)] bg-[hsl(0,0%,5%)] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[hsl(var(--gold-accent))]">
            {row.commercialOfferSnapshot
              ? "Pedido extra do catálogo"
              : row.isPreorder
              ? "Pré-venda com entrada"
              : "Pagamento do orçamento"}
          </h3>
          <p className="mt-1 text-xs leading-5 text-white/60">
            {row.commercialOfferSnapshot
              ? "O preço e os Coins aplicados ficam registrados nesta oferta. O frete é confirmado conforme a condição informada pela TONART."
              : row.isPreorder
              ? "R$ 50 de entrada abatidos do total; o restante é pago na finalização."
              : "Após a resposta da TONART, siga as instruções de pagamento do orçamento e envie o comprovante por aqui."}
          </p>
        </div>
        {paymentStatus === "under_review" ? (
          <span className="border border-amber-400/40 px-3 py-1 text-xs text-amber-200">
            Comprovante em análise
          </span>
        ) : paymentStatus === "fully_paid" ? (
          <span className="border border-emerald-400/40 px-3 py-1 text-xs text-emerald-200">
            Pagamento concluído
          </span>
        ) : paymentStatus === "deposit_paid" ? (
          <span className="border border-sky-400/40 px-3 py-1 text-xs text-sky-200">
            {finalPayment ? "Saldo liberado" : "Entrada aprovada"}
          </span>
        ) : null}
      </div>

      {row.commercialOfferSnapshot ? (
        <dl className="mt-4 grid grid-cols-2 gap-3 border-y border-white/10 py-3 text-sm">
          <div>
            <dt className="text-xs text-white/50">Preço da peça</dt>
            <dd className="mt-1 font-medium">
              {brl.format(row.commercialOfferSnapshot.itemPriceBrl)}
            </dd>
          </div>
          {row.commercialOfferSnapshot.itemDiscountBrl > 0 ? (
            <div>
              <dt className="text-xs text-white/50">
                Desconto de assinante ({row.commercialOfferSnapshot.subscriberDiscountBasisPoints / 100}%)
              </dt>
              <dd className="mt-1 font-medium text-[hsl(var(--gold-accent))]">
                −{brl.format(row.commercialOfferSnapshot.itemDiscountBrl)}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="text-xs text-white/50">Frete</dt>
            <dd className="mt-1 font-medium">
              {row.commercialShippingAmountBrl !== null
                ? brl.format(row.commercialShippingAmountBrl)
                : "A confirmar pela equipe"}
            </dd>
          </div>
          {row.commercialOfferSnapshot.coinsApplied > 0 ? (
            <div>
              <dt className="text-xs text-white/50">
                {row.status === "archived" ? "Coins devolvidos" : "Coins reservados"}
              </dt>
              <dd className="mt-1 font-medium text-[hsl(var(--gold-accent))]">
                {row.status === "archived" ? "+" : "−"}
                {brl.format(row.commercialOfferSnapshot.coinsApplied)}
              </dd>
            </div>
          ) : null}
          {row.quotedAmount !== null ? (
            <>
              <div>
                <dt className="text-xs text-white/50">
                  {row.status === "archived" ? "Total antes do cancelamento" : "Total aprovado"}
                </dt>
                <dd className="mt-1 font-medium">{brl.format(row.quotedAmount)}</dd>
              </div>
              <div>
                <dt className="text-xs text-white/50">Saldo em reais</dt>
                <dd className="mt-1 font-medium">
                  {row.remainingAmount === null
                    ? row.status === "archived"
                      ? "Sem cobrança pendente"
                      : paymentStatus === "fully_paid"
                        ? "R$ 0,00"
                        : "A confirmar"
                    : brl.format(row.remainingAmount)}
                </dd>
              </div>
            </>
          ) : (
            <div className="col-span-2">
              <dt className="text-xs text-white/50">Próxima etapa</dt>
              <dd className="mt-1 text-sm text-white/70">
                {row.status === "archived"
                  ? "Pedido cancelado antes da confirmação do frete e do saldo final."
                  : row.commercialOfferSnapshot.shippingMode === "quote_required"
                  ? "A equipe confirma o frete e o saldo antes das instruções de pagamento."
                  : "A equipe revisa o pedido antes de enviar as instruções de pagamento."}
              </dd>
            </div>
          )}
          <div className="col-span-2 border-t border-white/10 pt-3">
            <dt className="text-xs text-white/50">Condições e conteúdo</dt>
            <dd className="mt-1 text-xs leading-relaxed text-white/70">
              {row.commercialOfferSnapshot.scale} · {row.commercialOfferSnapshot.finishing === "painted" ? "Pintado" : "Sem pintura"} · {row.commercialOfferSnapshot.contentsDescription}
            </dd>
          </div>
        </dl>
      ) : row.quotedAmount === null ? (
        <p className="mt-4 text-sm text-white/70">
          A equipe está definindo o valor e o prazo. As opções de pagamento
          aparecem após a resposta.
        </p>
      ) : (
        <dl className="mt-4 grid grid-cols-2 gap-3 border-y border-white/10 py-3 text-sm">
          {row.discountAmount > 0 && row.listAmount !== null && (
            <div>
              <dt className="text-xs text-white/50">
                Valor antes da Black Friday
              </dt>
              <dd className="mt-1 font-medium">{brl.format(row.listAmount)}</dd>
            </div>
          )}
          {row.discountAmount > 0 && (
            <div>
              <dt className="text-xs text-white/50">
                Desconto Black Friday ({row.discountPercent}%)
              </dt>
              <dd className="mt-1 font-medium text-[hsl(var(--gold-accent))]">
                −{brl.format(row.discountAmount)}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-white/50">Valor total</dt>
            <dd className="mt-1 font-medium">{brl.format(row.quotedAmount)}</dd>
          </div>
          {row.isPreorder ? (
            <div>
              <dt className="text-xs text-white/50">Saldo na finalização</dt>
              <dd className="mt-1 font-medium">
                {preorderBalance === null
                  ? "A confirmar"
                  : brl.format(preorderBalance)}
              </dd>
            </div>
          ) : (
            <>
              {row.coinAmountApplied > 0 && (
                <div>
                  <dt className="text-xs text-white/50">Coins registrados neste histórico</dt>
                  <dd className="mt-1 font-medium text-[hsl(var(--gold-accent))]">
                    −{brl.format(row.coinAmountApplied)}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-white/50">Valor para pagar</dt>
                <dd className="mt-1 font-medium">
                  {amountDue === null ? "A confirmar" : brl.format(amountDue)}
                </dd>
              </div>
            </>
          )}
        </dl>
      )}


      {row.paymentVoucherRejectionReason && (
        <p
          role="alert"
          className="mt-4 border-l-2 border-red-400 pl-3 text-sm text-red-200"
        >
          Comprovante recusado: {row.paymentVoucherRejectionReason}
        </p>
      )}

      {paymentStatus === "under_review" ? (
        <p role="status" className="mt-4 text-sm text-white/70">
          Recebemos seu comprovante de{" "}
          {row.paymentVoucherType === "final"
            ? "saldo"
            : row.paymentVoucherType === "full"
              ? "pagamento do orçamento"
              : "entrada"}
          . A confirmação só acontece após a conferência da equipe.
        </p>
      ) : row.commercialOfferSnapshot && row.status === "archived" ? null : paymentStatus === "fully_paid" ? (
        <p className="mt-4 text-sm text-white/70">
          O valor total foi confirmado pela TONART.
        </p>
      ) : paymentStatus === "deposit_paid" && !finalPayment ? (
        <p className="mt-4 text-sm text-white/70">
          Entrada aprovada. A equipe libera o saldo quando a peça estiver pronta
          para finalização.
        </p>
      ) : row.quotedAmount !== null && !instructionsAvailable ? (
        <p className="mt-4 text-sm text-white/70">
          {row.isPreorder
            ? "O valor está definido. A equipe enviará as instruções PIX para você confirmar a entrada."
            : "O valor está definido. A equipe enviará as instruções para pagamento do saldo."}
        </p>
      ) : null}

      {row.commercialOfferSnapshot && row.status === "archived" ? (
        <p role="status" className="mt-4 text-sm text-white/70">
          Pedido cancelado. A reserva de Coins, se havia, foi devolvida à sua carteira.
        </p>
      ) : null}

      {instructionsAvailable &&
        (paymentStatus === "pending" || finalPayment) && (
          <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/75">
              {finalPayment
                ? "Instruções para pagar o saldo"
                : row.isPreorder
                  ? "Instruções para pagar a entrada"
                  : "Instruções para pagar o orçamento"}
              {amount !== null ? ` · ${brl.format(amount)}` : ""}
            </p>
            {row.pixKey && (
              <p className="break-all rounded-sm bg-white/[0.04] p-3 text-sm text-white/80">
                <span className="mb-1 block text-xs text-white/50">
                  Chave PIX
                </span>
                {row.pixKey}
              </p>
            )}
            {safeLink && (
              <a
                href={safeLink}
                target="_blank"
                rel="noreferrer"
                className={secondaryClass}
              >
                Abrir link de pagamento
              </a>
            )}
            {row.paymentInstructions && (
              <p className="whitespace-pre-wrap text-sm leading-6 text-white/65">
                {row.paymentInstructions}
              </p>
            )}
            {canSubmit && (
              <div className="space-y-3 border-t border-white/10 pt-4">
                <label
                  htmlFor={`preorder-voucher-${row.id}`}
                  className="block text-sm font-medium"
                >
                  {row.paymentVoucherRejectionReason
                    ? "Enviar comprovante corrigido"
                    : "Comprovante de pagamento"}
                </label>
                <input
                  id={`preorder-voucher-${row.id}`}
                  type="file"
                  accept={ALLOWED_PAYMENT_VOUCHER_TYPES.join(",")}
                  className="block min-h-11 w-full text-sm text-white/70 file:mr-3 file:min-h-11 file:border-0 file:bg-white/10 file:px-4 file:text-white hover:file:bg-white/15"
                  onChange={(event) => {
                    const selected = event.currentTarget.files?.[0] ?? null;
                    setError("");
                    if (!selected) {
                      setFile(null);
                      return;
                    }
                    try {
                      validatePaymentVoucher(selected);
                      setFile(selected);
                    } catch (cause) {
                      setFile(null);
                      setError(
                        cause instanceof Error
                          ? cause.message
                          : "Comprovante inválido.",
                      );
                    }
                  }}
                />
                <p className="text-xs text-white/50">
                  JPG, PNG ou PDF · até{" "}
                  {Math.round(MAX_PAYMENT_VOUCHER_SIZE / (1024 * 1024))} MB. O
                  comprovante fica privado e é analisado pela equipe.
                </p>
                {error && (
                  <p role="alert" className="text-sm text-red-300">
                    {error}
                  </p>
                )}
                {submitted && (
                  <p role="status" className="text-sm text-emerald-300">
                    Comprovante enviado para análise.
                  </p>
                )}
                <button
                  type="button"
                  className={secondaryClass}
                  disabled={!file || busy}
                  onClick={() => void sendVoucher()}
                >
                  {busy ? "Enviando comprovante..." : "Enviar comprovante"}
                </button>
              </div>
            )}
          </div>
        )}
      {canCancelExtraOrder ? (
        <div className="mt-5 border-t border-white/10 pt-4">
          {!cancelConfirmation ? (
            <button
              type="button"
              className={secondaryClass}
              onClick={() => {
                setCancelError("");
                setCancelConfirmation(true);
              }}
            >
              Cancelar pedido
            </button>
          ) : (
            <div className="space-y-3" role="group" aria-label="Confirmar cancelamento do pedido extra">
              <p className="text-sm text-white/75">
                Os Coins reservados serão devolvidos. Se algum valor em reais já foi pago ou o comprovante está em análise, fale com a equipe antes de continuar.
              </p>
              {cancelError ? (
                <p role="alert" className="text-sm text-red-300">{cancelError}</p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={secondaryClass}
                  disabled={cancelBusy}
                  onClick={() => void cancelExtraOrder()}
                >
                  {cancelBusy ? "Cancelando…" : "Confirmar cancelamento"}
                </button>
                <button
                  type="button"
                  className={secondaryClass}
                  disabled={cancelBusy}
                  onClick={() => setCancelConfirmation(false)}
                >
                  Manter pedido
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

export default function TonecosMyQuotesPage() {
  const location = useLocation();
  const requestedId = new URLSearchParams(location.search).get("quote");
  const selectedId =
    requestedId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      requestedId,
    )
      ? requestedId.toLowerCase()
      : null;
  const invalidSelection = requestedId !== null && !selectedId;
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [authError, setAuthError] = useState(false);
  const [authAttempt, setAuthAttempt] = useState(0);
  const [rows, setRows] = useState<CustomerCatalogQuote[]>([]);
  const [history, setHistory] = useState<Record<string, CatalogQuoteEvent[]>>(
    {},
  );
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setUserId(undefined);
    setAuthError(false);
    getTonecosCurrentUser()
      .then((user) => {
        if (active) setUserId(user?.id ?? null);
      })
      .catch(() => {
        if (active) {
          setAuthError(true);
          setUserId(null);
        }
      });
    return () => {
      active = false;
    };
  }, [authAttempt]);

  useEffect(() => {
    if (!userId || invalidSelection) return;
    let active = true;
    setRows([]);
    setHistory({});
    setLoading(true);
    setError("");
    loadMyCatalogQuotePage(
      userId,
      selectedId
        ? { limit: 1, offset: 0, quoteId: selectedId }
        : { limit: PAGE_SIZE, offset },
    )
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
        setRows(result.rows);
        setTotal(result.total);
        setHistory(quoteHistory);
      })
      .catch((err: unknown) => {
        if (active) setError(commercialQuoteErrorText(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId, attempt, offset, selectedId, invalidSelection]);

  // Navigation state is not proof until the authenticated quote directory returns it.
  const sentId =
    location.state &&
    typeof location.state === "object" &&
    "sent" in location.state &&
    typeof location.state.sent === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      location.state.sent,
    )
      ? location.state.sent
      : null;
  const justSent = Boolean(
    sentId &&
    userId &&
    !loading &&
    !error &&
    rows.some((row) => row.id === sentId),
  );

  return (
    <CommercialPage
      title="Meus orçamentos"
      intro="Acompanhe as solicitações enviadas e os valores respondidos pela TONART Studio. Orçamento não é confirmação de compra."
    >
      {invalidSelection && (
        <p
          role="alert"
          className="mb-5 max-w-3xl border border-white/20 p-4 text-sm text-white/75"
        >
          O link do orçamento é inválido. Abra seu histórico para continuar.
        </p>
      )}
      {selectedId && (
        <div className="mb-5 max-w-3xl flex flex-wrap items-center gap-3">
          <p className="text-sm text-white/75">
            Consultando orçamento #{selectedId.slice(0, 8)}
          </p>
          <Link
            className={secondaryClass}
            to={TONECOS_COMMERCIAL_ROUTES.history}
          >
            Ver todos os orçamentos
          </Link>
        </div>
      )}
      {justSent && (
        <p
          role="status"
          className="mb-5 max-w-3xl border border-white/20 p-4 text-sm text-white/80"
        >
          Solicitação enviada. Você poderá acompanhar a resposta aqui.
        </p>
      )}
      {userId === undefined || (loading && !invalidSelection) ? (
        <p role="status">Carregando seus orçamentos...</p>
      ) : null}
      {authError ? (
        <div role="alert" className={panelClass}>
          <p className="mb-4 text-sm text-white/70">
            Não foi possível verificar sua sessão.
          </p>
          <button
            type="button"
            className={secondaryClass}
            onClick={() => setAuthAttempt((n) => n + 1)}
          >
            Tentar novamente
          </button>
        </div>
      ) : userId === null ? (
        <div className={panelClass}>
          <p className="mb-4 text-sm text-white/70">
            Entre na sua conta para consultar suas solicitações.
          </p>
          <Link
            className={secondaryClass}
            to={
              TONECOS_COMMERCIAL_ROUTES.login +
              "?next=" +
              encodeURIComponent(
                selectedId
                  ? TONECOS_COMMERCIAL_ROUTES.history + "?quote=" + selectedId
                  : TONECOS_COMMERCIAL_ROUTES.history,
              )
            }
          >
            Entrar
          </Link>
        </div>
      ) : null}
      {error && (
        <div
          role="alert"
          className="mb-5 max-w-3xl border border-red-500/30 p-4 text-sm text-red-200"
        >
          <p>{error}</p>
          {error === "Sua sessão expirou. Entre novamente para continuar." ? (
            <Link
              className={secondaryClass + " mt-3"}
              to={
                TONECOS_COMMERCIAL_ROUTES.login +
                "?next=" +
                encodeURIComponent(
                  selectedId
                    ? TONECOS_COMMERCIAL_ROUTES.history + "?quote=" + selectedId
                    : TONECOS_COMMERCIAL_ROUTES.history,
                )
              }
            >
              Entrar novamente
            </Link>
          ) : (
            <button
              type="button"
              className={secondaryClass + " mt-3"}
              onClick={() => setAttempt((n) => n + 1)}
            >
              Tentar novamente
            </button>
          )}
        </div>
      )}
      {userId && !authError && !error && !invalidSelection && (
        <div className="mb-5">
          <button
            type="button"
            className={secondaryClass}
            disabled={loading}
            onClick={() => setAttempt((current) => current + 1)}
          >
            {loading ? "Atualizando..." : "Atualizar orçamentos"}
          </button>
        </div>
      )}
      {userId &&
        !loading &&
        !error &&
        !invalidSelection &&
        !selectedId &&
        total > 0 && (
          <p className="mb-4 max-w-3xl text-xs text-white/55">
            Mostrando {offset + 1}–{Math.min(offset + rows.length, total)} de{" "}
            {total}
          </p>
        )}
      {userId &&
        !loading &&
        !error &&
        !invalidSelection &&
        (rows.length === 0 ? (
          <div className={panelClass + " max-w-3xl"}>
            <p className="mb-5 text-white/70">
              {selectedId
                ? "Esse orçamento não foi encontrado na sua conta."
                : "Você ainda não enviou solicitações."}
            </p>
            <Link className={secondaryClass} to="/modelos">
              Explorar modelos
            </Link>
          </div>
        ) : (
          <ul className="grid max-w-3xl gap-4">
            {rows.map((row) => (
              <li key={row.id} className={panelClass}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-base font-semibold">
                    Orçamento #{row.id.slice(0, 8)}
                  </h2>
                  <span className="border border-white/20 px-3 py-1 text-xs">
                    {labels[row.status] ?? "Em atualização"}
                  </span>
                </div>
                <p className="mt-2 text-xs text-white/55">
                  Solicitado em{" "}
                  {new Date(row.createdAt).toLocaleDateString("pt-BR")}
                </p>
                <ul className="mt-4 space-y-1 text-sm text-white/70">
                  {row.items.map((item) => (
                    <li key={item.slug}>
                      <Link
                        to={"/modelos/" + encodeURIComponent(item.slug)}
                        className="underline-offset-2 hover:underline"
                      >
                        {item.slug.replace(/-/g, " ")}
                      </Link>{" "}
                      · {item.quantity}{" "}
                      {item.quantity === 1 ? "unidade" : "unidades"}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-white/60">
                  Escala: {row.scale || "A definir"} · Acabamento:{" "}
                  {row.finishing || "A definir"}
                </p>
                {row.notes && (
                  <p className="mt-4 whitespace-pre-wrap text-sm text-white/60">
                    {row.notes}
                  </p>
                )}
                {row.responseMessage && (
                  <section className="mt-5 border-l-2 border-[hsl(var(--gold-accent)/0.55)] pl-4">
                    <h3 className="text-sm font-semibold">
                      Resposta da TONART
                    </h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-white/80">
                      {row.responseMessage}
                    </p>
                  </section>
                )}
                {(history[row.id] ?? []).length > 0 && (
                  <section className="mt-5 border-t border-white/15 pt-4">
                    <h3 className="text-sm font-semibold">Andamento</h3>
                    <ol className="mt-3 space-y-2">
                      {(history[row.id] ?? []).map((event) => (
                        <li key={event.id} className="text-xs text-white/65">
                          <span className="text-white/85">
                            {customerQuoteEventLabel(event)}
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
                {!row.isPreorder && row.quotedAmount === null && (
                  <div className="mt-5 border-t border-white/15 pt-4 text-sm font-semibold">
                    Valor em análise
                  </div>
                )}
                <QuotePaymentPanel
                  row={row}
                  onSuccess={() => setAttempt((value) => value + 1)}
                />
              </li>
            ))}
          </ul>
        ))}
      {userId &&
        !loading &&
        !error &&
        !selectedId &&
        !invalidSelection &&
        total > PAGE_SIZE && (
          <div className="mt-6 flex max-w-3xl items-center justify-between gap-3">
            <button
              type="button"
              className={secondaryClass}
              disabled={offset === 0}
              onClick={() =>
                setOffset((value) => Math.max(0, value - PAGE_SIZE))
              }
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
              disabled={offset + rows.length >= total}
              onClick={() => setOffset((value) => value + PAGE_SIZE)}
            >
              Próxima
            </button>
          </div>
        )}
    </CommercialPage>
  );
}
