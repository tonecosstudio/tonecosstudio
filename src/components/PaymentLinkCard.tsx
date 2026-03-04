// @ts-nocheck
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, Copy, Check, CheckCircle2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface PaymentLinkCardProps {
  quoteId: string;
  amount: number;
  paymentLink?: string | null;
  pixKey?: string | null;
  instructions?: string | null;
  paymentLinkSentAt?: string | null;
  customerPaidNotificationAt?: string | null;
}

export function PaymentLinkCard({
  quoteId,
  amount,
  paymentLink,
  pixKey,
  instructions,
  paymentLinkSentAt,
  customerPaidNotificationAt,
}: PaymentLinkCardProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [copiedPix, setCopiedPix] = useState(false);

  const notifyPaidMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("quotes")
        .update({
          customer_paid_notification_at: new Date().toISOString(),
        })
        .eq("id", quoteId);

      if (error) throw error;

      // Criar notificação para admin
      const { error: notifError } = await supabase.from("notifications").insert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        title: "Cliente Confirmou Pagamento",
        message: `O cliente informou que realizou o pagamento de R$ ${amount.toFixed(2)}`,
        type: "payment",
      });

      if (notifError) console.error("Erro ao criar notificação:", notifError);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quote-tracking", quoteId] });
      toast({
        title: "Confirmação enviada!",
        description: "Avisamos o admin. Aguarde a confirmação.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao confirmar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const copyPixKey = () => {
    if (pixKey) {
      navigator.clipboard.writeText(pixKey);
      setCopiedPix(true);
      toast({ title: "Chave PIX copiada!" });
      setTimeout(() => setCopiedPix(false), 2000);
    }
  };

  if (!paymentLinkSentAt) {
    return null;
  }

  const alreadyNotified = Boolean(customerPaidNotificationAt);

  return (
    <Alert className="border-primary bg-primary/5">
      <AlertCircle className="h-5 w-5 text-primary" />
      <AlertTitle className="text-primary font-bold text-lg">
        💳 Link de Pagamento Disponível
      </AlertTitle>
      <AlertDescription>
        <div className="space-y-4 mt-4">
          {/* Valor */}
          <div className="p-4 rounded-lg bg-background border">
            <p className="text-sm text-muted-foreground mb-1">Valor a Pagar</p>
            <p className="text-3xl font-bold text-primary">R$ {amount.toFixed(2)}</p>
          </div>

          {/* Instruções */}
          {instructions && (
            <div className="p-4 rounded-lg bg-background border">
              <p className="text-sm whitespace-pre-wrap">{instructions}</p>
            </div>
          )}

          {/* Link de Pagamento */}
          {paymentLink && (
            <div>
              <p className="text-sm font-medium mb-2">Link de Pagamento:</p>
              <Button asChild className="w-full" size="lg">
                <a href={paymentLink} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir Link de Pagamento
                </a>
              </Button>
            </div>
          )}

          {/* Chave PIX */}
          {pixKey && (
            <div>
              <p className="text-sm font-medium mb-2">Chave PIX:</p>
              <div className="flex gap-2">
                <div className="flex-1 p-3 rounded-lg bg-background border font-mono text-sm break-all">
                  {pixKey}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyPixKey}
                  className="flex-shrink-0"
                >
                  {copiedPix ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Botão Já Paguei */}
          <div className="pt-4 border-t">
            {alreadyNotified ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">
                  Confirmação enviada! Aguardando verificação do admin.
                </span>
              </div>
            ) : (
              <Button
                onClick={() => notifyPaidMutation.mutate()}
                disabled={notifyPaidMutation.isPending}
                variant="default"
                size="lg"
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {notifyPaidMutation.isPending ? (
                  "Enviando..."
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Já Paguei - Avisar Admin
                  </>
                )}
              </Button>
            )}
            <p className="text-xs text-center text-muted-foreground mt-2">
              Clique após realizar o pagamento para avisarmos o admin
            </p>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
