import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Send, Copy, Check } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSendPaymentLink } from "@/hooks/admin/useSendPaymentLink";

interface SendPaymentLinkDialogProps {
  quoteId: string;
  amount: number;
  paymentType: "voucher" | "deposit" | "final" | "full";
  customerName: string;
  customerEmail: string;
}

export function SendPaymentLinkDialog({
  quoteId,
  amount,
  paymentType,
  customerName,
  customerEmail: _customerEmail,
}: SendPaymentLinkDialogProps) {
  const { toast } = useToast();
  const sendLinkMutation = useSendPaymentLink(quoteId);
  const [isOpen, setIsOpen] = useState(false);
  const [paymentLink, setPaymentLink] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [instructions, setInstructions] = useState(() =>
    paymentType === "final"
      ? `Olá ${customerName}!\n\nSua peça está pronta para a finalização.\n\nSaldo restante: R$ ${amount.toFixed(2)}. A entrada de R$ 50 já foi abatida do total.\n\nApós o pagamento, acesse Minha conta > Meus orçamentos e envie o comprovante para conferência.`
      : `Olá ${customerName}!\n\nSua pré-venda foi confirmada.\n\nEntrada: R$ ${amount.toFixed(2)}, abatida do valor total.\n\nApós o pagamento, acesse Minha conta > Meus orçamentos e envie o comprovante para conferência. O saldo será pago quando a peça estiver pronta.`
  );
  const [copiedPix, setCopiedPix] = useState(false);

  const copyPixKey = async () => {
    if (!pixKey) return;

    try {
      await navigator.clipboard.writeText(pixKey);
      setCopiedPix(true);
      toast({ title: "Chave PIX copiada!" });
      setTimeout(() => setCopiedPix(false), 2000);
    } catch {
      toast({
        title: "Não foi possível copiar a chave PIX",
        variant: "destructive",
      });
    }
  };

  const getPaymentTypeLabel = () => {
    switch (paymentType) {
      case "voucher":
        return "Voucher";
      case "deposit":
        return "Entrada";
      case "final":
        return "Pagamento Final";
      case "full":
        return "Pagamento Completo";
      default:
        return "Pagamento";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Send className="h-4 w-4" />
          Enviar Link
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Disponibilizar instruções de pagamento</DialogTitle>
          <DialogDescription>
            {getPaymentTypeLabel()} - R$ {amount.toFixed(2)} para {customerName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <AlertDescription>
              As instruções ficarão disponíveis em Meus orçamentos. Avise o cliente pelos canais habituais; esta ação não envia e-mail ou WhatsApp.
            </AlertDescription>
          </Alert>

          <div>
            <Label htmlFor="payment-link">Link de Pagamento (Opcional)</Label>
            <Input
              id="payment-link"
              value={paymentLink}
              onChange={(e) => setPaymentLink(e.target.value)}
              placeholder="https://picpay.me/seuusuario ou link do Mercado Pago"
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Cole o link do PicPay, Mercado Pago, PayPal, ou qualquer plataforma
            </p>
          </div>

          <div>
            <Label htmlFor="pix-key">Chave PIX (Opcional)</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="pix-key"
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                placeholder="seuemail@exemplo.com ou CPF/CNPJ"
                className="flex-1"
              />
              {pixKey && (
                <Button type="button" variant="outline" size="icon" onClick={() => void copyPixKey()}>
                  {copiedPix ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Cliente poderá copiar a chave PIX diretamente
            </p>
          </div>

          <div>
            <Label htmlFor="instructions">Mensagem para o Cliente</Label>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={8}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Personalize a mensagem que o cliente verá
            </p>
          </div>

          <div className="p-4 rounded-lg border bg-muted/50">
            <p className="text-sm font-medium mb-2">Prévia das instruções:</p>
            <div className="space-y-2 text-sm">
              <p className="font-medium">Pagamento disponível</p>
              <p className="text-muted-foreground">Valor: R$ {amount.toFixed(2)}</p>
              {paymentLink && (
                <p className="text-primary">Link: {paymentLink.substring(0, 50)}...</p>
              )}
              {pixKey && <p className="text-primary">PIX: {pixKey}</p>}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() =>
              sendLinkMutation.mutate(
                {
                  quoteId,
                  amount,
                  paymentType,
                  paymentLink,
                  pixKey,
                  instructions,
                },
                {
                  onSuccess: () => {
                    toast({
                      title: "Instruções disponibilizadas",
                      description: "O cliente pode consultar os dados em Meus orçamentos. Avise-o pelo canal de atendimento.",
                    });
                    setIsOpen(false);
                    setPaymentLink("");
                    setPixKey("");
                  },
                  onError: (error: Error) => {
                    toast({
                      title: "Erro ao enviar link",
                      description: error.message,
                      variant: "destructive",
                    });
                  },
                }
              )
            }
            disabled={sendLinkMutation.isPending || (!paymentLink && !pixKey)}
          >
            {sendLinkMutation.isPending ? (
              "Enviando..."
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Salvar e disponibilizar
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
