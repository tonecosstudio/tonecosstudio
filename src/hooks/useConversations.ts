import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { conversationService } from "@/services/support/conversation-service";
import { log } from "@/lib/logger";
import { subscribeToSupportConversationListChanges } from "@/services/realtime/realtime-service";
import type {
  Conversation,
  ConversationFilters,
  ConversationStatus,
  ConversationTag,
} from "@/types/support";
import { toast } from "sonner";

export function useConversations() {
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ConversationFilters>({});
  const [searchTerm, setSearchTerm] = useState("");
  const conversationsQuery = useQuery({
    queryKey: ["support-conversations", filters],
    queryFn: async () => {
      try {
        return await conversationService.listConversations(filters);
      } catch (error) {
        log.error("Failed to load support conversations", { error, filters });
        toast.error("Erro ao carregar conversas");
        throw error;
      }
    },
  });

  useEffect(() => {
    setLoading(conversationsQuery.isLoading || conversationsQuery.isFetching);
  }, [conversationsQuery.isFetching, conversationsQuery.isLoading]);

  // Configurar Realtime subscription
  useEffect(() => {
    return subscribeToSupportConversationListChanges((eventType) => {
      log.debug("Support conversation realtime change received", { eventType });
      void conversationsQuery.refetch();
    });
  }, [conversationsQuery]);

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
    void conversationsQuery.refetch();
  }, [conversationsQuery]);

  // Conversas filtradas localmente (para busca instantanea)
  const filteredConversations = useMemo(() => {
    const conversations = conversationsQuery.data ?? ([] as Conversation[]);

    return conversations.filter((conv) => {
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
  }, [conversationsQuery.data, searchTerm]);

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
