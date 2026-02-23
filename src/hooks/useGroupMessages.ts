import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { messageService } from "@/lib/services/messageService";
import { verifyGroupMembership } from "@/lib/realtime/groupBroadcast";
import type { GroupMessage, GroupAttachment, Pagination } from "@/types/groups";
import { toast } from "sonner";

interface UseGroupMessagesOptions {
  groupId: string | null;
  autoScroll?: boolean;
}

interface EnrichedGroupMessage extends GroupMessage {
  sender_name: string;
  sender_avatar: string | null;
  attachments: GroupAttachment[];
}

export function useGroupMessages({ 
  groupId, 
  autoScroll = true 
}: UseGroupMessagesOptions) {
  const [messages, setMessages] = useState<EnrichedGroupMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const LIMIT = 50;

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [autoScroll]);

  // Load messages
  const loadMessages = useCallback(async (page: number = 1) => {
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

      const result = await messageService.listGroupMessages(
        groupId,
        user.id,
        { page, limit: LIMIT }
      );

      setMessages(result.messages);
      setCurrentPage(result.pagination.page);
      setTotalPages(result.pagination.total_pages);
      setHasMore(result.pagination.page < result.pagination.total_pages);

      // Scroll after loading
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error("Erro ao carregar mensagens do grupo:", error);
      toast.error("Erro ao carregar mensagens");
    } finally {
      setLoading(false);
    }
  }, [groupId, scrollToBottom]);

  // Load more messages (pagination)
  const loadMore = useCallback(async () => {
    if (!groupId || !hasMore || loading) return;

    const nextPage = currentPage + 1;
    await loadMessages(nextPage);
  }, [groupId, hasMore, loading, currentPage, loadMessages]);

  // Load messages when group changes
  useEffect(() => {
    loadMessages(1);
  }, [loadMessages]);

  // Update last viewed timestamp when opening group
  useEffect(() => {
    if (!groupId) return;

    const updateLastViewed = async () => {
      try {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) return;

        await messageService.updateLastViewed(groupId, user.id);
        console.log(`[useGroupMessages] Updated last_viewed_at for group ${groupId}`);
      } catch (error) {
        console.error("Erro ao atualizar última visualização:", error);
      }
    };

    updateLastViewed();
  }, [groupId]);

  // Setup Realtime subscription
  useEffect(() => {
    if (!groupId) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let isSubscribed = false;

    const setupRealtimeSubscription = async () => {
      try {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) {
          console.warn("[useGroupMessages] User not authenticated");
          return;
        }

        // Verify membership before subscribing (security validation)
        const isMember = await verifyGroupMembership(groupId, user.id);
        if (!isMember) {
          console.error("[useGroupMessages] User is not a member of this group");
          toast.error("Você não tem permissão para acessar este grupo");
          return;
        }

        console.log(`[useGroupMessages] Setting up Realtime for group: ${groupId}`);

        channel = supabase.channel(`group:${groupId}`, {
          config: {
            broadcast: {
              self: false, // Don't receive own messages
              ack: false,  // Don't wait for acknowledgment
            },
          },
        });

        channel
          .on('broadcast', { event: 'new_message' }, ({ payload }) => {
            console.log("[useGroupMessages] New message received:", payload);

            const newMessage = payload.message as EnrichedGroupMessage;

            setMessages((prev) => {
              // Avoid duplicates
              if (prev.some((msg) => msg.id === newMessage.id)) {
                console.log("[useGroupMessages] Duplicate message, ignoring");
                return prev;
              }
              console.log("[useGroupMessages] Adding message to list");
              return [...prev, newMessage];
            });

            // Scroll to new message
            setTimeout(scrollToBottom, 100);

            // Update last_viewed_at when new message arrives
            messageService.updateLastViewed(groupId, user.id).catch((err) => {
              console.error("Error updating last_viewed_at:", err);
            });
          })
          .subscribe((status) => {
            console.log("[useGroupMessages] Subscription status:", status);
            if (status === 'SUBSCRIBED') {
              isSubscribed = true;
            }
          });
      } catch (error) {
        console.error("[useGroupMessages] Error setting up Realtime:", error);
        // Graceful degradation - continue without Realtime
        toast.error("Erro ao conectar ao chat em tempo real. As mensagens serão atualizadas ao recarregar.");
      }
    };

    setupRealtimeSubscription();

    return () => {
      if (channel && isSubscribed) {
        console.log("[useGroupMessages] Removing Realtime subscription");
        supabase.removeChannel(channel);
      }
    };
  }, [groupId, scrollToBottom]);

  // Send message (admin only)
  const sendMessage = useCallback(
    async (message: string, attachmentFiles?: File[]) => {
      if (!groupId) return;

      try {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) throw new Error("Usuário não autenticado");

        // Verify user is admin
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

        // Get sender info for enriched message
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

        // Broadcast via Realtime
        const { broadcastGroupMessage } = await import("@/lib/realtime/groupBroadcast");
        await broadcastGroupMessage(groupId, enrichedMessage);

        // Message will be added via Realtime subscription
        toast.success("Mensagem enviada com sucesso");
      } catch (error) {
        console.error("Erro ao enviar mensagem:", error);
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
