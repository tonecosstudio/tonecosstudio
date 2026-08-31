import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Save, Key, CreditCard, Loader2 } from "lucide-react";
import { useSanitizedForm } from "@/hooks/useSanitizedInput";
import { checkRateLimit } from "@/lib/security/rate-limiter";
import { FORM_RATE_LIMITS } from "@/lib/security/sanitization-config";
import { useAdminPaymentKeys, useUpdateAdminPaymentKey } from "@/hooks/admin/useAdminPaymentKeys";

export default function AdminPaymentKeys() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const { data: paymentKeys = [], isLoading } = useAdminPaymentKeys();

  // Initialize form data from payment keys
  const initialFormData = paymentKeys.reduce((acc, key) => {
    acc[key.key] = key.value;
    return acc;
  }, {} as Record<string, string>);

  // Setup sanitization for all fields (text type for PIX keys and API keys)
  const sanitizationMap = paymentKeys.reduce((acc, key) => {
    acc[key.key] = 'text';
    return acc;
  }, {} as Record<string, 'text'>);

  const {
    formData,
    setValue,
    getSanitizedData
  } = useSanitizedForm(
    initialFormData,
    sanitizationMap
  );

  // Mutation para atualizar chaves
  const updateKeyMutation = useUpdateAdminPaymentKey();

  // Salvar todas as chaves
  const handleSaveAll = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Check rate limit
    const rateLimitKey = 'admin-payment-keys-update';
    const rateLimit = checkRateLimit(rateLimitKey, FORM_RATE_LIMITS.adminUserUpdate);

    if (!rateLimit.allowed) {
      toast({
        title: 'Limite de requisições excedido',
        description: `Aguarde ${rateLimit.retryAfter}s antes de tentar novamente.`,
        variant: 'destructive'
      });
      return;
    }

    setIsSaving(true);

    try {
      // Get sanitized data
      const sanitizedData = getSanitizedData();
      const updates: Promise<void>[] = [];

      paymentKeys.forEach((key) => {
        const newValue = sanitizedData[key.key];
        if (newValue !== key.value) {
          updates.push(
            updateKeyMutation.mutateAsync({ key: key.key, value: newValue })
          );
        }
      });

      await Promise.all(updates);

      toast({
        title: "Chaves atualizadas",
        description: "Todas as chaves de pagamento foram atualizadas com sucesso.",
      });
    } catch (_error) {
      toast({
        title: "Erro ao atualizar",
        description: "Ocorreu um erro ao atualizar as chaves.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Agrupar chaves por tipo
  const pixKeys = paymentKeys.filter((k) => k.key.startsWith("pix_key_"));
  const paymentLinks = paymentKeys.filter((k) => k.key.startsWith("payment_link_"));

  const getKeyLabel = (key: string) => {
    const labels: Record<string, string> = {
      pix_key_onetime: "Compra Avulsa",
      pix_key_voucher: "Sistema de Voucher / Entrada",
      pix_key_subscription_quarterly: "Assinatura Trimestral",
      pix_key_subscription_semiannual: "Assinatura Semestral",
      pix_key_subscription_annual: "Assinatura Anual",
      payment_link_onetime: "Compra Avulsa",
      payment_link_voucher: "Sistema de Voucher / Entrada",
      payment_link_subscription_quarterly: "Assinatura Trimestral",
      payment_link_subscription_semiannual: "Assinatura Semestral",
      payment_link_subscription_annual: "Assinatura Anual",
    };
    return labels[key] || key;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Chaves de Pagamento</h2>
        <p className="text-muted-foreground mt-2">
          Configure chaves PIX e links de pagamento específicos para cada tipo de transação
        </p>
      </div>

        <form onSubmit={handleSaveAll}>
          <Tabs defaultValue="pix" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="pix">
                <Key className="h-4 w-4 mr-2" />
                Chaves PIX
              </TabsTrigger>
              <TabsTrigger value="links">
                <CreditCard className="h-4 w-4 mr-2" />
                Links de Cartão
              </TabsTrigger>
            </TabsList>

            {/* Chaves PIX */}
            <TabsContent value="pix" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Chaves PIX por Tipo de Pagamento</CardTitle>
                  <CardDescription>
                    Configure uma chave PIX diferente para cada tipo de transação. Essas chaves serão
                    exibidas automaticamente no checkout.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {pixKeys.map((key) => (
                    <div key={key.key} className="space-y-2">
                      <Label htmlFor={key.key}>{getKeyLabel(key.key)}</Label>
                      <Input
                        id={key.key}
                        name={key.key}
                        value={formData[key.key] || key.value}
                        onChange={(e) => setValue(key.key, e.target.value)}
                        placeholder="Digite a chave PIX (CPF, CNPJ, email, telefone ou chave aleatória)"
                        className="font-mono"
                      />
                      <p className="text-xs text-muted-foreground">{key.description}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Links de Pagamento */}
            <TabsContent value="links" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Links de Pagamento por Cartão</CardTitle>
                  <CardDescription>
                    Configure links de pagamento (Mercado Pago, PagSeguro, etc) para cada tipo de
                    transação.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {paymentLinks.map((key) => (
                    <div key={key.key} className="space-y-2">
                      <Label htmlFor={key.key}>{getKeyLabel(key.key)}</Label>
                      <Input
                        id={key.key}
                        name={key.key}
                        value={formData[key.key] || key.value}
                        onChange={(e) => setValue(key.key, e.target.value)}
                        placeholder="https://..."
                        type="url"
                      />
                      <p className="text-xs text-muted-foreground">{key.description}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Botão Salvar */}
          <div className="flex justify-end mt-6">
            <Button type="submit" size="lg" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Todas as Chaves
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Informações Adicionais */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-base">Como Funciona</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <strong>Compra Avulsa:</strong> Usada quando o cliente paga um orçamento único.
            </div>
            <div>
              <strong>Sistema de Voucher:</strong> Usada para instruções de entrada conforme o valor
              persistido no pedido ou orçamento.
            </div>
            <div>
              <strong>Assinaturas:</strong> Cada período (trimestral, semestral, anual) pode ter sua
              própria chave PIX e link de pagamento.
            </div>
            <div className="pt-2 border-t">
              <strong>Importante:</strong> As chaves configuradas aqui serão exibidas automaticamente no
              checkout quando o cliente for realizar o pagamento.
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
