import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { InfiniteData, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { log } from "@/lib/logger";
import { messageService } from "@/services/support/message-service";
import {
  hydrateSupportMessage,
  type SupportAttachmentRow,
  type SupportMessageRow,
} from "@/services/support/support-message-hydration-service";
import { subscribeToSupportMessageThreadChanges } from "@/services/realtime/realtime-service";
import type { Attachment, Message } from "@/types/support";

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

function isSupportMessageRow(value: unknown): value is SupportMessageRow {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<SupportMessageRow>;
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

function appendMessageToCache(
  cache: InfiniteData<Message[]> | undefined,
  message: Message
): InfiniteData<Message[]> | undefined {
  if (!cache) {
    return cache;
  }

  const pages = [...cache.pages];
  const latestPage = pages[0] ?? [];

  if (latestPage.some((current) => current.id === message.id)) {
    return cache;
  }

  pages[0] = [...latestPage, message];
  return { ...cache, pages };
}

function updateMessageInCache(
  cache: InfiniteData<Message[]> | undefined,
  message: Message
): InfiniteData<Message[]> | undefined {
  if (!cache) {
    return cache;
  }

  return {
    ...cache,
    pages: cache.pages.map((page) =>
      page.map((current) => (current.id === message.id ? message : current))
    ),
  };
}

function removeMessageFromCache(
  cache: InfiniteData<Message[]> | undefined,
  messageId: string
): InfiniteData<Message[]> | undefined {
  if (!cache) {
    return cache;
  }

  return {
    ...cache,
    pages: cache.pages.map((page) => page.filter((message) => message.id !== messageId)),
  };
}

function appendAttachmentToCache(
  cache: InfiniteData<Message[]> | undefined,
  attachment: Attachment
): InfiniteData<Message[]> | undefined {
  if (!cache) {
    return cache;
  }

  return {
    ...cache,
    pages: cache.pages.map((page) =>
      page.map((message) => {
        if (message.id !== attachment.message_id) {
          return message;
        }

        const existingAttachments = message.attachments || [];
        if (existingAttachments.some((current) => current.id === attachment.id)) {
          return message;
        }

        return {
          ...message,
          attachments: [...existingAttachments, attachment],
        };
      })
    ),
  };
}

export function useMessages({ conversationId, autoScroll = true }: UseMessagesOptions) {
  const [optimisticAttachments, setOptimisticAttachments] = useState<
    Map<string, OptimisticAttachment[]>
  >(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const skipAutoScrollRef = useRef(false);
  const queryClient = useQueryClient();
  const LIMIT = 50;
  const queryKey = useMemo(() => ["support-messages", conversationId], [conversationId]);

  const scrollToBottom = useCallback(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [autoScroll]);

  const messagesQuery = useInfiniteQuery({
    queryKey,
    enabled: Boolean(conversationId),
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      if (!conversationId) {
        return [] as Message[];
      }

      try {
        return await messageService.listMessages(conversationId, {
          limit: LIMIT,
          offset: pageParam,
        });
      } catch (error) {
        log.error("Erro ao carregar mensagens", { error, conversationId, offset: pageParam });
        toast.error("Erro ao carregar mensagens");
        throw error;
      }
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < LIMIT) {
        return undefined;
      }

      return allPages.reduce((total, page) => total + page.length, 0);
    },
  });

  const messages = useMemo(() => {
    const pages = messagesQuery.data?.pages ?? [];
    return [...pages].reverse().flat();
  }, [messagesQuery.data]);

  useEffect(() => {
    if (!messages.length || messagesQuery.isFetchingNextPage) {
      return;
    }

    if (skipAutoScrollRef.current) {
      skipAutoScrollRef.current = false;
      return;
    }

    setTimeout(scrollToBottom, 100);
  }, [messages.length, messagesQuery.isFetchingNextPage, scrollToBottom]);

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    log.debug("Setting up support messages realtime subscription", { conversationId });

    return subscribeToSupportMessageThreadChanges({
      conversationId,
      onMessageChange: async (payload) => {
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

          const enrichedMessage = await hydrateSupportMessage(payload.new);

          queryClient.setQueryData<InfiniteData<Message[]>>(queryKey, (current) => {
            if (payload.eventType === "INSERT") {
              return appendMessageToCache(current, enrichedMessage);
            }

            return updateMessageInCache(current, enrichedMessage);
          });

          if (payload.eventType === "INSERT") {
            setTimeout(scrollToBottom, 100);
          }
          return;
        }

        if (payload.eventType === "DELETE") {
          const deletedId =
            payload.old && typeof payload.old === "object"
              ? (payload.old as { id?: unknown }).id
              : undefined;
          if (typeof deletedId !== "string") {
            log.warn("Ignoring invalid support message delete payload", {
              conversationId,
              payload: payload.old,
            });
            return;
          }

          queryClient.setQueryData<InfiniteData<Message[]>>(queryKey, (current) =>
            removeMessageFromCache(current, deletedId)
          );
        }
      },
      onMessageStatusChange: (status) => {
        log.debug("Support messages realtime subscription status changed", {
          conversationId,
          status,
        });
      },
      onAttachmentInsert: (payload) => {
        if (!isSupportAttachmentRow(payload)) {
          log.warn("Ignoring invalid support attachment realtime payload", {
            conversationId,
            payload,
          });
          return;
        }

        const attachment: Attachment = {
          id: payload.id,
          message_id: payload.message_id,
          file_name: payload.file_name,
          file_path: payload.file_path,
          file_size: payload.file_size ?? 0,
          file_type: payload.file_type ?? "",
          thumbnail_path: payload.thumbnail_path ?? undefined,
          uploaded_by: payload.uploaded_by,
          created_at: payload.created_at,
        };

        queryClient.setQueryData<InfiniteData<Message[]>>(queryKey, (current) =>
          appendAttachmentToCache(current, attachment)
        );

        setTimeout(() => {
          setOptimisticAttachments((prev) => {
            const next = new Map(prev);
            next.delete(attachment.message_id);
            return next;
          });
        }, 500);
      },
      onAttachmentStatusChange: (status) => {
        log.debug("Support attachments realtime subscription status changed", {
          conversationId,
          status,
        });
      },
    });
  }, [conversationId, queryClient, queryKey, scrollToBottom]);

  const sendMessage = useCallback(
    async (message: string, isInternal: boolean = false) => {
      if (!conversationId) return;

      try {
        await messageService.sendCurrentAdminMessage(conversationId, message, isInternal);
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
      const messageIds = await messageService.listUnreadCustomerMessageIds(conversationId);

      if (messageIds.length > 0) {
        await messageService.markAsRead(messageIds, "admin");
        log.debug("Marked support messages as read", {
          conversationId,
          count: messageIds.length,
        });
      }
    } catch (error) {
      log.error("Erro ao marcar mensagens como lidas", { error, conversationId });
    }
  }, [conversationId]);

  useEffect(() => {
    if (conversationId && messages.length > 0) {
      void markAsRead();
    }
  }, [conversationId, messages.length, markAsRead]);

  const loadMore = useCallback(async () => {
    if (!messagesQuery.hasNextPage || messagesQuery.isFetchingNextPage) {
      return;
    }

    skipAutoScrollRef.current = true;
    await messagesQuery.fetchNextPage();
  }, [messagesQuery]);

  const refresh = useCallback(async () => {
    await messagesQuery.refetch();
  }, [messagesQuery]);

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
    loading: messagesQuery.isLoading || messagesQuery.isFetchingNextPage,
    hasMore: messagesQuery.hasNextPage ?? false,
    loadMore,
    sendMessage,
    markAsRead,
    messagesEndRef,
    refresh,
    optimisticAttachments,
    addOptimisticAttachment,
    updateOptimisticAttachment,
    removeOptimisticAttachment,
  };
}
