import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { useSupportDashboardMetrics } from "@/hooks/admin/useSupportDashboardMetrics";

export function DashboardMetrics() {
  const { metrics, loading } = useSupportDashboardMetrics();

  if (loading) {
    return (
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-4 animate-pulse rounded bg-muted" />
            </CardHeader>
            <CardContent>
              <div className="h-8 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Aguardando Resposta"
        value={metrics.open_count}
        icon={<AlertCircle className="h-4 w-4" />}
        variant={metrics.open_count > 0 ? "warning" : "default"}
        description="Conversas aguardando admin"
      />
      <MetricCard
        title="Aguardando Cliente"
        value={metrics.waiting_customer_count}
        icon={<UserCheck className="h-4 w-4" />}
        variant="default"
        description="Conversas aguardando cliente"
      />
      <MetricCard
        title="Resolvidas Hoje"
        value={metrics.resolved_today_count}
        icon={<CheckCircle className="h-4 w-4" />}
        variant="success"
        description="Conversas resolvidas hoje"
      />
      <MetricCard
        title="Total de Conversas"
        value={metrics.total_count}
        icon={<MessageSquare className="h-4 w-4" />}
        variant="default"
        description="Todas as conversas"
      />
      <MetricCard
        title="SLA: Atrasadas (>24h)"
        value={metrics.overdue_24h_count}
        icon={<Clock className="h-4 w-4" />}
        variant={metrics.overdue_24h_count > 0 ? "danger" : "success"}
        description="Conversas abertas há mais de 24h"
        highlight={metrics.overdue_24h_count > 0}
      />
      <MetricCard
        title="Tempo Médio Resposta"
        value={`${metrics.avg_first_response_minutes}min`}
        icon={<Timer className="h-4 w-4" />}
        variant="default"
        description="Média últimos 7 dias"
      />
      <MetricCard
        title="Conversas com Risco"
        value={metrics.conversations_with_risk}
        icon={<AlertTriangle className="h-4 w-4" />}
        variant={metrics.conversations_with_risk > 0 ? "danger" : "default"}
        description="Com flags de risco"
        highlight={metrics.conversations_with_risk > 0}
      />
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

function MetricCard({ title, value, icon, variant, description, highlight = false }: MetricCardProps) {
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
    <Card className={highlight ? "border-2 border-red-500" : ""}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Badge
          variant={badgeVariants[variant]}
          className="flex h-6 w-6 items-center justify-center p-0"
        >
          {icon}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${variantStyles[variant]}`}>{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
