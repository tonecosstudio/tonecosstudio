import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bell, Check, CheckCheck, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  useAdminNotificationHistory,
  useDeleteAdminNotification,
  useMarkAdminNotificationRead,
  useMarkAllAdminNotificationsRead,
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
  const { toast } = useToast();
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const { data: notifications = [], isLoading } = useAdminNotificationHistory(filter);
  const markAsReadMutation = useMarkAdminNotificationRead();
  const markAllAsReadMutation = useMarkAllAdminNotificationsRead();
  const deleteNotificationMutation = useDeleteAdminNotification();

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const markAllAsRead = () => {
    markAllAsReadMutation.mutate(undefined, {
      onSuccess: () => {
        toast({
          title: "Sucesso",
          description: "Todas as notificacoes foram marcadas como lidas.",
        });
      },
    });
  };

  const deleteNotification = (notificationId: string) => {
    deleteNotificationMutation.mutate(notificationId, {
      onSuccess: () => {
        toast({
          title: "Sucesso",
          description: "Notificacao excluida.",
        });
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Historico de notificacoes</h2>
          <p className="mt-1 text-muted-foreground">
            Visualize e gerencie todas as notificacoes operacionais.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button onClick={markAllAsRead} disabled={markAllAsReadMutation.isPending}>
            <CheckCheck className="mr-2 h-4 w-4" />
            Marcar todas como lidas
          </Button>
        )}
      </div>

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
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
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

                      <div className="flex items-center gap-1">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => markAsReadMutation.mutate(notification.id)}
                            disabled={markAsReadMutation.isPending}
                            title="Marcar como lida"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteNotification(notification.id)}
                          disabled={deleteNotificationMutation.isPending}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
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
