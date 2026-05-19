/**
 * useOrderProgressRealtime Hook
 *
 * Manages real-time updates for customer order progress view.
 * Subscribes to production_queue and character_choices changes via Supabase Realtime.
 *
 * Features:
 * - Subscribe to production_queue changes for user's orders
 * - Subscribe to character_choices changes
 * - Automatically update UI on changes
 * - Show toast notifications for important events (stage changes, choice approvals)
 * - Handle connection errors and reconnection gracefully
 * - Clean up subscriptions on unmount
 *
 * Requirements: 2.4.5 Progress Notifications
 * Task: 5.2.1 Implement Supabase Realtime subscription
 */
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { log } from "@/lib/logger";
import type { ProductionStage, ChoiceStatus } from "@/services/admin/production-service";

// ============================================================================
// Types
// ============================================================================

interface UseOrderProgressRealtimeOptions {
  orderId: string;
  orderType: "subscription_delivery" | "standalone_purchase";
  enabled?: boolean;
  enableToast?: boolean;
}

interface ProductionQueueUpdate {
  id: string;
  order_id: string;
  order_type: string;
  current_stage: ProductionStage;
  production_status: string;
  choice_status: ChoiceStatus;
  character_id: string | null;
  character_name: string | null;
  tracking_code: string | null;
  estimated_completion_date: string | null;
}

interface CharacterChoiceUpdate {
  id: string;
  order_id: string;
  order_type: string;
  status: ChoiceStatus;
  character_id: string | null;
  character_name: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
}

// Stage display names in Portuguese
const STAGE_NAMES: Record<ProductionStage, string> = {
  awaiting_choice: "Aguardando Escolha",
  design: "Design",
  production: "Produção",
  quality_check: "Controle de Qualidade",
  packaging: "Embalagem",
  shipped: "Enviado",
};

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to manage real-time updates for customer order progress
 *
 * @param options - Configuration options
 * @returns void - Updates are handled via query invalidation and toasts
 */
