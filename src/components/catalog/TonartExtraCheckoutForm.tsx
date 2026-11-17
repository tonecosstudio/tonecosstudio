import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "react-router-dom";
import { TONECOS_COMMERCIAL_ROUTES } from "@/config/routes";
import {
  getMyTonecosCoinBalance,
  type TonecosCoinBalance,
} from "@/services/coins/tonecos-coins-service";
import {
  getMyTonecosProfile,
  getTonecosCurrentUser,
} from "@/services/customer/tonecos-account-service";
import { decimalToHundredths } from "@/services/commercial/tonart-commerce-rules";
import {
  clearStoredTonartCheckoutRequest,
  createStoredTonartCheckoutRequest,
  readStoredTonartCheckoutRequest,
  type StoredTonartCheckoutRequest,
} from "@/services/commercial/tonart-extra-order-idempotency";
import type { TonartCommercialOffer } from "@/services/commercial/tonart-commercial-offer";
import {
  submitTonartExtraOrder,
  type TonartExtraOrderResult,
} from "@/services/commercial/tonart-extra-order-service";
import { commercialQuoteErrorText } from "@/pages/commercial/commercial-quote-error-text";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const coinNumber = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const fieldClass =
  "min-h-11 w-full border border-[hsl(0,0%,26%)] bg-[hsl(0,0%,5%)] px-3 py-2 text-sm text-[hsl(0,0%,92%)] placeholder:text-[hsl(0,0%,45%)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[hsl(var(--gold-accent))]";
function browserStorages(): Storage[] {
  if (typeof window === "undefined") return [];
  const storages: Storage[] = [];
  try {
    storages.push(window.localStorage);
  } catch {
    // Session storage can still preserve retries in this tab.
  }
  try {
    storages.push(window.sessionStorage);
  } catch {
    // Checkout fails closed below when no browser storage is available.
  }
  return storages;
}

function parseCoinLimit(input: string): number {
  const raw = input.trim().replace(",", ".");
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(raw)) {
    throw new Error("tonart_extra_order_coins_invalid");
  }
  const hundredths = decimalToHundredths(raw);
  if (hundredths > 100_000_000) {
    throw new Error("tonart_extra_order_coins_invalid");
  }
  return hundredths / 100;
}

function savedPostalCode(
  profile: Awaited<ReturnType<typeof getMyTonecosProfile>>,
) {
  const address = profile.delivery_address;
  if (!address || typeof address !== "object" || Array.isArray(address))
    return "";
  const zipCode = (address as Record<string, unknown>).zipCode;
  return typeof zipCode === "string" && /^\d{8}$/.test(zipCode) ? zipCode : "";
}

