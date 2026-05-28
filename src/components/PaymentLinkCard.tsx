import { useState } from "react";
import { AlertCircle, Check, CheckCircle2, Copy, ExternalLink } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { usePaymentConfirmation } from "@/hooks/payments/usePaymentConfirmation";
import { sanitizeURL } from "@/lib/security/input-sanitizer";

interface PaymentLinkCardProps {
  quoteId: string;
  amount: number;
  paymentLink?: string | null;
  pixKey?: string | null;
  instructions?: string | null;
  paymentLinkSentAt?: string | null;
  customerPaidNotificationAt?: string | null;
}

function getSafePaymentLink(paymentLink?: string | null): string | null {
  if (!paymentLink) return null;

  try {
    return sanitizeURL(paymentLink, ["http", "https"]);
  } catch {
    return null;
  }
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
  const [copiedPix, setCopiedPix] = useState(false);
  const paymentConfirmation = usePaymentConfirmation({ quoteId, amount });

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
  const safePaymentLink = getSafePaymentLink(paymentLink);

  return (
    <Alert className="border-primary bg-primary/5">
      <AlertCircle className="h-5 w-5 text-primary" />
      <AlertTitle className="text-primary font-bold text-lg">
        Link de Pagamento Disponivel
      </AlertTitle>
      <AlertDescription>
        <div className="space-y-4 mt-4">
          <div className="p-4 rounded-lg bg-background border">
            <p className="text-sm text-muted-foreground mb-1">Valor a Pagar</p>
            <p className="text-3xl font-bold text-primary">R$ {amount.toFixed(2)}</p>
          </div>

          {instructions && (
            <div className="p-4 rounded-lg bg-background border">
              <p className="text-sm whitespace-pre-wrap">{instructions}</p>
            </div>
          )}

          {safePaymentLink && (
            <div>
              <p className="text-sm font-medium mb-2">Link de Pagamento:</p>
              <Button asChild className="w-full" size="lg">
                <a href={safePaymentLink} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir Link de Pagamento
                </a>
              </Button>
            </div>
          )}

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

          <div className="pt-4 border-t">
            {alreadyNotified ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">
                  Confirmacao enviada! Aguardando verificacao do admin.
                </span>
              </div>
            ) : (
              <Button
                onClick={() => paymentConfirmation.notifyPaid()}
                disabled={paymentConfirmation.isPending}
                variant="default"
                size="lg"
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {paymentConfirmation.isPending ? (
                  "Enviando..."
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Ja Paguei - Avisar Admin
                  </>
                )}
              </Button>
            )}
            <p className="text-xs text-center text-muted-foreground mt-2">
              Clique apos realizar o pagamento para avisarmos o admin
            </p>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
