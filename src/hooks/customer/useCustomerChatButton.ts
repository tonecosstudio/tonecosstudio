import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth";
import { log } from "@/lib/logger";
import {
  countUnreadCustomerSupportMessages,
  createCustomerSupportConversation,
  listCustomerSupportConversations,
  subscribeToCustomerChatUpdates,
  unsubscribeFromCustomerChatUpdates,
} from "@/services/customer/customer-chat-button-service";
import type { Conversation } from "@/types/support";

export function useCustomerChatButton() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const userId = user?.id ?? null;
  const conversationsQueryKey = useMemo(
    () => ["customer-support-conversations", userId],
    [userId],
  );
  const unreadCountQueryKey = useMemo(
    () => ["customer-support-unread-count", userId],
    [userId],
  );

  const conversationsQuery = useQuery({
    queryKey: conversationsQueryKey,
    enabled: Boolean(userId && isOpen),
    queryFn: async () => {
      if (!userId) {
        return [] as Conversation[];
      }

      try {
        return await listCustomerSupportConversations(userId);
      } catch (error) {
        log.error("Erro ao carregar conversas customer", { error, userId });
        toast.error("Erro ao carregar conversas");
        throw error;
      }
    },
  });

  const unreadCountQuery = useQuery({
    queryKey: unreadCountQueryKey,
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) {
        return 0;
      }

      try {
        return await countUnreadCustomerSupportMessages(userId);
      } catch (error) {
        log.error("Erro ao carregar contador do chat customer", {
          error,
          userId,
        });
        return 0;
      }
    },
  });

  const createConversationMutation = useMutation({
    mutationFn: async () => {
      if (!userId) {
        throw new Error("Usuario nao autenticado");
      }
      return createCustomerSupportConversation(userId);
    },
    onSuccess: (newConversation) => {
      queryClient.setQueryData<Conversation[]>(
        conversationsQueryKey,
        (current = []) => [
          newConversation,
          ...current.filter(
            (conversation) => conversation.id !== newConversation.id,
          ),
        ],
      );
      setSelectedConversationId(newConversation.id);
      toast.success("Nova conversa iniciada!");
      void queryClient.invalidateQueries({ queryKey: unreadCountQueryKey });
    },
    onError: (error) => {
      log.error("Erro ao criar conversa customer", { error, userId });
      toast.error("Erro ao criar conversa");
    },
  });

  useEffect(() => {
    if (!userId) {
      return;
    }

    let active = true;
    let channel: Awaited<
      ReturnType<typeof subscribeToCustomerChatUpdates>
    > | null = null;

    void subscribeToCustomerChatUpdates(userId, () => {
      void queryClient.invalidateQueries({ queryKey: unreadCountQueryKey });
      if (isOpen) {
        void queryClient.invalidateQueries({ queryKey: conversationsQueryKey });
      }
    })
      .then((subscription) => {
        if (!active) {
          unsubscribeFromCustomerChatUpdates(subscription);
          return;
        }

        channel = subscription;
      })
      .catch((error) => {
        log.error("Erro ao assinar atualizacoes do chat customer", {
          error,
          userId,
        });
      });

    return () => {
      active = false;
      if (channel) {
        unsubscribeFromCustomerChatUpdates(channel);
      }
    };
  }, [conversationsQueryKey, isOpen, queryClient, unreadCountQueryKey, userId]);

  useEffect(() => {
    if (!userId) {
      setSelectedConversationId(null);
    }
  }, [userId]);

  const conversations = useMemo(
    () => conversationsQuery.data ?? ([] as Conversation[]),
    [conversationsQuery.data],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSelectedConversationId((current) => {
      if (
        current &&
        conversations.some((conversation) => conversation.id === current)
      ) {
        return current;
      }
      return conversations[0]?.id ?? null;
    });
  }, [conversations, isOpen]);

  const selectedConversation = useMemo(
    () =>
      conversations.find(
        (conversation) => conversation.id === selectedConversationId,
      ),
    [conversations, selectedConversationId],
  );
  const currentUserName =
    user?.user_metadata?.full_name || user?.email || "Cliente";
  const loading = conversationsQuery.isLoading || conversationsQuery.isFetching;

  const createConversation = useCallback(async () => {
    if (!userId) {
      return;
    }

    await createConversationMutation.mutateAsync();
  }, [createConversationMutation, userId]);

  return {
    user,
    isOpen,
    setIsOpen,
    unreadCount: unreadCountQuery.data ?? 0,
    conversations,
    selectedConversationId,
    setSelectedConversationId,
    selectedConversation,
    isClosed: selectedConversation?.status === "closed",
    loading,
    currentUserName,
    createConversation,
    isCreatingConversation: createConversationMutation.isPending,
  };
}
