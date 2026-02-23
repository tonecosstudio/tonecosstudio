// @ts-nocheck
/**
 * useConversationRealtime - Hook para assinar novas mensagens e mudanças em conversas em tempo real
 * 
 * Requirements: 16.1-16.15
 * Design: .kiro/specs/manual-payment-system/design.md
 * 
 * Este hook fornece assinaturas em tempo real para mudanças nas tabelas support_messages
 * e support_conversations com tratamento de perda de conexão, reconexão automática e backoff exponencial.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeConnectionState, ReconnectionConfig } from "./use-payment-realtime";

/**
 * Tipos de mensagem de suporte
 */
export interface SupportMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  message: string;
  is_internal: boolean;
  attachments: string[];
  read_by_customer: boolean;
  read_by_admin: boolean;
  created_at: string;
}

/**
 * Tipos de conversa de suporte
 */
export interface SupportConversation {
  id: string;
  user_id: string;
  subject: string;
  status: string;
  payment_id?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

/**
 * Opções para o hook useConversationRealtime
 */
export interface UseConversationRealtimeOptions {
  /** ID da conversa específica para assinar (opcional, assina todas se não fornecido) */
  conversationId?: string;
  /** ID do usuário para filtrar conversas (opcional) */
  userId?: string;
  /** ID do pagamento para filtrar conversas (opcional) */
  paymentId?: string;
  /** Se deve assinar apenas a INSERT, UPDATE, DELETE ou todos os eventos */
  events?: ("INSERT" | "UPDATE" | "DELETE" | "*")[];
  /** Se deve assinar a tabela support_messages (padrão: true) */
  subscribeToMessages?: boolean;
  /** Se deve assinar a tabela support_conversations (padrão: false) */
  subscribeToConversations?: boolean;
  /** Configuração de reconexão personalizada */
  reconnectionConfig?: Partial<ReconnectionConfig>;
  /** Callback quando uma nova mensagem é recebida */
  onNewMessage?: (message: SupportMessage) => void;
  /** Callback quando uma mensagem é atualizada (ex: marcada como lida) */
  onMessageUpdate?: (message: SupportMessage, oldMessage: SupportMessage | null) => void;
  /** Callback quando uma conversa é atualizada */
  onConversationUpdate?: (conversation: SupportConversation, oldConversation: SupportConversation | null) => void;
  /** Callback quando a conexão é estabelecida */
  onConnected?: () => void;
  /** Callback quando a conexão é perdida */
  onDisconnected?: (error?: Error) => void;
}

/**
 * Hook para assinar mudanças em conversas e mensagens em tempo real
 * 
 * @param options Opções de configuração do hook
 * @returns Estado da conexão e funções de controle
 */
export function useConversationRealtime(options: UseConversationRealtimeOptions = {}) {
  const {
    conversationId,
    userId,
    paymentId,
    events = ["INSERT", "UPDATE", "DELETE"],
    subscribeToMessages = true,
    subscribeToConversations = false,
    reconnectionConfig: userReconnectionConfig,
    onNewMessage,
    onMessageUpdate,
    onConversationUpdate,
    onConnected,
    onDisconnected,
  } = options;

  // Referências para gerenciar estado interno
  const channelsRef = useRef<any[]>([]);
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
  const calculateRetryDelay = useCallback((attempt: number): number => {
    const delay = reconnectionConfig.baseDelayMs * Math.pow(reconnectionConfig.backoffFactor, attempt);
    return Math.min(delay, reconnectionConfig.maxDelayMs);
  }, [reconnectionConfig]);

  /**
   * Estabelece a conexão com os canais de realtime
   */
  const connect = useCallback(async () => {
    if (!isMountedRef.current) return;

    // Limpar canais anteriores se existirem
    channelsRef.current.forEach(channel => {
      supabase.removeChannel(channel);
    });
    channelsRef.current = [];

    // Construir filtro para mensagens
    let messageFilter = "";
    const messageFilters = [];

    if (conversationId) {
      messageFilters.push(`conversation_id=eq.${conversationId}`);
    }

    if (messageFilters.length > 0) {
      messageFilter = messageFilters.join(",");
    }

    // Construir filtro para conversas
    let conversationFilter = "";
    const conversationFilters = [];

    if (conversationId) {
      conversationFilters.push(`id=eq.${conversationId}`);
    }

    if (userId) {
      conversationFilters.push(`user_id=eq.${userId}`);
    }

    if (paymentId) {
      conversationFilters.push(`payment_id=eq.${paymentId}`);
    }

    if (conversationFilters.length > 0) {
      conversationFilter = conversationFilters.join(",");
    }

    try {
      setConnectionState(prev => ({
        ...prev,
        isReconnecting: true,
        error: null,
      }));

      const channels = [];
      let subscribedChannels = 0;
      let totalChannels = 0;

      /**
       * Função para verificar se todos os canais estão conectados
       */
      const checkAllChannelsConnected = () => {
        if (subscribedChannels === totalChannels) {
          // Todos os canais conectados
          retryCountRef.current = 0;
          setConnectionState(prev => ({
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
        }
      };

      /**
       * Função para lidar com erros de canal
       */
      const handleChannelError = (channelName: string, error: Error) => {
        console.error(`Erro no canal ${channelName}:`, error);
        
        if (!isMountedRef.current) return;

        setConnectionState(prev => ({
          ...prev,
          isConnected: false,
          isReconnecting: false,
          lastDisconnectedAt: new Date(),
          error,
        }));

        if (onDisconnected) {
          onDisconnected(error);
        }

        // Tentar reconectar se ainda não excedeu o máximo de tentativas
        if (retryCountRef.current < reconnectionConfig.maxRetries) {
          scheduleReconnect();
        }
      };

      // Canal para mensagens (se habilitado)
      if (subscribeToMessages) {
        totalChannels++;
        const messageChannelName = `conversation-messages-${conversationId || "all"}-${Date.now()}`;
        
        const messageChannel = supabase
          .channel(messageChannelName)
          .on(
            "postgres_changes",
            {
              event: events.includes("*") ? "*" : events.join(",") as any,
              schema: "public",
              table: "support_messages",
              filter: messageFilter || undefined,
            },
            (payload) => {
              if (!isMountedRef.current) return;

              const message = payload.new as SupportMessage;
              const oldMessage = payload.old as SupportMessage | null;

              switch (payload.eventType) {
                case "INSERT":
                  if (onNewMessage) {
                    onNewMessage(message);
                  }
                  break;
                case "UPDATE":
                  if (onMessageUpdate) {
                    onMessageUpdate(message, oldMessage);
                  }
                  break;
                case "DELETE":
                  // Tratar exclusão se necessário
                  break;
              }
            }
          )
          .subscribe((status, error) => {
            if (!isMountedRef.current) return;

            if (status === "SUBSCRIBED") {
              subscribedChannels++;
              checkAllChannelsConnected();
            } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
              handleChannelError(messageChannelName, error || new Error(`Falha na conexão: ${status}`));
            }
          });

        channels.push(messageChannel);
      }

      // Canal para conversas (se habilitado)
      if (subscribeToConversations) {
        totalChannels++;
        const conversationChannelName = `conversation-conversations-${conversationId || "all"}-${Date.now()}`;
        
        const conversationChannel = supabase
          .channel(conversationChannelName)
          .on(
            "postgres_changes",
            {
              event: events.includes("*") ? "*" : events.join(",") as any,
              schema: "public",
              table: "support_conversations",
              filter: conversationFilter || undefined,
            },
            (payload) => {
              if (!isMountedRef.current && onConversationUpdate) {
                const conversation = payload.new as SupportConversation;
                const oldConversation = payload.old as SupportConversation | null;
                
                if (payload.eventType === "UPDATE") {
                  onConversationUpdate(conversation, oldConversation);
                }
              }
            }
          )
          .subscribe((status, error) => {
            if (!isMountedRef.current) return;

            if (status === "SUBSCRIBED") {
              subscribedChannels++;
              checkAllChannelsConnected();
            } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
              handleChannelError(conversationChannelName, error || new Error(`Falha na conexão: ${status}`));
            }
          });

        channels.push(conversationChannel);
      }

      // Se não há canais para assinar, considerar como conectado
      if (totalChannels === 0) {
        setConnectionState(prev => ({
          ...prev,
          isConnected: true,
          isReconnecting: false,
          lastConnectedAt: new Date(),
          error: null,
        }));

        if (onConnected) {
          onConnected();
        }
      }

      channelsRef.current = channels;
    } catch (error) {
      console.error("Erro ao criar canais de realtime:", error);
      setConnectionState(prev => ({
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
    conversationId,
    userId,
    paymentId,
    events,
    subscribeToMessages,
    subscribeToConversations,
    onNewMessage,
    onMessageUpdate,
    onConversationUpdate,
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

    setConnectionState(prev => ({
      ...prev,
      isReconnecting: true,
      retryCount: retryCountRef.current,
    }));

    retryTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [connect, calculateRetryDelay]);

  /**
   * Desconecta dos canais de realtime
   */
  const disconnect = useCallback(() => {
    channelsRef.current.forEach(channel => {
      supabase.removeChannel(channel);
    });
    channelsRef.current = [];

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    setConnectionState(prev => ({
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
    if (isMountedRef.current && channelsRef.current.length > 0) {
      // Reconectar com novas configurações
      reconnect();
    }
  }, [conversationId, userId, paymentId, events, subscribeToMessages, subscribeToConversations, reconnect]);

  return {
    ...connectionState,
    disconnect,
    reconnect,
  };
}

/**
 * Hook simplificado para assinar novas mensagens de uma conversa específica
 * 
 * @param conversationId ID da conversa para assinar
 * @param onNewMessage Callback quando uma nova mensagem é recebida
 * @returns Estado da conexão
 */
export function useConversationMessagesRealtime(
  conversationId: string,
  onNewMessage?: (message: SupportMessage) => void
) {
  const { isConnected, isReconnecting, error, ...rest } = useConversationRealtime({
    conversationId,
    events: ["INSERT"],
    subscribeToMessages: true,
    subscribeToConversations: false,
    onNewMessage,
  });

  return {
    isConnected,
    isReconnecting,
    error,
    ...rest,
  };
}

/**
 * Hook para assinar atualizações de leitura de mensagens
 * 
 * @param conversationId ID da conversa para filtrar (opcional)
 * @param onMessageRead Callback quando uma mensagem é marcada como lida
 * @returns Estado da conexão
 */
export function useMessageReadRealtime(
  conversationId?: string,
  onMessageRead?: (message: SupportMessage, wasReadByCustomer: boolean, wasReadByAdmin: boolean) => void
) {
  const { isConnected, isReconnecting, error, ...rest } = useConversationRealtime({
    conversationId,
    events: ["UPDATE"],
    subscribeToMessages: true,
    subscribeToConversations: false,
    onMessageUpdate: (message, oldMessage) => {
      if (onMessageRead && oldMessage) {
        const wasReadByCustomer = !oldMessage.read_by_customer && message.read_by_customer;
        const wasReadByAdmin = !oldMessage.read_by_admin && message.read_by_admin;
        
        if (wasReadByCustomer || wasReadByAdmin) {
          onMessageRead(message, wasReadByCustomer, wasReadByAdmin);
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
 * Hook para assinar conversas relacionadas a um pagamento
 * 
 * @param paymentId ID do pagamento para filtrar
 * @param onConversationUpdate Callback quando a conversa é atualizada
 * @returns Estado da conexão
 */
export function usePaymentConversationRealtime(
  paymentId: string,
  onConversationUpdate?: (conversation: SupportConversation) => void
) {
  const { isConnected, isReconnecting, error, ...rest } = useConversationRealtime({
    paymentId,
    events: ["UPDATE"],
    subscribeToMessages: false,
    subscribeToConversations: true,
    onConversationUpdate: (conversation) => {
      if (onConversationUpdate) {
        onConversationUpdate(conversation);
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