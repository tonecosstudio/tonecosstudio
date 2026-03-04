/**
 * ProgressNotification Component
 * 
 * Provides a reusable notification system for production progress updates.
 * Wraps the toast system with consistent styling and behavior for production events.
 * 
 * Features:
 * - Consistent notification interface for production updates
 * - Support for different notification types (stage change, choice approved, choice rejected, shipped)
 * - Uses shadcn/ui toast system
 * - Optional sound notifications (user preference)
 * - All text in Portuguese (pt-BR)
 * 
 * Requirements: 2.4.5 Progress Notifications
 * Task: 5.2.2 Create ProgressNotification component
 */

import { useToast } from "@/hooks/use-toast";
import type { ProductionStage, ChoiceStatus } from "@/services/admin/production-service";

// ============================================================================
// Types
// ============================================================================

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
  stage?: ProductionStage;
  characterName?: string;
  trackingCode?: string;
  rejectionReason?: string;
  blockReason?: string;
  playSound?: boolean;
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
// Sound Notification
// ============================================================================

/**
 * Play a notification sound
 * Uses Web Audio API to play a simple beep
 */
function playNotificationSound(): void {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800; // Frequency in Hz
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    console.warn("[ProgressNotification] Failed to play sound:", error);
  }
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to show progress notifications with consistent styling
 * 
 * @returns Object with showNotification function
 */
export function useProgressNotification() {
  const { toast } = useToast();

  /**
   * Show a progress notification
   * 
   * @param options - Notification options
   */
  const showNotification = (options: ProgressNotificationOptions): void => {
    const { type, stage, characterName, trackingCode, rejectionReason, blockReason, playSound = false } = options;

    // Play sound if enabled
    if (playSound) {
      playNotificationSound();
    }

    // Generate notification content based on type
    switch (type) {
      case "stage_change":
        if (stage) {
          const stageName = STAGE_NAMES[stage] || stage;
          
          toast({
            title: "Pedido Atualizado",
            description: `Seu pedido avançou para: ${stageName}`,
            duration: 5000,
          });
        }
        break;

      case "choice_approved":
        if (characterName) {
          toast({
            title: "✅ Escolha Aprovada!",
            description: `Sua escolha do personagem "${characterName}" foi aprovada. A produção começará em breve!`,
            duration: 8000,
          });
        }
        break;

      case "choice_rejected":
        {
          const reason = rejectionReason || "Motivo não especificado";
          toast({
            title: "Escolha Rejeitada",
            description: `Sua escolha foi rejeitada. Motivo: ${reason}. Por favor, escolha outro personagem.`,
            variant: "destructive",
            duration: 10000,
          });
        }
        break;

      case "shipped":
        if (trackingCode) {
          toast({
            title: "🎉 Pedido Enviado!",
            description: `Seu pedido foi enviado. Código de rastreamento: ${trackingCode}`,
            duration: 8000,
          });
        } else {
          toast({
            title: "🎉 Pedido Enviado!",
            description: "Seu pedido foi enviado. O código de rastreamento será disponibilizado em breve.",
            duration: 8000,
          });
        }
        break;

      case "choice_locked":
        toast({
          title: "Escolha Confirmada",
          description: "Sua escolha foi confirmada e a produção foi iniciada!",
          duration: 5000,
        });
        break;

      case "production_blocked":
        {
          const reason = blockReason || "Motivo não especificado";
          toast({
            title: "⚠️ Produção Pausada",
            description: `A produção do seu pedido foi temporariamente pausada. Motivo: ${reason}. Entraremos em contato em breve.`,
            variant: "destructive",
            duration: 10000,
          });
        }
        break;

      case "production_unblocked":
        toast({
          title: "✅ Produção Retomada",
          description: "A produção do seu pedido foi retomada. Obrigado pela paciência!",
          duration: 5000,
        });
        break;

      default:
        console.warn("[ProgressNotification] Unknown notification type:", type);
    }
  };

  return { showNotification };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Show a stage change notification
 * 
 * @param stage - The new production stage
 * @param playSound - Whether to play a sound notification
 */
export function showStageChangeNotification(stage: ProductionStage, playSound = false): void {
  const { showNotification } = useProgressNotification();
  showNotification({ type: "stage_change", stage, playSound });
}

/**
 * Show a choice approved notification
 * 
 * @param characterName - The name of the approved character
 * @param playSound - Whether to play a sound notification
 */
export function showChoiceApprovedNotification(characterName: string, playSound = false): void {
  const { showNotification } = useProgressNotification();
  showNotification({ type: "choice_approved", characterName, playSound });
}

/**
 * Show a choice rejected notification
 * 
 * @param rejectionReason - The reason for rejection
 * @param playSound - Whether to play a sound notification
 */
export function showChoiceRejectedNotification(rejectionReason?: string, playSound = false): void {
  const { showNotification } = useProgressNotification();
  showNotification({ type: "choice_rejected", rejectionReason, playSound });
}

/**
 * Show a shipped notification
 * 
 * @param trackingCode - The tracking code (optional)
 * @param playSound - Whether to play a sound notification
 */
export function showShippedNotification(trackingCode?: string, playSound = false): void {
  const { showNotification } = useProgressNotification();
  showNotification({ type: "shipped", trackingCode, playSound });
}