export function useOrderProgressRealtime(options: UseOrderProgressRealtimeOptions): void {
  const { orderId, orderType, enabled = true, enableToast = true } = options;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Track previous stage to detect changes
  const previousStageRef = useRef<ProductionStage | null>(null);
  const previousChoiceStatusRef = useRef<ChoiceStatus | null>(null);

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Don't subscribe if disabled or missing required params
    if (!enabled || !orderId || !orderType) {
      return;
    }

    // ========================================================================
    // Production Queue Subscription
    // ========================================================================

    const productionChannelName = `production-queue:${orderId}:${orderType}`;
    const productionChannel = supabase
      .channel(productionChannelName)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "production_queue",
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          if (!isMountedRef.current) return;

          const newData = payload.new as ProductionQueueUpdate;

          // Check if this update is for the correct order type
          if (newData.order_type !== orderType) {
            return;
          }

          log.debug("Order progress production queue updated", {
            orderId,
            orderType,
            productionQueueId: newData.id,
            currentStage: newData.current_stage,
            productionStatus: newData.production_status,
          });

          // Invalidate queries to refresh UI
          queryClient.invalidateQueries({
            queryKey: ["customer-order-progress", orderId, orderType]
          });

          // Show toast notification for stage changes
          if (enableToast && previousStageRef.current && previousStageRef.current !== newData.current_stage) {
            const stageName = STAGE_NAMES[newData.current_stage] || newData.current_stage;

            toast({
              title: "Pedido Atualizado",
              description: `Seu pedido avançou para: ${stageName}`,
              duration: 5000,
            });

            // Special notification for shipped status
            if (newData.current_stage === "shipped" && newData.tracking_code) {
              toast({
                title: "🎉 Pedido Enviado!",
                description: `Seu pedido foi enviado. Código de rastreamento: ${newData.tracking_code}`,
                duration: 8000,
              });
            }
          }

          // Update previous stage reference
          previousStageRef.current = newData.current_stage;
        }
      )
      .subscribe((status, error) => {
        if (!isMountedRef.current) return;

        if (status === "SUBSCRIBED") {
          log.debug("Order progress production queue realtime subscribed", {
            channel: productionChannelName,
          });
        } else if (status === "CHANNEL_ERROR") {
          log.error("Order progress production queue realtime failed", {
            channel: productionChannelName,
            error,
          });

          if (enableToast) {
            toast({
              title: "Erro de Conexão",
              description: "Não foi possível conectar às atualizações em tempo real. Tentando reconectar...",
              variant: "destructive",
              duration: 5000,
            });
          }
        } else if (status === "TIMED_OUT") {
          log.warn("Order progress production queue realtime timed out", {
            channel: productionChannelName,
          });
        } else if (status === "CLOSED") {
          log.debug("Order progress production queue realtime closed", {
            channel: productionChannelName,
          });
        }
      });

    // ========================================================================
    // Character Choices Subscription
    // ========================================================================

    const choiceChannelName = `character-choices:${orderId}:${orderType}`;
    const choiceChannel = supabase
      .channel(choiceChannelName)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "character_choices",
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          if (!isMountedRef.current) return;

          const newData = payload.new as CharacterChoiceUpdate;

          // Check if this update is for the correct order type
          if (newData.order_type !== orderType) {
            return;
          }

          log.debug("Order progress character choice updated", {
            orderId,
            orderType,
            choiceId: newData.id,
            status: newData.status,
            characterId: newData.character_id,
          });

          // Invalidate queries to refresh UI
          queryClient.invalidateQueries({
            queryKey: ["customer-order-progress", orderId, orderType]
          });

          // Show toast notification for choice status changes
          if (enableToast && previousChoiceStatusRef.current && previousChoiceStatusRef.current !== newData.status) {
            // Choice approved
            if (newData.status === "approved" && newData.character_name) {
              toast({
                title: "✅ Escolha Aprovada!",
                description: `Sua escolha do personagem "${newData.character_name}" foi aprovada. A produção começará em breve!`,
                duration: 8000,
              });
            }

            // Choice rejected
            else if (newData.status === "rejected") {
              const reason = newData.rejection_reason || "Motivo não especificado";
              toast({
                title: "Escolha Rejeitada",
                description: `Sua escolha foi rejeitada. Motivo: ${reason}. Por favor, escolha outro personagem.`,
                variant: "destructive",
                duration: 10000,
              });
            }

            // Choice locked (production started)
            else if (newData.status === "locked") {
              toast({
                title: "Escolha Confirmada",
                description: "Sua escolha foi confirmada e a produção foi iniciada!",
                duration: 5000,
              });
            }
          }

          // Update previous choice status reference
          previousChoiceStatusRef.current = newData.status;
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "character_choices",
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          if (!isMountedRef.current) return;

          const newData = payload.new as CharacterChoiceUpdate;

          // Check if this insert is for the correct order type
          if (newData.order_type !== orderType) {
            return;
          }

          log.debug("Order progress character choice created", {
            orderId,
            orderType,
            choiceId: newData.id,
            status: newData.status,
            characterId: newData.character_id,
          });

          // Invalidate queries to refresh UI
          queryClient.invalidateQueries({
            queryKey: ["customer-order-progress", orderId, orderType]
          });
        }
      )
      .subscribe((status, error) => {
        if (!isMountedRef.current) return;

        if (status === "SUBSCRIBED") {
          log.debug("Order progress character choice realtime subscribed", {
            channel: choiceChannelName,
          });
        } else if (status === "CHANNEL_ERROR") {
          log.error("Order progress character choice realtime failed", {
            channel: choiceChannelName,
            error,
          });
        } else if (status === "TIMED_OUT") {
          log.warn("Order progress character choice realtime timed out", {
            channel: choiceChannelName,
          });
        } else if (status === "CLOSED") {
          log.debug("Order progress character choice realtime closed", {
            channel: choiceChannelName,
          });
        }
      });

    // ========================================================================
    // Cleanup
    // ========================================================================

    return () => {
      log.debug("Order progress realtime cleanup", { orderId, orderType });
      supabase.removeChannel(productionChannel);
      supabase.removeChannel(choiceChannel);
    };
  }, [orderId, orderType, enabled, enableToast, queryClient, toast]);
}
