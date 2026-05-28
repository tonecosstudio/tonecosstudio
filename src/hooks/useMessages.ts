import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { log } from "@/lib/logger";
import { messageService } from "@/lib/services/messageService";
import type { Attachment, Message, SenderType } from "@/types/support";

type SupportAttachmentRow = Database["public"]["Tables"]["support_attachments"]["Row"];

type SupportMessageRealtimeRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: SenderType;
  message: string;
  is_internal: boolean | null;
  read_by_admin: boolean | null;
  read_by_customer: boolean | null;
  created_at: string;
  updated_at: string;
  edited_at?: string | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
};

interface UseMessagesOptions {
  conversationId: string | null;
  autoScroll?: boolean;
}

interface OptimisticAttachment {
  id: string;
  file: File;
  status: "uploading" | "uploaded" | "error";
  progress: number;
  url?: string;
  error?: string;
}

function isSupportMessageRow(value: unknown): value is SupportMessageRealtimeRow {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<SupportMessageRealtimeRow>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.conversation_id === "string" &&
    typeof candidate.sender_id === "string" &&
    typeof candidate.message === "string" &&
    (candidate.sender_type === "admin" ||
      candidate.sender_type === "customer" ||
      candidate.sender_type === "system")
  );
}

function isSupportAttachmentRow(value: unknown): value is SupportAttachmentRow {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<SupportAttachmentRow>;
  return typeof candidate.id === "string" && typeof candidate.message_id === "string";
}

function toAttachment(row: SupportAttachmentRow): Attachment {
  return {
    id: row.id,
    message_id: row.message_id,
    file_name: row.file_name,
    file_path: row.file_path,
    file_size: row.file_size ?? 0,
    file_type: row.file_type ?? "",
    thumbnail_path: row.thumbnail_path ?? undefined,
    uploaded_by: row.uploaded_by,
    created_at: row.created_at,
  };
}

function toMessage(row: SupportMessageRealtimeRow, attachments: SupportAttachmentRow[]): Message {
  return {
    id: row.id,
    conversation_id: row.conversation_id,
    sender_id: row.sender_id,
    sender_type: row.sender_type,
    message: row.message,
    sender_name: row.sender_type === "admin" ? "Admin" : "Cliente",
    attachments: attachments.map(toAttachment),
    is_internal: row.is_internal ?? false,
    read_by_admin: row.read_by_admin ?? false,
    read_by_customer: row.read_by_customer ?? false,
    created_at: row.created_at,
    updated_at: row.updated_at,
    edited_at: row.edited_at ?? undefined,
    deleted_at: row.deleted_at ?? undefined,
    deleted_by: row.deleted_by ?? undefined,
  };
}

