import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clipboard,
  Clock3,
  Crown,
  FileCheck2,
  ImageOff,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { Page } from "@/components/layouts/Page";
import { AUTH_ROUTES, PUBLIC_ROUTES, loginReturnToPath } from "@/config/routes";
import { useSubscribeCollectionCheckout } from "@/hooks/subscription/useSubscribeCollectionCheckout";
import {
  createSubscriptionCheckoutForCurrentUser,
  type SubscriptionCheckoutResult,
} from "@/services/subscriptions/subscription-checkout-service";
import {
  getPaymentSettings,
  type SubscriptionPeriod,
} from "@/services/payments/payment-settings-service";
import { subscriptionPaymentPeriodForPlanType } from "@/services/payments/subscription-payment-period";
import {
  ALLOWED_PAYMENT_VOUCHER_TYPES,
  MAX_PAYMENT_VOUCHER_SIZE,
} from "@/services/payments/payment-voucher-storage-service";
import { getTonecosCurrentUser } from "@/services/customer/tonecos-account-service";
import { formatNumber } from "@/lib/utils";
import { loadSubscriptionCatalogModels } from "@/services/subscriptions/subscription-catalog-service";
import { CANONICAL_CATALOG_API_BASE } from "@/config/canonical-catalog-endpoint";
import { createPublicCatalogGateway } from "@/services/catalog/public-catalog-gateway";
import { getSubscriptionModelSelectionIssue } from "@/services/subscriptions/subscription-model-selection";

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default function SubscribeCollection() {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const {
    plans,
    plansLoading,
    collections,
    collectionsLoading,
    loadError,
    retryLoad,
  } = useSubscribeCollectionCheckout();
  const catalogGateway = useMemo(
    () => CANONICAL_CATALOG_API_BASE
      ? createPublicCatalogGateway(CANONICAL_CATALOG_API_BASE, fetch)
      : null,
    [],
  );
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedCollectionId, setSelectedCollectionId] = useState("");
  const [selectedModelSlugs, setSelectedModelSlugs] = useState<string[]>([]);
  const [voucher, setVoucher] = useState<File | null>(null);
  const [checkout, setCheckout] = useState<SubscriptionCheckoutResult | null>(null);
  const [checkoutError, setCheckoutError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const selectedPlan = plans?.find((plan) => plan.id === selectedPlanId) ?? plans?.[0] ?? null;
  const modelSelectionLimit = selectedPlan?.model_selection_limit ?? 6;
  const availableCollections = useMemo(
    () => (collections ?? []).filter((collection) => collection.catalog_model_slugs.length >= modelSelectionLimit),
    [collections, modelSelectionLimit],
  );
  const selectedCollection =
    availableCollections.find((collection) => collection.id === selectedCollectionId) ??
    availableCollections.find((collection) => collection.slug === slug) ??
    availableCollections[0] ??
    null;
  const modelSelectionIssue = selectedPlan && selectedCollection
    ? getSubscriptionModelSelectionIssue({
        selectedSlugs: selectedModelSlugs,
        selectionLimit: selectedPlan.model_selection_limit,
        curatedSlugs: selectedCollection.catalog_model_slugs,
      })
    : "selection_count_invalid";
  useEffect(() => {
    setSelectedModelSlugs([]);
  }, [selectedCollection?.id]);
  const period = subscriptionPaymentPeriodForPlanType(selectedPlan?.plan_type);
  const catalogModelsQuery = useQuery({
    queryKey: ["subscription-curated-models", selectedCollection?.id, selectedCollection?.catalog_model_slugs],
    queryFn: ({ signal }) => loadSubscriptionCatalogModels(selectedCollection?.catalog_model_slugs ?? [], signal),
    enabled: Boolean(selectedCollection && selectedCollection.catalog_model_slugs.length > 0),
  });
  const paymentSettingsQuery = useQuery({
    queryKey: ["payment-settings", "subscription", period],
    queryFn: () => getPaymentSettings("subscription", period as SubscriptionPeriod),
    enabled: Boolean(period),
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = plansLoading || collectionsLoading;
  const requestedCollectionMissing = Boolean(
    slug && !availableCollections.some((collection) => collection.slug === slug),
  );

  const handleCheckout = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCheckoutError("");
    if (!selectedPlan || !selectedCollection) {
      setCheckoutError("Escolha um plano e uma coleção para continuar.");
      return;
    }
    if (modelSelectionIssue) {
      setCheckoutError(
        modelSelectionIssue === "selection_not_curated"
          ? "Escolha somente modelos disponíveis nesta coleção."
          : `Escolha exatamente ${selectedPlan.model_selection_limit} modelos da coleção.`,
      );
      return;
    }
    if (!period) {
      setCheckoutError("Este plano ainda não possui uma forma de pagamento configurada.");
      return;
    }
    if (!paymentSettingsQuery.data?.pix_key.trim()) {
      setCheckoutError("A chave PIX deste plano ainda não está configurada. Tente novamente mais tarde.");
      return;
    }
    if (!voucher) {
      setCheckoutError("Anexe o comprovante do PIX para enviar a solicitação.");
      return;
    }

    setIsSubmitting(true);
    try {
      const currentUser = await getTonecosCurrentUser();
      if (!currentUser) {
        navigate(loginReturnToPath(location.pathname + location.search));
        return;
      }
      const result = await createSubscriptionCheckoutForCurrentUser({
        planId: selectedPlan.id,
        collectionId: selectedCollection.id,
        selectedModelSlugs,
        modelSelectionLimit: selectedPlan.model_selection_limit,
        voucher,
      });
      setCheckout(result);
    } catch (error) {
      setCheckoutError(
        error instanceof Error
          ? error.message
          : "Não foi possível enviar sua solicitação. Tente novamente.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyPixKey = async () => {
    const pixKey = paymentSettingsQuery.data?.pix_key;
    if (!pixKey) return;
    try {
      await navigator.clipboard.writeText(pixKey);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCheckoutError("Não foi possível copiar automaticamente. Selecione e copie a chave PIX.");
    }
  };

  if (isLoading) {
    return (
      <Page title="Carregando planos" description="Consultando planos e coleções disponíveis">
        <div className="flex min-h-[55vh] items-center justify-center">
          <p role="status" className="text-sm text-slate-600 dark:text-slate-300">
            Carregando opções de assinatura...
          </p>
        </div>
      </Page>
    );
  }

  if (loadError || !plans?.length || !availableCollections.length || requestedCollectionMissing) {
    const noOptions = !loadError && (!plans?.length || !availableCollections.length || requestedCollectionMissing);
    return (
      <Page title="Planos de assinatura" description="Consulte as opções disponíveis para cada coleção">
        <div className="container mx-auto max-w-3xl px-5 py-20 text-center">
          <h1 className="text-3xl font-bold text-slate-950 dark:text-white">
            {noOptions ? "Nenhuma opção disponível no momento" : "Não foi possível carregar os planos"}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-slate-600 dark:text-slate-300">
            {requestedCollectionMissing
              ? "Esta coleção não possui personagens disponíveis para assinatura."
              : "As ofertas são exibidas somente quando os planos e as coleções estão ativos."}
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            {!noOptions && <Button onClick={retryLoad}>Tentar novamente</Button>}
            <Button variant="outline" onClick={() => navigate(PUBLIC_ROUTES.catalog)}>
              Ver catálogo
            </Button>
          </div>
        </div>
      </Page>
    );
  }

  if (checkout) {
    return (
      <Page title="Solicitação enviada" description="Seu comprovante foi recebido para conferência">
        <div className="container mx-auto max-w-2xl px-5 py-16">
          <Card className="border-emerald-500/30">
            <CardContent className="p-6 text-center sm:p-10">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" aria-hidden="true" />
              <Badge className="mt-5 bg-emerald-600 text-white">Comprovante recebido</Badge>
              <h1 className="mt-4 text-3xl font-bold text-slate-950 dark:text-white">
                Sua solicitação está em análise
              </h1>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-300">
                A equipe vai conferir o pagamento. A assinatura só fica ativa depois da aprovação.
                Você pode acompanhar o registro pela sua conta.
              </p>
              <div className="my-7 rounded-lg bg-slate-50 p-4 text-left dark:bg-slate-900">
                <p className="text-xs uppercase tracking-wider text-slate-500">Referência do pagamento</p>
                <p className="mt-1 break-all font-mono text-lg font-semibold">{checkout.referenceNumber}</p>
                <p className="mt-2 text-sm">Valor informado pelo sistema: <strong>{currency.format(checkout.amount)}</strong></p>
                <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-700">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Modelos escolhidos</p>
                  <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                    {(catalogModelsQuery.data ?? [])
                      .filter((model) => selectedModelSlugs.includes(model.slug))
                      .map((model) => (
                        <li key={model.slug} className="truncate text-sm text-slate-700 dark:text-slate-200">
                          {model.name}{model.variantName ? ` · ${model.variantName}` : ""}
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
              <Button asChild className="w-full sm:w-auto">
                <Link to={AUTH_ROUTES.paymentDetails.replace(":paymentId", checkout.paymentId)}>
                  <FileCheck2 className="mr-2 h-4 w-4" />
                  Acompanhar pagamento
                </Link>
              </Button>
              <div className="mt-4">
                <Button variant="ghost" asChild>
                  <Link to={AUTH_ROUTES.payments}>Voltar para Minha Conta</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Page>
    );
  }

  const pixKey = paymentSettingsQuery.data?.pix_key ?? "";
  const paymentSettingsUnavailable = paymentSettingsQuery.isError || !period;

  return (
    <Page
      title="Planos de assinatura"
      description="Escolha uma coleção, selecione seu plano e envie o comprovante de pagamento PIX."
      keywords={["assinatura", "coleção", "planos", "tonart"]}
    >
      <div className="container mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="mx-auto mb-10 max-w-3xl text-center">
          <Badge className="mb-4 bg-amber-500 px-4 py-2 text-white">
            <Crown className="mr-2 h-4 w-4" />
            Assinaturas TONART
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
            Sua coleção, em capítulos
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
            Escolha um plano, uma coleção temática e os modelos que farão parte da sua assinatura. O pagamento é feito por PIX e conferido pela equipe antes da ativação.
          </p>
        </header>

        <ol className="mx-auto mb-10 grid max-w-6xl gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Etapas da contratação">
          {[
            ["1", "Escolha seu plano"],
            ["2", "Selecione a coleção"],
            ["3", "Escolha seus modelos"],
            ["4", "Pague por PIX e envie o comprovante"],
          ].map(([number, label]) => (
            <li key={number} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm dark:border-slate-700 dark:bg-slate-900">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 font-bold text-white">
                {number}
              </span>
              <span className="font-medium text-slate-700 dark:text-slate-200">{label}</span>
            </li>
          ))}
        </ol>

        <section aria-labelledby="plans-heading" className="mb-12">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">Etapa 1</p>
              <h2 id="plans-heading" className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">Escolha seu plano</h2>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Preço PIX para o plano completo</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {plans.map((plan) => {
              const selected = selectedPlan?.id === plan.id;
              const perModel = plan.price_pix / plan.model_selection_limit;
              return (
                <Card key={plan.id} className={selected ? "border-amber-500 ring-2 ring-amber-500/20" : "transition-colors hover:border-amber-500/50"}>
                  <CardContent className="flex h-full flex-col p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-slate-950 dark:text-white">{plan.name}</h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          Escolha {plan.model_selection_limit} modelos da coleção
                        </p>
                      </div>
                      {selected && <Check className="h-5 w-5 text-amber-600" aria-label="Selecionado" />}
                    </div>
                    {plan.description && <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{plan.description}</p>}
                    <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-700">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Pagamento à vista via PIX</p>
                      <p className="mt-1 text-3xl font-bold tabular-nums text-slate-950 dark:text-white">{currency.format(plan.price_pix)}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {currency.format(perModel)} por modelo escolhido · preço integral {currency.format(plan.price_full)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant={selected ? "default" : "outline"}
                      aria-pressed={selected}
                      className="mt-5 w-full"
                      onClick={() => {
                        if (selectedPlan?.id !== plan.id) setSelectedModelSlugs([]);
                        setSelectedPlanId(plan.id);
                        setCheckoutError("");
                      }}
                    >
                      {selected ? "Plano selecionado" : "Selecionar plano"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="collections-heading" className="mb-12">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">Etapa 2</p>
            <h2 id="collections-heading" className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">Selecione a coleção</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Cada coleção reúne modelos pré-selecionados. O plano escolhido exige {modelSelectionLimit} modelos.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {availableCollections.map((collection) => {
              const selected = selectedCollection?.id === collection.id;
              const characterCount = collection.catalog_model_slugs.length;
              return (
                <button
                  key={collection.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    if (selectedCollection?.id !== collection.id) setSelectedModelSlugs([]);
                    setSelectedCollectionId(collection.id);
                    setCheckoutError("");
                  }}
                  className={`flex min-h-28 w-full items-center gap-4 rounded-lg border bg-white p-4 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 dark:bg-slate-900 ${selected ? "border-amber-500 ring-2 ring-amber-500/20" : "border-slate-200 hover:border-amber-500/50 dark:border-slate-700"}`}
                >
                  {collection.image_url ? (
                    <img src={collection.image_url} alt="" loading="lazy" className="h-16 w-16 shrink-0 rounded-md object-cover" />
                  ) : (
                    <span aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-600"><Crown className="h-6 w-6" /></span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-slate-950 dark:text-white">{collection.name}</span>
                    <span className="mt-1 block text-sm text-slate-500 dark:text-slate-400">
                      {characterCount} {characterCount === 1 ? "modelo para escolher" : "modelos para escolher"}
                    </span>
                    {collection.description && <span className="mt-1 line-clamp-2 block text-xs leading-5 text-slate-500 dark:text-slate-400">{collection.description}</span>}
                  </span>
                  {selected && <Check className="h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="subscription-models-heading" className="mb-12">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">Etapa 3</p>
              <h2 id="subscription-models-heading" className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
                Escolha {modelSelectionLimit} modelos
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Selecione os modelos que você quer incluir entre as opções desta coleção.
              </p>
            </div>
            <p aria-live="polite" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {selectedModelSlugs.length} de {modelSelectionLimit} selecionados
            </p>
          </div>
          {catalogModelsQuery.isLoading && (
            <p role="status" className="rounded-lg border p-5 text-sm text-slate-600 dark:text-slate-300">
              Carregando os modelos publicados desta coleção...
            </p>
          )}
          {catalogModelsQuery.isError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
                Não foi possível confirmar os modelos da coleção no catálogo. Tente novamente antes de continuar.
                <Button type="button" variant="outline" size="sm" onClick={() => void catalogModelsQuery.refetch()}>
                  Tentar novamente
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {catalogModelsQuery.data && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {catalogModelsQuery.data.map((model) => {
                const selected = selectedModelSlugs.includes(model.slug);
                const canSelect = selected || selectedModelSlugs.length < modelSelectionLimit;
                const imageUrl = catalogGateway?.mediaUrl(model.coverStorageKey) ?? null;
                return (
                  <button
                    key={model.slug}
                    type="button"
                    aria-pressed={selected}
                    disabled={!canSelect}
                    onClick={() => {
                      setSelectedModelSlugs((current) => selected
                        ? current.filter((slug) => slug !== model.slug)
                        : [...current, model.slug]);
                      setCheckoutError("");
                    }}
                    className={`group relative overflow-hidden rounded-lg border bg-white text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 disabled:cursor-not-allowed disabled:opacity-55 dark:bg-slate-900 ${selected ? "border-amber-500 ring-2 ring-amber-500/30" : "border-slate-200 hover:border-amber-500/60 dark:border-slate-700"}`}
                  >
                    <span className="relative block aspect-[4/3] bg-slate-100 dark:bg-slate-800">
                      {imageUrl ? (
                        <img src={imageUrl} alt="" loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]" />
                      ) : (
                        <span className="flex h-full items-center justify-center text-slate-400"><ImageOff className="h-7 w-7" /></span>
                      )}
                      <span className={`absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full shadow ${selected ? "bg-amber-500 text-white" : "bg-white/95 text-slate-600"}`} aria-hidden="true">
                        {selected && <Check className="h-4 w-4" />}
                      </span>
                    </span>
                    <span className="block p-3">
                      <span className="block truncate text-sm font-semibold text-slate-950 dark:text-white">{model.name}</span>
                      {model.variantName && <span className="mt-1 block truncate text-xs text-slate-500 dark:text-slate-400">{model.variantName}</span>}
                      <span className="mt-1 block truncate text-xs text-slate-500 dark:text-slate-400">{model.franchise}</span>
                    </span>
                    <span className="sr-only">{selected ? "Remover da seleção" : canSelect ? "Selecionar modelo" : "Limite de modelos selecionado"}</span>
                  </button>
                );
              })}
            </div>
          )}
          {selectedModelSlugs.length !== modelSelectionLimit && !catalogModelsQuery.isError && (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              {Math.max(modelSelectionLimit - selectedModelSlugs.length, 0)} {selectedModelSlugs.length > modelSelectionLimit ? "modelos acima do limite" : "modelos restantes para selecionar"}.
            </p>
          )}
        </section>

        <section aria-labelledby="checkout-heading" className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="h-fit border-slate-200 dark:border-slate-700">
            <CardContent className="p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">Etapa 4</p>
              <h2 id="checkout-heading" className="mt-1 text-xl font-bold text-slate-950 dark:text-white">Pagamento PIX</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Faça a transferência no valor do plano e guarde o comprovante para anexar abaixo.
              </p>
              {paymentSettingsQuery.isLoading && period && <p role="status" className="mt-5 text-sm text-slate-500">Carregando os dados de pagamento...</p>}
              {paymentSettingsUnavailable && (
                <Alert className="mt-5" variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>Não foi possível consultar a configuração PIX deste plano.</AlertDescription>
                </Alert>
              )}
              {!paymentSettingsQuery.isLoading && period && !paymentSettingsQuery.isError && !pixKey && (
                <Alert className="mt-5 border-amber-500/50 bg-amber-500/5">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription>A chave PIX deste plano ainda não foi configurada. A contratação ficará disponível assim que a equipe cadastrar os dados de recebimento.</AlertDescription>
                </Alert>
              )}
              {pixKey && (
                <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Chave PIX</p>
                  <div className="mt-2 flex items-start gap-2">
                    <code className="min-w-0 flex-1 break-all text-sm text-slate-800 dark:text-slate-100">{pixKey}</code>
                    <Button type="button" size="sm" variant="outline" onClick={copyPixKey} aria-label="Copiar chave PIX">
                      <Clipboard className="mr-1 h-4 w-4" />{copied ? "Copiada" : "Copiar"}
                    </Button>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Valor: {selectedPlan ? currency.format(selectedPlan.price_pix) : "—"}
                  </p>
                </div>
              )}
              <div className="mt-5 flex gap-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-900">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
                <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">
                  O comprovante é armazenado em área privada. A assinatura só é ativada depois da conferência da equipe.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 dark:border-slate-700">
            <CardContent className="p-5 sm:p-6">
              <h3 className="text-xl font-bold text-slate-950 dark:text-white">Enviar comprovante</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Anexe o recibo após realizar o PIX. Aceitamos JPG, PNG ou PDF de até {formatNumber(MAX_PAYMENT_VOUCHER_SIZE / (1024 * 1024), { maximumFractionDigits: 0 })} MB.
              </p>
              <form className="mt-5 space-y-5" onSubmit={(event) => void handleCheckout(event)}>
                <label htmlFor="subscription-voucher" className="block rounded-lg border border-dashed border-slate-300 p-5 transition-colors hover:border-amber-500 dark:border-slate-600">
                  <span className="flex items-center gap-3">
                    <Upload className="h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-slate-900 dark:text-white">{voucher?.name ?? "Escolher arquivo do comprovante"}</span>
                      <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">Arquivo legível, até 5 MB</span>
                    </span>
                  </span>
                </label>
                <input
                  id="subscription-voucher"
                  type="file"
                  className="sr-only"
                  accept={ALLOWED_PAYMENT_VOUCHER_TYPES.join(",")}
                  aria-describedby="voucher-help"
                  onChange={(event) => {
                    setVoucher(event.currentTarget.files?.[0] ?? null);
                    setCheckoutError("");
                  }}
                />
                <p id="voucher-help" className="sr-only">Formatos aceitos: JPG, PNG ou PDF, com tamanho máximo de 5 MB.</p>
                {checkoutError && <p role="alert" className="rounded-md border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-700 dark:text-red-300">{checkoutError}</p>}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting || !voucher || !pixKey || modelSelectionIssue !== null || catalogModelsQuery.isLoading || catalogModelsQuery.isError || paymentSettingsQuery.isLoading || paymentSettingsUnavailable}
                >
                  {isSubmitting ? "Enviando solicitação..." : "Enviar comprovante e solicitar assinatura"}
                </Button>
                <p className="flex items-start gap-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  <Clock3 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  O envio registra o pagamento para análise; não confirma a compensação do PIX nem ativa o plano automaticamente.
                </p>
              </form>
            </CardContent>
          </Card>
        </section>

        <div className="mt-10 text-center">
          <Button variant="ghost" asChild><Link to={PUBLIC_ROUTES.catalog}>Voltar ao catálogo</Link></Button>
        </div>
      </div>
    </Page>
  );
}
