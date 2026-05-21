import { useCallback, useState } from "react";
import { log } from "@/lib/logger";
import {
  createCustomerSupportConversation,
  getSupportAttachmentPublicUrl,
} from "@/services/customer-chat-button-service";
import type { Conversation } from "@/types/support";
import { toast } from "sonner";

export function dispatchCustomerConversationCreated(conversation: Conversation) {
  window.dispatchEvent(
    new CustomEvent("newConversationCreated", {
      detail: { conversation },
    })
  );
}

export function useCreateCustomerSupportConversation(currentUserId: string) {
  const [isCreating, setIsCreating] = useState(false);

  const createConversation = useCallback(async () => {
    if (!currentUserId) {
      toast.error("Voce precisa estar autenticado");
      return null;
    }

    try {
      setIsCreating(true);
      const newConversation = await createCustomerSupportConversation(currentUserId);
      toast.success("Nova conversa iniciada!");
      dispatchCustomerConversationCreated(newConversation);
      return newConversation;
    } catch (error) {
      log.error("Erro ao criar nova conversa customer", { error, currentUserId });
      toast.error("Erro ao criar nova solicitacao");
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [currentUserId]);

  return { createConversation, isCreating };
}

export function useSupportAttachmentPublicUrl() {
  return useCallback((filePath: string) => getSupportAttachmentPublicUrl(filePath), []);
}
