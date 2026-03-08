import { ArcadePage, ArcadeHero, ArcadeCard, ArcadeSectionTitle } from "@/components/arcade/ArcadeLayout";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Bell, Check, CheckCheck, Package, Truck, CheckCircle,
  CreditCard, AlertCircle, Users, MessageSquare, Heart,
  Megaphone, Trash2, Search
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { UserNotification } from "@/hooks/useUserNotifications";

const iconMap: Record<string, any> = {
  Package, Truck, CheckCircle, CreditCard, AlertCircle, Users, MessageSquare, Heart, Megaphone, Bell
};

export default function NotificationsArcade() {
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["user-notifications-history", filter, searchQuery],
    queryFn: async () => {
      let query = supabase.from("user_notifications").select("*").order("created_at", { ascending: false });
      if (filter === "unread") query = query.eq("is_read", false);
      else if (filter === "read") query = query.eq("is_read", true);
      if (searchQuery) query = query.or(`title.ilike.%${searchQuery}%,message.ilike.%${searchQuery}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data as UserNotification[];
    },
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("mark_user_notification_read", { p_notification_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-notifications-history"] });
      qc.invalidateQueries({ queryKey: ["user-notifications-unread"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("mark_all_user_notifications_read");
      if (error) throw error;
      return data;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ["user-notifications-history"] });
      qc.invalidateQueries({ queryKey: ["user-notifications-unread"] });
      toast({ title: "Notificações marcadas como lidas", description: `${count} atualizadas.` });
    },
  });

  const deleteNotification = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("delete_user_notification", { p_notification_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-notifications-history"] });
      qc.invalidateQueries({ queryKey: ["user-notifications-unread"] });
    },
  });

  const handleClick = (n: UserNotification) => {
    if (!n.is_read) markAsRead.mutate(n.id);
    if (n.action_url) navigate(n.action_url);
  };

  const getIcon = (n: UserNotification) => {
    const I = n.icon ? (iconMap[n.icon] || Bell) : Bell;
    return <I className="w-4 h-4" />;
  };

  return (
    <ArcadePage title="Notificações | ORDAX" description="Histórico de notificações">
      <ArcadeHero
        badge="COMMS CENTER"
        title="NOTIFICAÇÕES"
        subtitle="CENTRAL DE COMUNICADOS"
        stats={[
          { value: notifications.length, label: "Total" },
          { value: unreadCount, label: "Não Lidas" },
        ]}
      />

      <section className="max-w-4xl mx-auto px-6 pb-16">
        {/* Search & Filters */}
        <ArcadeCard hover={false} className="p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(0,0%,30%)]" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar notificações..."
                className="pl-10 bg-[hsl(0,0%,8%)] border-[hsl(0,0%,15%)] text-[hsl(0,0%,90%)] font-mono text-xs"
              />
            </div>
            <div className="flex gap-2">
              {(["all", "unread", "read"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`font-mono text-[9px] px-3 py-1.5 tracking-[0.15em] uppercase border transition-colors ${
                    filter === f
                      ? "border-[hsl(var(--gold-accent))] text-[hsl(var(--gold-accent))] bg-[hsl(var(--gold-accent)/0.1)]"
                      : "border-[hsl(0,0%,15%)] text-[hsl(0,0%,45%)] hover:text-[hsl(0,0%,70%)]"
                  }`}
                >
                  {f === "all" ? "TODAS" : f === "unread" ? "NÃO LIDAS" : "LIDAS"}
                </button>
              ))}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="font-mono text-[9px] px-3 py-1.5 tracking-[0.15em] uppercase border border-[hsl(0,0%,15%)] text-[hsl(0,0%,60%)] hover:text-[hsl(var(--gold-accent))] hover:border-[hsl(var(--gold-accent)/0.3)] transition-colors flex items-center gap-1"
              >
                <CheckCheck className="w-3 h-3" /> MARCAR TODAS
              </button>
            )}
          </div>
        </ArcadeCard>

        {/* Notifications List */}
        {isLoading ? (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-2 border-[hsl(var(--gold-accent))] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="font-mono text-xs text-[hsl(0,0%,40%)] tracking-wider">CARREGANDO...</p>
          </div>
        ) : notifications.length === 0 ? (
          <ArcadeCard className="p-12 text-center">
            <Bell className="w-12 h-12 text-[hsl(0,0%,20%)] mx-auto mb-4" />
            <p className="font-mono text-xs text-[hsl(0,0%,45%)] tracking-wider">NENHUMA NOTIFICAÇÃO</p>
          </ArcadeCard>
        ) : (
          <div className="space-y-2">
            {notifications.map(n => (
              <ArcadeCard
                key={n.id}
                className={cn("p-4 cursor-pointer", !n.is_read && "border-l-2 border-l-[hsl(var(--gold-accent))]")}
                hover
              >
                <div className="flex items-start gap-3" onClick={() => handleClick(n)}>
                  <div className={cn(
                    "w-8 h-8 flex items-center justify-center flex-shrink-0",
                    !n.is_read ? "text-[hsl(var(--gold-accent))]" : "text-[hsl(0,0%,30%)]"
                  )}>
                    {getIcon(n)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={cn("font-mono text-xs tracking-wider", !n.is_read ? "text-[hsl(0,0%,90%)]" : "text-[hsl(0,0%,55%)]")}>
                        {n.title}
                      </h3>
                      {!n.is_read && <div className="w-1.5 h-1.5 bg-[hsl(var(--gold-accent))] rounded-full" />}
                    </div>
                    <p className="font-mono text-[10px] text-[hsl(0,0%,40%)] leading-relaxed mb-1">{n.message}</p>
                    <span className="font-mono text-[9px] text-[hsl(0,0%,30%)]">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!n.is_read && (
                      <button onClick={e => { e.stopPropagation(); markAsRead.mutate(n.id); }} className="p-1 text-[hsl(0,0%,40%)] hover:text-[hsl(var(--gold-accent))]">
                        <Check className="w-3 h-3" />
                      </button>
                    )}
                    <button onClick={e => { e.stopPropagation(); deleteNotification.mutate(n.id); }} className="p-1 text-[hsl(0,0%,40%)] hover:text-red-400">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </ArcadeCard>
            ))}
          </div>
        )}
      </section>
    </ArcadePage>
  );
}
