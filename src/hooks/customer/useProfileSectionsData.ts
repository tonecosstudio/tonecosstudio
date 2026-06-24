import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { log } from "@/lib/logger";
import { useToast } from "@/hooks/use-toast";
import {
  createSupportConversation,
  deleteProfilePaymentMethod,
  getActiveSubscription,
  listProfilePaymentMethods,
  listSupportConversations,
  listSupportMessages,
  markSupportMessagesRead,
  sendSupportMessage,
  setDefaultProfilePaymentMethod,
  subscribeToSupportMessages,
} from "@/services/customer/profile-sections-service";
import type { SupportConversation, SupportMessage } from "@/types/profile-sections";

export function useProfilePaymentMethods(userId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const paymentMethodsQuery = useQuery({
    queryKey: ["payment-methods", userId],
    enabled: Boolean(userId),
    queryFn: () => listProfilePaymentMethods(userId),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProfilePaymentMethod,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
      toast({ title: "Metodo de pagamento removido" });
    },
    onError: () => {
      toast({ title: "Erro ao remover", variant: "destructive" });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: setDefaultProfilePaymentMethod,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
      toast({ title: "Metodo padrao atualizado" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    },
  });

  return {
    methods: paymentMethodsQuery.data ?? [],
    isLoading: paymentMethodsQuery.isLoading,
    deletePaymentMethod: deleteMutation.mutate,
    setDefaultPaymentMethod: setDefaultMutation.mutate,
    isDeleting: deleteMutation.isPending,
    isSettingDefault: setDefaultMutation.isPending,
  };
}

export function useActiveProfileSubscription(userId: string) {
  return useQuery({
    queryKey: ["user-subscription", userId],
    enabled: Boolean(userId),
    queryFn: () => getActiveSubscription(userId),
  });
}

export function useProfileSupport(userId: string) {
  const queryClient = useQueryClient();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newFirstMessage, setNewFirstMessage] = useState("");
  const [showNewConversationForm, setShowNewConversationForm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const { toast } = useToast();

  const conversationsQuery = useQuery({
    queryKey: ["user-conversations", userId],
    enabled: Boolean(userId),
    queryFn: () => listSupportConversations(userId),
  });

  const selectedConversation = useMemo(
    () =>
      (conversationsQuery.data ?? []).find((conversation) => conversation.id === selectedConversationId) ??
      null,
    [conversationsQuery.data, selectedConversationId]
  );

  const selectedConversationMessagesQuery = useQuery({
    queryKey: ["user-support-messages", selectedConversationId],
    enabled: Boolean(selectedConversationId),
    queryFn: async () => {
      if (!selectedConversationId) {
        return [] as SupportMessage[];
      }

      const data = await listSupportMessages(selectedConversationId);
      await markAsRead(selectedConversationId);
      return data;
    },
  });

  const messages = selectedConversationMessagesQuery.data ?? [];

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const markAsRead = useCallback(async (conversationId: string) => {
    if (!userId) return;

    await markSupportMessagesRead({
      conversationId,
      userId,
    });
  }, [userId]);

  useEffect(() => {
    if (!selectedConversationId) return;

    const unsubscribe = subscribeToSupportMessages(selectedConversationId, (message) => {
      queryClient.setQueryData<SupportMessage[]>(
        ["user-support-messages", selectedConversationId],
        (current = []) => {
          if (current.some((existing) => existing.id === message.id)) {
            return current;
          }
          return [...current, message];
        }
      );

      void markAsRead(selectedConversationId);
      void conversationsQuery.refetch();
    });

    return () => {
      unsubscribe();
    };
  }, [conversationsQuery, markAsRead, queryClient, selectedConversationId]);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length]);

  useEffect(() => {
    if (!selectedConversationId) {
      return;
    }

    const conversations = conversationsQuery.data ?? [];
    if (!conversations.some((conversation) => conversation.id === selectedConversationId)) {
      setSelectedConversationId(null);
    }
  }, [conversationsQuery.data, selectedConversationId]);

  const createConversationMutation = useMutation({
    mutationFn: async () => {
      if (!newSubject.trim() || !newFirstMessage.trim() || !userId) {
        throw new Error("Preencha o assunto e a mensagem");
      }

      return createSupportConversation({
        userId,
        subject: newSubject.trim(),
        firstMessage: newFirstMessage.trim(),
      });
    },
    onSuccess: (conversation) => {
      toast({ title: "Mensagem enviada! Responderemos em ate 48h uteis." });
      setNewSubject("");
      setNewFirstMessage("");
      setSelectedConversationId(conversation.id);
      setShowNewConversationForm(false);
      void conversationsQuery.refetch();
    },
    onError: (error) => {
      if (error instanceof Error && error.message === "Preencha o assunto e a mensagem") {
        toast({ title: error.message, variant: "destructive" });
        return;
      }

      log.error("Error creating support conversation", { error, userId });
      toast({ title: "Erro ao enviar mensagem", variant: "destructive" });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      if (!newMessage.trim() || !selectedConversationId || !userId) {
        return;
      }

      await sendSupportMessage({
        conversationId: selectedConversationId,
        userId,
        message: newMessage.trim(),
      });
    },
    onSuccess: () => {
      setNewMessage("");
      toast({ title: "Mensagem enviada!" });
    },
    onError: (error) => {
      log.error("Error sending support message", {
        error,
        conversationId: selectedConversationId,
        userId,
      });
      toast({ title: "Erro ao enviar mensagem", variant: "destructive" });
    },
  });

  const createConversation = async () => {
    await createConversationMutation.mutateAsync();
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversationId || !userId) return;
    await sendMessageMutation.mutateAsync();
  };

  const setSelectedConversation = useCallback((conversation: SupportConversation | null) => {
    setSelectedConversationId(conversation?.id ?? null);
  }, []);

  return {
    conversations: conversationsQuery.data ?? [],
    isLoadingConversations: conversationsQuery.isLoading,
    selectedConversation,
    setSelectedConversation,
    messages,
    isLoadingMessages: selectedConversationMessagesQuery.isLoading,
    newMessage,
    setNewMessage,
    newSubject,
    setNewSubject,
    newFirstMessage,
    setNewFirstMessage,
    sending: createConversationMutation.isPending || sendMessageMutation.isPending,
    showNewConversationForm,
    setShowNewConversationForm,
    messagesEndRef,
    createConversation,
    sendMessage,
  };
}
