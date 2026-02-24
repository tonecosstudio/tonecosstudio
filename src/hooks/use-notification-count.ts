/**
 * useNotificationCount - Hook para gerenciar badge de notificação in-app
 *
 * Requirements: 10.1-10.10
 * Design: .kiro/specs/manual-payment-system/design.md
 *
 * Este hook calcula e atualiza em tempo real a contagem de notificações
 * para clientes e administradores usando Supabase Realtime.
 *
 * Para clientes: requires_info + mensagens não lidas
 * Para admins: pending + under_review + mensagens não lidas
 */

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useIsAdmin } from "@/lib/roles";
import type { ManualPayment, PaymentStatus } from "@/types/manual-payment";

/**
 * Interface para o resultado do hook
 */
export interface NotificationCount {
  /** Contagem total de notificações */
  total: number;
  /** Contagem de pagamentos pendentes (apenas para admins) */
  pendingPayments: number;
  /** Contagem de pagamentos em análise (apenas para admins) */
  underReviewPayments: number;
  /** Contagem de pagamentos que requerem informações (apenas para clientes) */
  requiresInfoPayments: number;
  /** Contagem de mensagens não lidas */
  unreadMessages: number;
  /** Se o usuário é admin */
  isAdmin: boolean;
  /** Se está carregando */
  isLoading: boolean;
  /** Erro se houver */
  error: Error | null;
}

/**
 * Hook para calcular e atualizar contagem de notificações em tempo real
 *
 * @returns NotificationCount com contagens atualizadas e status
 */
