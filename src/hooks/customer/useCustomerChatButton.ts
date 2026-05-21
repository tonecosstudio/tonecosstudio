import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { log } from "@/lib/logger";
import type { Conversation } from "@/types/support";
import { toast } from "sonner";
import {
  countUnreadCustomerSupportMessages,
  createCustomerSupportConversation,
  listCustomerSupportConversations,
  subscribeToCustomerChatUpdates,
  unsubscribeFromCustomerChatUpdates,
} from "@/services/customer-chat-button-service";

export function useCustomerChatButton() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadUnreadCount = useCallback(async () => {
    if (!user) return;

    try {
      const count = await countUnreadCustomerSupportMessages(user.id);
      setUnreadCount(count);
    } catch (error) {
      log.error("Erro ao carregar contador do chat customer", { error, userId: user.id });
    }
  }, [user]);

  const createConversation = useCallback(async () => {
    if (!user) return;

    try {
      const newConversation = await createCustomerSupportConversation(user.id);
      setConversations((prev) => [newConversation, ...prev]);
      setSelectedConversationId(newConversation.id);
      toast.success("Nova conversa iniciada!");
    } catch (error) {
      log.error("Erro ao criar conversa customer", { error, userId: user.id });
      toast.error("Erro ao criar conversa");
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    loadUnreadCount();

    const channel = subscribeToCustomerChatUpdates(user.id, loadUnreadCount);

    return () => {
      unsubscribeFromCustomerChatUpdates(channel);
    };
  }, [loadUnreadCount, user]);

  useEffect(() => {
    if (!isOpen || !user) return;

    const loadConversations = async () => {
      try {
        setLoading(true);
        const data = await listCustomerSupportConversations(user.id);
        setConversations(data);

        if (data.length > 0) {
          setSelectedConversationId(data[0].id);
        }
      } catch (error) {
        log.error("Erro ao carregar conversas customer", { error, userId: user.id });
        toast.error("Erro ao carregar conversas");
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, [isOpen, user]);

  useEffect(() => {
    const handleNewConversation = (event: Event) => {
      const conversation = (event as CustomEvent<{ conversation?: Conversation }>).detail
        ?.conversation;

      if (!conversation) return;

      setConversations((prev) => [
        conversation,
        ...prev.filter((current) => current.id !== conversation.id),
      ]);
      setSelectedConversationId(conversation.id);
    };

    window.addEventListener("newConversationCreated", handleNewConversation);

    return () => {
      window.removeEventListener("newConversationCreated", handleNewConversation);
    };
  }, []);

  const selectedConversation = conversations.find(
    (conversation) => conversation.id === selectedConversationId
  );
  const isClosed = selectedConversation?.status === "closed";
  const currentUserName = user?.user_metadata?.full_name || user?.email || "Cliente";

  return {
    user,
    isOpen,
    setIsOpen,
    unreadCount,
    conversations,
    selectedConversationId,
    setSelectedConversationId,
    selectedConversation,
    isClosed,
    loading,
    currentUserName,
    createConversation,
  };
}
