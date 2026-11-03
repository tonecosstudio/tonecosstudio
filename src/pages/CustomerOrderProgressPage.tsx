import { useNavigate, useParams } from "react-router-dom";
import { AlertCircle, Package } from "lucide-react";
import { ArcadeCard } from "@/components/arcade/ArcadeLayout";
import { CharacterChoiceCard } from "@/components/customer/CharacterChoiceCard";
import { EstimatedDatesCard } from "@/components/customer/EstimatedDatesCard";
import { ProgressTimeline } from "@/components/customer/ProgressTimeline";
import { TrackingCard } from "@/components/customer/TrackingCard";
import { Page } from "@/components/layouts/Page";
import { BRAND_NAME } from "@/config/brand";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AUTH_ROUTES, profileSectionPath } from "@/config/routes";
import { useCustomerOrderProgress, type CustomerOrderType } from "@/hooks/customer/useCustomerOrderProgress";
import { useOrderProgressRealtime } from "@/hooks/customer/useOrderProgressRealtime";

export default function CustomerOrderProgressPage() {
  const { orderId, orderType } = useParams<{ orderId: string; orderType: string }>();
  const navigate = useNavigate();
  const { data: orderProgress, isLoading, error } = useCustomerOrderProgress(orderId, orderType);

  useOrderProgressRealtime({
    orderId: orderId || "",
    orderType: (orderType as CustomerOrderType) || "subscription_delivery",
    enabled: Boolean(orderId && orderType),
    enableToast: true,
  });

  const isOnTrack = orderProgress?.productionStatus !== "on_hold";

  if (isLoading) {
    return (
      <Page title={`Carregando pedido | ${BRAND_NAME}`} description="Carregando informacoes do pedido.">
        <section className="mx-auto max-w-6xl px-6 py-12">
          <div className="space-y-6">
            <Skeleton className="h-14 w-72 rounded-sm" />
            <Skeleton className="h-6 w-[32rem] rounded-sm" />
            <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
              <div className="space-y-6">
                <Skeleton className="h-72 rounded-sm" />
                <Skeleton className="h-52 rounded-sm" />
              </div>
              <div className="space-y-6">
                <Skeleton className="h-36 rounded-sm" />
                <Skeleton className="h-52 rounded-sm" />
              </div>
            </div>
          </div>
        </section>
      </Page>
    );
  }

  if (error || !orderProgress) {
    return (
      <Page title={`Pedido nao encontrado | ${BRAND_NAME}`} description="Erro ao carregar informacoes do pedido.">
        <section className="mx-auto max-w-5xl px-6 py-12">
          <ArcadeCard className="p-12 text-center">
            <AlertCircle className="mx-auto mb-4 h-16 w-16 text-red-400" />
            <h1
              className="mb-2 text-2xl font-black uppercase tracking-[0.08em]"
              style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
            >
              PEDIDO NAO ENCONTRADO
            </h1>
            <p className="mb-6 text-sm text-[hsl(0,0%,58%)]">
              {error instanceof Error
                ? error.message
                : "Nao foi possivel carregar as informacoes do pedido."}
            </p>
            <Button onClick={() => navigate(AUTH_ROUTES.dashboard)}>Voltar ao dashboard</Button>
          </ArcadeCard>
        </section>
      </Page>
    );
  }

  return (
    <Page
      title={`Pedido #${orderProgress.orderNumber} | ${BRAND_NAME}`}
      description="Acompanhe o progresso do pedido em tempo real."
    >
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8 rounded-sm border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,6%)] p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[hsl(var(--gold-accent))]">
            Acompanhamento
          </p>
          <h1
            className="mt-3 text-4xl font-black uppercase tracking-[0.08em]"
            style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
          >
            PEDIDO #{orderProgress.orderNumber}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[hsl(0,0%,58%)]">
            Acompanhe producao, prazos, rastreio e escolhas relacionadas ao pedido em uma unica superficie.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
          <div className="space-y-6">
            <ArcadeCard hover={false} className="p-6">
              <div className="mb-4 flex items-center gap-2">
                <Package className="h-5 w-5 text-[hsl(var(--gold-accent))]" />
                <h2
                  className="text-lg font-bold tracking-wider"
                  style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
                >
                  PROGRESSO DE PRODUCAO
                </h2>
              </div>
              <ProgressTimeline stages={orderProgress.stages} />
            </ArcadeCard>

            <EstimatedDatesCard
              estimatedCompletionDate={orderProgress.estimatedCompletionDate}
              estimatedShippingDate={orderProgress.estimatedShippingDate}
              estimatedDeliveryDate={orderProgress.estimatedDeliveryDate}
              isOnTrack={isOnTrack}
              productionStatus={orderProgress.productionStatus}
            />

            {orderProgress.currentStage === "shipped" ? (
              <TrackingCard
                trackingCode={orderProgress.trackingCode}
                trackingCarrier={orderProgress.trackingCarrier}
                estimatedDeliveryDate={orderProgress.estimatedDeliveryDate}
              />
            ) : null}
          </div>

          <div className="h-fit space-y-6 lg:sticky lg:top-4">
            <ArcadeCard hover={false} className="p-6">
              <h3
                className="mb-4 text-lg font-bold tracking-wider"
                style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
              >
                RESUMO DO PEDIDO
              </h3>

              <div className="space-y-4">
                {orderProgress.collectionImageUrl ? (
                  <img
                    src={orderProgress.collectionImageUrl}
                    alt={orderProgress.collectionName}
                    className="h-48 w-full rounded-sm object-cover"
                  />
                ) : null}

                <div>
                  <p className="text-sm text-[hsl(0,0%,52%)]">Colecao</p>
                  <p className="text-lg font-semibold">{orderProgress.collectionName}</p>
                </div>

                <div>
                  <p className="text-sm text-[hsl(0,0%,52%)]">Numero do pedido</p>
                  <p className="font-mono text-sm">#{orderProgress.orderNumber}</p>
                </div>
              </div>
            </ArcadeCard>

            <CharacterChoiceCard
              orderId={orderProgress.orderId}
              orderType={orderProgress.orderType}
              collectionId={orderProgress.collectionId}
              choiceStatus={orderProgress.choiceStatus}
              choiceDeadline={orderProgress.choiceDeadline}
              choiceId={orderProgress.choiceId}
              characterId={orderProgress.characterId}
              characterName={orderProgress.characterName}
              characterImageUrl={orderProgress.characterImageUrl}
            />

            <ArcadeCard hover={false} className="p-6">
              <h3
                className="mb-3 text-lg font-bold tracking-wider"
                style={{ fontFamily: "'Bebas Neue', Impact, sans-serif" }}
              >
                PRECISA DE AJUDA?
              </h3>
              <p className="mb-4 text-sm text-[hsl(0,0%,58%)]">
                Fale com a equipe se houver duvida sobre etapa, prazo, rastreio ou contexto do pedido.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate(profileSectionPath("support"))}
              >
                Falar com suporte
              </Button>
            </ArcadeCard>
          </div>
        </div>
      </section>
    </Page>
  );
}