export function TonartExtraCheckoutForm({
  offer,
}: {
  offer: TonartCommercialOffer;
}) {
  const location = useLocation();
  const queryClient = useQueryClient();
  const [coinsLimit, setCoinsLimit] = useState("0");
  const [whatsapp, setWhatsapp] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState<TonartExtraOrderResult | null>(null);
  const requestRef = useRef<StoredTonartCheckoutRequest | null>(null);
  const identityQuery = useQuery({
    queryKey: ["tonart-offer-preview", "identity"],
    queryFn: getTonecosCurrentUser,
    retry: false,
    staleTime: 0,
  });
  const balanceQuery = useQuery<TonecosCoinBalance>({
    queryKey: ["tonecos-coins", "balance", identityQuery.data?.id],
    queryFn: getMyTonecosCoinBalance,
    enabled: Boolean(identityQuery.data && offer.coinsEligible),
    retry: 1,
    staleTime: 30_000,
  });
  const profileQuery = useQuery({
    queryKey: ["tonecos-account", "profile", identityQuery.data?.id],
    queryFn: getMyTonecosProfile,
    enabled: Boolean(identityQuery.data),
    retry: false,
    staleTime: 30_000,
  });

  useEffect(() => {
    const profile = profileQuery.data;
    if (!profile) return;
    setWhatsapp(
      (current) => current || profile.whatsapp || profile.phone || "",
    );
    setPostalCode((current) => current || savedPostalCode(profile));
  }, [profileQuery.data]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || order) return;
    setBusy(true);
    setError("");
    try {
      const maximumCoins = offer.coinsEligible ? parseCoinLimit(coinsLimit) : 0;
      const userId = identityQuery.data?.id;
      if (!userId) throw new Error("tonecos_login_required");
      const storageKey = `tonart-extra-order:v1:${userId}:${offer.id}`;
      const storages = browserStorages();
      const request =
        requestRef.current?.storageKey === storageKey
          ? requestRef.current
          : (readStoredTonartCheckoutRequest(storageKey, storages) ??
            createStoredTonartCheckoutRequest(storageKey, storages, () => {
              if (typeof crypto.randomUUID !== "function") {
                throw new Error("tonart_extra_order_idempotency_unavailable");
              }
              return crypto.randomUUID();
            }));
      requestRef.current = request;
      const result = await submitTonartExtraOrder({
        offerId: offer.id,
        maximumCoins,
        checkoutRequestId: request.id,
        whatsapp,
        postalCode,
      });
      setOrder(result);
      clearStoredTonartCheckoutRequest(request, storages);
      requestRef.current = null;
      await queryClient.invalidateQueries({
        queryKey: ["tonecos-coins", "balance", identityQuery.data?.id],
      });
    } catch (cause) {
      setError(commercialQuoteErrorText(cause));
    } finally {
      setBusy(false);
    }
  }

  if (identityQuery.isPending) {
    return (
      <p role="status" className="mt-4 text-xs text-[hsl(0,0%,56%)]">
        Preparando seu pedido seguro…
      </p>
    );
  }
  if (identityQuery.isError) {
    return (
      <p role="alert" className="mt-4 text-xs leading-relaxed text-red-300">
        Não foi possível confirmar sua sessão. Atualize a página ou entre na sua
        conta para continuar.
      </p>
    );
  }
  if (!identityQuery.data) {
    const returnTo = location.pathname + location.search;
    return (
      <div className="mt-4 border-t border-[hsl(0,0%,17%)] pt-4">
        <Link
          className="inline-flex min-h-11 items-center justify-center border border-[hsl(var(--gold-accent)/0.6)] px-4 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--gold-accent))] hover:bg-[hsl(var(--gold-accent)/0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--gold-accent))]"
          to={
            TONECOS_COMMERCIAL_ROUTES.login +
            "?next=" +
            encodeURIComponent(returnTo)
          }
        >
          Entre para pedir esta peça
        </Link>
      </div>
    );
  }

  if (order) {
    return (
      <div
        role="status"
        className={
          order.status === "archived"
            ? "mt-4 border border-white/15 bg-white/[0.03] p-4"
            : "mt-4 border border-emerald-400/30 bg-emerald-950/20 p-4"
        }
      >
        <p
          className={
            order.status === "archived"
              ? "text-sm font-semibold text-white/85"
              : "text-sm font-semibold text-emerald-200"
          }
        >
          {order.status === "archived"
            ? "Este pedido foi cancelado"
            : order.idempotent
              ? "Pedido anterior localizado no seu histórico"
              : "Pedido registrado no seu histórico"}
        </p>
        {order.status === "archived" ? (
          <p className="mt-2 text-xs leading-relaxed text-white/70">
            Os Coins vinculados foram devolvidos quando havia reserva. Consulte
            o histórico para ver o registro final.
          </p>
        ) : (
          <p className="mt-2 text-xs leading-relaxed text-white/70">
            Peça: {brl.format(order.itemPriceBrl)}
            {order.coinsApplied > 0
              ? ` · ${coinNumber.format(order.coinsApplied)} Coins reservados`
              : ""}
            {order.shippingAmountBrl !== null
              ? ` · frete ${brl.format(order.shippingAmountBrl)}`
              : " · frete a confirmar pela equipe"}
            {order.cashAmountDueBrl > 0
              ? ` · saldo da peça em reais ${brl.format(order.cashAmountDueBrl)}`
              : " · sem saldo em reais neste momento"}
          </p>
        )}
        <Link
          className="mt-3 inline-flex min-h-11 items-center text-xs font-semibold uppercase tracking-wider text-[hsl(var(--gold-accent))] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--gold-accent))]"
          to={TONECOS_COMMERCIAL_ROUTES.history + "?quote=" + order.quoteId}
        >
          Acompanhar pedido
        </Link>
      </div>
    );
  }

  const balanceHundredths = balanceQuery.data
    ? decimalToHundredths(balanceQuery.data.balance)
    : null;

  return (
    <form
      className="mt-4 space-y-3 border-t border-[hsl(0,0%,17%)] pt-4"
      onSubmit={(event) => void submit(event)}
      aria-label={`Pedido da oferta escala ${offer.scale}`}
    >
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[hsl(0,0%,82%)]">
          Pedir esta peça
        </h4>
        <p className="mt-1 text-xs leading-relaxed text-[hsl(0,0%,57%)]">
          O preço final e o desconto elegível são recalculados no servidor.
          Coins cobrem apenas a peça; o frete é sempre separado.
        </p>
      </div>
      {offer.coinsEligible ? (
        <div>
          <label
            htmlFor={`extra-coins-${offer.id}`}
            className="mb-1 block text-xs text-[hsl(0,0%,70%)]"
          >
            Usar até Coins (opcional)
          </label>
          <input
            id={`extra-coins-${offer.id}`}
            className={fieldClass}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={coinsLimit}
            onChange={(event) => setCoinsLimit(event.currentTarget.value)}
            aria-describedby={`extra-coins-help-${offer.id}`}
            disabled={balanceHundredths === null}
          />
          <p
            id={`extra-coins-help-${offer.id}`}
            className="mt-1 text-xs text-[hsl(0,0%,53%)]"
          >
            {balanceQuery.isError
              ? "A carteira não respondeu. Você ainda pode pedir sem aplicar Coins."
              : balanceHundredths === null
                ? "Consultando saldo…"
                : `Saldo confirmado: ${coinNumber.format(balanceHundredths / 100)} Coins. O limite não ultrapassa o valor elegível da peça.`}
          </p>
        </div>
      ) : (
        <p className="text-xs text-[hsl(0,0%,57%)]">
          Esta variante não aceita pagamento em Coins.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs text-[hsl(0,0%,70%)]">
          WhatsApp
          <input
            className={fieldClass + " mt-1"}
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            maxLength={40}
            required
            value={whatsapp}
            onChange={(event) => setWhatsapp(event.currentTarget.value)}
            placeholder="(11) 99999-9999"
          />
        </label>
        <label className="block text-xs text-[hsl(0,0%,70%)]">
          CEP de entrega
          <input
            className={fieldClass + " mt-1"}
            type="text"
            autoComplete="postal-code"
            inputMode="numeric"
            maxLength={20}
            required
            value={postalCode}
            onChange={(event) => setPostalCode(event.currentTarget.value)}
            placeholder="00000-000"
          />
        </label>
      </div>
      {offer.shippingMode === "quote_required" ? (
        <p className="text-xs leading-relaxed text-[hsl(0,0%,57%)]">
          A equipe confirma o frete antes de liberar o pagamento em reais.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm leading-relaxed text-red-300">
          {error}
        </p>
      ) : null}
      <button
        className="inline-flex min-h-11 w-full items-center justify-center border border-[hsl(var(--gold-accent)/0.65)] bg-[hsl(var(--gold-accent))] px-4 text-xs font-bold uppercase tracking-wider text-black transition-colors hover:bg-[hsl(var(--gold-accent)/0.85)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[hsl(var(--gold-accent))] disabled:cursor-wait disabled:opacity-60 sm:w-auto"
        type="submit"
        disabled={
          busy ||
          (offer.coinsEligible &&
            balanceHundredths === null &&
            !balanceQuery.isError)
        }
      >
        {busy ? "Registrando pedido…" : "Confirmar pedido"}
      </button>
      <p className="text-[11px] leading-relaxed text-[hsl(0,0%,49%)]">
        Coins são reservados apenas quando a oferta é elegível. Nenhum pagamento
        em reais é confirmado nesta etapa.
      </p>
    </form>
  );
}
