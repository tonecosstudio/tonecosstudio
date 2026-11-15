import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { TONECOS_COMMERCIAL_ROUTES } from "@/config/routes";
import {
  getMyTonecosCoinBalance,
  type TonecosCoinBalance,
} from "@/services/coins/tonecos-coins-service";
import { getTonecosCurrentUser } from "@/services/customer/tonecos-account-service";
import {
  decimalToHundredths,
  priceEligibleExtra,
} from "@/services/commercial/tonart-commerce-rules";
import type { TonartCommercialOffer } from "@/services/commercial/tonart-commercial-offer";

const formatBrl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const formatCoins = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function useOfferCoinBalance(enabled: boolean) {
  const identityQuery = useQuery({
    queryKey: ["tonart-offer-preview", "identity"],
    queryFn: getTonecosCurrentUser,
    enabled,
    retry: false,
    staleTime: 0,
  });

  const balanceQuery = useQuery<TonecosCoinBalance>({
    queryKey: ["tonecos-coins", "balance", identityQuery.data?.id],
    queryFn: getMyTonecosCoinBalance,
    enabled: enabled && Boolean(identityQuery.data),
    retry: 1,
    staleTime: 30_000,
  });

  return { identityQuery, balanceQuery };
}

export function TonartOfferCoinsPreview({
  offer,
}: {
  offer: TonartCommercialOffer;
}) {
  const [applyCoins, setApplyCoins] = useState(true);
  const { identityQuery, balanceQuery } = useOfferCoinBalance(
    offer.coinsEligible,
  );

  if (!offer.coinsEligible) return null;

  if (
    identityQuery.isPending ||
    (identityQuery.data && balanceQuery.isPending)
  ) {
    return (
      <p
        role="status"
        aria-live="polite"
        className="mt-4 text-xs text-[hsl(0,0%,56%)]"
      >
        Consultando seu saldo de Coins…
      </p>
    );
  }

  if (identityQuery.isError) {
    return (
      <p role="alert" className="mt-4 text-xs leading-relaxed text-red-300">
        Não foi possível confirmar sua conta. Nenhum saldo foi presumido para
        esta simulação.
      </p>
    );
  }

  if (!identityQuery.data) {
    const loginPath =
      TONECOS_COMMERCIAL_ROUTES.login +
      "?next=" +
      encodeURIComponent(TONECOS_COMMERCIAL_ROUTES.coins);

    return (
      <div className="mt-4 border-t border-[hsl(0,0%,17%)] pt-3 text-xs leading-relaxed text-[hsl(0,0%,66%)]">
        Entre para consultar seu saldo e simular o abatimento de Coins nesta
        peça.{" "}
        <Link
          className="font-semibold text-[hsl(var(--gold-accent))] underline underline-offset-4"
          to={loginPath}
        >
          Acessar minha conta
        </Link>
      </div>
    );
  }

  if (balanceQuery.isError || !balanceQuery.data) {
    return (
      <p role="alert" className="mt-4 text-xs leading-relaxed text-red-300">
        Não foi possível consultar sua carteira agora. O saldo não foi tratado
        como zero.
      </p>
    );
  }

  const balanceHundredths = decimalToHundredths(balanceQuery.data.balance);
  const shippingCents =
    offer.shippingMode === "fixed" && offer.shippingAmountBrl !== null
      ? decimalToHundredths(offer.shippingAmountBrl)
      : 0;
  const priceInput = {
    listPriceCents: decimalToHundredths(offer.itemPriceBrl),
    subscriber: false,
    subscriberDiscountEligible: offer.subscriberDiscountEligible,
    subscriberDiscountBasisPoints: offer.subscriberDiscountBasisPoints,
    coinsEligible: offer.coinsEligible,
    coinBalanceHundredths: applyCoins ? balanceHundredths : 0,
    shippingCents,
  };
  const regularPrice = priceEligibleExtra(priceInput);
  const subscriberPrice = offer.subscriberDiscountEligible
    ? priceEligibleExtra({ ...priceInput, subscriber: true })
    : null;

  return (
    <section
      aria-label={"Simulação de Coins para escala " + offer.scale}
      className="mt-4 border-t border-[hsl(0,0%,17%)] pt-3"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[hsl(0,0%,72%)]">
          Simulação de preço e Coins
        </h4>
        <p className="text-xs tabular-nums text-[hsl(var(--gold-accent))]">
          Saldo: {formatCoins.format(balanceQuery.data.balance)} Coins
        </p>
      </div>

      <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-3 text-sm text-[hsl(0,0%,82%)]">
        <input
          type="checkbox"
          checked={applyCoins}
          onChange={(event) => setApplyCoins(event.currentTarget.checked)}
          disabled={balanceHundredths === 0}
          className="h-4 w-4 accent-[hsl(var(--gold-accent))]"
          aria-label="Aplicar Coins disponíveis à peça nesta simulação"
        />
        Aplicar saldo disponível ao valor da peça
      </label>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <PriceScenario
          title="Sem desconto de assinante"
          breakdown={regularPrice}
          showCoins={offer.coinsEligible}
          fixedShipping={offer.shippingMode === "fixed"}
          shippingCents={shippingCents}
        />
        {subscriberPrice ? (
          <PriceScenario
            title="Com desconto de assinante"
            breakdown={subscriberPrice}
            showCoins={offer.coinsEligible}
            fixedShipping={offer.shippingMode === "fixed"}
            shippingCents={shippingCents}
            discountCents={subscriberPrice.discountCents}
          />
        ) : null}
      </div>

      <p className="mt-3 text-xs leading-relaxed text-[hsl(0,0%,56%)]">
        {offer.subscriberDiscountEligible
          ? "O cenário de assinante depende de um contrato elegível confirmado. "
          : ""}
        Esta simulação não cria pedido, reserva a peça nem debita sua carteira.
      </p>
    </section>
  );
}

