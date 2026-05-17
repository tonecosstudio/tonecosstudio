/**
 * SubscriptionInfo Component
 * Displays active subscription information
 *
 * Requirements: 9.1, 9.2
 */

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Calendar, CheckCircle, XCircle, type LucideIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Subscription } from "@/lib/services/integrationService";

interface SubscriptionInfoProps {
  subscription: Subscription;
}

export function SubscriptionInfo({ subscription }: SubscriptionInfoProps) {
  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: LucideIcon }
    > = {
      active: { label: "Ativa", variant: "default", icon: CheckCircle },
      inactive: { label: "Inativa", variant: "secondary", icon: XCircle },
      cancelled: { label: "Cancelada", variant: "destructive", icon: XCircle },
      suspended: { label: "Suspensa", variant: "destructive", icon: XCircle },
    };

    const config = statusMap[status] || {
      label: status,
      variant: "outline" as const,
      icon: Calendar,
    };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getPlanTypeLabel = (planType: string) => {
    const planMap: Record<string, string> = {
      trimestral: "Trimestral (3 meses)",
      semestral: "Semestral (6 meses)",
      anual: "Anual (12 meses)",
    };
    return planMap[planType] || planType;
  };

  return (
    <div className="space-y-3">
      <Card className="p-3 bg-gradient-to-br from-primary/5 to-primary/10">
        <div className="space-y-3">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status</span>
            {getStatusBadge(subscription.status)}
          </div>

          {/* Plan Type */}
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Plano</span>
            <p className="text-sm font-medium">{getPlanTypeLabel(subscription.plan_type)}</p>
          </div>

          {/* Next Billing Date */}
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Próxima cobrança</span>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">
                {format(new Date(subscription.next_delivery_date), "dd 'de' MMMM 'de' yyyy", {
                  locale: ptBR,
                })}
              </p>
            </div>
          </div>

          {/* Created Date */}
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Assinatura desde</span>
            <p className="text-sm">
              {format(new Date(subscription.created_at), "dd/MM/yyyy", { locale: ptBR })}
            </p>
          </div>
        </div>
      </Card>

      {/* Info Note */}
      <div className="bg-muted p-2 rounded text-xs text-muted-foreground">
        💡 Assinatura ativa com entregas programadas
      </div>
    </div>
  );
}
