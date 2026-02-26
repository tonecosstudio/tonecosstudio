import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Save, Key, CreditCard, Loader2 } from "lucide-react";

interface PaymentKey {
  key: string;
  value: string;
  description: string;
}

export default function AdminPaymentKeys() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  // Buscar todas as chaves de pagamento
  const { data: paymentKeys = [], isLoading } = useQuery({
    queryKey: ["payment-keys"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("*")
        .or(
          "key.like.pix_key_%,key.like.payment_link_%"
        )
        .order("key");

      if (error) throw error;
      return data as PaymentKey[];
    },
  });

  // Mutation para atualizar chaves
  const updateKeyMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from("system_settings")
        .update({ value, updated_at: new Date().toISOString() })
        .eq("key", key);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-keys"] });
    },
  });

  // Salvar todas as chaves
  const handleSaveAll = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const formData = new FormData(e.currentTarget);
      const updates: Promise<any>[] = [];

      paymentKeys.forEach((key) => {
        const newValue = formData.get(key.key) as string;
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
    } catch (error) {
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
      pix_key_voucher: "Sistema de Voucher (R$ 100 entrada)",
      pix_key_subscription_quarterly: "Assinatura Trimestral",
      pix_key_subscription_semiannual: "Assinatura Semestral",
      pix_key_subscription_annual: "Assinatura Anual",
      payment_link_onetime: "Compra Avulsa",
      payment_link_voucher: "Sistema de Voucher (R$ 100 entrada)",
      payment_link_subscription_quarterly: "Assinatura Trimestral",
      payment_link_subscription_semiannual: "Assinatura Semestral",
      payment_link_subscription_annual: "Assinatura Anual",
    };
    return labels[key] || key;
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <SEOHead title="Chaves de Pagamento" />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <SEOHead title="Chaves de Pagamento" description="Gerenciar chaves PIX e links de pagamento" />

      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Chaves de Pagamento</h1>
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
                        defaultValue={key.value}
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
                        defaultValue={key.value}
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
              <strong>Compra Avulsa:</strong> Usada quando o cliente compra um quote (orçamento) único.
            </div>
            <div>
              <strong>Sistema de Voucher:</strong> Usada para entrada de R$ 100 no sistema estilo Iron
              Studios.
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
    </AdminLayout>
  );
}
