import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { log } from "@/lib/logger";
import { messageService } from "@/lib/services/messageService";
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

export function useGroupMessages({ groupId, autoScroll = true }: UseGroupMessagesOptions) {
  const [messages, setMessages] = useState<EnrichedGroupMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const LIMIT = 50;

  const scrollToBottom = useCallback(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [autoScroll]);

  const loadMessages = useCallback(
    async (page: number = 1) => {
      if (!groupId) {
        setMessages([]);
        return;
      }

      try {
        setLoading(true);

        const user = (await supabase.auth.getUser()).data.user;
        if (!user) {
          throw new Error("Usuário não autenticado");
        }

        const result = await messageService.listGroupMessages(groupId, user.id, {
          page,
          limit: LIMIT,
        });

        setMessages(result.messages);
        setCurrentPage(result.pagination.page);
        setTotalPages(result.pagination.total_pages);
        setHasMore(result.pagination.page < result.pagination.total_pages);

        setTimeout(scrollToBottom, 100);
      } catch (error) {
        log.error("Erro ao carregar mensagens do grupo", { error, groupId });
        toast.error("Erro ao carregar mensagens");
      } finally {
        setLoading(false);
      }
    },
    [groupId, scrollToBottom]
  );

  const loadMore = useCallback(async () => {
    if (!groupId || !hasMore || loading) return;

    const nextPage = currentPage + 1;
    await loadMessages(nextPage);
  }, [groupId, hasMore, loading, currentPage, loadMessages]);

  useEffect(() => {
    loadMessages(1);
  }, [loadMessages]);

  useEffect(() => {
    if (!groupId) return;

    const updateLastViewed = async () => {
      try {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) return;

        await messageService.updateLastViewed(groupId, user.id);
        log.debug("Updated group last viewed timestamp", { groupId, userId: user.id });
      } catch (error) {
        log.error("Erro ao atualizar última visualização do grupo", { error, groupId });
      }
    };

    updateLastViewed();
  }, [groupId]);

  useEffect(() => {
    if (!groupId) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let isSubscribed = false;

    const setupRealtimeSubscription = async () => {
      try {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) {
          log.warn("Skipping group realtime setup without authenticated user", { groupId });
          return;
        }

        log.debug("Setting up group realtime subscription", { groupId, userId: user.id });

        channel = supabase.channel(`group:${groupId}`, {
          config: {
            broadcast: {
              self: false,
              ack: false,
            },
          },
        });

        channel
          .on("broadcast", { event: "new_message" }, ({ payload }) => {
            if (!isGroupMessagePayload(payload)) {
              log.warn("Ignoring invalid group message payload", { groupId, payload });
              return;
            }

            const newMessage = payload.message;
            log.debug("New group message received", { groupId, messageId: newMessage.id });

            setMessages((prev) => {
              if (prev.some((msg) => msg.id === newMessage.id)) {
                log.debug("Ignoring duplicate group message", {
                  groupId,
                  messageId: newMessage.id,
                });
                return prev;
              }

              return [...prev, newMessage];
            });

            setTimeout(scrollToBottom, 100);

            messageService.updateLastViewed(groupId, user.id).catch((error: unknown) => {
              log.error("Error updating group last viewed timestamp", {
                error,
                groupId,
                userId: user.id,
              });
            });
          })
          .subscribe((status) => {
            log.debug("Group realtime subscription status changed", { groupId, status });
            if (status === "SUBSCRIBED") {
              isSubscribed = true;
            }
          });
      } catch (error) {
        log.error("Error setting up group realtime subscription", { error, groupId });
        toast.error(
          "Erro ao conectar ao chat em tempo real. As mensagens serão atualizadas ao recarregar."
        );
      }
    };

    setupRealtimeSubscription();

    return () => {
      if (channel && isSubscribed) {
        log.debug("Removing group realtime subscription", { groupId });
        supabase.removeChannel(channel);
      }
    };
  }, [groupId, scrollToBottom]);

  const sendMessage = useCallback(
    async (message: string, attachmentFiles?: File[]) => {
      if (!groupId) return;

      try {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) throw new Error("Usuário não autenticado");

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profile?.role !== "admin") {
          throw new Error("Apenas administradores podem enviar mensagens");
        }

        const result = await messageService.sendBroadcastMessage(
          groupId,
          user.id,
          message,
          attachmentFiles
        );

        const { data: senderProfile } = await supabase
          .from("profiles")
          .select("full_name, email, avatar_url")
          .eq("id", user.id)
          .single();

        const enrichedMessage: EnrichedGroupMessage = {
          ...result,
          sender_name: senderProfile?.full_name || senderProfile?.email || "Admin",
          sender_avatar: senderProfile?.avatar_url || null,
        };

        const { broadcastGroupMessage } = await import("@/lib/realtime/groupBroadcast");
        await broadcastGroupMessage(groupId, enrichedMessage);

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
    loading,
    hasMore,
    currentPage,
    totalPages,
    loadMore,
    sendMessage,
    messagesEndRef,
    refresh: () => loadMessages(1),
  };
}
