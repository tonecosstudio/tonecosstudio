import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  useAdminNotificationHistory,
  type NotificationFilter,
  type NotificationPriority,
  type NotificationType,
} from "@/hooks/admin/useAdminNotificationManagement";

const notificationLabels: Partial<Record<NotificationType, string>> = {
  new_quote: "Novo orcamento",
  quote_approved: "Orcamento aprovado",
  payment_received: "Pagamento recebido",
  payment_failed: "Pagamento falhou",
  new_subscription: "Nova assinatura",
  subscription_cancelled: "Assinatura cancelada",
  support_ticket: "Ticket de suporte",
  low_stock: "Estoque baixo",
  system_error: "Erro no sistema",
  user_registered: "Novo usuario",
};

const priorityColors: Record<NotificationPriority, string> = {
  low: "bg-gray-500",
  medium: "bg-blue-500",
  high: "bg-orange-500",
  urgent: "bg-red-500",
};

function getNotificationLabel(type: NotificationType): string {
  return notificationLabels[type] ?? type.split("_").join(" ");
}

export default function AdminNotificationHistory() {
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const { data: notifications = [], isLoading, isError, error } = useAdminNotificationHistory(filter);

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Historico de notificacoes</h2>
        <p className="mt-1 text-muted-foreground">
          Visualize as notificacoes operacionais registradas pelo sistema.
        </p>
      </div>

      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardContent className="flex gap-3 pt-6 text-sm">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
          <div>
            <p className="font-medium">Gerenciamento de notificacoes temporariamente somente leitura</p>
            <p className="mt-1 text-muted-foreground">
              Marcar como lida e excluir estao bloqueados ate a autoridade de mutacao do banco ser
              reconciliada. O historico continua disponivel para consulta.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificacoes
              {unreadCount > 0 && <Badge variant="destructive">{unreadCount}</Badge>}
            </CardTitle>

            <Tabs value={filter} onValueChange={(value) => setFilter(value as NotificationFilter)}>
              <TabsList>
                <TabsTrigger value="all">Todas</TabsTrigger>
                <TabsTrigger value="unread">Nao lidas</TabsTrigger>
                <TabsTrigger value="read">Lidas</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Carregando notificacoes...</div>
          ) : isError ? (
            <div className="py-8 text-center">
              <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-destructive" aria-hidden="true" />
              <p className="font-medium">Nao foi possivel carregar as notificacoes</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {error instanceof Error ? error.message : "Falha inesperada ao consultar o historico."}
              </p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Bell className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p>Nenhuma notificacao encontrada</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-4 transition-colors",
                    notification.read ? "bg-background" : "border-primary/20 bg-muted/50"
                  )}
                >
                  <div
                    className={cn(
                      "h-full w-1 flex-shrink-0 rounded-full",
                      priorityColors[notification.priority]
                    )}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {getNotificationLabel(notification.type)}
                      </Badge>
                      {!notification.read && (
                        <Badge variant="default" className="text-xs">
                          Nova
                        </Badge>
                      )}
                    </div>

                    <h4 className="font-medium">{notification.title}</h4>
                    <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