export function useNotificationCount(): NotificationCount {
  const [user, setUser] = useState<any>(null);
  const { data: isAdminData, isLoading: isAdminLoading } = useIsAdmin(user?.id);
  const queryClient = useQueryClient();
  const [realTimeCount, setRealTimeCount] = useState<NotificationCount | null>(null);

  /**
   * Busca o usuário atual
   */
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      setUser(currentUser);
    };

    getUser();

    // Configurar listener para mudanças de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const isAdmin = isAdminData || false;
  const isLoadingAuth = isAdminLoading || !user;

  /**
   * Busca a contagem inicial de notificações
   */
  const {
    data: initialCount,
    isLoading: isLoadingCount,
    error,
  } = useQuery({
    queryKey: ["notification-count", user?.id, isAdmin],
    queryFn: async () => {
      if (!user?.id) {
        return {
          total: 0,
          pendingPayments: 0,
          underReviewPayments: 0,
          requiresInfoPayments: 0,
          unreadMessages: 0,
          isAdmin: false,
        };
      }

      if (isAdmin) {
        return await fetchAdminNotificationCount(user.id);
      } else {
        return await fetchCustomerNotificationCount(user.id);
      }
    },
    enabled: !!user?.id && !isAdminLoading,
    refetchOnWindowFocus: false,
  });

  /**
   * Calcula contagem de notificações para administradores
   */
  const fetchAdminNotificationCount = async (
    adminId: string
  ): Promise<Omit<NotificationCount, "isLoading" | "error">> => {
    let pendingCount = 0;
    let underReviewCount = 0;

    try {
      // Buscar pagamentos pendentes e em análise
      const { data: pendingPayments, error: pendingError } = await supabase
        .from("manual_payments")
        .select("id, status")
        .in("status", ["pending", "under_review"]);

      if (pendingError) {
        console.error("Erro ao buscar pagamentos pendentes:", pendingError);
        // Se a tabela não existir, retorna 0 para as contagens
        if (
          pendingError.code === "PGRST205" ||
          pendingError.message?.includes("Could not find the table")
        ) {
          console.warn("Tabela manual_payments não encontrada. Retornando contagem zero.");
        } else {
          throw pendingError;
        }
      } else {
        pendingCount = pendingPayments?.filter((p) => p.status === "pending").length || 0;
        underReviewCount = pendingPayments?.filter((p) => p.status === "under_review").length || 0;
      }
    } catch (error) {
      console.error("Erro inesperado ao buscar pagamentos:", error);
      // Continua com contagem zero em caso de erro
    }

    // Buscar mensagens não lidas por administradores
    const { data: unreadMessages, error: messagesError } = await supabase
      .from("support_messages")
      .select("id, read_by_admin")
      .eq("read_by_admin", false);

    if (messagesError) {
      console.error("Erro ao buscar mensagens não lidas:", messagesError);
      throw messagesError;
    }

    const unreadMessagesCount = unreadMessages?.length || 0;

    const total = pendingCount + underReviewCount + unreadMessagesCount;

    return {
      total,
      pendingPayments: pendingCount,
      underReviewPayments: underReviewCount,
      requiresInfoPayments: 0, // Admins não têm requires_info
      unreadMessages: unreadMessagesCount,
      isAdmin: true,
    };
  };

  /**
   * Calcula contagem de notificações para clientes
   */
  const fetchCustomerNotificationCount = async (
    customerId: string
  ): Promise<Omit<NotificationCount, "isLoading" | "error">> => {
    let requiresInfoCount = 0;

    try {
      // Buscar pagamentos que requerem informações
      const { data: requiresInfoPayments, error: paymentsError } = await supabase
        .from("manual_payments")
        .select("id, status")
        .eq("user_id", customerId)
        .eq("status", "requires_info");

      if (paymentsError) {
        console.error("Erro ao buscar pagamentos requires_info:", paymentsError);
        // Se a tabela não existir, apenas continua com contagem zero
        if (
          paymentsError.code === "PGRST205" ||
          paymentsError.message?.includes("Could not find the table")
        ) {
          console.warn("Tabela manual_payments não encontrada. Retornando contagem zero.");
        } else {
          throw paymentsError;
        }
      } else {
        requiresInfoCount = requiresInfoPayments?.length || 0;
      }
    } catch (error) {
      console.error("Erro ao buscar pagamentos requires_info:", error);
      // Continua com contagem zero em caso de erro
    }

    // Buscar mensagens não lidas por clientes
    const { data: unreadMessages, error: messagesError } = await supabase
      .from("support_messages")
      .select("id, read_by_customer, conversation_id")
      .eq("read_by_customer", false);

    if (messagesError) {
      console.error("Erro ao buscar mensagens não lidas:", messagesError);
      throw messagesError;
    }

    // Filtrar apenas mensagens de conversas do cliente
    const customerConversations = await getCustomerConversations(customerId);
    const customerUnreadMessages =
      unreadMessages?.filter((msg) =>
        customerConversations.some((conv) => conv.id === msg.conversation_id)
      ) || [];

    const unreadMessagesCount = customerUnreadMessages.length;

    const total = requiresInfoCount + unreadMessagesCount;

    return {
      total,
      pendingPayments: 0, // Clientes não veem pending
      underReviewPayments: 0, // Clientes não veem under_review
      requiresInfoPayments: requiresInfoCount,
      unreadMessages: unreadMessagesCount,
      isAdmin: false,
    };
  };

  /**
   * Busca conversas do cliente
   */
  const getCustomerConversations = async (customerId: string) => {
    const { data, error } = await supabase
      .from("support_conversations")
      .select("id")
      .eq("user_id", customerId);

    if (error) {
      console.error("Erro ao buscar conversas do cliente:", error);
      return [];
    }

    return data || [];
  };

  /**
   * Atualiza contagem quando há mudanças em tempo real
   */
  const updateCount = useCallback(async () => {
    if (!user?.id) return;

    try {
      const newCount = isAdmin
        ? await fetchAdminNotificationCount(user.id)
        : await fetchCustomerNotificationCount(user.id);

      setRealTimeCount({
        ...newCount,
        isLoading: false,
        error: null,
      });

      // Invalida a query para forçar refetch se necessário
      queryClient.invalidateQueries({ queryKey: ["notification-count", user.id, isAdmin] });
    } catch (err) {
      console.error("Erro ao atualizar contagem de notificações:", err);
      setRealTimeCount((prev) =>
        prev
          ? {
              ...prev,
              isLoading: false,
              error: err as Error,
            }
          : null
      );
    }
  }, [user?.id, isAdmin, queryClient]);

  /**
   * Configura assinaturas em tempo real
   */
  useEffect(() => {
    if (!user?.id) return;

    const channels = [];

    // Canal para mudanças de status de pagamento
    try {
      const paymentChannel = supabase
        .channel(`notification-payments-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "manual_payments",
            filter: isAdmin ? undefined : `user_id=eq.${user.id}`,
          },
          () => {
            updateCount();
          }
        )
        .subscribe();

      channels.push(paymentChannel);
    } catch (error) {
      console.warn(
        "Não foi possível criar canal de notificação para manual_payments. A tabela pode não existir:",
        error
      );
    }

    // Canal para novas mensagens
    const messageChannel = supabase
      .channel(`notification-messages-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
        },
        () => {
          updateCount();
        }
      )
      .subscribe();

    channels.push(messageChannel);

    // Canal para atualizações de leitura de mensagens
    const messageReadChannel = supabase
      .channel(`notification-messages-read-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "support_messages",
        },
        (payload) => {
          // Só atualiza se o campo read_by_customer ou read_by_admin mudou
          if (
            payload.new.read_by_customer !== payload.old?.read_by_customer ||
            payload.new.read_by_admin !== payload.old?.read_by_admin
          ) {
            updateCount();
          }
        }
      )
      .subscribe();

    channels.push(messageReadChannel);

    // Cleanup
    return () => {
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, [user?.id, isAdmin, updateCount]);

  /**
   * Retorna o resultado combinado (dados iniciais + atualizações em tempo real)
   */
  const isLoading = isLoadingAuth || isLoadingCount;

  const result =
    realTimeCount ||
    (initialCount
      ? {
          ...initialCount,
          isLoading,
          error: error as Error | null,
        }
      : {
          total: 0,
          pendingPayments: 0,
          underReviewPayments: 0,
          requiresInfoPayments: 0,
          unreadMessages: 0,
          isAdmin: false,
          isLoading,
          error: error as Error | null,
        });

  return result;
}

/**
 * Hook auxiliar para formatar a contagem para exibição
 * (ex: "99+" para contagens maiores que 99)
 */
export function useFormattedNotificationCount() {
  const notificationCount = useNotificationCount();

  const formattedTotal = notificationCount.total > 99 ? "99+" : notificationCount.total.toString();
  const hasNotifications = notificationCount.total > 0;

  return {
    ...notificationCount,
    formattedTotal,
    hasNotifications,
  };
}
