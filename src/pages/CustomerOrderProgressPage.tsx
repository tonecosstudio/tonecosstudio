// @ts-nocheck
/**
 * CustomerOrderProgressPage Component
 * 
 * Customer-facing page to view order production progress.
 * Shows visual timeline, estimated dates, character selection, and tracking info.
 * 
 * Requirements: 2.4.1, 2.4.2, 2.4.3, 2.4.4
 * Task: 5.1.1 Create CustomerOrderProgressPage component
 */

import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import SEOHead from "@/components/SEOHead";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Package } from "lucide-react";
import { CharacterChoiceCard } from "@/components/customer/CharacterChoiceCard";
import { ProgressTimeline } from "@/components/customer/ProgressTimeline";
import { EstimatedDatesCard } from "@/components/customer/EstimatedDatesCard";
import { TrackingCard } from "@/components/customer/TrackingCard";
import { useOrderProgressRealtime } from "@/hooks/customer/useOrderProgressRealtime";
import type { ProductionStage, ChoiceStatus } from "@/services/admin/production-service";

// ============================================================================
// Types
// ============================================================================

interface OrderProgress {
  id: string;
  orderId: string;
  orderNumber: string;
  orderType: "subscription_delivery" | "standalone_purchase";
  collectionId: string;
  collectionName: string;
  collectionImageUrl: string | null;
  currentStage: ProductionStage;
  productionStatus: string;
  choiceStatus: ChoiceStatus;
  choiceDeadline: string | null;
  choiceId: string | null;
  characterId: string | null;
  characterName: string | null;
  characterImageUrl: string | null;
  estimatedCompletionDate: string | null;
  estimatedShippingDate: string | null;
  estimatedDeliveryDate: string | null;
  trackingCode: string | null;
  trackingCarrier: string | null;
  productionStartedAt: string | null;
  productionCompletedAt: string | null;
  stages: StageInfo[];
}

interface StageInfo {
  name: ProductionStage;
  displayName: string;
  status: "completed" | "current" | "upcoming";
  completedAt: string | null;
  order: number;
}

// Stage configuration
const STAGE_CONFIG: Record<ProductionStage, { label: string; order: number }> = {
  awaiting_choice: { label: "Aguardando Escolha", order: 1 },
  design: { label: "Design", order: 2 },
  production: { label: "Produção", order: 3 },
  quality_check: { label: "Controle de Qualidade", order: 4 },
  packaging: { label: "Embalagem", order: 5 },
  shipped: { label: "Enviado", order: 6 },
};

// Database types (temporary until Supabase types are regenerated)
interface ProductionQueueRow {
  id: string;
  order_id: string;
  order_type: string;
  current_stage: string;
  production_status: string;
  choice_status: string;
  choice_deadline: string | null;
  character_id: string | null;
  character_name: string | null;
  estimated_completion_date: string | null;
  production_started_at: string | null;
  production_completed_at: string | null;
  collection_id: string;
  collection_name: string;
  tracking_code: string | null;
  tracking_carrier: string | null;
}

interface ProductionStageRow {
  stage_name: string;
  status: string;
  completed_at: string | null;
  stage_order: number;
}

// ============================================================================
// Component
// ============================================================================