function PriceScenario({
  title,
  breakdown,
  showCoins,
  fixedShipping,
  shippingCents,
  discountCents,
}: {
  title: string;
  breakdown: ReturnType<typeof priceEligibleExtra>;
  showCoins: boolean;
  fixedShipping: boolean;
  shippingCents: number;
  discountCents?: number;
}) {
  const itemCashCents =
    breakdown.priceAfterAllowedDiscountCents - breakdown.coinsAppliedHundredths;

  return (
    <dl className="space-y-2 border border-[hsl(0,0%,17%)] p-3 text-xs">
      <div>
        <dt className="font-semibold text-[hsl(0,0%,80%)]">{title}</dt>
        {discountCents !== undefined ? (
          <dd className="mt-1 text-[hsl(var(--gold-accent))]">
            Redução configurada: {formatBrl.format(discountCents / 100)}
          </dd>
        ) : null}
      </div>
      {showCoins ? (
        <div className="flex justify-between gap-3">
          <dt className="text-[hsl(0,0%,56%)]">Coins na peça</dt>
          <dd className="font-medium text-[hsl(0,0%,86%)]">
            {formatCoins.format(breakdown.coinsAppliedHundredths / 100)}
          </dd>
        </div>
      ) : null}
      <div className="flex justify-between gap-3">
        <dt className="text-[hsl(0,0%,56%)]">Peça em reais</dt>
        <dd className="font-medium text-[hsl(0,0%,86%)]">
          {formatBrl.format(itemCashCents / 100)}
        </dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt className="text-[hsl(0,0%,56%)]">Frete</dt>
        <dd className="font-medium text-[hsl(0,0%,86%)]">
          {fixedShipping
            ? formatBrl.format(shippingCents / 100)
            : "Definido separadamente"}
        </dd>
      </div>
      {fixedShipping ? (
        <div className="flex justify-between gap-3 border-t border-[hsl(0,0%,17%)] pt-2">
          <dt className="font-medium text-[hsl(0,0%,68%)]">Total em reais</dt>
          <dd className="font-semibold text-[hsl(var(--gold-accent))]">
            {formatBrl.format(breakdown.amountDueCents / 100)}
          </dd>
        </div>
      ) : null}
    </dl>
  );
}
