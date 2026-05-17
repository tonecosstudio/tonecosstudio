import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import type { DashboardMetrics } from "@/types/support";
import {
  AlertCircle,
  Clock,
  CheckCircle,
  MessageSquare,
  UserCheck,
  Timer,
  AlertTriangle,
  CalendarX,
} from "lucide-react";

export function DashboardMetrics() {
  type ConversationWithOptionalFields = {
    status: string;
    resolved_at: string | null;
    last_message_at: string;
    created_at: string;
    first_response_at: string | null;
    risk_flags?: unknown;
    promised_date?: string | null;
  };

  const [metrics, setMetrics] = useState<DashboardMetrics>({
    open_count: 0,
    waiting_customer_count: 0,
    resolved_today_count: 0,
    total_count: 0,
    overdue_24h_count: 0,
    avg_first_response_minutes: 0,
    conversations_with_risk: 0,
    conversations_overdue_promise: 0,
  });
  const [loading, setLoading] = useState(true);

  const calculateMetrics = useCallback(async () => {
    try {
      setLoading(true);

      // Buscar todas as conversas
      const { data: conversations, error } = await supabase
        .from("support_conversations")
        .select("*");

      if (error) throw error;

      if (!conversations) {
        setLoading(false);
        return;
      }

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // 1. open_count - conversas com status 'waiting_admin'
      const open_count = conversations.filter((c) => c.status === "waiting_admin").length;

      // 2. waiting_customer_count - conversas com status 'waiting_customer'
      const waiting_customer_count = conversations.filter(
        (c) => c.status === "waiting_customer"
      ).length;

      // 3. resolved_today_count - conversas resolvidas hoje
      const resolved_today_count = conversations.filter((c) => {
        if (!c.resolved_at) return false;
        const resolvedDate = new Date(c.resolved_at);
        return resolvedDate >= today;
      }).length;

      // 4. total_count - total de conversas
      const total_count = conversations.length;

      // 5. overdue_24h_count - conversas abertas há mais de 24h (SLA alert)
      const overdue_24h_count = conversations.filter((c) => {
        if (c.status !== "waiting_admin") return false;
        const lastMessageDate = new Date(c.last_message_at);
        return lastMessageDate < twentyFourHoursAgo;
      }).length;

      // 6. avg_first_response_minutes - tempo médio de primeira resposta (últimos 7 dias)
      const recentConversations = conversations.filter((c) => {
        const createdDate = new Date(c.created_at);
        return createdDate >= sevenDaysAgo && c.first_response_at;
      });

      let avg_first_response_minutes = 0;
      if (recentConversations.length > 0) {
        const totalMinutes = recentConversations.reduce((sum, c) => {
          const created = new Date(c.created_at).getTime();
          const firstResponse = new Date(c.first_response_at!).getTime();
          const minutes = (firstResponse - created) / (1000 * 60);
          return sum + minutes;
        }, 0);
        avg_first_response_minutes = Math.round(totalMinutes / recentConversations.length);
      }

      // 7. conversations_with_risk - conversas com risk_flags não vazio
      // Note: risk_flags field will be available after migration 20260221000004_update_support_conversations.sql
      const conversations_with_risk = conversations.filter((c) => {
        const riskFlags = (c as ConversationWithOptionalFields).risk_flags;
        return riskFlags && Array.isArray(riskFlags) && riskFlags.length > 0;
      }).length;

      // 8. conversations_overdue_promise - conversas com promised_date no passado
      // Note: promised_date field will be available after migration 20260221000004_update_support_conversations.sql
      const conversations_overdue_promise = conversations.filter((c) => {
        const promisedDate = (c as ConversationWithOptionalFields).promised_date;
        if (!promisedDate) return false;
        const promised = new Date(promisedDate);
        return promised < now && c.status !== "resolved" && c.status !== "closed";
      }).length;

      setMetrics({
        open_count,
        waiting_customer_count,
        resolved_today_count,
        total_count,
        overdue_24h_count,
        avg_first_response_minutes,
        conversations_with_risk,
        conversations_overdue_promise,
      });
    } catch (error) {
      console.error("Erro ao calcular métricas:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    calculateMetrics();

    // Configurar Realtime para atualizar métricas em tempo real
    const channel = supabase
      .channel("dashboard_metrics_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_conversations",
        },
        () => {
          // Recalcular métricas quando houver mudanças
          calculateMetrics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [calculateMetrics]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Conversas Abertas (Aguardando Admin) */}
      <MetricCard
        title="Aguardando Resposta"
        value={metrics.open_count}
        icon={<AlertCircle className="h-4 w-4" />}
        variant={metrics.open_count > 0 ? "warning" : "default"}
        description="Conversas aguardando admin"
      />

      {/* Aguardando Cliente */}
      <MetricCard
        title="Aguardando Cliente"
        value={metrics.waiting_customer_count}
        icon={<UserCheck className="h-4 w-4" />}
        variant="default"
        description="Conversas aguardando cliente"
      />

      {/* Resolvidas Hoje */}
      <MetricCard
        title="Resolvidas Hoje"
        value={metrics.resolved_today_count}
        icon={<CheckCircle className="h-4 w-4" />}
        variant="success"
        description="Conversas resolvidas hoje"
      />

      {/* Total de Conversas */}
      <MetricCard
        title="Total de Conversas"
        value={metrics.total_count}
        icon={<MessageSquare className="h-4 w-4" />}
        variant="default"
        description="Todas as conversas"
      />

      {/* SLA: Conversas > 24h */}
      <MetricCard
        title="SLA: Atrasadas (>24h)"
        value={metrics.overdue_24h_count}
        icon={<Clock className="h-4 w-4" />}
        variant={metrics.overdue_24h_count > 0 ? "danger" : "success"}
        description="Conversas abertas há mais de 24h"
        highlight={metrics.overdue_24h_count > 0}
      />

      {/* Tempo Médio de Primeira Resposta */}
      <MetricCard
        title="Tempo Médio Resposta"
        value={`${metrics.avg_first_response_minutes}min`}
        icon={<Timer className="h-4 w-4" />}
        variant="default"
        description="Média últimos 7 dias"
      />

      {/* Conversas com Risco */}
      <MetricCard
        title="Conversas com Risco"
        value={metrics.conversations_with_risk}
        icon={<AlertTriangle className="h-4 w-4" />}
        variant={metrics.conversations_with_risk > 0 ? "danger" : "default"}
        description="Com flags de risco"
        highlight={metrics.conversations_with_risk > 0}
      />

      {/* Promessas Atrasadas */}
      <MetricCard
        title="Promessas Atrasadas"
        value={metrics.conversations_overdue_promise}
        icon={<CalendarX className="h-4 w-4" />}
        variant={metrics.conversations_overdue_promise > 0 ? "danger" : "default"}
        description="Prazos prometidos vencidos"
        highlight={metrics.conversations_overdue_promise > 0}
      />
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  variant: "default" | "success" | "warning" | "danger";
  description: string;
  highlight?: boolean;
}

function MetricCard({
  title,
  value,
  icon,
  variant,
  description,
  highlight = false,
}: MetricCardProps) {
  const variantStyles = {
    default: "text-foreground",
    success: "text-green-600 dark:text-green-400",
    warning: "text-yellow-600 dark:text-yellow-400",
    danger: "text-red-600 dark:text-red-400",
  };

  const badgeVariants = {
    default: "secondary" as const,
    success: "secondary" as const,
    warning: "default" as const,
    danger: "destructive" as const,
  };

  return (
    <Card className={highlight ? "border-red-500 border-2" : ""}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Badge
          variant={badgeVariants[variant]}
          className="h-6 w-6 p-0 flex items-center justify-center"
        >
          {icon}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${variantStyles[variant]}`}>{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}
