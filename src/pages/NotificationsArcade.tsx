import { useState, type ComponentType } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertCircle,
  Bell,
  Check,
  CheckCheck,
  CheckCircle,
  CreditCard,
  Heart,
  Megaphone,
  MessageSquare,
  Package,
  Search,
  Trash2,
  Truck,
  Users,
} from "lucide-react";
import { ArcadeCard, ArcadeHero } from "@/components/arcade/ArcadeLayout";
import { Page } from "@/components/layouts/Page";
import { BRAND_NAME } from "@/config/brand";
import { Input } from "@/components/ui/input";
import { useUserNotificationCenterData } from "@/hooks/notifications/useUserNotificationCenterData";
import { cn } from "@/lib/utils";
import { isSafeInAppPath } from "@/config/routes";
import type {
  UserNotificationCenterItem,
  UserNotificationFilter,
} from "@/types/notifications";

const iconMap: Record<string, ComponentType<{ className?: string }>> = {
  AlertCircle,
  Bell,
  CheckCircle,
  CreditCard,
  Heart,
  Megaphone,
  MessageSquare,
  Package,
  Truck,
  Users,
};

const filters: UserNotificationFilter[] = ["all", "unread", "read"];

function getFilterLabel(filter: UserNotificationFilter) {
  if (filter === "unread") return "NAO LIDAS";
  if (filter === "read") return "LIDAS";
  return "TODAS";
}

export default function NotificationsArcade() {
  const [filter, setFilter] = useState<UserNotificationFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useUserNotificationCenterData(filter, searchQuery);

  const handleClick = (notification: UserNotificationCenterItem) => {
    if (!notification.is_read) markAsRead(notification.id);
    if (notification.action_url && isSafeInAppPath(notification.action_url)) {
      navigate(notification.action_url);
    }
  };

  const getIcon = (notification: UserNotificationCenterItem) => {
    const Icon = notification.icon ? iconMap[notification.icon] ?? Bell : Bell;
    return <Icon className="w-4 h-4" />;
  };

  return (
    <Page title={`Notificacoes | ${BRAND_NAME}`} description="Historico de notificacoes">
      <ArcadeHero
        badge="COMMS CENTER"
        title="NOTIFICACOES"
        subtitle="CENTRAL DE COMUNICADOS"
        stats={[
          { value: notifications.length, label: "Total" },
          { value: unreadCount, label: "Nao Lidas" },
        ]}
      />

      <section className="max-w-4xl mx-auto px-6 pb-16">
        <ArcadeCard hover={false} className="p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(0,0%,30%)]" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Buscar notificacoes..."
                className="pl-10 bg-[hsl(0,0%,8%)] border-[hsl(0,0%,15%)] text-[hsl(0,0%,90%)] font-mono text-xs"
              />
            </div>
            <div className="flex gap-2">
              {filters.map((item) => (
                <button
                  key={item}
                  onClick={() => setFilter(item)}
                  className={`font-mono text-[9px] px-3 py-1.5 tracking-[0.15em] uppercase border transition-colors ${
                    filter === item
                      ? "border-[hsl(var(--gold-accent))] text-[hsl(var(--gold-accent))] bg-[hsl(var(--gold-accent)/0.1)]"
                      : "border-[hsl(0,0%,15%)] text-[hsl(0,0%,45%)] hover:text-[hsl(0,0%,70%)]"
                  }`}
                >
                  {getFilterLabel(item)}
                </button>
              ))}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="font-mono text-[9px] px-3 py-1.5 tracking-[0.15em] uppercase border border-[hsl(0,0%,15%)] text-[hsl(0,0%,60%)] hover:text-[hsl(var(--gold-accent))] hover:border-[hsl(var(--gold-accent)/0.3)] transition-colors flex items-center gap-1"
              >
                <CheckCheck className="w-3 h-3" /> MARCAR TODAS
              </button>
            )}
          </div>
        </ArcadeCard>

        {isLoading ? (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-2 border-[hsl(var(--gold-accent))] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="font-mono text-xs text-[hsl(0,0%,40%)] tracking-wider">CARREGANDO...</p>
          </div>
        ) : notifications.length === 0 ? (
          <ArcadeCard className="p-12 text-center">
            <Bell className="w-12 h-12 text-[hsl(0,0%,20%)] mx-auto mb-4" />
            <p className="font-mono text-xs text-[hsl(0,0%,45%)] tracking-wider">
              NENHUMA NOTIFICACAO
            </p>
          </ArcadeCard>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification) => (
              <ArcadeCard
                key={notification.id}
                className={cn(
                  "group p-4 cursor-pointer",
                  !notification.is_read && "border-l-2 border-l-[hsl(var(--gold-accent))]",
                )}
                hover
              >
                <div
                  className="flex items-start gap-3"
                  onClick={() => handleClick(notification)}
                >
                  <div
                    className={cn(
                      "w-8 h-8 flex items-center justify-center flex-shrink-0",
                      !notification.is_read
                        ? "text-[hsl(var(--gold-accent))]"
                        : "text-[hsl(0,0%,30%)]",
                    )}
                  >
                    {getIcon(notification)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3
                        className={cn(
                          "font-mono text-xs tracking-wider",
                          !notification.is_read
                            ? "text-[hsl(0,0%,90%)]"
                            : "text-[hsl(0,0%,55%)]",
                        )}
                      >
                        {notification.title}
                      </h3>
                      {!notification.is_read && (
                        <div className="w-1.5 h-1.5 bg-[hsl(var(--gold-accent))] rounded-full" />
                      )}
                    </div>
                    <p className="font-mono text-[10px] text-[hsl(0,0%,40%)] leading-relaxed mb-1">
                      {notification.message}
                    </p>
                    <span className="font-mono text-[9px] text-[hsl(0,0%,30%)]">
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!notification.is_read && (
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          markAsRead(notification.id);
                        }}
                        className="p-1 text-[hsl(0,0%,40%)] hover:text-[hsl(var(--gold-accent))]"
                        aria-label="Marcar como lida"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                      className="p-1 text-[hsl(0,0%,40%)] hover:text-red-400"
                      aria-label="Excluir notificacao"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </ArcadeCard>
            ))}
          </div>
        )}
      </section>
    </Page>
  );
}
