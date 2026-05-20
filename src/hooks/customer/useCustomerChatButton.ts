import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
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
      console.error("Erro ao carregar contador:", error);
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
      console.error("Erro ao criar conversa:", error);
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
        console.error("Erro ao carregar conversas:", error);
        toast.error("Erro ao carregar conversas");
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, [isOpen, user]);

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
    selectedConversation,
    isClosed,
    loading,
    currentUserName,
    createConversation,
  };
}
