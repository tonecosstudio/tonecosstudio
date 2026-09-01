import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getProductionStageLabel } from "@/config/production-stages";
import { useToast } from "@/hooks/use-toast";
import { log } from "@/lib/logger";
import {
  subscribeToOrderProgressChanges,
  type CharacterChoiceUpdate,
  type ProductionQueueUpdate,
} from "@/services/realtime/realtime-service";
import type { ChoiceStatus, ProductionStage } from "@/services/admin/production/production-service";

interface UseOrderProgressRealtimeOptions {
  orderId: string;
  orderType: "subscription_delivery" | "standalone_purchase";
  enabled?: boolean;
  enableToast?: boolean;
}

export function useOrderProgressRealtime(options: UseOrderProgressRealtimeOptions): void {
  const { orderId, orderType, enabled = true, enableToast = true } = options;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const previousStageRef = useRef<ProductionStage | null>(null);
  const previousChoiceStatusRef = useRef<ChoiceStatus | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled || !orderId || !orderType) {
      return;
    }

    const invalidateProgress = () => {
      void queryClient.invalidateQueries({
        queryKey: ["customer-order-progress", orderId, orderType],
      });
    };

    const handleProductionUpdate = (newData: ProductionQueueUpdate) => {
      if (!isMountedRef.current) return;

      log.debug("Order progress production queue updated", {
        orderId,
        orderType,
        productionQueueId: newData.id,
        currentStage: newData.current_stage,
        productionStatus: newData.production_status,
      });

      invalidateProgress();

      if (enableToast && previousStageRef.current && previousStageRef.current !== newData.current_stage) {
        const stageName = getProductionStageLabel(newData.current_stage);

        toast({
          title: "Pedido Atualizado",
          description: `Seu pedido avancou para: ${stageName}`,
          duration: 5000,
        });

        if (newData.current_stage === "shipped" && newData.tracking_code) {
          toast({
            title: "Pedido Enviado!",
            description: `Seu pedido foi enviado. Codigo de rastreamento: ${newData.tracking_code}`,
            duration: 8000,
          });
        }
      }

      previousStageRef.current = newData.current_stage;
    };

    const handleCharacterChoiceUpdate = (newData: CharacterChoiceUpdate) => {
      if (!isMountedRef.current) return;

      log.debug("Order progress character choice updated", {
        orderId,
        orderType,
        choiceId: newData.id,
        status: newData.status,
        characterId: newData.character_id,
      });

      invalidateProgress();

      if (
        enableToast &&
        previousChoiceStatusRef.current &&
        previousChoiceStatusRef.current !== newData.status
      ) {
        if (newData.status === "approved" && newData.character_name) {
          toast({
            title: "Escolha Aprovada!",
            description: `Sua escolha do personagem "${newData.character_name}" foi aprovada e registrada para a proxima etapa.`,
            duration: 8000,
          });
        } else if (newData.status === "rejected") {
          const reason = newData.rejection_reason || "Motivo nao especificado";
          toast({
            title: "Escolha Rejeitada",
            description: `Sua escolha foi rejeitada. Motivo: ${reason}. Por favor, escolha outro personagem.`,
            variant: "destructive",
            duration: 10000,
          });
        } else if (newData.status === "locked") {
          toast({
            title: "Escolha Confirmada",
            description: "Sua escolha foi confirmada e nao pode mais ser alterada.",
            duration: 5000,
          });
        }
      }

      previousChoiceStatusRef.current = newData.status;
    };

    const handleCharacterChoiceInsert = (newData: CharacterChoiceUpdate) => {
      if (!isMountedRef.current) return;

      log.debug("Order progress character choice created", {
        orderId,
        orderType,
        choiceId: newData.id,
        status: newData.status,
        characterId: newData.character_id,
      });

      invalidateProgress();
    };

    return subscribeToOrderProgressChanges({
      orderId,
      orderType,
      onProductionUpdate: handleProductionUpdate,
      onCharacterChoiceUpdate: handleCharacterChoiceUpdate,
      onCharacterChoiceInsert: handleCharacterChoiceInsert,
      onProductionStatusChange: (status, error) => {
        if (!isMountedRef.current) return;

        const channel = `production-queue:${orderId}:${orderType}`;
        if (status === "SUBSCRIBED") {
          log.debug("Order progress production queue realtime subscribed", { channel });
        } else if (status === "CHANNEL_ERROR") {
          log.error("Order progress production queue realtime failed", { channel, error });

          if (enableToast) {
            toast({
              title: "Erro de Conexao",
              description: "Nao foi possivel conectar as atualizacoes em tempo real. Tentando reconectar...",
              variant: "destructive",
              duration: 5000,
            });
          }
        } else if (status === "TIMED_OUT") {
          log.warn("Order progress production queue realtime timed out", { channel });
        } else if (status === "CLOSED") {
          log.debug("Order progress production queue realtime closed", { channel });
        }
      },
      onChoiceStatusChange: (status, error) => {
        if (!isMountedRef.current) return;

        const channel = `character-choices:${orderId}:${orderType}`;
        if (status === "SUBSCRIBED") {
          log.debug("Order progress character choice realtime subscribed", { channel });
        } else if (status === "CHANNEL_ERROR") {
          log.error("Order progress character choice realtime failed", { channel, error });
        } else if (status === "TIMED_OUT") {
          log.warn("Order progress character choice realtime timed out", { channel });
        } else if (status === "CLOSED") {
          log.debug("Order progress character choice realtime closed", { channel });
        }
      },
    });
  }, [orderId, orderType, enabled, enableToast, queryClient, toast]);
}
