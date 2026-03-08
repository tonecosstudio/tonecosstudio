/**
 * My Subscription Section Component
 * Displays subscription status, plan info, and action buttons
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, TrendingUp, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Subscription } from '@/types/subscription-credit-system';
import { SchedulePlanChangeDialog } from './SchedulePlanChangeDialog';
import { CancelWithRefundDialog } from './CancelWithRefundDialog';
import { NoRenewalDialog } from './NoRenewalDialog';

interface MySubscriptionSectionProps {
  subscription: Subscription;
}

export function MySubscriptionSection({ subscription }: MySubscriptionSectionProps) {
  const [showPlanChange, setShowPlanChange] = useState(false);
  const [showCancelRefund, setShowCancelRefund] = useState(false);
  const [showNoRenewal, setShowNoRenewal] = useState(false);

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
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Minha Assinatura</CardTitle>
            {getStatusBadge(subscription.status)}
          </div>
          <CardDescription>
            Plano {getPlanLabel(subscription.plan_type)}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Pending Plan Change Alert */}
          {subscription.pending_plan_change && subscription.next_billing_date && (
            <Alert className="bg-blue-50 border-blue-200">
              <AlertTriangle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-900">
                <strong>Mudança agendada:</strong> Seu plano será alterado para{' '}
                {getPlanLabel(subscription.pending_plan_change)} em{' '}
                {format(new Date(subscription.next_billing_date), "dd 'de' MMMM 'de' yyyy", {
                  locale: ptBR,
                })}
              </AlertDescription>
            </Alert>
          )}

          {/* Subscription Dates */}
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
              <span className="text-sm text-muted-foreground block mb-1">
                {subscription.auto_renew ? 'Próxima cobrança' : 'Expira em'}
              </span>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {format(
                    new Date(subscription.next_billing_date || subscription.end_date),
                    'dd/MM/yyyy',
                    { locale: ptBR }
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* No Renewal Warning */}
          {!subscription.auto_renew && subscription.status === 'active' && (
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-sm text-yellow-900">
                <strong>Não renovará:</strong> Sua assinatura expirará em{' '}
                {format(new Date(subscription.end_date), "dd 'de' MMMM", { locale: ptBR })}. Seus
                créditos permanecem válidos até essa data.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          {subscription.status === 'active' && (
            <div className="flex flex-col gap-2 pt-4 border-t">
              {/* Schedule Plan Change */}
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setShowPlanChange(true)}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                {subscription.plan_type === 'trimestral'
                  ? 'Fazer Upgrade para Semestral'
                  : 'Fazer Downgrade para Trimestral'}
              </Button>

              {/* Cancel with Refund */}
              <Button
                variant="outline"
                className="w-full justify-start text-destructive hover:text-destructive"
                onClick={() => setShowCancelRefund(true)}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancelar com Extorno
              </Button>

              {/* No Renewal */}
              {subscription.auto_renew ? (
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => setShowNoRenewal(true)}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Não Renovar Automaticamente
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    // TODO: Implement reactivate renewal
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reativar Renovação Automática
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <SchedulePlanChangeDialog
        subscription={subscription}
        isOpen={showPlanChange}
        onOpenChange={setShowPlanChange}
      />
      <CancelWithRefundDialog
        subscription={subscription}
        isOpen={showCancelRefund}
        onOpenChange={setShowCancelRefund}
      />
      <NoRenewalDialog
        subscription={subscription}
        isOpen={showNoRenewal}
        onOpenChange={setShowNoRenewal}
      />
    </>
  );
}
