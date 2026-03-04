// @ts-nocheck
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { messageService } from "@/lib/services/messageService";
import type { Message } from "@/types/support";
import { toast } from "sonner";

interface UseMessagesOptions {
  conversationId: string | null;
  autoScroll?: boolean;
}

// Optimistic attachment state
interface OptimisticAttachment {
  id: string; // temporary client-side ID
  file: File;
  status: "uploading" | "uploaded" | "error";
  progress: number;
  url?: string;
  error?: string;
}

export function useMessages({ conversationId, autoScroll = true }: UseMessagesOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [optimisticAttachments, setOptimisticAttachments] = useState<
    Map<string, OptimisticAttachment[]>
  >(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const LIMIT = 50;

  // Scroll para última mensagem
  const scrollToBottom = useCallback(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [autoScroll]);

  // Carregar mensagens iniciais
  const loadMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    try {
      setLoading(true);
      const data = await messageService.listMessages(conversationId, {
        limit: LIMIT,
        offset: 0,
      });
      // Não filtrar mensagens deletadas - mostrar como "Mensagem deletada"
      setMessages(data);
      setOffset(data.length);
      setHasMore(data.length === LIMIT);

      // Scroll após carregar
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error);
      toast.error("Erro ao carregar mensagens");
    } finally {
      setLoading(false);
    }
  }, [conversationId, scrollToBottom]);

  // Carregar mensagens antigas (infinite scroll)
  const loadMore = useCallback(async () => {
    if (!conversationId || !hasMore || loading) return;

    try {
      setLoading(true);
      const data = await messageService.listMessages(conversationId, {
        limit: LIMIT,
        offset,
      });

      if (data.length > 0) {
        setMessages((prev) => [...data, ...prev]);
        setOffset((prev) => prev + data.length);
        setHasMore(data.length === LIMIT);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Erro ao carregar mais mensagens:", error);
      toast.error("Erro ao carregar mais mensagens");
    } finally {
      setLoading(false);
    }
  }, [conversationId, hasMore, loading, offset]);

  // Carregar mensagens quando conversa muda
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Configurar Realtime subscription
  useEffect(() => {
    if (!conversationId) return;

    console.log(`[useMessages] Configurando Realtime para conversa: ${conversationId}`);

    const messagesChannel = supabase
      .channel(`messages_${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          console.log("[useMessages] Message change:", payload);

          if (payload.eventType === "INSERT") {
            // Nova mensagem
            const rawMessage = payload.new as any;

            console.log("[useMessages] Nova mensagem recebida:", rawMessage.id);

            // Buscar anexos da mensagem
            const { data: attachmentsData } = await supabase
              .from("support_attachments")
              .select("*")
              .eq("message_id", rawMessage.id);

            console.log("[useMessages] Anexos encontrados:", attachmentsData?.length || 0);

            // Enriquecer mensagem com dados adicionais
            const enrichedMessage: Message = {
              ...rawMessage,
              sender_name: rawMessage.sender_type === "admin" ? "Admin" : "Cliente",
              attachments: attachmentsData || [],
              is_internal: rawMessage.is_internal || false,
              read_by_admin: rawMessage.read_by_admin || false,
              read_by_customer: rawMessage.read_by_customer || false,
            };

            setMessages((prev) => {
              // Evitar duplicatas
              if (prev.some((msg) => msg.id === enrichedMessage.id)) {
                console.log("[useMessages] Mensagem duplicada, ignorando");
                return prev;
              }
              console.log("[useMessages] Adicionando mensagem à lista");
              return [...prev, enrichedMessage];
            });

            // Scroll para nova mensagem
            setTimeout(scrollToBottom, 100);
          } else if (payload.eventType === "UPDATE") {
            // Mensagem atualizada (ex: editada)
            const rawMessage = payload.new as any;

            console.log("[useMessages] Mensagem atualizada:", rawMessage.id);

            // Buscar anexos da mensagem
            const { data: attachmentsData } = await supabase
              .from("support_attachments")
              .select("*")
              .eq("message_id", rawMessage.id);

            const enrichedMessage: Message = {
              ...rawMessage,
              sender_name: rawMessage.sender_type === "admin" ? "Admin" : "Cliente",
              attachments: attachmentsData || [],
              is_internal: rawMessage.is_internal || false,
              read_by_admin: rawMessage.read_by_admin || false,
              read_by_customer: rawMessage.read_by_customer || false,
            };

            setMessages((prev) =>
              prev.map((msg) => (msg.id === enrichedMessage.id ? enrichedMessage : msg))
            );
          } else if (payload.eventType === "DELETE") {
            // Mensagem deletada
            const deletedId = payload.old.id;
            console.log("[useMessages] Mensagem deletada:", deletedId);
            setMessages((prev) => prev.filter((msg) => msg.id !== deletedId));
          }
        }
      )
      .subscribe((status) => {
        console.log("[useMessages] Status da subscription de mensagens:", status);
      });

    // Subscription para anexos
    const attachmentsChannel = supabase
      .channel(`attachments_${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_attachments",
        },
        async (payload) => {
          console.log("[useMessages] Attachment added:", payload);
          const attachment = payload.new as any;

          // Atualizar a mensagem correspondente com o novo anexo
          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id === attachment.message_id) {
                console.log("[useMessages] Adicionando anexo à mensagem:", msg.id);
                // Evitar duplicatas
                const existingAttachments = msg.attachments || [];
                if (existingAttachments.some((a) => a.id === attachment.id)) {
                  return msg;
                }
                return {
                  ...msg,
                  attachments: [...existingAttachments, attachment],
                };
              }
              return msg;
            })
          );

          // Limpar optimistic attachments para esta mensagem após confirmação
          // Aguardar um pouco para garantir que o anexo foi adicionado
          setTimeout(() => {
            setOptimisticAttachments((prev) => {
              const newMap = new Map(prev);
              newMap.delete(attachment.message_id);
              return newMap;
            });
          }, 500);
        }
      )
      .subscribe((status) => {
        console.log("[useMessages] Status da subscription de anexos:", status);
      });

    return () => {
      console.log("[useMessages] Removendo subscriptions");
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(attachmentsChannel);
    };
  }, [conversationId, scrollToBottom]);

  // Enviar mensagem
  const sendMessage = useCallback(
    async (message: string, isInternal: boolean = false) => {
      if (!conversationId) return;

      try {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) throw new Error("Usuário não autenticado");

        await messageService.sendMessage({
          conversation_id: conversationId,
          sender_id: user.id,
          sender_type: "admin",
          message,
          is_internal: isInternal,
        });

        // Mensagem será adicionada via Realtime
      } catch (error) {
        console.error("Erro ao enviar mensagem:", error);
        toast.error("Erro ao enviar mensagem");
        throw error;
      }
    },
    [conversationId]
  );

  // Marcar mensagens como lidas
  const markAsRead = useCallback(async () => {
    if (!conversationId) return;

    try {
      // Buscar IDs das mensagens não lidas desta conversa
      const { data: unreadMessages, error } = await supabase
        .from("support_messages")
        .select("id")
        .eq("conversation_id", conversationId)
        .eq("read_by_admin", false)
        .eq("sender_type", "customer"); // Apenas mensagens de clientes

      if (error) {
        console.error("Erro ao buscar mensagens não lidas:", error);
        return;
      }

      if (unreadMessages && unreadMessages.length > 0) {
        const messageIds = unreadMessages.map((msg) => msg.id);

        // Validar que todos os IDs são UUIDs válidos
        const validMessageIds = messageIds.filter((id) =>
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
        );

        if (validMessageIds.length > 0) {
          await messageService.markAsRead(validMessageIds, "admin");
          console.log(`Marcadas ${validMessageIds.length} mensagens como lidas`);
        }
      }
    } catch (error) {
      console.error("Erro ao marcar como lido:", error);
    }
  }, [conversationId]);

  // Marcar como lido quando abre a conversa
  useEffect(() => {
    if (conversationId && messages.length > 0) {
      markAsRead();
    }
  }, [conversationId, messages.length, markAsRead]);

  // Optimistic attachment management
  const addOptimisticAttachment = useCallback((messageId: string, file: File): string => {
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const attachment: OptimisticAttachment = {
      id: tempId,
      file,
      status: "uploading",
      progress: 0,
    };

    setOptimisticAttachments((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(messageId) || [];
      newMap.set(messageId, [...existing, attachment]);
      return newMap;
    });

    return tempId;
  }, []);

  const updateOptimisticAttachment = useCallback(
    (messageId: string, tempId: string, updates: Partial<OptimisticAttachment>) => {
      setOptimisticAttachments((prev) => {
        const newMap = new Map(prev);
        const attachments = newMap.get(messageId) || [];
        newMap.set(
          messageId,
          attachments.map((a) => (a.id === tempId ? { ...a, ...updates } : a))
        );
        return newMap;
      });
    },
    []
  );

  const removeOptimisticAttachment = useCallback((messageId: string, tempId: string) => {
    setOptimisticAttachments((prev) => {
      const newMap = new Map(prev);
      const attachments = (newMap.get(messageId) || []).filter((a) => a.id !== tempId);
      if (attachments.length === 0) {
        newMap.delete(messageId);
      } else {
        newMap.set(messageId, attachments);
      }
      return newMap;
    });
  }, []);

  return {
    messages,
    loading,
    hasMore,
    loadMore,
    sendMessage,
    markAsRead,
    messagesEndRef,
    refresh: loadMessages,
    optimisticAttachments,
    addOptimisticAttachment,
    updateOptimisticAttachment,
    removeOptimisticAttachment,
  };
}
