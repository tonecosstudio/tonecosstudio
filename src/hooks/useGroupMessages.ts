import { useCallback, useEffect, useMemo, useRef } from "react";
import { InfiniteData, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { log } from "@/lib/logger";
import { messageService } from "@/services/support/message-service";
import { subscribeToGroupBroadcastMessages } from "@/services/realtime/realtime-service";
import type { EnrichedGroupMessage } from "@/types/groups";

interface UseGroupMessagesOptions {
  groupId: string | null;
  autoScroll?: boolean;
}

interface GroupMessagePayload {
  message: EnrichedGroupMessage;
}

function isGroupMessagePayload(payload: unknown): payload is GroupMessagePayload {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as { message?: Partial<EnrichedGroupMessage> };
  return typeof candidate.message?.id === "string";
}

function appendGroupMessageToCache(
  cache: InfiniteData<EnrichedGroupMessage[]> | undefined,
  message: EnrichedGroupMessage
): InfiniteData<EnrichedGroupMessage[]> | undefined {
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

export function useGroupMessages({ groupId, autoScroll = true }: UseGroupMessagesOptions) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const skipAutoScrollRef = useRef(false);
  const queryClient = useQueryClient();
  const LIMIT = 50;
  const queryKey = useMemo(() => ["group-messages", groupId], [groupId]);

  const scrollToBottom = useCallback(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [autoScroll]);

  const groupMessagesQuery = useInfiniteQuery({
    queryKey,
    enabled: Boolean(groupId),
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      if (!groupId) {
        return {
          messages: [] as EnrichedGroupMessage[],
          pagination: {
            page: 1,
            total_pages: 0,
            total: 0,
            limit: LIMIT,
            hasMore: false,
          },
        };
      }

      return messageService.listCurrentUserGroupMessages(groupId, {
        page: pageParam,
        limit: LIMIT,
      });
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.page >= lastPage.pagination.total_pages) {
        return undefined;
      }

      return lastPage.pagination.page + 1;
    },
  });

  const pages = useMemo(() => groupMessagesQuery.data?.pages ?? [], [groupMessagesQuery.data]);
  const messages = useMemo(
    () => [...pages].reverse().flatMap((page) => page.messages),
    [pages]
  );
  const latestPagination = pages[0]?.pagination;
  const currentPage = latestPagination?.page ?? 1;
  const totalPages = latestPagination?.total_pages ?? 0;
  const hasMore = groupMessagesQuery.hasNextPage ?? false;

  useEffect(() => {
    if (!messages.length || groupMessagesQuery.isFetchingNextPage) {
      return;
    }

    if (skipAutoScrollRef.current) {
      skipAutoScrollRef.current = false;
      return;
    }

    setTimeout(scrollToBottom, 100);
  }, [groupMessagesQuery.isFetchingNextPage, messages.length, scrollToBottom]);

  useEffect(() => {
    if (!groupId) return;

    const updateLastViewed = async () => {
      try {
        const userId = await messageService.updateCurrentUserLastViewed(groupId);
        log.debug("Updated group last viewed timestamp", { groupId, userId });
      } catch (error) {
        log.error("Erro ao atualizar ultima visualizacao do grupo", { error, groupId });
      }
    };

    void updateLastViewed();
  }, [groupId]);

  useEffect(() => {
    if (!groupId) return;

    const setupRealtimeSubscription = async () => {
      try {
        log.debug("Setting up group realtime subscription", { groupId });

        return subscribeToGroupBroadcastMessages({
          groupId,
          onNewMessage: (payload) => {
            if (!isGroupMessagePayload(payload)) {
              log.warn("Ignoring invalid group message payload", { groupId, payload });
              return;
            }

            const newMessage = payload.message;
            log.debug("New group message received", { groupId, messageId: newMessage.id });

            queryClient.setQueryData<InfiniteData<{ messages: EnrichedGroupMessage[]; pagination: { page: number; total_pages: number; total: number; limit: number; hasMore: boolean } }>>(
              queryKey,
              (current) => {
                if (!current) {
                  return current;
                }

                return {
                  ...current,
                  pages: appendGroupMessageToCache(
                    {
                      pageParams: current.pageParams,
                      pages: current.pages.map((page) => page.messages),
                    },
                    newMessage
                  )!.pages.map((pageMessages, index) => ({
                    ...current.pages[index],
                    messages: pageMessages,
                  })),
                };
              }
            );

            setTimeout(scrollToBottom, 100);

            messageService.updateCurrentUserLastViewed(groupId).catch((error: unknown) => {
              log.error("Error updating group last viewed timestamp", {
                error,
                groupId,
              });
            });
          },
          onStatusChange: (status) => {
            log.debug("Group realtime subscription status changed", { groupId, status });
          },
        });
      } catch (error) {
        log.error("Error setting up group realtime subscription", { error, groupId });
        toast.error(
          "Erro ao conectar ao chat em tempo real. As mensagens serao atualizadas ao recarregar."
        );
      }
    };

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    void setupRealtimeSubscription().then((cleanup) => {
      if (cancelled) {
        cleanup?.();
        return;
      }
      unsubscribe = cleanup;
    });

    return () => {
      cancelled = true;
      log.debug("Removing group realtime subscription", { groupId });
      unsubscribe?.();
    };
  }, [groupId, queryClient, queryKey, scrollToBottom]);

  const loadMore = useCallback(async () => {
    if (!hasMore || groupMessagesQuery.isFetchingNextPage) return;

    skipAutoScrollRef.current = true;
    await groupMessagesQuery.fetchNextPage();
  }, [groupMessagesQuery, hasMore]);

  const refresh = useCallback(async () => {
    await groupMessagesQuery.refetch();
  }, [groupMessagesQuery]);

  const sendMessage = useCallback(
    async (message: string, attachmentFiles?: File[]) => {
      if (!groupId) return;

      try {
        await messageService.sendCurrentAdminBroadcastMessage(groupId, message, attachmentFiles);
        toast.success("Mensagem enviada com sucesso");
      } catch (error) {
        log.error("Erro ao enviar mensagem do grupo", { error, groupId });
        toast.error(error instanceof Error ? error.message : "Erro ao enviar mensagem");
        throw error;
      }
    },
    [groupId]
  );

  return {
    messages,
    loading: groupMessagesQuery.isLoading || groupMessagesQuery.isFetchingNextPage,
    hasMore,
    currentPage,
    totalPages,
    loadMore,
    sendMessage,
    messagesEndRef,
    refresh,
  };
}
