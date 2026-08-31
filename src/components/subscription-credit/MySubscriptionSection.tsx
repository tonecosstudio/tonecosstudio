/**
 * My Subscription Section Component
 * Displays subscription status and renewal controls backed by implemented contracts.
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, AlertTriangle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Subscription } from '@/types/subscription-credit-system';
import { NoRenewalDialog } from './NoRenewalDialog';
import { useToast } from '@/hooks/use-toast';
import { useReactivateSubscriptionRenewal } from '@/hooks/subscription/useSubscriptionCreditActions';

interface MySubscriptionSectionProps {
  subscription: Subscription;
}

export function MySubscriptionSection({ subscription }: MySubscriptionSectionProps) {
  const { toast } = useToast();
  const [showNoRenewal, setShowNoRenewal] = useState(false);
  const reactivateRenewalMutation = useReactivateSubscriptionRenewal(subscription.id, {
    onSuccess: () => {
      toast({
        title: "Renovação automática reativada",
        description: "Sua assinatura voltará a renovar no próximo ciclo.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao reativar renovação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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
          <CardDescription>Plano {getPlanLabel(subscription.plan_type)}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {subscription.pending_plan_change && (
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-sm text-yellow-900">
                Existe uma solicitação antiga de mudança para o plano{' '}
                {getPlanLabel(subscription.pending_plan_change)}. A alteração automática está
                temporariamente indisponível até a renovação financeira ser reconciliada.
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
              <span className="text-sm text-muted-foreground block mb-1">
                {subscription.auto_renew ? 'Próxima renovação' : 'Expira em'}
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

          {subscription.status === 'active' && (
            <div className="flex flex-col gap-2 pt-4 border-t">
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
                  onClick={() => reactivateRenewalMutation.mutate()}
                  disabled={reactivateRenewalMutation.isPending}
                >
                  <RefreshCw
                    className={`h-4 w-4 mr-2 ${
                      reactivateRenewalMutation.isPending ? "animate-spin" : ""
                    }`}
                  />
                  {reactivateRenewalMutation.isPending
                    ? "Reativando..."
                    : "Reativar Renovação Automática"}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <NoRenewalDialog
        subscription={subscription}
        isOpen={showNoRenewal}
        onOpenChange={setShowNoRenewal}
      />
    </>
  );
}
