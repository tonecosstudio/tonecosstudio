import { useState } from "react";
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
  FileText,
  DollarSign,
  HeadphonesIcon,
  CreditCard,
  AlertTriangle,
  AlertCircle,
  Users,
  Clock,
  Package,
  MessageSquare,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type AdminNotification,
  useAdminNotifications,
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
} from "@/hooks/admin/useNotificationCenter";

const iconMap: Record<string, LucideIcon> = {
  FileText,
  DollarSign,
  HeadphonesIcon,
  CreditCard,
  AlertTriangle,
  AlertCircle,
  Users,
  Clock,
  Package,
  MessageSquare,
};

const priorityColors = {
  low: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  medium: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const { toast } = useToast();
  const navigate = useNavigate();

  const { data: notifications = [], isLoading } = useAdminNotifications(filter);
  const markAsReadMutation = useMarkNotificationAsRead();
  const markAllAsReadMutation = useMarkAllNotificationsAsRead();

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate(undefined, {
      onSuccess: (count) => {
        toast({
          title: "Notificações marcadas como lidas",
          description: `${count} notificações foram marcadas como lidas.`,
        });
      },
    });
  };

  const handleNotificationClick = (notification: AdminNotification) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }

    if (notification.action_url) {
      navigate(notification.action_url);
      setIsOpen(false);
    }
  };

  const getIcon = (notification: AdminNotification) => {
    const IconComponent = notification.icon ? iconMap[notification.icon] || Bell : Bell;
    return <IconComponent className="h-4 w-4" />;
  };

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
              className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="font-semibold">Notificações</h3>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={markAllAsReadMutation.isPending}
              >
                <CheckCheck className="mr-1 h-4 w-4" />
                Marcar todas como lidas
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "unread")}>
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
                <div className="flex h-32 items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-muted-foreground flex h-32 flex-col items-center justify-center">
                  <Bell className="mb-2 h-12 w-12 opacity-50" />
                  <p className="text-sm">Nenhuma notificação</p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "cursor-pointer p-4 transition-colors hover:bg-muted/50",
                        !notification.is_read && "bg-muted/30"
                      )}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full",
                            priorityColors[notification.priority]
                          )}
                        >
                          {getIcon(notification)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium">{notification.title}</p>
                            {!notification.is_read && (
                              <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
                            )}
                          </div>
                          <p className="text-muted-foreground mt-1 text-sm">{notification.message}</p>
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-muted-foreground text-xs">
                              {formatTime(notification.created_at)}
                            </span>
                            {notification.priority !== "medium" && (
                              <Badge
                                variant="outline"
                                className={cn("text-xs", priorityColors[notification.priority])}
                              >
                                {notification.priority === "critical"
                                  ? "Crítico"
                                  : notification.priority === "high"
                                    ? "Alta"
                                    : "Baixa"}
                              </Badge>
                            )}
                          </div>
                        </div>
                        {!notification.is_read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsReadMutation.mutate(notification.id);
                            }}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {notifications.length > 0 && (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                navigate("/admin/notificacoes");
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
