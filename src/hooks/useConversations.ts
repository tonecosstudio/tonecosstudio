import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { conversationService } from "@/lib/services/conversationService";
import type {
  Conversation,
  ConversationFilters,
  ConversationStatus,
  ConversationTag,
} from "@/types/support";
import { toast } from "sonner";

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ConversationFilters>({});
  const [searchTerm, setSearchTerm] = useState("");

  // Carregar conversas iniciais
  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await conversationService.listConversations(filters);
      setConversations(data);
    } catch (error) {
      console.error("Erro ao carregar conversas:", error);
      toast.error("Erro ao carregar conversas");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Configurar Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("support_conversations_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_conversations",
        },
        (payload) => {
          console.log("Conversation change:", payload);

          if (payload.eventType === "INSERT") {
            // Nova conversa
            const newConv = payload.new as Conversation;
            setConversations((prev) => [newConv, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            // Conversa atualizada
            const updatedConv = payload.new as Conversation;
            setConversations((prev) =>
              prev.map((conv) => (conv.id === updatedConv.id ? updatedConv : conv))
            );
          } else if (payload.eventType === "DELETE") {
            // Conversa deletada
            const deletedId = payload.old.id;
            setConversations((prev) => prev.filter((conv) => conv.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filtrar por status
  const filterByStatus = useCallback((status: ConversationStatus | "all") => {
    setFilters((prev) => ({
      ...prev,
      status: status === "all" ? undefined : status,
    }));
  }, []);

  // Filtrar por tags
  const filterByTags = useCallback((tags: ConversationTag[]) => {
    setFilters((prev) => ({
      ...prev,
      tags: tags.length > 0 ? tags : undefined,
    }));
  }, []);

  // Buscar conversas
  const search = useCallback((term: string) => {
    setSearchTerm(term);
    setFilters((prev) => ({
      ...prev,
      search: term || undefined,
    }));
  }, []);

  // Limpar filtros
  const clearFilters = useCallback(() => {
    setFilters({});
    setSearchTerm("");
  }, []);

  // Recarregar conversas
  const refresh = useCallback(() => {
    loadConversations();
  }, [loadConversations]);

  // Conversas filtradas localmente (para busca instantânea)
  const filteredConversations = conversations.filter((conv) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        conv.user_email?.toLowerCase().includes(term) ||
        conv.user_name?.toLowerCase().includes(term) ||
        conv.subject.toLowerCase().includes(term)
      );
    }
    return true;
  });

  return {
    conversations: filteredConversations,
    loading,
    filters,
    searchTerm,
    filterByStatus,
    filterByTags,
    search,
    clearFilters,
    refresh,
  };
}
