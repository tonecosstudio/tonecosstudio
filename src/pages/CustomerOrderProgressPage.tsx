/**
 * CustomerOrderProgressPage Component
 *
 * Customer-facing page to view order production progress.
 */

import { useParams, useNavigate } from "react-router-dom";
import { Page } from "@/components/layouts/Page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Package } from "lucide-react";
import { CharacterChoiceCard } from "@/components/customer/CharacterChoiceCard";
import { ProgressTimeline } from "@/components/customer/ProgressTimeline";
import { EstimatedDatesCard } from "@/components/customer/EstimatedDatesCard";
import { TrackingCard } from "@/components/customer/TrackingCard";
import { useOrderProgressRealtime } from "@/hooks/customer/useOrderProgressRealtime";
import {
  useCustomerOrderProgress,
  type CustomerOrderType,
} from "@/hooks/customer/useCustomerOrderProgress";
import { AUTH_ROUTES, profileSectionPath } from "@/config/routes";

export default function CustomerOrderProgressPage() {
  const { orderId, orderType } = useParams<{ orderId: string; orderType: string }>();
  const navigate = useNavigate();
  const { data: orderProgress, isLoading, error } = useCustomerOrderProgress(orderId, orderType);

  useOrderProgressRealtime({
    orderId: orderId || "",
    orderType: (orderType as CustomerOrderType) || "subscription_delivery",
    enabled: !!orderId && !!orderType,
    enableToast: true,
  });

  const isOnTrack = orderProgress?.productionStatus !== "on_hold";

  if (isLoading) {
    return (
      <Page title="Carregando..." description="Carregando informacoes do pedido">
        <div className="container py-12 max-w-5xl">
          <Skeleton className="h-12 w-64 mb-4" />
          <Skeleton className="h-6 w-96 mb-8" />
          <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
            <div className="space-y-6">
              <Skeleton className="h-64" />
              <Skeleton className="h-48" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-32" />
              <Skeleton className="h-48" />
            </div>
          </div>
        </div>
      </Page>
    );
  }

  if (error || !orderProgress) {
    return (
      <Page title="Erro" description="Erro ao carregar informacoes do pedido">
        <div className="container py-12 max-w-5xl text-center">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Pedido Nao Encontrado</h1>
          <p className="text-muted-foreground mb-6">
            {error instanceof Error
              ? error.message
              : "Nao foi possivel carregar as informacoes do pedido."}
          </p>
          <Button onClick={() => navigate(AUTH_ROUTES.dashboard)}>Voltar ao Dashboard</Button>
        </div>
      </Page>
    );
  }

  return (
    <Page
      title={`Pedido #${orderProgress.orderNumber} - Acompanhamento`}
      description="Acompanhe o progresso do seu pedido em tempo real"
    >
      <div className="container py-12 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Pedido #{orderProgress.orderNumber}</h1>
          <p className="text-muted-foreground">
            Acompanhe o progresso do seu pedido em tempo real
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Progresso de Producao
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ProgressTimeline stages={orderProgress.stages} />
              </CardContent>
            </Card>

            <EstimatedDatesCard
              estimatedCompletionDate={orderProgress.estimatedCompletionDate}
              estimatedShippingDate={orderProgress.estimatedShippingDate}
              estimatedDeliveryDate={orderProgress.estimatedDeliveryDate}
              isOnTrack={isOnTrack}
              productionStatus={orderProgress.productionStatus}
            />

            {orderProgress.currentStage === "shipped" && (
              <TrackingCard
                trackingCode={orderProgress.trackingCode}
                trackingCarrier={orderProgress.trackingCarrier}
                estimatedDeliveryDate={orderProgress.estimatedDeliveryDate}
              />
            )}
          </div>

          <div className="lg:sticky lg:top-4 h-fit space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Resumo do Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {orderProgress.collectionImageUrl && (
                  <img
                    src={orderProgress.collectionImageUrl}
                    alt={orderProgress.collectionName}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                )}

                <div>
                  <p className="text-sm text-muted-foreground">Colecao</p>
                  <p className="font-semibold text-lg">{orderProgress.collectionName}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Numero do Pedido</p>
                  <p className="font-mono text-sm">#{orderProgress.orderNumber}</p>
                </div>
              </CardContent>
            </Card>

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

            <Card>
              <CardHeader>
                <CardTitle>Precisa de Ajuda?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Entre em contato conosco para qualquer duvida sobre seu pedido.
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate(profileSectionPath("support"))}
                >
                  Falar com Suporte
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Page>
  );
}
