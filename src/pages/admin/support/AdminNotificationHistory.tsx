import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bell, Check, CheckCheck, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  deleteAdminNotification,
  fetchAdminNotificationsHistory,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  type NotificationFilter,
  type NotificationType,
  type NotificationPriority,
} from "@/services/admin/admin-notifications-service";

const notificationLabels: Record<NotificationType, string> = {
  new_quote: "Novo Orçamento",
  quote_approved: "Orçamento Aprovado",
  payment_received: "Pagamento Recebido",
  payment_failed: "Pagamento Falhou",
  new_subscription: "Nova Assinatura",
  subscription_cancelled: "Assinatura Cancelada",
  support_ticket: "Ticket de Suporte",
  low_stock: "Estoque Baixo",
  system_error: "Erro no Sistema",
  user_registered: "Novo Usuário",
};

const priorityColors: Record<NotificationPriority, string> = {
  low: "bg-gray-500",
  medium: "bg-blue-500",
  high: "bg-orange-500",
  urgent: "bg-red-500",
};

export default function AdminNotificationHistory() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<NotificationFilter>("all");

  // Buscar todas as notificações
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["admin-notifications-history", filter],
    queryFn: async () => {
      return fetchAdminNotificationsHistory(filter);
    },
  });

  // Marcar como lida
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await markAdminNotificationRead(notificationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications-history"] });
    },
  });

  // Marcar todas como lidas
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await markAllAdminNotificationsRead();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications-history"] });
      toast({
        title: "Sucesso",
        description: "Todas as notificações foram marcadas como lidas",
      });
    },
  });

  // Deletar notificação
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await deleteAdminNotification(notificationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications-history"] });
      toast({
        title: "Sucesso",
        description: "Notificação deletada",
      });
    },
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Histórico de Notificações</h2>
          <p className="text-muted-foreground mt-1">
            Visualize e gerencie todas as notificações do sistema
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Marcar Todas como Lidas
          </Button>
        )}
      </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notificações
                {unreadCount > 0 && <Badge variant="destructive">{unreadCount}</Badge>}
              </CardTitle>
              <Tabs value={filter} onValueChange={(v) => setFilter(v as NotificationFilter)}>
                <TabsList>
                  <TabsTrigger value="all">Todas</TabsTrigger>
                  <TabsTrigger value="unread">Não Lidas</TabsTrigger>
                  <TabsTrigger value="read">Lidas</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando notificações...
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma notificação encontrada</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "flex items-start gap-3 p-4 rounded-lg border transition-colors",
                      notification.read ? "bg-background" : "bg-muted/50 border-primary/20"
                    )}
                  >
                    {/* Indicador de prioridade */}
                    <div
                      className={cn(
                        "w-1 h-full rounded-full flex-shrink-0",
                        priorityColors[notification.priority]
                      )}
                    />

                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {notificationLabels[notification.type]}
                            </Badge>
                            {!notification.read && (
                              <Badge variant="default" className="text-xs">
                                Nova
                              </Badge>
                            )}
                          </div>
                          <h4 className="font-medium">{notification.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatDistanceToNow(new Date(notification.created_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </p>
                        </div>

                        {/* Ações */}
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
                            onClick={() => deleteNotificationMutation.mutate(notification.id)}
                            disabled={deleteNotificationMutation.isPending}
                            title="Deletar"
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
