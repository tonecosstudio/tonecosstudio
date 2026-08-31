import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import {
  useSubscribeCollectionCheckout,
  type SubscriptionPaymentMethod,
} from "@/hooks/subscription/useSubscribeCollectionCheckout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup } from "@/components/ui/radio-group";
import {
  ArrowRight,
  Check,
  Crown,
  Gift,
  Info,
  Shield,
  Sparkles,
  TrendingDown,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PaymentVoucherUpload } from "@/components/PaymentVoucherUpload";
import { Page } from "@/components/layouts/Page";
import { PUBLIC_ROUTES, paymentDetailsPath } from "@/config/routes";
import { usePricingSettings } from "@/hooks/usePricingSettings";
import { formatNumber } from "@/lib/utils";

export default function SubscribeCollection() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<SubscriptionPaymentMethod>("pix");
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [paymentVoucherUrl, setPaymentVoucherUrl] = useState<string | null>(null);

  const {
    plans,
    plansLoading,
    collections,
    collectionsLoading,
    initialCollection,
    initialCollectionLoading,
    loadError,
    retryLoad,
    createCheckout,
  } = useSubscribeCollectionCheckout(slug);
  const pricingQuery = usePricingSettings();

  useEffect(() => {
    if (initialCollection && !activeCollectionId) {
      setActiveCollectionId(initialCollection.id);
    }
  }, [initialCollection, activeCollectionId]);

  useEffect(() => {
    if (plans && plans.length > 0 && !selectedPlanId) {
      setSelectedPlanId(plans[0].id);
    }
  }, [plans, selectedPlanId]);

  const bestValuePlanId = useMemo(() => {
    if (!plans || plans.length === 0) return null;

    return plans.reduce((best, current) => {
      const currentUnit = current.price_full / current.deliveries_total;
      const bestUnit = best.price_full / best.deliveries_total;
      return currentUnit < bestUnit ? current : best;
    }).id;
  }, [plans]);

  const handleSubscribe = async () => {
    if (!user) {
      navigate(PUBLIC_ROUTES.login);
      return;
    }

    try {
      const selectedPlan = plans?.find((plan) => plan.id === selectedPlanId);
      if (!selectedPlan) throw new Error("Selecione um plano");

      if (!activeCollectionId) {
        throw new Error("Selecione uma coleção ativa");
      }

      if (!paymentVoucherUrl) {
        throw new Error("Envie o comprovante de pagamento");
      }

      const data = await createCheckout.mutateAsync({
        userId: user.id,
        selectedPlan,
        activeCollectionId,
        paymentMethod,
        paymentVoucherUrl,
      });

      toast({
        title: "Assinatura criada",
        description: "Abrindo os detalhes do pagamento...",
      });
      navigate(paymentDetailsPath(data.payment.id));
    } catch (error) {
      toast({
        title: "Erro ao criar assinatura",
        description: error instanceof Error ? error.message : "Erro inesperado",
        variant: "destructive",
      });
    }
  };

  if (
    plansLoading ||
    collectionsLoading ||
    initialCollectionLoading ||
    pricingQuery.isLoading
  ) {
    return (
      <Page title="Carregando..." description="Carregando planos de assinatura">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-slate-600 dark:text-slate-400">
              Validando planos e preços oficiais...
            </p>
          </div>
        </div>
      </Page>
    );
  }

  if (loadError || pricingQuery.isError || !pricingQuery.data) {
    return (
      <Page
        title="Assinatura indisponível"
        description="Não foi possível validar os dados comerciais"
      >
        <div className="container max-w-3xl px-6 py-24 text-center space-y-5">
          <h1 className="text-3xl font-bold">Assinatura temporariamente indisponível</h1>
          <p className="text-muted-foreground">
            Nenhuma oferta ou checkout é exibido quando planos, coleções ou preços oficiais
            não podem ser validados.
          </p>
          <Button
            onClick={() => {
              retryLoad();
              void pricingQuery.refetch();
            }}
          >
            Tentar novamente
          </Button>
        </div>
      </Page>
    );
  }

  const availableCollections = (collections ?? []).filter(
    (collection) => (collection.collection_characters?.length ?? 0) > 0,
  );

  if (!plans?.length || availableCollections.length === 0) {
    return (
      <Page
        title="Assinatura indisponível"
        description="Não há planos e coleções disponíveis para assinatura"
      >
        <div className="container max-w-3xl px-6 py-24 text-center space-y-5">
          <h1 className="text-3xl font-bold">Assinaturas ainda não estão disponíveis</h1>
          <p className="text-muted-foreground">
            Volte ao universo para acompanhar as coleções publicadas. Não criamos checkout
            sem plano e coleção ativos.
          </p>
          <Button onClick={() => navigate(PUBLIC_ROUTES.catalog)}>Ver universo</Button>
        </div>
      </Page>
    );
  }

  const standaloneReferencePrice = pricingQuery.data.defaultPriceFull;
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? null;
  const coinsToReceive = selectedPlan?.total_credits ?? null;
  const finalPrice = selectedPlan
    ? paymentMethod === "pix"
      ? selectedPlan.price_pix
      : selectedPlan.price_full
    : null;
  const discount = selectedPlan
    ? Math.max(0, selectedPlan.price_full - selectedPlan.price_pix)
    : null;
  const pixDiscountPercentage =
    selectedPlan && selectedPlan.price_full > 0
      ? Math.round(((selectedPlan.price_full - selectedPlan.price_pix) / selectedPlan.price_full) * 100)
      : 0;

  return (
    <Page
      title="Assinar Coleção - Planos Premium"
      description="Escolha um plano ativo e uma coleção publicada"
      keywords={["assinatura", "coleção", "planos", "ordax"]}
    >
      <div className="container max-w-7xl px-6 py-12">
        <div className="mb-12 text-center">
          <Badge className="mb-4 bg-amber-500 text-white px-4 py-2">
            <Crown className="w-4 h-4 mr-2" />
            Planos
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-slate-950 dark:text-white">
            Escolha seu plano
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Os valores abaixo vêm da configuração comercial ativa. O checkout é criado
            somente depois que os dados são validados pelo backend.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-lg">
                  1
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-950 dark:text-white">
                    Escolha seu plano
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Compare preço e quantidade de entregas
                  </p>
                </div>
              </div>

              <RadioGroup value={selectedPlanId || ""} onValueChange={setSelectedPlanId}>
                <div className="grid md:grid-cols-3 gap-4">
                  {plans.map((plan) => {
                    const isSelected = selectedPlanId === plan.id;
                    const isBestValue = bestValuePlanId === plan.id && plans.length > 1;
                    const pricePerPiece = plan.price_full / plan.deliveries_total;
                    const referenceTotal = standaloneReferencePrice * plan.deliveries_total;
                    const savings = Math.max(0, referenceTotal - plan.price_full);
                    const savingsPercent =
                      referenceTotal > 0 ? Math.round((savings / referenceTotal) * 100) : 0;

                    return (
                      <label
                        key={plan.id}
                        className={`relative cursor-pointer transition-all ${
                          isSelected ? "scale-[1.02]" : "hover:scale-[1.01]"
                        }`}
                      >
                        <input
                          type="radio"
                          value={plan.id}
                          checked={isSelected}
                          onChange={() => setSelectedPlanId(plan.id)}
                          className="sr-only"
                        />

                        <Card
                          className={`relative overflow-visible ${
                            isSelected
                              ? "ring-4 ring-amber-500 shadow-2xl"
                              : "shadow-lg hover:shadow-xl"
                          }`}
                        >
                          {isBestValue && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg z-10 whitespace-nowrap">
                              MENOR VALOR/PEÇA
                            </div>
                          )}

                          <CardContent className="p-5 pt-6">
                            <div className="text-center">
                              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                                <Shield className="w-6 h-6 text-white" />
                              </div>
                              <h3 className="text-lg font-bold text-slate-950 dark:text-white mb-1">
                                {plan.name}
                              </h3>
                              <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                                {plan.deliveries_total} entregas
                              </p>

                              <div className="text-3xl font-bold text-slate-950 dark:text-white mb-1">
                                R${" "}
                                {formatNumber(pricePerPiece, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </div>
                              <div className="text-xs text-slate-600 dark:text-slate-400">
                                por peça
                              </div>

                              {savings > 0 && (
                                <div className="mt-3 bg-green-600 text-white px-3 py-2 rounded-lg text-xs font-bold">
                                  {savingsPercent}% abaixo do valor avulso de referência
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </label>
                    );
                  })}
                </div>
              </RadioGroup>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-lg">
                  2
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-950 dark:text-white">
                    Escolha sua coleção ativa
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    O preço em coins é calculado pelas regras contextuais vigentes
                  </p>
                </div>
              </div>

              <Alert className="mb-6 border-primary bg-primary/5">
                <Sparkles className="h-4 w-4 text-primary" />
                <AlertDescription>
                  <strong>Preço contextual:</strong> o catálogo calcula o custo de cada
                  personagem conforme a coleção e o contexto da assinatura. Esta tela não
                  usa valores fixos como substituto.
                  {coinsToReceive !== null && coinsToReceive > 0 && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      O plano selecionado inclui{" "}
                      <strong>{coinsToReceive.toLocaleString("pt-BR")} coins</strong>.
                    </p>
                  )}
                </AlertDescription>
              </Alert>

              <div className="grid md:grid-cols-2 gap-4">
                {availableCollections.map((collection) => {
                  const isSelected = activeCollectionId === collection.id;
                  const characterCount = collection.collection_characters?.length ?? 0;

                  return (
                    <Card
                      key={collection.id}
                      onClick={() => setActiveCollectionId(collection.id)}
                      className={`cursor-pointer transition-all ${
                        isSelected
                          ? "ring-2 ring-amber-500 bg-amber-50 dark:bg-amber-950/20"
                          : "hover:shadow-lg"
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                              isSelected ? "border-amber-500 bg-amber-500" : "border-slate-300"
                            }`}
                          >
                            {isSelected && <Check className="h-4 w-4 text-white" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold text-slate-950 dark:text-white">
                                {collection.name}
                              </h4>
                              {isSelected && (
                                <Badge className="bg-amber-500 text-white text-xs">
                                  <Sparkles className="h-3 w-3 mr-1" />
                                  Ativa
                                </Badge>
                              )}
                            </div>
                            {collection.description && (
                              <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-2">
                                {collection.description}
                              </p>
                            )}
                            <p className="text-xs text-slate-500 dark:text-slate-500">
                              {characterCount}{" "}
                              {characterCount === 1 ? "personagem" : "personagens"}
                            </p>
                            {isSelected && (
                              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-medium">
                                Preço em coins confirmado no catálogo
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-lg">
                  3
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-950 dark:text-white">
                    Forma de pagamento
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Escolha uma opção disponível
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <Card
                  onClick={() => setPaymentMethod("pix")}
                  className={`cursor-pointer transition-all ${
                    paymentMethod === "pix"
                      ? "ring-2 ring-green-500 bg-green-50 dark:bg-green-950/20"
                      : "hover:shadow-lg"
                  }`}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          paymentMethod === "pix"
                            ? "border-green-500 bg-green-500"
                            : "border-slate-300"
                        }`}
                      >
                        {paymentMethod === "pix" && <Check className="h-4 w-4 text-white" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-bold text-slate-950 dark:text-white">PIX</h4>
                          {pixDiscountPercentage > 0 && (
                            <Badge className="bg-green-500 text-white text-xs">
                              {pixDiscountPercentage}% OFF
                            </Badge>
                          )}
                        </div>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
                          {selectedPlan
                            ? `R$ ${formatNumber(selectedPlan.price_pix, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}`
                            : "—"}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          Valor oficial do plano via PIX
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card
                  onClick={() => setPaymentMethod("credit_card")}
                  className={`cursor-pointer transition-all ${
                    paymentMethod === "credit_card"
                      ? "ring-2 ring-amber-500 bg-amber-50 dark:bg-amber-950/20"
                      : "hover:shadow-lg"
                  }`}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          paymentMethod === "credit_card"
                            ? "border-amber-500 bg-amber-500"
                            : "border-slate-300"
                        }`}
                      >
                        {paymentMethod === "credit_card" && (
                          <Check className="h-4 w-4 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-950 dark:text-white mb-2">
                          Cartão de crédito
                        </h4>
                        <p className="text-2xl font-bold text-slate-950 dark:text-white mb-1">
                          {selectedPlan
                            ? `R$ ${formatNumber(selectedPlan.price_full, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}`
                            : "—"}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          Valor integral configurado para o plano
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-lg">
                  4
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-950 dark:text-white">
                    Comprovante de pagamento
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    O upload só é permitido para usuário autenticado
                  </p>
                </div>
              </div>

              {!user && (
                <Alert className="mb-6 border-amber-500 bg-amber-50 dark:bg-amber-950/20">
                  <Info className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <span>Faça login antes de enviar qualquer comprovante.</span>
                    <Button size="sm" onClick={() => navigate(PUBLIC_ROUTES.login)}>
                      Entrar
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              <PaymentVoucherUpload
                onUploadSuccess={(url) => {
                  setPaymentVoucherUrl(url);
                  toast({
                    title: "Comprovante enviado",
                    description: "O arquivo foi recebido para vinculação ao checkout.",
                  });
                }}
                onUploadError={(error) => {
                  toast({
                    title: "Erro ao enviar comprovante",
                    description: error,
                    variant: "destructive",
                  });
                }}
                userId={user?.id}
                pathPrefix="subscriptions"
                label="Comprovante de pagamento"
                showPreview={true}
                disabled={!user}
              />
            </section>
          </div>

          <aside className="lg:col-span-1">
            <div className="sticky top-6 space-y-6">
              <Card className="shadow-2xl border-2">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-slate-950 dark:text-white mb-6">
                    Resumo do pedido
                  </h3>

                  <div className="space-y-4 mb-6">
                    <SummaryRow label="Plano" value={selectedPlan?.name ?? "—"} />
                    <SummaryRow
                      label="Entregas"
                      value={selectedPlan ? `${selectedPlan.deliveries_total}x` : "—"}
                    />
                    {coinsToReceive !== null && coinsToReceive > 0 && (
                      <SummaryRow
                        label="Coins"
                        value={`${coinsToReceive.toLocaleString("pt-BR")} coins`}
                        emphasis
                      />
                    )}
                    <SummaryRow
                      label="Coleção ativa"
                      value={
                        activeCollectionId
                          ? availableCollections.find(
                              (collection) => collection.id === activeCollectionId,
                            )?.name ?? "—"
                          : "—"
                      }
                    />
                    <SummaryRow
                      label="Pagamento"
                      value={paymentMethod === "pix" ? "PIX" : "Cartão"}
                    />
                    <SummaryRow
                      label="Comprovante"
                      value={paymentVoucherUrl ? "Enviado" : "Pendente"}
                      emphasis={Boolean(paymentVoucherUrl)}
                    />
                  </div>

                  {paymentMethod === "pix" && discount !== null && discount > 0 && (
                    <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4 mb-6">
                      <div className="flex items-center gap-2 text-green-700 dark:text-green-400 text-sm font-semibold mb-1">
                        <TrendingDown className="w-4 h-4" />
                        Diferença PIX
                      </div>
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        - R${" "}
                        {formatNumber(discount, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    </div>
                  )}

                  <div className="border-t pt-6 mb-6">
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="text-lg font-semibold text-slate-950 dark:text-white">
                        Total:
                      </span>
                      <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                        {finalPrice !== null
                          ? `R$ ${formatNumber(finalPrice, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}`
                          : "—"}
                      </div>
                    </div>
                  </div>

                  <Button
                    size="lg"
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-6 text-base shadow-xl"
                    onClick={handleSubscribe}
                    disabled={
                      createCheckout.isPending ||
                      !selectedPlanId ||
                      !activeCollectionId ||
                      !paymentVoucherUrl ||
                      !user
                    }
                  >
                    {createCheckout.isPending ? (
                      "Processando..."
                    ) : !user ? (
                      "Entre para continuar"
                    ) : !paymentVoucherUrl ? (
                      "Envie o comprovante"
                    ) : !activeCollectionId ? (
                      "Selecione uma coleção ativa"
                    ) : (
                      <>
                        Confirmar assinatura
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-center text-slate-500 dark:text-slate-400 mt-4">
                    A criação final usa o plano, a coleção e o preço validados no backend.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
                <CardContent className="p-6">
                  <h4 className="font-bold text-slate-950 dark:text-white mb-4 flex items-center gap-2">
                    <Gift className="w-5 h-5 text-amber-500" />
                    O que esta tela garante
                  </h4>
                  <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                    {[
                      "Plano ativo vindo do banco",
                      "Preço validado antes da oferta",
                      "Coleção publicada com personagens",
                      "Upload vinculado ao usuário autenticado",
                      "Checkout criado por RPC server-side",
                    ].map((benefit) => (
                      <div key={benefit} className="flex items-center gap-3">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span>{benefit}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </aside>
        </div>
      </div>
    </Page>
  );
}

function SummaryRow({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-slate-600 dark:text-slate-400">{label}:</span>
      <span
        className={`font-semibold text-right ${
          emphasis
            ? "text-amber-600 dark:text-amber-400"
            : "text-slate-950 dark:text-white"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
