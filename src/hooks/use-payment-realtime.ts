/**
 * usePaymentRealtime - Hook para assinar mudanças de status de pagamento em tempo real
 *
 * Requirements: 16.1-16.15
 * Design: .kiro/specs/manual-payment-system/design.md
 *
 * Este hook fornece assinaturas em tempo real para mudanças na tabela manual_payments
 * com tratamento de perda de conexão, reconexão automática e backoff exponencial.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ManualPayment, PaymentStatus } from "@/types/manual-payment";

/**
 * Configuração para reconexão com backoff exponencial
 */
interface ReconnectionConfig {
  /** Número máximo de tentativas de reconexão */
  maxRetries: number;
  /** Tempo base de espera em milissegundos */
  baseDelayMs: number;
  /** Fator de multiplicação para backoff exponencial */
  backoffFactor: number;
  /** Tempo máximo de espera em milissegundos */
  maxDelayMs: number;
}

/**
 * Estado da conexão em tempo real
 */
export interface RealtimeConnectionState {
  /** Se está conectado ao canal de realtime */
  isConnected: boolean;
  /** Se está tentando reconectar */
  isReconnecting: boolean;
  /** Número de tentativas de reconexão */
  retryCount: number;
  /** Último erro de conexão */
  error: Error | null;
  /** Timestamp da última conexão bem-sucedida */
  lastConnectedAt: Date | null;
  /** Timestamp da última desconexão */
  lastDisconnectedAt: Date | null;
}

/**
 * Opções para o hook usePaymentRealtime
 */
export interface UsePaymentRealtimeOptions {
  /** ID do pagamento específico para assinar (opcional, assina todos se não fornecido) */
  paymentId?: string;
  /** ID do usuário para filtrar pagamentos (opcional) */
  userId?: string;
  /** Status específico para filtrar (opcional) */
  status?: PaymentStatus | PaymentStatus[];
  /** Se deve assinar apenas a INSERT, UPDATE, DELETE ou todos os eventos */
  events?: ("INSERT" | "UPDATE" | "DELETE" | "*")[];
  /** Configuração de reconexão personalizada */
  reconnectionConfig?: Partial<ReconnectionConfig>;
  /** Callback quando uma mudança é recebida */
  onPaymentChange?: (payload: {
    event: "INSERT" | "UPDATE" | "DELETE";
    old: ManualPayment | null;
    new: ManualPayment | null;
  }) => void;
  /** Callback quando a conexão é estabelecida */
  onConnected?: () => void;
  /** Callback quando a conexão é perdida */
  onDisconnected?: (error?: Error) => void;
}

/**
 * Hook para assinar mudanças de pagamento em tempo real
 *
 * @param options Opções de configuração do hook
 * @returns Estado da conexão e funções de controle
 */
