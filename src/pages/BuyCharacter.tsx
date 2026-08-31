import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Check, Info } from "lucide-react";
import { Page } from "@/components/layouts/Page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCollectionPricing } from "@/hooks/useCollectionPricing";
import { getStandalonePurchaseCollectionBySlug } from "@/services/payments/standalone-purchase-reservation-service";
import { PUBLIC_ROUTES, subscribeCollectionPath } from "@/config/routes";
import { formatNumber } from "@/lib/utils";

export default function BuyCharacter() {
  const { slug } = useParams<{ slug: string }>();
  const collectionSlug = slug ?? "";
  const navigate = useNavigate();

  const collectionQuery = useQuery({
    queryKey: ["collection", collectionSlug],
    queryFn: () => getStandalonePurchaseCollectionBySlug(collectionSlug),
    enabled: collectionSlug.length > 0,
  });
  const { data: collection, isLoading } = collectionQuery;

  const pricingQuery = useCollectionPricing(collection?.id);
  const { data: pricing, isLoading: isPricingLoading } = pricingQuery;

  if (isLoading || isPricingLoading) {
    return (
      <Page title="Carregando..." description="Carregando informações da coleção">
        <div className="container flex max-w-4xl items-center justify-center py-16">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
            <p className="text-muted-foreground">Validando coleção e preço oficial...</p>
          </div>
        </div>
      </Page>
    );
  }

  if (collectionQuery.isError) {
    return (
      <Page title="Coleção indisponível" description="Não foi possível carregar a coleção">
        <div className="container max-w-4xl py-16 text-center">
          <h1 className="mb-4 text-3xl font-bold">Não foi possível carregar esta coleção</h1>
          <p className="mb-6 text-muted-foreground">
            Nenhuma compra foi iniciada. Tente novamente quando o catálogo estiver disponível.
          </p>
          <Button onClick={() => void collectionQuery.refetch()}>Tentar novamente</Button>
        </div>
      </Page>
    );
  }

  if (!collection) {
    return (
      <Page title="Coleção não encontrada" description="A coleção solicitada não foi encontrada">
        <div className="container max-w-4xl py-16 text-center">
          <h1 className="mb-4 text-3xl font-bold">Coleção não encontrada</h1>
          <p className="mb-6 text-muted-foreground">
            A coleção que você procura não existe ou não está disponível.
          </p>
          <Button asChild>
            <Link to={PUBLIC_ROUTES.collections}>Ver todas as coleções</Link>
          </Button>
        </div>
      </Page>
    );
  }

  if (pricingQuery.isError || !pricing) {
    return (
      <Page title="Preço indisponível" description="Os dados comerciais não puderam ser validados">
        <div className="container max-w-4xl py-16 text-center">
          <h1 className="mb-4 text-3xl font-bold">Preço indisponível</h1>
          <p className="mb-6 text-muted-foreground">
            Não exibimos valores estimados quando a fonte oficial não pode ser validada.
          </p>
          <Button onClick={() => void pricingQuery.refetch()}>Tentar novamente</Button>
        </div>
      </Page>
    );
  }

  const characters = collection.collection_characters ?? [];
  const currentMonthCharacter = characters.find((character) => character.status === "revealed");

  return (
    <Page
      title={`Peça Avulsa - ${collection.name}`}
      description={`Consulte a peça e os valores oficiais da coleção ${collection.name}`}
      keywords={["peça avulsa", "coleção", collection.name]}
    >
      <div className="container max-w-5xl py-12">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold">Peça Avulsa</h1>
          <p className="text-lg text-muted-foreground">
            Coleção: <span className="font-semibold text-foreground">{collection.name}</span>
          </p>
        </div>

        <Alert className="mb-8 border-amber-500/50 bg-amber-500/5">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription>
            <strong>Reserva temporariamente indisponível.</strong> O catálogo e os valores oficiais
            permanecem visíveis, mas não criamos reserva, cobrança nem recebemos comprovante enquanto
            o estado inicial de pagamento e a autoridade de criação da compra estão sendo
            reconciliados no backend.
          </AlertDescription>
        </Alert>

        <Card className="mb-8 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="pt-6">
            <p className="mb-2 text-sm text-muted-foreground">Valores oficiais configurados</p>
            <div className="mb-3 flex flex-wrap items-baseline gap-3">
              <span className="text-4xl font-bold text-primary">
                R$ {formatNumber(pricing.price_full, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-sm text-muted-foreground">valor integral</span>
            </div>
            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <PriceFact label="PIX" value={pricing.price_pix} />
              <PriceFact label="Entrada configurada" value={pricing.deposit_amount} />
              <PriceFact label="Saldo integral" value={pricing.remaining_full} />
            </div>
          </CardContent>
        </Card>

        {!currentMonthCharacter ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Info className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
              <h2 className="mb-2 text-xl font-semibold">Nenhum personagem revelado neste ciclo</h2>
              <p className="mb-6 text-muted-foreground">
                Não há peça avulsa revelada para esta coleção neste momento.
              </p>
              <Button asChild variant="outline">
                <Link to={subscribeCollectionPath(collectionSlug)}>Conhecer planos</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-8 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Personagem do ciclo atual</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  {currentMonthCharacter.image_url && (
                    <div className="mx-auto mb-6 aspect-square w-full max-w-sm overflow-hidden rounded-xl border bg-muted">
                      <img
                        src={currentMonthCharacter.image_url}
                        alt={currentMonthCharacter.name}
                        className="h-full w-full object-cover"
                        loading="eager"
                        {...({ fetchpriority: "high" } as Record<string, string>)}
                      />
                    </div>
                  )}
                  <h2 className="mb-3 text-3xl font-black text-primary">
                    {currentMonthCharacter.name}
                  </h2>
                  {currentMonthCharacter.description && (
                    <p className="mx-auto max-w-md text-muted-foreground">
                      {currentMonthCharacter.description}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Como será a compra quando reaberta</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <p className="text-sm text-muted-foreground">
                  Esta explicação é apenas informativa. Nenhuma vaga de produção é reservada por esta
                  página enquanto o fluxo financeiro estiver bloqueado.
                </p>
                {[
                  "Preço e capacidade validados no servidor",
                  "Reserva nasce como não paga até existir evidência financeira válida",
                  "Comprovante enviado nunca equivale a pagamento aprovado",
                  "Produção só avança após transição autorizada",
                  "Saldo e envio seguem os prazos persistidos no pedido",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}

                <Button asChild className="w-full" variant="outline">
                  <Link to={PUBLIC_ROUTES.catalog}>Explorar catálogo</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Page>
  );
}

function PriceFact({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-background/80 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">
        R$ {formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
    </div>
  );
}
