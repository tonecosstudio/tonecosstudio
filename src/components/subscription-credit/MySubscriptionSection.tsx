/**
 * My Subscription Section Component
 * Displays only persisted subscription state while financial renewal is unavailable.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Subscription } from '@/types/subscription-credit-system';

interface MySubscriptionSectionProps {
  subscription: Subscription;
}

export function MySubscriptionSection({ subscription }: MySubscriptionSectionProps) {
  const getPlanLabel = (planType: string) => {
    return planType === 'trimestral' ? 'Trimestral' : 'Semestral';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Ativa</Badge>;
      case 'expired':
        return <Badge variant="secondary">Expirada</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Minha Assinatura</CardTitle>
          {getStatusBadge(subscription.status)}
        </div>
        <CardDescription>Plano {getPlanLabel(subscription.plan_type)}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-sm text-yellow-900">
            Alterações de plano e renovação automática estão temporariamente indisponíveis enquanto
            o fluxo financeiro é reconciliado. Seus dados atuais permanecem somente para consulta.
          </AlertDescription>
        </Alert>

        {subscription.pending_plan_change && (
          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-sm text-yellow-900">
              Existe uma solicitação antiga de mudança para o plano{' '}
              {getPlanLabel(subscription.pending_plan_change)}. Ela não será tratada como efetivada
              sem uma renovação financeira comprovada.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-muted-foreground block mb-1">Início</span>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {format(new Date(subscription.start_date), 'dd/MM/yyyy', { locale: ptBR })}
              </span>
            </div>
          </div>
          <div>
            <span className="text-sm text-muted-foreground block mb-1">Término atual</span>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {format(new Date(subscription.end_date), 'dd/MM/yyyy', { locale: ptBR })}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
