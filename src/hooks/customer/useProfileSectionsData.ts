import { useCallback, useEffect, useRef, useState } from "react";
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
  const [selectedConversation, setSelectedConversation] = useState<SupportConversation | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newFirstMessage, setNewFirstMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showNewConversationForm, setShowNewConversationForm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const { toast } = useToast();

  const conversationsQuery = useQuery({
    queryKey: ["user-conversations", userId],
    enabled: Boolean(userId),
    queryFn: () => listSupportConversations(userId),
  });

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
  if (!selectedConversation) return;

  let isActive = true;
  const selectedConversationId = selectedConversation.id;

  async function fetchMessages() {
    try {
        const data = await listSupportMessages(selectedConversationId);
        if (!isActive) return;
        setMessages(data);
        scrollToBottom();
        await markAsRead(selectedConversationId);
      } catch (error) {
        log.error("Error loading support messages", {
          error,
          conversationId: selectedConversationId,
        });
        toast({ title: "Erro ao carregar mensagens", variant: "destructive" });
      }
    }

    fetchMessages();

    const unsubscribe = subscribeToSupportMessages(selectedConversationId, (message) => {
      setMessages((prev) => [...prev, message]);
      scrollToBottom();
      markAsRead(selectedConversationId);
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [markAsRead, selectedConversation, toast]);

  const createConversation = async () => {
    if (!newSubject.trim() || !newFirstMessage.trim() || !userId) {
      toast({ title: "Preencha o assunto e a mensagem", variant: "destructive" });
      return;
    }

    setSending(true);

    try {
      const conversation = await createSupportConversation({
        userId,
        subject: newSubject.trim(),
        firstMessage: newFirstMessage.trim(),
      });

      toast({ title: "Mensagem enviada! Responderemos em ate 48h uteis." });
      setNewSubject("");
      setNewFirstMessage("");
      setSelectedConversation(conversation);
      setShowNewConversationForm(false);
      conversationsQuery.refetch();
    } catch (error) {
      log.error("Error creating support conversation", { error, userId });
      toast({ title: "Erro ao enviar mensagem", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !userId) return;

    setSending(true);

    try {
      await sendSupportMessage({
        conversationId: selectedConversation.id,
        userId,
        message: newMessage.trim(),
      });

      setNewMessage("");
      toast({ title: "Mensagem enviada!" });
    } catch (error) {
      log.error("Error sending support message", {
        error,
        conversationId: selectedConversation.id,
        userId,
      });
      toast({ title: "Erro ao enviar mensagem", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return {
    conversations: conversationsQuery.data ?? [],
    selectedConversation,
    setSelectedConversation,
    messages,
    newMessage,
    setNewMessage,
    newSubject,
    setNewSubject,
    newFirstMessage,
    setNewFirstMessage,
    sending,
    showNewConversationForm,
    setShowNewConversationForm,
    messagesEndRef,
    createConversation,
    sendMessage,
  };
}
