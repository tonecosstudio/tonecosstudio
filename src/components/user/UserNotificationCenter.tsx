// @ts-nocheck
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  X,
  Trash2,
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

export function UserNotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Buscar notificações
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["user-notifications", filter],
    queryFn: async () => {
      let query = supabase
        .from("user_notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (filter === "unread") {
        query = query.eq("is_read", false);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as UserNotification[];
    },
    refetchInterval: 30000, // Refetch a cada 30 segundos
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
      queryClient.invalidateQueries({ queryKey: ["user-notifications"] });
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
      queryClient.invalidateQueries({ queryKey: ["user-notifications"] });
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
      queryClient.invalidateQueries({ queryKey: ["user-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["user-notifications-unread"] });
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
      setIsOpen(false);
    }
  };

  // Obter ícone da notificação
  const getIcon = (notification: UserNotification) => {
    const IconComponent = notification.icon ? iconMap[notification.icon] || Bell : Bell;
    return <IconComponent className="h-4 w-4" />;
  };

  // Formatar tempo relativo
  const formatTime = (date: string) => {
    return formatDistanceToNow(new Date(date), {
      addSuffix: true,
      locale: ptBR,
    });
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notificações</h3>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                Marcar todas
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
          <TabsList className="w-full rounded-none border-b">
            <TabsTrigger value="all" className="flex-1">
              Todas
            </TabsTrigger>
            <TabsTrigger value="unread" className="flex-1">
              Não lidas ({unreadCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={filter} className="m-0">
            <ScrollArea className="h-[400px]">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <Bell className="h-12 w-12 mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma notificação</p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "p-4 transition-colors hover:bg-muted/50 group",
                        !notification.is_read && "bg-muted/30"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {/* Ícone */}
                        <div
                          className={cn(
                            "h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0",
                            priorityColors[notification.priority]
                          )}
                        >
                          {getIcon(notification)}
                        </div>

                        {/* Conteúdo */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-sm">{notification.title}</p>
                            {!notification.is_read && (
                              <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
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
                              className="mt-3 w-full"
                              onClick={() => handleNotificationClick(notification)}
                            >
                              {notification.action_label || "Ver detalhes"}
                            </Button>
                          )}
                        </div>

                        {/* Ações */}
                        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!notification.is_read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
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
                            className="h-8 w-8 text-destructive hover:text-destructive"
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
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {notifications.length > 0 && (
          <div className="p-2 border-t">
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                navigate("/notificacoes");
                setIsOpen(false);
              }}
            >
              Ver todas as notificações
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
