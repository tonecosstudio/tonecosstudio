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
  const [instructions, setInstructions] = useState(
    `Olá ${customerName}!\n\nSeu link de pagamento está pronto.\n\nValor: R$ ${amount.toFixed(2)}\n\nApós realizar o pagamento, clique em "Já Paguei" para nos avisar.\n\nQualquer dúvida, estamos à disposição!`
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
        return "Sinal";
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
          <DialogTitle>Enviar Link de Pagamento</DialogTitle>
          <DialogDescription>
            {getPaymentTypeLabel()} - R$ {amount.toFixed(2)} para {customerName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <AlertDescription>
              O cliente receberá uma notificação no site e poderá ver o link na página de
              acompanhamento do pedido.
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
            <p className="text-sm font-medium mb-2">Preview da Notificação:</p>
            <div className="space-y-2 text-sm">
              <p className="font-medium">Link de Pagamento Disponível</p>
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
                      title: "Link enviado!",
                      description: `${customerName} foi notificado.`,
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
                Enviar para Cliente
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
