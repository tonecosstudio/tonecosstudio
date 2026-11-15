import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  listAdminTonartCommercialOffers,
  saveAdminTonartCommercialOffer,
  type TonartCommercialOffer,
  type TonartCommercialOfferDraft,
  type TonartOfferFinishing,
  type TonartOfferScale,
  type TonartOfferShippingMode,
} from "@/services/admin/commerce/commercial-offers-service";
import {
  loadSubscriptionCatalogModels,
  searchSubscriptionCatalogModels,
  type SubscriptionCatalogModel,
} from "@/services/subscriptions/subscription-catalog-service";
import { actionClass, panelClass } from "./CommercialPage";

const OFFERS_QUERY_KEY = ["admin-tonart-commercial-offers"] as const;
const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const dates = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" });

type OfferForm = Omit<
  TonartCommercialOfferDraft,
  "scale" | "finishing" | "subscriberDiscountBasisPoints"
> & {
  scale: "" | TonartOfferScale;
  finishing: "" | TonartOfferFinishing;
  subscriberDiscountBasisPoints: string;
};

const EMPTY_FORM: OfferForm = {
  catalogModelSlug: "",
  scale: "",
  finishing: "",
  contentsDescription: "",
  itemPriceBrl: "",
  shippingMode: "quote_required",
  shippingAmountBrl: "",
  deliveryTerms: "",
  coinsEligible: false,
  subscriberDiscountEligible: false,
  subscriberDiscountBasisPoints: "5",
  isActive: false,
};

function formatDiscountPercent(basisPoints: number): string {
  return (basisPoints / 100)
    .toFixed(2)
    .replace(/\.?0+$/, "")
    .replace(".", ",");
}

function parseDiscountPercent(value: string): number {
  const normalized = value.trim().replace(",", ".");
  const match = /^(\d{1,3})(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) throw new Error("commercial_offer_subscriber_discount_invalid");
  const basisPoints =
    Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  if (!Number.isSafeInteger(basisPoints) || basisPoints > 10_000) {
    throw new Error("commercial_offer_subscriber_discount_invalid");
  }
  return basisPoints;
}

function offerToForm(offer: TonartCommercialOffer): OfferForm {
  return {
    id: offer.id,
    catalogModelSlug: offer.catalogModelSlug,
    scale: offer.scale,
    finishing: offer.finishing,
    contentsDescription: offer.contentsDescription,
    itemPriceBrl: offer.itemPriceBrl.toFixed(2).replace(".", ","),
    shippingMode: offer.shippingMode,
    shippingAmountBrl:
      offer.shippingAmountBrl === null
        ? ""
        : offer.shippingAmountBrl.toFixed(2).replace(".", ","),
    deliveryTerms: offer.deliveryTerms,
    coinsEligible: offer.coinsEligible,
    subscriberDiscountEligible: offer.subscriberDiscountEligible,
    subscriberDiscountBasisPoints: formatDiscountPercent(
      offer.subscriberDiscountBasisPoints,
    ),
    isActive: offer.isActive,
  };
}

function modelName(
  model: Pick<SubscriptionCatalogModel, "name" | "variantName">,
) {
  return model.variantName
    ? `${model.name} · ${model.variantName}`
    : model.name;
}

