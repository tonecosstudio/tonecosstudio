import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePaymentKeys, PaymentType, SubscriptionPeriod } from "@/hooks/usePaymentKeys";
import { Copy, ExternalLink, QrCode, CreditCard, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { openSafeExternalUrl } from "@/lib/security/safe-open";

interface PaymentInstructionsProps {
  paymentType: PaymentType;
  subscriptionPeriod?: SubscriptionPeriod;
  amount?: number;
}

export function PaymentInstructions({
  paymentType,
  subscriptionPeriod,
  amount,
}: PaymentInstructionsProps) {
  const { toast } = useToast();
  const { data: paymentInfo, isLoading } = usePaymentKeys(paymentType, subscriptionPeriod);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: `${label} copiado para a área de transferência.`,
    });
  };

  const openPaymentLink = (url: string) => {
    try {
      openSafeExternalUrl(url);
    } catch {
      toast({
        title: "Link de pagamento invalido",
        description: "O link configurado para pagamento nao e seguro.",
        variant: "destructive",
      });
    }
  };

  const getPaymentTypeLabel = () => {
    if (paymentType === "onetime") return "Compra Avulsa";
    if (paymentType === "voucher") return "Sistema de Voucher";
    if (paymentType === "subscription") {
      if (subscriptionPeriod === "quarterly") return "Assinatura Trimestral";
      if (subscriptionPeriod === "semiannual") return "Assinatura Semestral";
      if (subscriptionPeriod === "annual") return "Assinatura Anual";
    }
    return "Pagamento";
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!paymentInfo?.pix_key && !paymentInfo?.payment_link) {
    return (
      <Alert>
        <AlertDescription>
          As informações de pagamento ainda não foram configuradas. Entre em contato com o suporte.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Informações de Pagamento</h3>
          <p className="text-sm text-muted-foreground">{getPaymentTypeLabel()}</p>
        </div>
        {amount && (
          <Badge variant="secondary" className="text-lg px-4 py-2">
            R$ {amount.toFixed(2)}
          </Badge>
        )}
      </div>

      {/* PIX */}
      {paymentInfo.pix_key && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Pagamento via PIX
            </CardTitle>
            <CardDescription>
              Copie a chave PIX abaixo e realize o pagamento em seu banco
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 bg-muted rounded-md font-mono text-sm break-all">
                {paymentInfo.pix_key}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(paymentInfo.pix_key, "Chave PIX")}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            <div className="text-sm text-muted-foreground space-y-1">
              <p>1. Abra o app do seu banco</p>
              <p>2. Escolha pagar com PIX</p>
              <p>3. Cole a chave PIX copiada</p>
              <p>4. Confirme o pagamento</p>
              <p>5. Envie o comprovante para confirmação</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cartão de Crédito */}
      {paymentInfo.payment_link && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Pagamento via Cartão
            </CardTitle>
            <CardDescription>
              Clique no botão abaixo para pagar com cartão de crédito ou débito
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              size="lg"
              onClick={() => openPaymentLink(paymentInfo.payment_link)}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Pagar com Cartão
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Nota Importante */}
      <Alert>
        <AlertDescription className="text-sm">
          <strong>Importante:</strong> Após realizar o pagamento, envie o comprovante através da área
          de pagamentos para que possamos confirmar e processar seu pedido.
        </AlertDescription>
      </Alert>
    </div>
  );
}
