import { useQuery } from "@tanstack/react-query";
import { TonartOfferCoinsPreview } from "@/components/catalog/TonartOfferCoinsPreview";
import { validCatalogSlug } from "@/services/catalog/public-catalog-gateway";
import { listTonartCommercialOffersForModel } from "@/services/commercial/tonart-commercial-offers-service";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const discountPercent = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
function finishingLabel(finishing: "painted" | "unpainted"): string {
  return finishing === "painted" ? "Pintado" : "Sem pintura";
}

export function TonartCommercialOfferDetails({
  modelSlug,
  enabled,
}: {
  modelSlug: string;
  enabled: boolean;
}) {
  const safeSlug = validCatalogSlug(modelSlug) ? modelSlug : null;
  const offerQuery = useQuery({
    queryKey: ["tonart-commercial-offers", safeSlug],
    queryFn: () => {
      if (!safeSlug) throw new Error("commercial_offer_model_invalid");
      return listTonartCommercialOffersForModel(safeSlug);
    },
    enabled: enabled && safeSlug !== null,
    retry: 1,
    staleTime: 60_000,
  });

  if (!enabled || !safeSlug) return null;
  if (offerQuery.isPending) {
    return (
      <p
        role="status"
        aria-live="polite"
        className="text-sm text-[hsl(0,0%,56%)]"
      >
        Verificando condições comerciais…
      </p>
    );
  }
  if (offerQuery.isError) {
    return (
      <p role="status" className="text-sm leading-relaxed text-[hsl(0,0%,56%)]">
        Não foi possível consultar as condições comerciais agora. O orçamento
        continua disponível e a equipe confirma valores e disponibilidade antes
        de qualquer contratação.
      </p>
    );
  }
  if (offerQuery.data.length === 0) return null;

  return (
    <section
      aria-labelledby="tonart-offers-heading"
      className="space-y-4 border border-[hsl(var(--gold-accent)/0.35)] bg-[hsl(0,0%,8%)] p-4 sm:p-5"
    >
      <div>
        <h2
          id="tonart-offers-heading"
          className="font-mono text-xs uppercase tracking-[0.15em] text-[hsl(var(--gold-accent))]"
        >
          Condições da peça
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-[hsl(0,0%,58%)]">
          Valores e detalhes cadastrados para esta referência. Esta ficha não
          reserva a peça nem realiza pagamento.
        </p>
      </div>

      <ul className="space-y-3">
        {offerQuery.data.map((offer) => (
          <li
            key={offer.id}
            className="border-t border-[hsl(0,0%,17%)] pt-3 first:border-0 first:pt-0"
          >
            <h3 className="text-sm font-semibold text-[hsl(0,0%,91%)]">
              Escala {offer.scale} · {finishingLabel(offer.finishing)}
            </h3>
            <dl className="mt-3 grid gap-x-5 gap-y-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-[hsl(0,0%,56%)]">Preço da peça</dt>
                <dd className="mt-1 text-lg font-semibold text-[hsl(var(--gold-accent))]">
                  {brl.format(offer.itemPriceBrl)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[hsl(0,0%,56%)]">Frete</dt>
                <dd className="mt-1 text-[hsl(0,0%,86%)]">
                  {offer.shippingMode === "fixed" &&
                  offer.shippingAmountBrl !== null
                    ? brl.format(offer.shippingAmountBrl)
                    : "Informado separadamente"}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-[hsl(0,0%,56%)]">Conteúdo</dt>
                <dd className="mt-1 leading-relaxed text-[hsl(0,0%,82%)]">
                  {offer.contentsDescription}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-[hsl(0,0%,56%)]">
                  Prazo informado
                </dt>
                <dd className="mt-1 leading-relaxed text-[hsl(0,0%,82%)]">
                  {offer.deliveryTerms}
                </dd>
              </div>
            </dl>

            {offer.coinsEligible || offer.subscriberDiscountEligible ? (
              <ul className="mt-3 space-y-2 border-t border-[hsl(0,0%,17%)] pt-3 text-xs leading-relaxed text-[hsl(0,0%,66%)]">
                {offer.coinsEligible ? (
                  <li>
                    Elegível para Coins no valor da peça. O frete é pago à
                    parte; consulte abaixo a simulação com seu saldo.
                  </li>
                ) : null}
                {offer.subscriberDiscountEligible ? (
                  <li>
                    Contrato elegível: desconto configurado de{" "}
                    {discountPercent.format(
                      offer.subscriberDiscountBasisPoints / 100,
                    )}
                    % na peça, antes dos Coins. O frete não recebe desconto.
                  </li>
                ) : null}
              </ul>
            ) : null}
            <TonartOfferCoinsPreview offer={offer} />
          </li>
        ))}
      </ul>
    </section>
  );
}
