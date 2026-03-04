// @ts-nocheck
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Bell,
  Check,
  CheckCheck,
  Package,
  DollarSign,
  Truck,
  CheckCircle,
  CreditCard,
  AlertCircle,
  Users,
  MessageSquare,
  Heart,
  TrendingDown,
  Megaphone,
  Trash2,
  Search,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserNotification } from "@/hooks/useUserNotifications";

const iconMap: Record<string, any> = {
  Package,
  DollarSign,
  Truck,
  CheckCircle,
  CreditCard,
  AlertCircle,
  Users,
  MessageSquare,
  Heart,
  TrendingDown,
  Megaphone,
  Bell,
};

const priorityColors = {
  low: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  medium: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default function NotificationHistory() {
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Buscar notificações
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["user-notifications-history", filter, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("user_notifications")
        .select("*")
        .order("created_at", { ascending: false });

      if (filter === "unread") {
        query = query.eq("is_read", false);
      } else if (filter === "read") {
        query = query.eq("is_read", true);
      }

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,message.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as UserNotification[];
    },
  });

  // Contar notificações não lidas
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Mutation para marcar como lida
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase.rpc("mark_user_notification_read", {
        p_notification_id: notificationId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-notifications-history"] });
      queryClient.invalidateQueries({ queryKey: ["user-notifications-unread"] });
    },
  });

  // Mutation para marcar todas como lidas
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("mark_all_user_notifications_read");

      if (error) throw error;
      return data;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["user-notifications-history"] });
      queryClient.invalidateQueries({ queryKey: ["user-notifications-unread"] });
      toast({
        title: "Notificações marcadas como lidas",
        description: `${count} notificações foram marcadas como lidas.`,
      });
    },
  });

  // Mutation para deletar notificação
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase.rpc("delete_user_notification", {
        p_notification_id: notificationId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-notifications-history"] });
      queryClient.invalidateQueries({ queryKey: ["user-notifications-unread"] });
      toast({
        title: "Notificação removida",
      });
    },
  });

  // Lidar com clique na notificação
  const handleNotificationClick = (notification: UserNotification) => {
    // Marcar como lida
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }

    // Navegar para a URL de ação
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  // Obter ícone da notificação
  const getIcon = (notification: UserNotification) => {
    const IconComponent = notification.icon ? iconMap[notification.icon] || Bell : Bell;
    return <IconComponent className="h-5 w-5" />;
  };

  // Formatar tempo relativo
  const formatTime = (date: string) => {
    return formatDistanceToNow(new Date(date), {
      addSuffix: true,
      locale: ptBR,
    });
  };

  return (
    <AppShell>
      <SEOHead title="Notificações" description="Histórico de notificações" />

      <div className="container max-w-4xl py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Bell className="h-8 w-8" />
              Notificações
            </h1>
            <p className="text-muted-foreground mt-1">
              Acompanhe todas as suas notificações
            </p>
          </div>

          {unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Marcar todas como lidas
            </Button>
          )}
        </div>

        {/* Busca */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar notificações..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">
              Todas ({notifications.length})
            </TabsTrigger>
            <TabsTrigger value="unread">
              Não lidas ({unreadCount})
            </TabsTrigger>
            <TabsTrigger value="read">
              Lidas ({notifications.length - unreadCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={filter} className="space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : notifications.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <Bell className="h-16 w-16 mb-4 opacity-50" />
                  <p className="text-lg font-medium">Nenhuma notificação encontrada</p>
                  <p className="text-sm">
                    {searchQuery
                      ? "Tente buscar por outros termos"
                      : "Você não tem notificações no momento"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={cn(
                    "transition-all hover:shadow-md cursor-pointer group",
                    !notification.is_read && "border-l-4 border-l-blue-500"
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Ícone */}
                      <div
                        className={cn(
                          "h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0",
                          priorityColors[notification.priority]
                        )}
                      >
                        {getIcon(notification)}
                      </div>

                      {/* Conteúdo */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-base">{notification.title}</h3>
                          {!notification.is_read && (
                            <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-xs text-muted-foreground">
                            {formatTime(notification.created_at)}
                          </span>
                          {notification.priority !== "medium" && (
                            <Badge
                              variant="outline"
                              className={cn("text-xs", priorityColors[notification.priority])}
                            >
                              {notification.priority === "critical"
                                ? "Urgente"
                                : notification.priority === "high"
                                  ? "Importante"
                                  : "Info"}
                            </Badge>
                          )}
                        </div>

                        {/* Botão de ação */}
                        {notification.action_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3"
                            onClick={() => handleNotificationClick(notification)}
                          >
                            {notification.action_label || "Ver detalhes"}
                          </Button>
                        )}
                      </div>

                      {/* Ações */}
                      <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notification.is_read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsReadMutation.mutate(notification.id);
                            }}
                            title="Marcar como lida"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotificationMutation.mutate(notification.id);
                          }}
                          title="Deletar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
