/**
 * PaymentRealtimeExample - Componente de exemplo para demonstrar o uso dos hooks de realtime
 *
 * Este componente demonstra como usar os hooks usePaymentRealtime, useConversationRealtime
 * e usePaymentSystemRealtime em um cenário real.
 */

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Bell,
  MessageSquare,
  CreditCard,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";

// Importar hooks de realtime
import {
  usePaymentRealtime,
  useConversationRealtime,
  usePaymentSystemRealtime,
  usePaymentStatusRealtime,
  useConversationMessagesRealtime,
  useAdminDashboardRealtime,
  useUserPaymentsRealtime,
  type ManualPayment,
  type PaymentStatus,
  type SupportMessage,
} from "@/hooks/use-realtime";

interface PaymentRealtimeExampleProps {
  /** ID do pagamento para demonstrar assinatura específica */
  paymentId?: string;
  /** ID do usuário para demonstrar assinatura por usuário */
  userId?: string;
  /** Modo de demonstração: 'customer' ou 'admin' */
  mode?: "customer" | "admin";
}

/**
 * Componente de exemplo para demonstrar hooks de realtime
 */
export function PaymentRealtimeExample({
  paymentId = "demo-payment-id",
  userId = "demo-user-id",
  mode = "customer",
}: PaymentRealtimeExampleProps) {
  const [paymentUpdates, setPaymentUpdates] = useState<
    Array<{
      timestamp: Date;
      event: string;
      paymentId: string;
      oldStatus?: PaymentStatus;
      newStatus?: PaymentStatus;
    }>
  >([]);

  const [messageUpdates, setMessageUpdates] = useState<
    Array<{
      timestamp: Date;
      conversationId: string;
      message: string;
      senderId: string;
    }>
  >([]);

  const [showConnectionDetails, setShowConnectionDetails] = useState(false);

  // Hook 1: Assinar mudanças de status de um pagamento específico
  const paymentStatusRealtime = usePaymentStatusRealtime(
    paymentId,
    (newStatus, oldStatus, payment) => {
      setPaymentUpdates((prev) => [
        {
          timestamp: new Date(),
          event: "STATUS_CHANGE",
          paymentId: payment.id,
          oldStatus,
          newStatus,
        },
        ...prev.slice(0, 9),
      ]); // Manter apenas os últimos 10 updates

      // Mostrar notificação (em um app real, isso seria um toast)
      console.log(
        `Status do pagamento ${payment.reference_number} mudou: ${oldStatus} → ${newStatus}`
      );
    }
  );

  // Hook 2: Assinar novas mensagens de conversa
  const conversationRealtime = useConversationMessagesRealtime(
    `conversation-for-${paymentId}`,
    (message) => {
      setMessageUpdates((prev) => [
        {
          timestamp: new Date(),
          conversationId: message.conversation_id,
          message: message.message,
          senderId: message.sender_id,
        },
        ...prev.slice(0, 9),
      ]); // Manter apenas os últimos 10 updates

      console.log(
        `Nova mensagem na conversa ${message.conversation_id}: ${message.message.substring(0, 50)}...`
      );
    }
  );

  // Hook 3: Hook combinado para dashboard admin ou visão do cliente
  // Sempre chamar ambos os hooks (regra do React)
  const adminDashboardRealtime = useAdminDashboardRealtime(
    (payment) => {
      if (mode === "admin") {
        console.log(`Novo pagamento criado: ${payment.reference_number}`);
      }
    },
    (paymentId, newStatus, oldStatus) => {
      if (mode === "admin") {
        console.log(`Pagamento ${paymentId} mudou status: ${oldStatus} → ${newStatus}`);
      }
    },
    (message) => {
      if (mode === "admin") {
        console.log(`Nova mensagem: ${message.message.substring(0, 50)}...`);
      }
    }
  );

  const userPaymentsRealtime = useUserPaymentsRealtime(
    userId,
    (payment) => {
      if (mode === "user") {
        console.log(`Novo pagamento criado para você: ${payment.reference_number}`);
      }
    },
    (paymentId, newStatus, oldStatus) => {
      if (mode === "user") {
        console.log(`Seu pagamento ${paymentId} mudou status: ${oldStatus} → ${newStatus}`);
      }
    },
    (message) => {
      if (mode === "user") {
        console.log(`Nova mensagem na sua conversa: ${message.message.substring(0, 50)}...`);
      }
    }
  );

  // Usar o resultado apropriado baseado no modo
  const dashboardRealtime = mode === "admin" ? adminDashboardRealtime : userPaymentsRealtime;
  // Função para simular reconexão manual
  const handleManualReconnect = () => {
    paymentStatusRealtime.reconnect();
    conversationRealtime.reconnect();
  };

  // Função para limpar updates
  const handleClearUpdates = () => {
    setPaymentUpdates([]);
    setMessageUpdates([]);
  };

  // Status da conexão
  const allConnected = paymentStatusRealtime.isConnected && conversationRealtime.isConnected;
  const anyReconnecting =
    paymentStatusRealtime.isReconnecting || conversationRealtime.isReconnecting;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wifi className={allConnected ? "text-green-500" : "text-gray-400"} />
              Sistema de Atualizações em Tempo Real
            </CardTitle>
            <CardDescription>
              Demonstração dos hooks usePaymentRealtime e useConversationRealtime
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant={allConnected ? "default" : "destructive"}
              className="flex items-center gap-1"
            >
              {allConnected ? (
                <>
                  <Wifi className="h-3 w-3" />
                  Conectado
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3" />
                  Desconectado
                </>
              )}
            </Badge>

            {anyReconnecting && (
              <Badge variant="outline" className="flex items-center gap-1">
                <RefreshCw className="h-3 w-3 animate-spin" />
                Reconectando...
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Seção de Status da Conexão */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Pagamentos
                </h3>
                <Badge variant={paymentStatusRealtime.isConnected ? "default" : "secondary"}>
                  {paymentStatusRealtime.isConnected ? "Ativo" : "Inativo"}
                </Badge>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span
                    className={
                      paymentStatusRealtime.isConnected ? "text-green-600" : "text-red-600"
                    }
                  >
                    {paymentStatusRealtime.isConnected ? "Conectado" : "Desconectado"}
                  </span>
                </div>

                {paymentStatusRealtime.error && (
                  <Alert variant="destructive" className="py-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      {paymentStatusRealtime.error.message}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tentativas:</span>
                  <span>{paymentStatusRealtime.retryCount}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Conversas
                </h3>
                <Badge variant={conversationRealtime.isConnected ? "default" : "secondary"}>
                  {conversationRealtime.isConnected ? "Ativo" : "Inativo"}
                </Badge>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span
                    className={conversationRealtime.isConnected ? "text-green-600" : "text-red-600"}
                  >
                    {conversationRealtime.isConnected ? "Conectado" : "Desconectado"}
                  </span>
                </div>

                {conversationRealtime.error && (
                  <Alert variant="destructive" className="py-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      {conversationRealtime.error.message}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tentativas:</span>
                  <span>{conversationRealtime.retryCount}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Seção de Updates em Tempo Real */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Atualizações em Tempo Real
            </h3>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualReconnect}
                disabled={anyReconnecting}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Reconectar
              </Button>

              <Button variant="outline" size="sm" onClick={handleClearUpdates}>
                Limpar
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowConnectionDetails(!showConnectionDetails)}
              >
                {showConnectionDetails ? "Ocultar detalhes" : "Mostrar detalhes"}
              </Button>
            </div>
          </div>

          {/* Detalhes da Conexão (opcional) */}
          {showConnectionDetails && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <h4 className="font-medium mb-2">Detalhes Técnicos da Conexão</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Backoff Exponencial:</p>
                    <p>Base: 1s, Fator: 2, Máx: 30s</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Tentativas Máximas:</p>
                    <p>10 tentativas de reconexão</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Eventos Assinados:</p>
                    <p>INSERT, UPDATE (mensagens)</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Filtros Ativos:</p>
                    <p className="truncate">payment_id=eq.{paymentId}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lista de Updates de Pagamento */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <CreditCard className="h-3 w-3" />
              Mudanças de Status de Pagamento ({paymentUpdates.length})
            </h4>

            {paymentUpdates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhuma mudança de status recebida ainda.</p>
                <p className="text-sm">As mudanças aparecerão aqui em tempo real.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {paymentUpdates.map((update, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-background border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`
                        p-2 rounded-full
                        ${update.event === "STATUS_CHANGE" ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"}
                      `}
                      >
                        {update.event === "STATUS_CHANGE" ? (
                          <RefreshCw className="h-4 w-4" />
                        ) : (
                          <Bell className="h-4 w-4" />
                        )}
                      </div>

                      <div>
                        <p className="font-medium text-sm">
                          Pagamento {update.paymentId.substring(0, 8)}...
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {update.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {update.oldStatus && (
                        <Badge variant="outline" className="text-xs">
                          {update.oldStatus}
                        </Badge>
                      )}
                      {update.oldStatus && update.newStatus && (
                        <span className="text-muted-foreground">→</span>
                      )}
                      {update.newStatus && (
                        <Badge
                          variant={
                            update.newStatus === "approved"
                              ? "default"
                              : update.newStatus === "rejected"
                                ? "destructive"
                                : "secondary"
                          }
                          className="text-xs"
                        >
                          {update.newStatus}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Lista de Updates de Mensagem */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <MessageSquare className="h-3 w-3" />
              Novas Mensagens ({messageUpdates.length})
            </h4>

            {messageUpdates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhuma nova mensagem recebida ainda.</p>
                <p className="text-sm">As mensagens aparecerão aqui em tempo real.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {messageUpdates.map((update, index) => (
                  <div key={index} className="p-3 bg-background border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-sm">
                          Conversa {update.conversationId.substring(0, 8)}...
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {update.timestamp.toLocaleTimeString()} • Remetente:{" "}
                          {update.senderId.substring(0, 8)}...
                        </p>
                      </div>
                    </div>

                    <p className="text-sm line-clamp-2">{update.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Informações de Uso */}
        <Alert>
          <AlertTitle className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            Como usar esses hooks
          </AlertTitle>
          <AlertDescription className="text-sm space-y-2">
            <p>
              <strong>usePaymentRealtime:</strong> Assina mudanças na tabela manual_payments. Use
              para atualizar dashboards em tempo real.
            </p>
            <p>
              <strong>useConversationRealtime:</strong> Assina novas mensagens e atualizações. Use
              para chats em tempo real.
            </p>
            <p>
              <strong>usePaymentSystemRealtime:</strong> Combina ambos os hooks para uma experiência
              completa do sistema de pagamento.
            </p>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

/**
 * Componente simplificado para mostrar status de conexão
 */
export function RealtimeStatusBadge() {
  const { isConnected, isReconnecting, error } = usePaymentSystemRealtime({
    subscribeToPayments: true,
    subscribeToConversations: true,
  });

  if (isReconnecting) {
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <RefreshCw className="h-3 w-3 animate-spin" />
        Reconectando...
      </Badge>
    );
  }

  if (error) {
    return (
      <Badge variant="destructive" className="flex items-center gap-1">
        <WifiOff className="h-3 w-3" />
        Erro de conexão
      </Badge>
    );
  }

  return (
    <Badge variant={isConnected ? "default" : "secondary"} className="flex items-center gap-1">
      {isConnected ? (
        <>
          <Wifi className="h-3 w-3" />
          Conectado
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3" />
          Desconectado
        </>
      )}
    </Badge>
  );
}