export default function CustomerOrderProgressPage() {
  const { orderId, orderType } = useParams<{ orderId: string; orderType: string }>();
  const navigate = useNavigate();

  // Fetch order progress data
  const { data: orderProgress, isLoading, error } = useQuery({
    queryKey: ["customer-order-progress", orderId, orderType],
    queryFn: async () => {
      if (!orderId || !orderType) {
        throw new Error("ID do pedido ou tipo não fornecido");
      }

      // Fetch from production_queue using raw query to avoid type issues
      const { data: productionData, error: productionError } = await supabase
        .from("production_queue" as any)
        .select(`
          id,
          order_id,
          order_type,
          current_stage,
          production_status,
          choice_status,
          choice_deadline,
          character_id,
          character_name,
          estimated_completion_date,
          production_started_at,
          production_completed_at,
          collection_id,
          collection_name,
          tracking_code,
          tracking_carrier
        `)
        .eq("order_id", orderId)
        .eq("order_type", orderType)
        .maybeSingle() as { data: ProductionQueueRow | null; error: any };

      if (productionError) throw productionError;
      if (!productionData) throw new Error("Pedido não encontrado na fila de produção");

      return await processProductionData(productionData);
    },
    enabled: !!orderId && !!orderType,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Helper function to process production data
  async function processProductionData(productionData: ProductionQueueRow): Promise<OrderProgress> {
    // Fetch collection image
    let collectionImageUrl = null;
    if (productionData.collection_id) {
      const { data: collectionData } = await supabase
        .from("collections")
        .select("image_bucket, image_path")
        .eq("id", productionData.collection_id)
        .maybeSingle() as { data: { image_bucket: string; image_path: string } | null };

      if (collectionData?.image_bucket && collectionData?.image_path) {
        collectionImageUrl = supabase.storage
          .from(collectionData.image_bucket)
          .getPublicUrl(collectionData.image_path).data.publicUrl;
      }
    }

    // Fetch character image if character is selected
    let characterImageUrl = null;
    if (productionData.character_id) {
      const { data: characterData } = await supabase
        .from("collection_characters")
        .select("image_bucket, image_path")
        .eq("id", productionData.character_id)
        .maybeSingle() as { data: { image_bucket: string; image_path: string } | null };

      if (characterData?.image_bucket && characterData?.image_path) {
        characterImageUrl = supabase.storage
          .from(characterData.image_bucket)
          .getPublicUrl(characterData.image_path).data.publicUrl;
      }
    }

    // Fetch production stages
    const { data: stagesData } = await supabase
      .from("production_stages" as any)
      .select("stage_name, status, completed_at, stage_order")
      .eq("production_queue_id", productionData.id)
      .order("stage_order", { ascending: true }) as { data: ProductionStageRow[] | null };

    // Fetch choice_id from character_choices table
    let choiceId = null;
    if (productionData.choice_status !== 'pending') {
      const { data: choiceData } = await supabase
        .from("character_choices" as any)
        .select("id")
        .eq("order_id", productionData.order_id)
        .eq("order_type", productionData.order_type)
        .maybeSingle();
      
      if (choiceData) {
        choiceId = (choiceData as any).id;
      }
    }

    // Build stages array
    const stages: StageInfo[] = Object.entries(STAGE_CONFIG).map(([stageName, config]) => {
      const stageData = stagesData?.find((s) => s.stage_name === stageName);
      const currentStageOrder = STAGE_CONFIG[productionData.current_stage as ProductionStage].order;
      const thisStageOrder = config.order;

      let status: "completed" | "current" | "upcoming";
      if (thisStageOrder < currentStageOrder) {
        status = "completed";
      } else if (thisStageOrder === currentStageOrder) {
        status = "current";
      } else {
        status = "upcoming";
      }

      return {
        name: stageName as ProductionStage,
        displayName: config.label,
        status,
        completedAt: stageData?.completed_at || null,
        order: config.order,
      };
    });

    // Calculate estimated dates
    const estimatedShippingDate = productionData.estimated_completion_date
      ? new Date(new Date(productionData.estimated_completion_date).getTime() + 2 * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const estimatedDeliveryDate = estimatedShippingDate
      ? new Date(new Date(estimatedShippingDate).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
      : null;

    return {
      id: productionData.id,
      orderId: productionData.order_id,
      orderNumber: productionData.order_id.slice(0, 8),
      orderType: productionData.order_type as "subscription_delivery" | "standalone_purchase",
      collectionId: productionData.collection_id,
      collectionName: productionData.collection_name,
      collectionImageUrl,
      currentStage: productionData.current_stage as ProductionStage,
      productionStatus: productionData.production_status,
      choiceStatus: productionData.choice_status as ChoiceStatus,
      choiceDeadline: productionData.choice_deadline,
      choiceId,
      characterId: productionData.character_id,
      characterName: productionData.character_name,
      characterImageUrl,
      estimatedCompletionDate: productionData.estimated_completion_date,
      estimatedShippingDate,
      estimatedDeliveryDate,
      trackingCode: productionData.tracking_code,
      trackingCarrier: productionData.tracking_carrier,
      productionStartedAt: productionData.production_started_at,
      productionCompletedAt: productionData.production_completed_at,
      stages,
    };
  }

  // Subscribe to real-time updates
  useOrderProgressRealtime({
    orderId: orderId || "",
    orderType: (orderType as "subscription_delivery" | "standalone_purchase") || "subscription_delivery",
    enabled: !!orderId && !!orderType,
    enableToast: true,
  });

  // Determine if order is on track or delayed
  const isOnTrack = orderProgress?.productionStatus !== "on_hold";

  // Loading state
  if (isLoading) {
    return (
      <AppShell>
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
      </AppShell>
    );
  }

  // Error state
  if (error || !orderProgress) {
    return (
      <AppShell>
        <div className="container py-12 max-w-5xl text-center">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Pedido Não Encontrado</h1>
          <p className="text-muted-foreground mb-6">
            {error instanceof Error ? error.message : "Não foi possível carregar as informações do pedido."}
          </p>
          <Button onClick={() => navigate("/dashboard")}>
            Voltar ao Dashboard
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <>
      <SEOHead
        title={`Pedido #${orderProgress.orderNumber} - Acompanhamento`}
        description="Acompanhe o progresso do seu pedido em tempo real"
      />

      <AppShell>
        <div className="container py-12 max-w-5xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">
              Pedido #{orderProgress.orderNumber}
            </h1>
            <p className="text-muted-foreground">
              Acompanhe o progresso do seu pedido em tempo real
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
            {/* Main Content */}
            <div className="space-y-6">
              {/* Progress Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Progresso de Produção
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ProgressTimeline stages={orderProgress.stages} />
                </CardContent>
              </Card>

              {/* Estimated Dates Card */}
              <EstimatedDatesCard
                estimatedCompletionDate={orderProgress.estimatedCompletionDate}
                estimatedShippingDate={orderProgress.estimatedShippingDate}
                estimatedDeliveryDate={orderProgress.estimatedDeliveryDate}
                isOnTrack={isOnTrack}
                productionStatus={orderProgress.productionStatus}
              />

              {/* Tracking Card - Only show if shipped */}
              {orderProgress.currentStage === "shipped" && (
                <TrackingCard
                  trackingCode={orderProgress.trackingCode}
                  trackingCarrier={orderProgress.trackingCarrier}
                  estimatedDeliveryDate={orderProgress.estimatedDeliveryDate}
                />
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:sticky lg:top-4 h-fit space-y-6">
              {/* Order Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Resumo do Pedido</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Collection Image */}
                  {orderProgress.collectionImageUrl && (
                    <img
                      src={orderProgress.collectionImageUrl}
                      alt={orderProgress.collectionName}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  )}

                  {/* Collection Name */}
                  <div>
                    <p className="text-sm text-muted-foreground">Coleção</p>
                    <p className="font-semibold text-lg">{orderProgress.collectionName}</p>
                  </div>

                  {/* Order Number */}
                  <div>
                    <p className="text-sm text-muted-foreground">Número do Pedido</p>
                    <p className="font-mono text-sm">#{orderProgress.orderNumber}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Character Selection */}
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

              {/* Support */}
              <Card>
                <CardHeader>
                  <CardTitle>Precisa de Ajuda?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Entre em contato conosco para qualquer dúvida sobre seu pedido.
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate("/perfil?section=support")}
                  >
                    Falar com Suporte
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </AppShell>
    </>
  );
}
