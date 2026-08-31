import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Check, Crown, Shield, Sparkles } from "lucide-react";
import { Page } from "@/components/layouts/Page";
import { PUBLIC_ROUTES } from "@/config/routes";
import { usePricingSettings } from "@/hooks/usePricingSettings";
import { useSubscribeCollectionCheckout } from "@/hooks/subscription/useSubscribeCollectionCheckout";
import { formatNumber } from "@/lib/utils";

export default function SubscribeCollection() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const {
    plans,
    plansLoading,
    collections,
    collectionsLoading,
    initialCollectionLoading,
    loadError,
    retryLoad,
  } = useSubscribeCollectionCheckout(slug);
  const pricingQuery = usePricingSettings();

  const bestValuePlanId = useMemo(() => {
    if (!plans || plans.length === 0) return null;

    return plans.reduce((best, current) => {
      const currentUnit = current.price_full / current.deliveries_total;
      const bestUnit = best.price_full / best.deliveries_total;
      return currentUnit < bestUnit ? current : best;
    }).id;
  }, [plans]);

  if (plansLoading || collectionsLoading || initialCollectionLoading || pricingQuery.isLoading) {
    return (
      <Page title="Carregando..." description="Carregando planos de assinatura">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="space-y-4 text-center">
            <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
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
        <div className="container max-w-3xl space-y-5 px-6 py-24 text-center">
          <h1 className="text-3xl font-bold">Assinatura temporariamente indisponível</h1>
          <p className="text-muted-foreground">
            Nenhuma oferta é exibida quando planos, coleções ou preços oficiais não podem ser
            validados.
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
        <div className="container max-w-3xl space-y-5 px-6 py-24 text-center">
          <h1 className="text-3xl font-bold">Assinaturas ainda não estão disponíveis</h1>
          <p className="text-muted-foreground">
            Volte ao universo para acompanhar as coleções publicadas. Não exibimos oferta sem
            plano e coleção ativos.
          </p>
          <Button onClick={() => navigate(PUBLIC_ROUTES.catalog)}>Ver universo</Button>
        </div>
      </Page>
    );
  }

  const standaloneReferencePrice = pricingQuery.data.defaultPriceFull;

  return (
    <Page
      title="Planos de assinatura"
      description="Consulte os planos ativos enquanto o checkout seguro é finalizado"
      keywords={["assinatura", "coleção", "planos", "ordax"]}
    >
      <div className="container max-w-7xl px-6 py-12">
        <div className="mb-10 text-center">
          <Badge className="mb-4 bg-amber-500 px-4 py-2 text-white">
            <Crown className="mr-2 h-4 w-4" />
            Planos
          </Badge>
          <h1 className="mb-4 text-4xl font-bold text-slate-950 dark:text-white md:text-5xl">
            Conheça os planos ativos
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-slate-600 dark:text-slate-400">
            Valores e quantidades abaixo vêm da configuração comercial ativa. A contratação está
            temporariamente bloqueada até a validação completa do fluxo financeiro.
          </p>
        </div>

        <Alert className="mx-auto mb-10 max-w-4xl border-amber-500/50 bg-amber-500/5">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription>
            <strong>Checkout temporariamente indisponível.</strong> Não solicitamos pagamento nem
            comprovante enquanto a autoridade de criação e aprovação da assinatura está sendo
            reconciliada no backend. Isso evita pedidos ou cobranças em estado inconsistente.
          </AlertDescription>
        </Alert>

        <section className="mb-12">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 font-bold text-white">
              1
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-950 dark:text-white">Planos disponíveis</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Compare preço e quantidade de entregas com dados oficiais
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {plans.map((plan) => {
              const isBestValue = bestValuePlanId === plan.id && plans.length > 1;
              const pricePerPiece = plan.price_full / plan.deliveries_total;
              const referenceTotal = standaloneReferencePrice * plan.deliveries_total;
              const savings = Math.max(0, referenceTotal - plan.price_full);
              const savingsPercent =
                referenceTotal > 0 ? Math.round((savings / referenceTotal) * 100) : 0;

              return (
                <Card key={plan.id} className="relative overflow-visible shadow-lg">
                  {isBestValue && (
                    <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-white shadow-lg">
                      MENOR VALOR/PEÇA
                    </div>
                  )}
                  <CardContent className="p-5 pt-7 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500">
                      <Shield className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="mb-1 text-lg font-bold text-slate-950 dark:text-white">
                      {plan.name}
                    </h3>
                    <p className="mb-3 text-xs text-slate-600 dark:text-slate-400">
                      {plan.deliveries_total} entregas
                    </p>
                    <div className="mb-1 text-3xl font-bold text-slate-950 dark:text-white">
                      R${" "}
                      {formatNumber(pricePerPiece, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">por peça</div>
                    {savings > 0 && (
                      <div className="mt-3 rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white">
                        {savingsPercent}% abaixo do valor avulso de referência
                      </div>
                    )}
                    <div className="mt-4 border-t pt-4 text-sm">
                      <p>
                        PIX: <strong>R$ {formatNumber(plan.price_pix, { minimumFractionDigits: 2 })}</strong>
                      </p>
                      <p className="mt-1 text-muted-foreground">
                        Integral: R$ {formatNumber(plan.price_full, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section>
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 font-bold text-white">
              2
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-950 dark:text-white">Coleções publicadas</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Coleções que possuem personagens disponíveis no catálogo
              </p>
            </div>
          </div>

          <Alert className="mb-6 border-primary bg-primary/5">
            <Sparkles className="h-4 w-4 text-primary" />
            <AlertDescription>
              O catálogo e os valores permanecem consultáveis, mas nenhuma seleção nesta página cria
              reserva, assinatura, cobrança ou upload de comprovante.
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {availableCollections.map((collection) => {
              const characterCount = collection.collection_characters?.length ?? 0;
              return (
                <Card key={collection.id}>
                  <CardContent className="p-5">
                    <div className="mb-2 flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <h3 className="font-bold text-slate-950 dark:text-white">{collection.name}</h3>
                    </div>
                    {collection.description && (
                      <p className="mb-3 line-clamp-3 text-sm text-muted-foreground">
                        {collection.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {characterCount} {characterCount === 1 ? "personagem" : "personagens"}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <div className="mt-12 text-center">
          <Button onClick={() => navigate(PUBLIC_ROUTES.catalog)}>Explorar o universo</Button>
        </div>
      </div>
    </Page>
  );
}