async function getMessageAttachments(messageId: string): Promise<SupportAttachmentRow[]> {
  const { data, error } = await supabase
    .from("support_attachments")
    .select("*")
    .eq("message_id", messageId);

  if (error) {
    log.error("Erro ao buscar anexos da mensagem", { error, messageId });
    return [];
  }

  return data ?? [];
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

  const scrollToBottom = useCallback(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [autoScroll]);

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

      setMessages(data);
      setOffset(data.length);
      setHasMore(data.length === LIMIT);
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      log.error("Erro ao carregar mensagens", { error, conversationId });
      toast.error("Erro ao carregar mensagens");
    } finally {
      setLoading(false);
    }
  }, [conversationId, scrollToBottom]);

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
      log.error("Erro ao carregar mais mensagens", { error, conversationId });
      toast.error("Erro ao carregar mais mensagens");
    } finally {
      setLoading(false);
    }
  }, [conversationId, hasMore, loading, offset]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (!conversationId) return;

    log.debug("Setting up support messages realtime subscription", { conversationId });

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
          log.debug("Support message realtime change received", {
            conversationId,
            eventType: payload.eventType,
          });

          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            if (!isSupportMessageRow(payload.new)) {
              log.warn("Ignoring invalid support message realtime payload", {
                conversationId,
                eventType: payload.eventType,
                payload: payload.new,
              });
              return;
            }

            const attachments = await getMessageAttachments(payload.new.id);
            const enrichedMessage = toMessage(payload.new, attachments);

            setMessages((prev) => {
              if (payload.eventType === "INSERT") {
                if (prev.some((msg) => msg.id === enrichedMessage.id)) {
                  log.debug("Ignoring duplicate support message", {
                    conversationId,
                    messageId: enrichedMessage.id,
                  });
                  return prev;
                }
                return [...prev, enrichedMessage];
              }

              return prev.map((msg) => (msg.id === enrichedMessage.id ? enrichedMessage : msg));
            });

            if (payload.eventType === "INSERT") {
              setTimeout(scrollToBottom, 100);
            }
            return;
          }

          if (payload.eventType === "DELETE") {
            const deletedId = payload.old.id;
            if (typeof deletedId !== "string") {
              log.warn("Ignoring invalid support message delete payload", {
                conversationId,
                payload: payload.old,
              });
              return;
            }

            setMessages((prev) => prev.filter((msg) => msg.id !== deletedId));
          }
        }
      )
      .subscribe((status) => {
        log.debug("Support messages realtime subscription status changed", {
          conversationId,
          status,
        });
      });

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
          if (!isSupportAttachmentRow(payload.new)) {
            log.warn("Ignoring invalid support attachment realtime payload", {
              conversationId,
              payload: payload.new,
            });
            return;
          }

          const attachment = toAttachment(payload.new);

          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id !== attachment.message_id) {
                return msg;
              }

              const existingAttachments = msg.attachments || [];
              if (existingAttachments.some((existing) => existing.id === attachment.id)) {
                return msg;
              }

              return {
                ...msg,
                attachments: [...existingAttachments, attachment],
              };
            })
          );

          setTimeout(() => {
            setOptimisticAttachments((prev) => {
              const next = new Map(prev);
              next.delete(attachment.message_id);
              return next;
            });
          }, 500);
        }
      )
      .subscribe((status) => {
        log.debug("Support attachments realtime subscription status changed", {
          conversationId,
          status,
        });
      });

    return () => {
      log.debug("Removing support messages realtime subscriptions", { conversationId });
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(attachmentsChannel);
    };
  }, [conversationId, scrollToBottom]);

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
      } catch (error) {
        log.error("Erro ao enviar mensagem", { error, conversationId });
        toast.error("Erro ao enviar mensagem");
        throw error;
      }
    },
    [conversationId]
  );

  const markAsRead = useCallback(async () => {
    if (!conversationId) return;

    try {
      const { data: unreadMessages, error } = await supabase
        .from("support_messages")
        .select("id")
        .eq("conversation_id", conversationId)
        .eq("read_by_admin", false)
        .eq("sender_type", "customer");

      if (error) {
        log.error("Erro ao buscar mensagens não lidas", { error, conversationId });
        return;
      }

      if (unreadMessages && unreadMessages.length > 0) {
        const messageIds = unreadMessages.map((msg) => msg.id);
        const validMessageIds = messageIds.filter((id) =>
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
        );

        if (validMessageIds.length > 0) {
          await messageService.markAsRead(validMessageIds, "admin");
          log.debug("Marked support messages as read", {
            conversationId,
            count: validMessageIds.length,
          });
        }
      }
    } catch (error) {
      log.error("Erro ao marcar mensagens como lidas", { error, conversationId });
    }
  }, [conversationId]);

  useEffect(() => {
    if (conversationId && messages.length > 0) {
      markAsRead();
    }
  }, [conversationId, messages.length, markAsRead]);

  const addOptimisticAttachment = useCallback((messageId: string, file: File): string => {
    const tempId = `temp-${Date.now()}-${crypto.randomUUID()}`;
    const attachment: OptimisticAttachment = {
      id: tempId,
      file,
      status: "uploading",
      progress: 0,
    };

    setOptimisticAttachments((prev) => {
      const next = new Map(prev);
      const existing = next.get(messageId) || [];
      next.set(messageId, [...existing, attachment]);
      return next;
    });

    return tempId;
  }, []);

  const updateOptimisticAttachment = useCallback(
    (messageId: string, tempId: string, updates: Partial<OptimisticAttachment>) => {
      setOptimisticAttachments((prev) => {
        const next = new Map(prev);
        const attachments = next.get(messageId) || [];
        next.set(
          messageId,
          attachments.map((attachment) =>
            attachment.id === tempId ? { ...attachment, ...updates } : attachment
          )
        );
        return next;
      });
    },
    []
  );

  const removeOptimisticAttachment = useCallback((messageId: string, tempId: string) => {
    setOptimisticAttachments((prev) => {
      const next = new Map(prev);
      const attachments = (next.get(messageId) || []).filter(
        (attachment) => attachment.id !== tempId
      );
      if (attachments.length === 0) {
        next.delete(messageId);
      } else {
        next.set(messageId, attachments);
      }
      return next;
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
