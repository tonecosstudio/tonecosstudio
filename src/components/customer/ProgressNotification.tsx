import { getProductionStageLabel } from "@/config/production-stages";
import { useToast } from "@/hooks/use-toast";
import { log } from "@/lib/logger";
import type { ProductionStage } from "@/types/production";

export type NotificationType =
  | "stage_change"
  | "choice_approved"
  | "choice_rejected"
  | "shipped"
  | "choice_locked"
  | "production_blocked"
  | "production_unblocked";

export interface ProgressNotificationOptions {
  type: NotificationType;
  stage?: ProductionStage | string;
  characterName?: string;
  trackingCode?: string;
  rejectionReason?: string;
  blockReason?: string;
  playSound?: boolean;
}

interface WebkitAudioWindow extends Window {
  webkitAudioContext?: typeof AudioContext;
}

function playNotificationSound(): void {
  try {
    const AudioContextConstructor = window.AudioContext || (window as WebkitAudioWindow).webkitAudioContext;

    if (!AudioContextConstructor) {
      return;
    }

    const audioContext = new AudioContextConstructor();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = 800;
    oscillator.type = "sine";
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    log.warn("Progress notification sound failed", { error });
  }
}

export function useProgressNotification() {
  const { toast } = useToast();

  const showNotification = (options: ProgressNotificationOptions): void => {
    const {
      type,
      stage,
      characterName,
      trackingCode,
      rejectionReason,
      blockReason,
      playSound = false,
    } = options;

    if (playSound) {
      playNotificationSound();
    }

    switch (type) {
      case "stage_change":
        if (stage) {
          toast({
            title: "Pedido atualizado",
            description: `Seu pedido avancou para: ${getProductionStageLabel(stage)}.`,
            duration: 5000,
          });
        }
        break;

      case "choice_approved":
        if (characterName) {
          toast({
            title: "Escolha aprovada",
            description: `Sua escolha do personagem "${characterName}" foi aprovada e registrada para a proxima etapa.`,
            duration: 8000,
          });
        }
        break;

      case "choice_rejected": {
        const reason = rejectionReason || "Motivo nao especificado";
        toast({
          title: "Escolha rejeitada",
          description: `Sua escolha foi rejeitada. Motivo: ${reason}. Escolha outro personagem para continuar.`,
          variant: "destructive",
          duration: 10000,
        });
        break;
      }

      case "shipped":
        toast({
          title: "Pedido enviado",
          description: trackingCode
            ? `Seu pedido foi enviado. Codigo de rastreamento: ${trackingCode}.`
            : "Seu pedido foi enviado. O codigo de rastreamento ainda nao esta disponivel.",
          duration: 8000,
        });
        break;

      case "choice_locked":
        toast({
          title: "Escolha confirmada",
          description: "Sua escolha foi confirmada e nao pode mais ser alterada.",
          duration: 5000,
        });
        break;

      case "production_blocked": {
        const reason = blockReason || "Motivo nao especificado";
        toast({
          title: "Producao pausada",
          description: `A producao do seu pedido foi pausada temporariamente. Motivo: ${reason}. Novas atualizacoes aparecerao no acompanhamento do pedido quando forem registradas.`,
          variant: "destructive",
          duration: 10000,
        });
        break;
      }

      case "production_unblocked":
        toast({
          title: "Producao retomada",
          description: "A producao do seu pedido foi retomada.",
          duration: 5000,
        });
        break;

      default:
        log.warn("Unknown progress notification type", { type });
    }
  };

  return { showNotification };
}
