import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Page } from "@/components/layouts/Page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Save,
  RefreshCw,
  Building2,
  Mail,
  Globe,
  DollarSign,
  Clock,
  Palette,
} from "lucide-react";
import ImageUpload from "@/components/admin/shared/ImageUpload";

interface Setting {
  key: string;
  value: string;
  description: string | null;
}

export default function AdminSystemSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editedSettings, setEditedSettings] = useState<Record<string, string>>({});

  // Buscar todas as configurações
  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin-system-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("system_settings").select("*").order("key");

      if (error) throw error;
      return data as Setting[];
    },
  });

  // Mutation para atualizar configurações
  const updateMutation = useMutation({
    mutationFn: async (updates: Record<string, string>) => {
      const updatePromises = Object.entries(updates).map(async ([key, value]) => {
        // Usar UPSERT para criar ou atualizar
        const { error } = await supabase
          .from("system_settings")
          .upsert(
            {
              key,
              value,
              updated_at: new Date().toISOString()
            },
            {
              onConflict: 'key',
              ignoreDuplicates: false
            }
          );

        return { key, error };
      });

      const results = await Promise.all(updatePromises);
      const errors = results.filter((r) => r.error);

      if (errors.length > 0) {
        throw new Error(`Erro ao atualizar ${errors.length} configuração(ões)`);
      }

      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-system-settings"] });
      queryClient.invalidateQueries({ queryKey: ["system-settings"] });
      setEditedSettings({});
      toast({
        title: "Configurações atualizadas",
        description: "As alterações foram salvas com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleChange = (key: string, value: string) => {
    setEditedSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (Object.keys(editedSettings).length === 0) {
      toast({
        title: "Nenhuma alteração",
        description: "Não há alterações para salvar.",
      });
      return;
    }

    updateMutation.mutate(editedSettings);
  };

  const handleReset = () => {
    setEditedSettings({});
    toast({
      title: "Alterações descartadas",
      description: "As alterações não salvas foram descartadas.",
    });
  };

  const getValue = (key: string) => {
    return editedSettings[key] ?? settings?.find((s) => s.key === key)?.value ?? "";
  };

  const getDescription = (key: string) => {
    return settings?.find((s) => s.key === key)?.description ?? "";
  };

  const hasChanges = Object.keys(editedSettings).length > 0;

  if (isLoading) {
    return (
      <Page title="Configurações do Sistema - Admin" description="Carregando configurações">
        <div className="container max-w-6xl py-16 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Page>
    );
  }

  return (
    <Page
      title="Configurações do Sistema - Admin"
      description="Gerenciar configurações do sistema"
    >

      <div className="container max-w-6xl py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Configurações do Sistema</h1>
            <p className="text-muted-foreground mt-2">
              Gerencie todas as configurações da plataforma
            </p>
          </div>

          <div className="flex gap-2">
            {hasChanges && (
              <Button variant="outline" onClick={handleReset}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Descartar
              </Button>
            )}
            <Button onClick={handleSave} disabled={!hasChanges || updateMutation.isPending}>
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar Alterações
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="company" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="company">
              <Building2 className="h-4 w-4 mr-2" />
              Empresa
            </TabsTrigger>
            <TabsTrigger value="contact">
              <Mail className="h-4 w-4 mr-2" />
              Contato
            </TabsTrigger>
            <TabsTrigger value="website">
              <Globe className="h-4 w-4 mr-2" />
              Website
            </TabsTrigger>
            <TabsTrigger value="pricing">
              <DollarSign className="h-4 w-4 mr-2" />
              Preços
            </TabsTrigger>
            <TabsTrigger value="timing">
              <Clock className="h-4 w-4 mr-2" />
              Prazos
            </TabsTrigger>
            <TabsTrigger value="ui">
              <Palette className="h-4 w-4 mr-2" />
              Interface
            </TabsTrigger>
          </TabsList>

          {/* Empresa */}
          <TabsContent value="company">
            <Card>
              <CardHeader>
                <CardTitle>Informações da Empresa</CardTitle>
                <CardDescription>Dados básicos da empresa exibidos no site</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="company_name">Nome da Empresa</Label>
                    <Input
                      id="company_name"
                      value={getValue("company_name")}
                      onChange={(e) => handleChange("company_name", e.target.value)}
                      placeholder="Tonecos Studios"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {getDescription("company_name")}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="company_address">Endereço</Label>
                    <Input
                      id="company_address"
                      value={getValue("company_address")}
                      onChange={(e) => handleChange("company_address", e.target.value)}
                      placeholder="São Paulo, Brasil"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {getDescription("company_address")}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="company_logo_url">URL do Logo</Label>
                    <Input
                      id="company_logo_url"
                      value={getValue("company_logo_url")}
                      onChange={(e) => handleChange("company_logo_url", e.target.value)}
                      placeholder="/logo.png"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {getDescription("company_logo_url")}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="legal_name">Razão Social (Opcional)</Label>
                    <Input
                      id="legal_name"
                      value={getValue("legal_name")}
                      onChange={(e) => handleChange("legal_name", e.target.value)}
                      placeholder="Tonecos Studios LTDA"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {getDescription("legal_name")}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="cnpj">CNPJ (Opcional)</Label>
                    <Input
                      id="cnpj"
                      value={getValue("cnpj")}
                      onChange={(e) => handleChange("cnpj", e.target.value)}
                      placeholder="00.000.000/0000-00"
                    />
                    <p className="text-xs text-muted-foreground mt-1">{getDescription("cnpj")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contato */}
          <TabsContent value="contact">
            <Card>
              <CardHeader>
                <CardTitle>Informações de Contato</CardTitle>
                <CardDescription>Emails e telefones para contato com clientes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="contact_email">Email de Contato</Label>
                    <Input
                      id="contact_email"
                      type="email"
                      value={getValue("contact_email")}
                      onChange={(e) => handleChange("contact_email", e.target.value)}
                      placeholder="contato@ordax.com.br"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {getDescription("contact_email")}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="support_email">Email de Suporte</Label>
                    <Input
                      id="support_email"
                      type="email"
                      value={getValue("support_email")}
                      onChange={(e) => handleChange("support_email", e.target.value)}
                      placeholder="suporte@ordax.com.br"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {getDescription("support_email")}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="privacy_email">Email de Privacidade</Label>
                    <Input
                      id="privacy_email"
                      type="email"
                      value={getValue("privacy_email")}
                      onChange={(e) => handleChange("privacy_email", e.target.value)}
                      placeholder="privacidade@ordax.com.br"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {getDescription("privacy_email")}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="dpo_email">Email do DPO</Label>
                    <Input
                      id="dpo_email"
                      type="email"
                      value={getValue("dpo_email")}
                      onChange={(e) => handleChange("dpo_email", e.target.value)}
                      placeholder="dpo@ordax.com.br"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {getDescription("dpo_email")}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="phone_primary">Telefone Principal (Opcional)</Label>
                    <Input
                      id="phone_primary"
                      type="tel"
                      value={getValue("phone_primary")}
                      onChange={(e) => handleChange("phone_primary", e.target.value)}
                      placeholder="+55 (11) 9999-9999"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {getDescription("phone_primary")}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="phone_whatsapp">WhatsApp (Opcional)</Label>
                    <Input
                      id="phone_whatsapp"
                      type="tel"
                      value={getValue("phone_whatsapp")}
                      onChange={(e) => handleChange("phone_whatsapp", e.target.value)}
                      placeholder="+55 (11) 9999-9999"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {getDescription("phone_whatsapp")}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="business_hours">Horário de Atendimento</Label>
                    <Input
                      id="business_hours"
                      value={getValue("business_hours")}
                      onChange={(e) => handleChange("business_hours", e.target.value)}
                      placeholder="Segunda a Sexta, 9h às 18h"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {getDescription("business_hours")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Website */}
          <TabsContent value="website">
            <Card>
              <CardHeader>
                <CardTitle>Website e Redes Sociais</CardTitle>
                <CardDescription>URLs do site e perfis em redes sociais</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="website_url">URL do Site</Label>
                    <Input
                      id="website_url"
                      type="url"
                      value={getValue("website_url")}
                      onChange={(e) => handleChange("website_url", e.target.value)}
                      placeholder="https://ordax.com.br"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {getDescription("website_url")}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="facebook_url">Facebook (Opcional)</Label>
                    <Input
                      id="facebook_url"
                      type="url"
                      value={getValue("facebook_url")}
                      onChange={(e) => handleChange("facebook_url", e.target.value)}
                      placeholder="https://facebook.com/ordax"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {getDescription("facebook_url")}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="instagram_url">Instagram (Opcional)</Label>
                    <Input
                      id="instagram_url"
                      type="url"
                      value={getValue("instagram_url")}
                      onChange={(e) => handleChange("instagram_url", e.target.value)}
                      placeholder="https://instagram.com/ordax"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {getDescription("instagram_url")}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="twitter_url">Twitter/X (Opcional)</Label>
                    <Input
                      id="twitter_url"
                      type="url"
                      value={getValue("twitter_url")}
                      onChange={(e) => handleChange("twitter_url", e.target.value)}
                      placeholder="https://twitter.com/ordax"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {getDescription("twitter_url")}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="youtube_url">YouTube (Opcional)</Label>
                    <Input
                      id="youtube_url"
                      type="url"
                      value={getValue("youtube_url")}
                      onChange={(e) => handleChange("youtube_url", e.target.value)}
                      placeholder="https://youtube.com/@ordax"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {getDescription("youtube_url")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preços */}
          <TabsContent value="pricing">
            <Card>
              <CardHeader>
                <CardTitle>Configurações de Preços</CardTitle>
                <CardDescription>Preços padrão e configurações de pagamento</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="default_price_full">Preço Padrão Cartão (R$)</Label>
                    <Input
                      id="default_price_full"
                      type="number"
                      step="0.01"
                      value={getValue("default_price_full")}
                      onChange={(e) => handleChange("default_price_full", e.target.value)}
                      placeholder="500"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {getDescription("default_price_full")}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="default_price_pix">Preço Padrão PIX (R$)</Label>
                    <Input
                      id="default_price_pix"
                      type="number"
                      step="0.01"
                      value={getValue("default_price_pix")}
                      onChange={(e) => handleChange("default_price_pix", e.target.value)}
                      placeholder="475"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {getDescription("default_price_pix")}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="default_deposit_amount">Valor de Entrada (R$)</Label>
                    <Input
                      id="default_deposit_amount"
                      type="number"
                      step="0.01"
                      value={getValue("default_deposit_amount")}
                      onChange={(e) => handleChange("default_deposit_amount", e.target.value)}
                      placeholder="100"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {getDescription("default_deposit_amount")}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="pix_discount_percentage">Desconto PIX (%)</Label>
                    <Input
                      id="pix_discount_percentage"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={getValue("pix_discount_percentage")}
                      onChange={(e) => handleChange("pix_discount_percentage", e.target.value)}
                      placeholder="5"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {getDescription("pix_discount_percentage")}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="max_installments_no_interest">Parcelas Sem Juros</Label>
                    <Input
                      id="max_installments_no_interest"
                      type="number"
                      min="1"
                      value={getValue("max_installments_no_interest")}
                      onChange={(e) => handleChange("max_installments_no_interest", e.target.value)}
                      placeholder="6"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {getDescription("max_installments_no_interest")}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="max_installments_with_interest">Parcelas Com Juros</Label>
                    <Input
                      id="max_installments_with_interest"
                      type="number"
                      min="1"
                      value={getValue("max_installments_with_interest")}
                      onChange={(e) =>
                        handleChange("max_installments_with_interest", e.target.value)
                      }
                      placeholder="10"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {getDescription("max_installments_with_interest")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Prazos */}
          <TabsContent value="timing">
            <Card>
              <CardHeader>
                <CardTitle>Prazos e Cronogramas</CardTitle>
                <CardDescription>Configurações de produção e entrega</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="shipping_business_days">Dias Úteis para Envio</Label>
                    <Input
                      id="shipping_business_days"
                      type="number"
                      min="1"
                      value={getValue("shipping_business_days")}
                      onChange={(e) => handleChange("shipping_business_days", e.target.value)}
                      placeholder="5"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {getDescription("shipping_business_days")}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="exchange_deadline_days">Prazo para Troca (dias)</Label>
                    <Input
                      id="exchange_deadline_days"
                      type="number"
                      min="0"
                      value={getValue("exchange_deadline_days")}
                      onChange={(e) => handleChange("exchange_deadline_days", e.target.value)}
                      placeholder="1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {getDescription("exchange_deadline_days")}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="days_to_next_delivery">Dias para Próxima Entrega</Label>
                    <Input
                      id="days_to_next_delivery"
                      type="number"
                      min="1"
                      value={getValue("days_to_next_delivery")}
                      onChange={(e) => handleChange("days_to_next_delivery", e.target.value)}
                      placeholder="30"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {getDescription("days_to_next_delivery")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Interface */}
          <TabsContent value="ui">
            <Card>
              <CardHeader>
                <CardTitle>Configurações de Interface</CardTitle>
                <CardDescription>Configurações de UX e performance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  {/* Hero Image Upload */}
                  <ImageUpload
                    label="Imagem do Hero (Página Coleções)"
                    description="Imagem do guerreiro exibida na página de coleções. Recomendado: proporção 3:4 ou 2:3 (vertical), ex: 600x800px"
                    currentImageUrl={getValue("hero_image_url")}
                    bucket="images"
                    folder="hero"
                    onUploadComplete={(url) => handleChange("hero_image_url", url)}
                    maxSizeMB={5}
                    acceptedFormats={["image/png", "image/jpeg", "image/jpg", "image/webp"]}
                  />

                  <div>
                    <Label htmlFor="default_page_size">Itens por Página</Label>
                    <Input
                      id="default_page_size"
                      type="number"
                      min="5"
                      value={getValue("default_page_size")}
                      onChange={(e) => handleChange("default_page_size", e.target.value)}
                      placeholder="20"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {getDescription("default_page_size")}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="search_debounce_ms">Debounce de Busca (ms)</Label>
                    <Input
                      id="search_debounce_ms"
                      type="number"
                      min="0"
                      value={getValue("search_debounce_ms")}
                      onChange={(e) => handleChange("search_debounce_ms", e.target.value)}
                      placeholder="300"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {getDescription("search_debounce_ms")}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="max_image_size_mb">Tamanho Máximo de Imagem (MB)</Label>
                    <Input
                      id="max_image_size_mb"
                      type="number"
                      min="1"
                      value={getValue("max_image_size_mb")}
                      onChange={(e) => handleChange("max_image_size_mb", e.target.value)}
                      placeholder="5"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {getDescription("max_image_size_mb")}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="user_online_threshold_minutes">
                      Threshold Usuário Online (minutos)
                    </Label>
                    <Input
                      id="user_online_threshold_minutes"
                      type="number"
                      min="1"
                      value={getValue("user_online_threshold_minutes")}
                      onChange={(e) =>
                        handleChange("user_online_threshold_minutes", e.target.value)
                      }
                      placeholder="5"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {getDescription("user_online_threshold_minutes")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer com botões */}
        {hasChanges && (
          <Card className="mt-6 border-primary">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Você tem alterações não salvas</p>
                  <p className="text-sm text-muted-foreground">
                    {Object.keys(editedSettings).length} configuração(ões) modificada(s)
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleReset}>
                    Descartar
                  </Button>
                  <Button onClick={handleSave} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Salvar Alterações
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Page>
  );
}