export function usePaymentRealtime(options: UsePaymentRealtimeOptions = {}) {
  const {
    paymentId,
    userId,
    status,
    events = ["INSERT", "UPDATE", "DELETE"],
    reconnectionConfig: userReconnectionConfig,
    onPaymentChange,
    onConnected,
    onDisconnected,
  } = options;

  // Referências para gerenciar estado interno
  const channelRef = useRef<any>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);

  // Estado da conexão
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>({
    isConnected: false,
    isReconnecting: false,
    retryCount: 0,
    error: null,
    lastConnectedAt: null,
    lastDisconnectedAt: null,
  });

  // Configuração padrão de reconexão
  const defaultReconnectionConfig: ReconnectionConfig = {
    maxRetries: 10,
    baseDelayMs: 1000,
    backoffFactor: 2,
    maxDelayMs: 30000,
  };

  const reconnectionConfig = {
    ...defaultReconnectionConfig,
    ...userReconnectionConfig,
  };

  /**
   * Calcula o delay para a próxima tentativa de reconexão usando backoff exponencial
   */
  const calculateRetryDelay = useCallback(
    (attempt: number): number => {
      const delay =
        reconnectionConfig.baseDelayMs * Math.pow(reconnectionConfig.backoffFactor, attempt);
      return Math.min(delay, reconnectionConfig.maxDelayMs);
    },
    [reconnectionConfig]
  );

  /**
   * Estabelece a conexão com o canal de realtime
   */
  const connect = useCallback(async () => {
    if (!isMountedRef.current) return;

    // Limpar canal anterior se existir
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Construir filtro para a assinatura
    let filter = "";
    const filters = [];

    if (paymentId) {
      filters.push(`id=eq.${paymentId}`);
    }

    if (userId) {
      filters.push(`user_id=eq.${userId}`);
    }

    if (status) {
      const statusArray = Array.isArray(status) ? status : [status];
      if (statusArray.length === 1) {
        filters.push(`status=eq.${statusArray[0]}`);
      } else {
        const statusConditions = statusArray.map((s) => `status=eq.${s}`).join(",");
        filters.push(`or(${statusConditions})`);
      }
    }

    if (filters.length > 0) {
      filter = filters.join(",");
    }

    // Criar nome do canal único
    const channelName = `payment-realtime-${paymentId || "all"}-${userId || "all"}-${Date.now()}`;

    try {
      setConnectionState((prev) => ({
        ...prev,
        isReconnecting: true,
        error: null,
      }));

      // Criar canal
      const channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: events.includes("*") ? "*" : (events.join(",") as any),
            schema: "public",
            table: "manual_payments",
            filter: filter || undefined,
          },
          (payload) => {
            if (onPaymentChange) {
              onPaymentChange({
                event: payload.eventType as "INSERT" | "UPDATE" | "DELETE",
                old: payload.old as ManualPayment | null,
                new: payload.new as ManualPayment | null,
              });
            }
          }
        )
        .subscribe((status, error) => {
          if (!isMountedRef.current) return;

          if (status === "SUBSCRIBED") {
            // Conexão bem-sucedida
            retryCountRef.current = 0;
            setConnectionState((prev) => ({
              ...prev,
              isConnected: true,
              isReconnecting: false,
              retryCount: 0,
              lastConnectedAt: new Date(),
              error: null,
            }));

            if (onConnected) {
              onConnected();
            }
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            // Erro de conexão
            const errorObj = error || new Error(`Falha na conexão: ${status}`);
            setConnectionState((prev) => ({
              ...prev,
              isConnected: false,
              isReconnecting: false,
              lastDisconnectedAt: new Date(),
              error: errorObj,
            }));

            if (onDisconnected) {
              onDisconnected(errorObj);
            }

            // Tentar reconectar se ainda não excedeu o máximo de tentativas
            if (retryCountRef.current < reconnectionConfig.maxRetries) {
              scheduleReconnect();
            }
          }
        });

      channelRef.current = channel;
    } catch (error) {
      console.error("Erro ao criar canal de realtime:", error);
      setConnectionState((prev) => ({
        ...prev,
        isConnected: false,
        isReconnecting: false,
        error: error as Error,
        lastDisconnectedAt: new Date(),
      }));

      if (onDisconnected) {
        onDisconnected(error as Error);
      }

      if (retryCountRef.current < reconnectionConfig.maxRetries) {
        scheduleReconnect();
      }
    }
  }, [
    paymentId,
    userId,
    status,
    events,
    onPaymentChange,
    onConnected,
    onDisconnected,
    reconnectionConfig.maxRetries,
  ]);

  /**
   * Agenda uma tentativa de reconexão
   */
  const scheduleReconnect = useCallback(() => {
    if (!isMountedRef.current) return;

    // Limpar timeout anterior
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    retryCountRef.current += 1;
    const delay = calculateRetryDelay(retryCountRef.current);

    setConnectionState((prev) => ({
      ...prev,
      isReconnecting: true,
      retryCount: retryCountRef.current,
    }));

    retryTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [connect, calculateRetryDelay]);

  /**
   * Desconecta do canal de realtime
   */
  const disconnect = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    setConnectionState((prev) => ({
      ...prev,
      isConnected: false,
      isReconnecting: false,
      lastDisconnectedAt: new Date(),
    }));
  }, []);

  /**
   * Reconecta manualmente
   */
  const reconnect = useCallback(() => {
    disconnect();
    retryCountRef.current = 0;
    connect();
  }, [disconnect, connect]);

  /**
   * Efeito para gerenciar ciclo de vida do hook
   */
  useEffect(() => {
    isMountedRef.current = true;

    // Conectar quando o componente montar
    connect();

    // Cleanup quando o componente desmontar
    return () => {
      isMountedRef.current = false;
      disconnect();
    };
  }, [connect, disconnect]);

  /**
   * Efeito para reconectar quando dependências mudarem
   */
  useEffect(() => {
    if (isMountedRef.current && channelRef.current) {
      // Reconectar com novas configurações
      reconnect();
    }
  }, [paymentId, userId, status, events, reconnect]);

  return {
    ...connectionState,
    disconnect,
    reconnect,
  };
}

/**
 * Hook simplificado para assinar mudanças de status de um pagamento específico
 *
 * @param paymentId ID do pagamento para assinar
 * @param onStatusChange Callback quando o status muda
 * @returns Estado da conexão
 */
export function usePaymentStatusRealtime(
  paymentId: string,
  onStatusChange?: (
    newStatus: PaymentStatus,
    oldStatus: PaymentStatus | null,
    payment: ManualPayment
  ) => void
) {
  const { isConnected, isReconnecting, error, ...rest } = usePaymentRealtime({
    paymentId,
    events: ["UPDATE"],
    onPaymentChange: (payload) => {
      if (payload.event === "UPDATE" && payload.new && onStatusChange) {
        const oldStatus = payload.old?.status as PaymentStatus | null;
        const newStatus = payload.new.status as PaymentStatus;

        if (oldStatus !== newStatus) {
          onStatusChange(newStatus, oldStatus, payload.new as ManualPayment);
        }
      }
    },
  });

  return {
    isConnected,
    isReconnecting,
    error,
    ...rest,
  };
}

/**
 * Hook para assinar novos pagamentos de um usuário específico
 *
 * @param userId ID do usuário para filtrar
 * @param onNewPayment Callback quando um novo pagamento é criado
 * @returns Estado da conexão
 */
export function useNewPaymentsRealtime(
  userId?: string,
  onNewPayment?: (payment: ManualPayment) => void
) {
  const { isConnected, isReconnecting, error, ...rest } = usePaymentRealtime({
    userId,
    events: ["INSERT"],
    onPaymentChange: (payload) => {
      if (payload.event === "INSERT" && payload.new && onNewPayment) {
        onNewPayment(payload.new as ManualPayment);
      }
    },
  });

  return {
    isConnected,
    isReconnecting,
    error,
    ...rest,
  };
}
