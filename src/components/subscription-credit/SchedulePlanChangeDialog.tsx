/**
 * Schedule Plan Change Dialog
 * Allows user to schedule upgrade/downgrade for next renewal
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, TrendingDown, Calendar, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Subscription, PlanType } from '@/types/subscription-credit-system';
import { useScheduleSubscriptionPlanChange } from '@/hooks/subscription/useSubscriptionCreditActions';

interface SchedulePlanChangeDialogProps {
  subscription: Subscription;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SchedulePlanChangeDialog({
  subscription,
  isOpen,
  onOpenChange,
}: SchedulePlanChangeDialogProps) {
  const { toast } = useToast();
  const newPlanType: PlanType = subscription.plan_type === 'trimestral' ? 'semestral' : 'trimestral';
  const isUpgrade = newPlanType === 'semestral';

  const scheduleMutation = useScheduleSubscriptionPlanChange(subscription.id, newPlanType, {
    onSuccess: (data) => {
      toast({
        title: 'Mudança agendada com sucesso!',
        description: `Seu plano será alterado em ${format(new Date(data.effective_date), "dd 'de' MMMM", { locale: ptBR })}`,
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao agendar mudança',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSchedule = () => {
    scheduleMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isUpgrade ? (
              <TrendingUp className="h-5 w-5 text-green-500" />
            ) : (
              <TrendingDown className="h-5 w-5 text-orange-500" />
            )}
            {isUpgrade ? 'Fazer Upgrade' : 'Fazer Downgrade'}
          </DialogTitle>
          <DialogDescription>
            Agende a mudança do seu plano para a próxima renovação
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Plan */}
          <div className="p-4 rounded-lg border bg-muted/50">
            <div className="text-sm text-muted-foreground mb-1">Plano Atual</div>
            <div className="font-semibold">
              {subscription.plan_type === 'trimestral' ? 'Trimestral' : 'Semestral'}
            </div>
            <div className="text-sm text-muted-foreground">
              {subscription.plan_type === 'trimestral' ? '600 créditos' : '1.400 créditos'}
            </div>
          </div>

          {/* Arrow */}
          <div className="text-center">
            {isUpgrade ? (
              <TrendingUp className="h-6 w-6 mx-auto text-green-500" />
            ) : (
              <TrendingDown className="h-6 w-6 mx-auto text-orange-500" />
            )}
          </div>

          {/* New Plan */}
          <div className="p-4 rounded-lg border bg-primary/5 border-primary">
            <div className="text-sm text-muted-foreground mb-1">Novo Plano</div>
            <div className="font-semibold">{newPlanType === 'trimestral' ? 'Trimestral' : 'Semestral'}</div>
            <div className="text-sm text-muted-foreground">
              {newPlanType === 'trimestral' ? '600 créditos' : '1.400 créditos (1.200 + 200 bônus)'}
            </div>
          </div>

          {/* Effective Date */}
          {subscription.next_billing_date && (
            <Alert>
              <Calendar className="h-4 w-4" />
              <AlertDescription>
                A mudança entrará em vigor na sua próxima renovação:{' '}
                <strong>
                  {format(new Date(subscription.next_billing_date), "dd 'de' MMMM 'de' yyyy", {
                    locale: ptBR,
                  })}
                </strong>
              </AlertDescription>
            </Alert>
          )}

          {/* Important Info */}
          <Alert className="bg-blue-50 border-blue-200">
            <AlertTriangle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-900">
              <strong>Importante:</strong> Seu plano atual permanecerá ativo até a data de renovação.
              Os créditos atuais continuam disponíveis.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSchedule} disabled={scheduleMutation.isPending}>
            {scheduleMutation.isPending ? 'Agendando...' : 'Confirmar Mudança'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