export default function TonartCommercialOffersAdmin() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState<OfferForm>(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [formError, setFormError] = useState("");
  const offersQuery = useQuery({
    queryKey: OFFERS_QUERY_KEY,
    queryFn: listAdminTonartCommercialOffers,
  });
  const directory = offersQuery.data;
  const searchQuery = useQuery({
    queryKey: ["admin-tonart-offer-catalog-search", search.trim()],
    queryFn: ({ signal }) => searchSubscriptionCatalogModels(search, signal),
    enabled: Array.from(search.trim()).length >= 3,
    staleTime: 30_000,
  });
  const modelQuery = useQuery({
    queryKey: ["admin-tonart-offer-model", form.catalogModelSlug],
    queryFn: () => loadSubscriptionCatalogModels([form.catalogModelSlug]),
    enabled: Boolean(form.catalogModelSlug),
    retry: false,
  });
  const models = useMemo(
    () => new Map((modelQuery.data ?? []).map((model) => [model.slug, model])),
    [modelQuery.data],
  );

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!form.scale || !form.finishing || !directory) {
        throw new Error("Selecione a escala e o acabamento da oferta.");
      }
      const draft: TonartCommercialOfferDraft = {
        ...form,
        scale: form.scale,
        finishing: form.finishing,
        subscriberDiscountBasisPoints: parseDiscountPercent(
          form.subscriberDiscountBasisPoints,
        ),
      };
      return saveAdminTonartCommercialOffer(draft, directory.commerceEnabled);
    },
    onSuccess: async () => {
      toast({
        title: form.id ? "Oferta atualizada" : "Oferta cadastrada",
        description: directory?.commerceEnabled
          ? "Os termos comerciais foram salvos."
          : "A oferta permanece inativa enquanto as vendas estiverem bloqueadas.",
      });
      setForm(EMPTY_FORM);
      setSearch("");
      setFormError("");
      await queryClient.invalidateQueries({ queryKey: OFFERS_QUERY_KEY });
    },
    onError: (error) => {
      setFormError(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar os termos comerciais.",
      );
    },
  });

  function chooseModel(model: Pick<SubscriptionCatalogModel, "slug">) {
    setForm((current) => ({ ...current, catalogModelSlug: model.slug }));
    setSearch("");
    setFormError("");
  }

  function editOffer(offer: TonartCommercialOffer) {
    setForm(offerToForm(offer));
    setSearch("");
    setFormError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const searchResults = searchQuery.data?.items ?? [];
  const editingModel = models.get(form.catalogModelSlug);
  const isDirty = JSON.stringify(form) !== JSON.stringify(EMPTY_FORM);

  return (
    <div className="space-y-6">
      {directory && !directory.commerceEnabled && (
        <div
          role="status"
          className="rounded-sm border border-[hsl(var(--gold-accent)/0.4)] bg-[hsl(var(--gold-accent)/0.06)] p-4 text-sm text-white/80"
        >
          <p className="font-semibold text-[hsl(var(--gold-accent))]">
            Checkout de produtos extras bloqueado
          </p>
          <p className="mt-1 leading-6">
            Você pode preparar ofertas com dados reais. Nenhuma delas será
            publicada ou vendida até que o gate comercial seja liberado no
            backend.
          </p>
        </div>
      )}

      <section className={panelClass} aria-labelledby="offer-editor-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 id="offer-editor-title" className="text-lg font-semibold">
              {form.id
                ? "Editar oferta comercial"
                : "Configurar oferta comercial"}
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/60">
              Cada oferta aponta para uma identidade publicada no catálogo D1.
              Escala, acabamento, conteúdo, preço e prazo pertencem à oferta;
              nenhum modelo ou imagem é copiado para o Supabase.
            </p>
          </div>
          <Badge variant="outline">D1 + termos TONART</Badge>
        </div>

        {formError && (
          <p
            role="alert"
            className="mt-5 border border-red-500/40 p-3 text-sm text-red-200"
          >
            {formError}
          </p>
        )}

        {offersQuery.isError && (
          <div
            role="alert"
            className="mt-5 border border-red-500/40 p-4 text-sm text-red-100"
          >
            Não foi possível consultar as ofertas no backend. Não trate uma
            falha de conexão como catálogo vazio.
            <Button
              className="ml-3"
              variant="outline"
              size="sm"
              onClick={() => void offersQuery.refetch()}
            >
              Tentar novamente
            </Button>
          </div>
        )}

        <form
          className="mt-6 space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            setFormError("");
            saveMutation.mutate();
          }}
        >
          <div className="grid gap-4 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <div className="space-y-2">
              <Label htmlFor="offer-catalog-search">
                Modelo publicado no catálogo
              </Label>
              <Input
                id="offer-catalog-search"
                value={search}
                maxLength={80}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nome, variante ou franquia"
              />
              {search.trim().length < 3 && !form.catalogModelSlug && (
                <p className="text-xs text-white/45">
                  Digite ao menos 3 caracteres para buscar no catálogo oficial.
                </p>
              )}
              {searchQuery.isLoading && (
                <p role="status" className="text-xs text-white/55">
                  Buscando no catálogo...
                </p>
              )}
              {searchQuery.isError && (
                <p role="alert" className="text-xs text-red-200">
                  Catálogo indisponível; não é possível validar um modelo agora.
                </p>
              )}
              {searchResults.length > 0 && (
                <ul
                  className="max-h-64 space-y-2 overflow-auto rounded-sm border border-white/15 p-2"
                  aria-label="Modelos publicados"
                >
                  {searchResults.map((model) => (
                    <li key={model.slug}>
                      <button
                        type="button"
                        onClick={() => chooseModel(model)}
                        className="flex min-h-14 w-full items-center gap-3 rounded-sm px-2 py-2 text-left hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[hsl(var(--gold-accent))]"
                      >
                        {model.imageUrl && (
                          <img
                            src={model.imageUrl}
                            alt=""
                            loading="lazy"
                            className="h-12 w-12 rounded-sm object-cover"
                          />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {modelName(model)}
                          </span>
                          <span className="mt-1 block truncate text-xs text-white/50">
                            {model.franchise} · {model.slug}
                          </span>
                        </span>
                        <span className="text-xs text-[hsl(var(--gold-accent))]">
                          Selecionar
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {form.catalogModelSlug && (
                <div className="flex items-center gap-3 border border-white/15 p-3">
                  {editingModel?.imageUrl && (
                    <img
                      src={editingModel.imageUrl}
                      alt=""
                      className="h-14 w-14 rounded-sm object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {editingModel
                        ? modelName(editingModel)
                        : form.catalogModelSlug}
                    </p>
                    <p className="mt-1 break-all text-xs text-white/50">
                      Slug canônico: {form.catalogModelSlug}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-sm text-white/65 underline underline-offset-4"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        catalogModelSlug: "",
                      }))
                    }
                  >
                    Trocar
                  </button>
                </div>
              )}
            </div>

            <div className="grid content-start gap-4 sm:grid-cols-2 md:grid-cols-1">
              <div className="space-y-2">
                <Label htmlFor="offer-scale">Escala</Label>
                <select
                  id="offer-scale"
                  required
                  value={form.scale}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      scale: event.target.value as OfferForm["scale"],
                    }))
                  }
                  className="min-h-11 w-full rounded-sm border border-white/20 bg-black px-3 py-2 text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[hsl(var(--gold-accent))]"
                >
                  <option value="">Selecione a escala</option>
                  <option value="1/10">1/10</option>
                  <option value="1/6">1/6</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="offer-finishing">Acabamento</Label>
                <select
                  id="offer-finishing"
                  required
                  value={form.finishing}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      finishing: event.target.value as OfferForm["finishing"],
                    }))
                  }
                  className="min-h-11 w-full rounded-sm border border-white/20 bg-black px-3 py-2 text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[hsl(var(--gold-accent))]"
                >
                  <option value="">Selecione o acabamento</option>
                  <option value="painted">Pintado</option>
                  <option value="unpainted">Sem pintura</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="offer-contents">O que está incluído</Label>
              <textarea
                id="offer-contents"
                required
                maxLength={1000}
                value={form.contentsDescription}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    contentsDescription: event.target.value,
                  }))
                }
                placeholder="Descreva somente os itens realmente incluídos."
                className="min-h-28 w-full rounded-sm border border-white/20 bg-black/20 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-[hsl(var(--gold-accent))]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="offer-delivery-terms">
                Prazo informado na oferta
              </Label>
              <textarea
                id="offer-delivery-terms"
                required
                maxLength={500}
                value={form.deliveryTerms}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    deliveryTerms: event.target.value,
                  }))
                }
                placeholder="Informe o prazo real de produção/postagem validado pela operação."
                className="min-h-28 w-full rounded-sm border border-white/20 bg-black/20 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-[hsl(var(--gold-accent))]"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-2 text-sm">
              <span className="block">Preço da peça (R$)</span>
              <Input
                required
                inputMode="decimal"
                value={form.itemPriceBrl}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    itemPriceBrl: event.target.value,
                  }))
                }
                placeholder="Preço validado"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="block">Frete</span>
              <select
                value={form.shippingMode}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    shippingMode: event.target.value as TonartOfferShippingMode,
                    shippingAmountBrl: "",
                  }))
                }
                className="min-h-11 w-full rounded-sm border border-white/20 bg-black px-3 py-2 text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[hsl(var(--gold-accent))]"
              >
                <option value="quote_required">
                  Calcular e informar antes do pagamento
                </option>
                <option value="fixed">Valor fixo configurado</option>
              </select>
            </label>
            {form.shippingMode === "fixed" && (
              <label className="space-y-2 text-sm">
                <span className="block">Valor do frete (R$)</span>
                <Input
                  required
                  inputMode="decimal"
                  value={form.shippingAmountBrl}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      shippingAmountBrl: event.target.value,
                    }))
                  }
                  placeholder="Frete validado"
                />
              </label>
            )}
          </div>

          <fieldset className="grid gap-3 rounded-sm border border-white/15 p-4 sm:grid-cols-2">
            <legend className="px-2 text-xs font-medium text-white/65">
              Benefícios configurados por oferta
            </legend>
            <label className="flex min-h-11 items-start gap-3 text-sm">
              <input
                className="mt-1 accent-[hsl(var(--gold-accent))]"
                type="checkbox"
                checked={form.coinsEligible}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    coinsEligible: event.target.checked,
                  }))
                }
              />
              <span>
                <span className="block font-medium">Aceita Coins na peça</span>
                <span className="mt-1 block text-xs leading-5 text-white/50">
                  Frete nunca é pago com Coins. O checkout ainda precisa ser
                  conectado ao ledger.
                </span>
              </span>
            </label>
            <label className="flex min-h-11 items-start gap-3 text-sm">
              <input
                className="mt-1 accent-[hsl(var(--gold-accent))]"
                type="checkbox"
                checked={form.subscriberDiscountEligible}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    subscriberDiscountEligible: event.target.checked,
                  }))
                }
              />
              <span>
                <span className="block font-medium">
                  Elegível ao desconto de assinante
                </span>
                <span className="mt-1 block text-xs leading-5 text-white/50">
                  O desconto proposto só se aplica a contrato elegível; não
                  acumula com outra promoção.
                </span>
              </span>
            </label>
            {form.subscriberDiscountEligible && (
              <label className="space-y-2 text-sm">
                <span className="block">Desconto de assinante (%)</span>
                <Input
                  required
                  inputMode="decimal"
                  maxLength={6}
                  value={form.subscriberDiscountBasisPoints}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      subscriberDiscountBasisPoints: event.target.value,
                    }))
                  }
                  placeholder="5"
                />
                <span className="block text-xs leading-5 text-white/50">
                  5% é a proposta documentada e inicial. O percentual permanece
                  configurável; esta edição não libera vendas.
                </span>
              </label>
            )}
          </fieldset>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input
                className="accent-[hsl(var(--gold-accent))]"
                type="checkbox"
                checked={form.isActive}
                disabled={!directory?.commerceEnabled}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    isActive: event.target.checked,
                  }))
                }
              />
              Publicar oferta para venda
            </label>
            <div className="flex flex-wrap gap-2">
              {isDirty && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setForm(EMPTY_FORM);
                    setFormError("");
                  }}
                >
                  Limpar
                </Button>
              )}
              <button
                type="submit"
                className={actionClass}
                disabled={
                  !directory ||
                  offersQuery.isLoading ||
                  saveMutation.isPending ||
                  !form.catalogModelSlug
                }
              >
                {saveMutation.isPending
                  ? "Salvando..."
                  : form.id
                    ? "Salvar alterações"
                    : "Salvar oferta"}
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className={panelClass} aria-labelledby="offer-directory-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 id="offer-directory-title" className="text-lg font-semibold">
              Ofertas cadastradas
            </h3>
            <p className="mt-2 text-sm text-white/55">
              Termos comerciais são snapshots independentes da identidade
              publicada no catálogo.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => void offersQuery.refetch()}
            disabled={offersQuery.isFetching}
          >
            Atualizar
          </Button>
        </div>
        {offersQuery.isLoading ? (
          <p role="status" className="mt-5 text-sm text-white/60">
            Carregando ofertas...
          </p>
        ) : (directory?.rows.length ?? 0) === 0 ? (
          <p className="mt-5 rounded-sm border border-dashed border-white/20 p-5 text-sm leading-6 text-white/60">
            Nenhuma oferta foi cadastrada. Os valores não são importados do
            catálogo e não há preços ou prazos de demonstração.
          </p>
        ) : (
          <ul className="mt-5 space-y-3">
            {directory?.rows.map((offer) => (
              <li
                key={offer.id}
                className="flex flex-wrap items-center justify-between gap-4 border border-white/10 p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="break-all font-medium">
                      {offer.catalogModelSlug}
                    </p>
                    <Badge variant={offer.isActive ? "default" : "secondary"}>
                      {offer.isActive ? "Publicada" : "Rascunho"}
                    </Badge>
                    {offer.coinsEligible && (
                      <Badge variant="outline">Coins</Badge>
                    )}
                    {offer.subscriberDiscountEligible && (
                      <Badge variant="outline">
                        Assinante −
                        {formatDiscountPercent(
                          offer.subscriberDiscountBasisPoints,
                        )}
                        %
                      </Badge>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-white/60">
                    {offer.scale} ·{" "}
                    {offer.finishing === "painted" ? "Pintado" : "Sem pintura"}{" "}
                    · {brl.format(offer.itemPriceBrl)} pela peça ·{" "}
                    {offer.shippingMode === "fixed"
                      ? `frete ${brl.format(offer.shippingAmountBrl ?? 0)}`
                      : "frete informado antes do pagamento"}
                  </p>
                  <p className="mt-1 text-xs text-white/45">
                    Atualizada em {dates.format(new Date(offer.updatedAt))}
                  </p>
                </div>
                <Button variant="outline" onClick={() => editOffer(offer)}>
                  Editar
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
