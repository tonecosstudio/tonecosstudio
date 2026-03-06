/**
 * No Renewal Dialog
 * Allows user to disable auto-renewal without immediate cancellation
 */

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RefreshCw, Calendar, AlertTriangle, CheckCircle, Coins } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { Subscription } from "@/types/subscription-credit-system";
import { subscriptionCreditAPI } from "@/services/subscription-credit-api";
import { Checkbox } from "@/components/ui/checkbox";
import { useUserCoins } from "@/hooks/useUserCoins";
import { useAuth } from "@/lib/auth";

interface NoRenewalDialogProps {
  subscription: Subscription;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NoRenewalDialog({ subscription, isOpen, onOpenChange }: NoRenewalDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [confirmed, setConfirmed] = useState(false);
  const { data: coinsData } = useUserCoins(user?.id);

  const noRenewalMutation = useMutation({
    mutationFn: () => subscriptionCreditAPI.setNoRenewal(subscription.id),
    onSuccess: (data) => {
      toast({
        title: "Renovação automática desativada",
        description: `Sua assinatura expirará em ${format(new Date(data.end_date), "dd 'de' MMMM", { locale: ptBR })}`,
      });
      queryClient.invalidateQueries({ queryKey: ["subscription-credit"] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao desativar renovação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleNoRenewal = () => {
    if (!confirmed) {
      toast({
        title: "Confirmação necessária",
        description: "Por favor, confirme que você entende as consequências.",
        variant: "destructive",
      });
      return;
    }
    noRenewalMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Não Renovar Automaticamente
          </DialogTitle>
          <DialogDescription>
            Desative a renovação automática sem perder acesso imediato
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Status */}
          <div className="p-4 rounded-lg border bg-muted/50">
            <div className="text-sm text-muted-foreground mb-1">Plano Atual</div>
            <div className="font-semibold">
              {subscription.plan_type === "trimestral" ? "Trimestral" : "Semestral"}
            </div>
            <div className="text-sm text-muted-foreground">
              Expira em: {format(new Date(subscription.end_date), "dd/MM/yyyy", { locale: ptBR })}
            </div>
          </div>

          {/* What Happens */}
          <Alert className="bg-blue-50 border-blue-200">
            <CheckCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-900 space-y-2">
              <p>
                <strong>O que acontecerá:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>
                  Sua assinatura permanecerá ativa até{" "}
                  {format(new Date(subscription.end_date), "dd 'de' MMMM", { locale: ptBR })}
                </li>
                <li>Seus créditos continuam válidos até essa data</li>
                <li>Você pode continuar usando todos os benefícios</li>
                <li>Não haverá cobrança na próxima renovação</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Coins Warning */}
          {coinsData && coinsData.balance > 0 && (
            <Alert variant="default" className="bg-amber-50 border-amber-200">
              <Coins className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-900 font-semibold mb-2">
                Atenção: Seus Coins Expirarão
              </AlertTitle>
              <AlertDescription className="text-sm text-amber-900 space-y-2">
                <div className="bg-amber-100 p-3 rounded-md border border-amber-300">
                  <div className="flex items-center gap-2 mb-1">
                    <Coins className="h-4 w-4 text-amber-700" />
                    <span className="font-semibold">
                      Você tem {coinsData.balance.toLocaleString("pt-BR")} coins disponíveis
                    </span>
                  </div>
                  <p className="text-xs text-amber-800">
                    Seus coins permanecerão válidos até{" "}
                    <strong>
                      {format(new Date(subscription.end_date), "dd/MM/yyyy", { locale: ptBR })}
                    </strong>
                    . Após essa data, todos os coins não utilizados expirarão automaticamente.
                  </p>
                </div>
                <p className="text-xs">
                  <strong>Importante:</strong> Coins não possuem valor monetário e não são
                  reembolsáveis. Use seus coins antes da data de expiração.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Pending Plan Change Warning */}
          {subscription.pending_plan_change && (
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-sm text-yellow-900">
                <strong>Atenção:</strong> Você tem uma mudança de plano agendada para{" "}
                {subscription.plan_type === "trimestral" ? "Semestral" : "Trimestral"}. Esta mudança
                será cancelada se você desativar a renovação.
              </AlertDescription>
            </Alert>
          )}

          {/* Important Info */}
          <Alert>
            <Calendar className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Sem reembolso:</strong> Esta opção não gera reembolso. Se você deseja receber
              reembolso proporcional, use a opção "Cancelar com Extorno".
            </AlertDescription>
          </Alert>

          {/* Confirmation Checkbox */}
          <div className="flex items-start space-x-2">
            <Checkbox
              id="confirm-no-renewal"
              checked={confirmed}
              onCheckedChange={(checked) => setConfirmed(checked as boolean)}
            />
            <label
              htmlFor="confirm-no-renewal"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Eu entendo que minha assinatura não renovará automaticamente, meus créditos e coins
              expirarão em {format(new Date(subscription.end_date), "dd/MM/yyyy", { locale: ptBR })}
              , e que coins não são reembolsáveis
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleNoRenewal} disabled={!confirmed || noRenewalMutation.isPending}>
            {noRenewalMutation.isPending ? "Processando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
