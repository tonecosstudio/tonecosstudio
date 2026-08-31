import { useState } from "react";
import { Building2, Clock, DollarSign, Globe, Loader2, Mail, Palette, RefreshCw, Save } from "lucide-react";
import { Page } from "@/components/layouts/Page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ImageUpload from "@/components/admin/shared/ImageUpload";
import { useToast } from "@/hooks/use-toast";
import {
  useAdminSystemSettings,
  useUpdateAdminSystemSettings,
} from "@/hooks/admin/useAdminSystemSettings";

type FieldType = "text" | "email" | "url" | "tel" | "number";

interface SettingField {
  key: string;
  label: string;
  type?: FieldType;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: string;
}

interface SettingsSection {
  id: string;
  label: string;
  title: string;
  description: string;
  icon: typeof Building2;
  fields: SettingField[];
}

const SECTIONS: SettingsSection[] = [
  {
    id: "company",
    label: "Empresa",
    title: "Informações da empresa",
    description: "Dados institucionais exibidos na plataforma e em documentos.",
    icon: Building2,
    fields: [
      { key: "company_name", label: "Nome da empresa", placeholder: "Nome comercial" },
      { key: "legal_name", label: "Razão social", placeholder: "Opcional" },
      { key: "cnpj", label: "CNPJ", placeholder: "00.000.000/0000-00" },
      { key: "company_address", label: "Endereço", placeholder: "Cidade, Estado, Brasil" },
      { key: "company_logo_url", label: "URL do logo", type: "url", placeholder: "https://..." },
    ],
  },
  {
    id: "contact",
    label: "Contato",
    title: "Canais de contato",
    description: "Contatos oficiais usados no site, suporte e documentos legais.",
    icon: Mail,
    fields: [
      { key: "contact_email", label: "Email de contato", type: "email", placeholder: "contato@dominio.com" },
      { key: "support_email", label: "Email de suporte", type: "email", placeholder: "suporte@dominio.com" },
      { key: "privacy_email", label: "Email de privacidade", type: "email", placeholder: "privacidade@dominio.com" },
      { key: "dpo_email", label: "Email do DPO", type: "email", placeholder: "dpo@dominio.com" },
      { key: "phone_primary", label: "Telefone principal", type: "tel", placeholder: "+55 (DDD) 00000-0000" },
      { key: "phone_whatsapp", label: "WhatsApp", type: "tel", placeholder: "+55 (DDD) 00000-0000" },
      { key: "business_hours", label: "Horário de atendimento", placeholder: "Ex.: Segunda a sexta, 9h às 18h" },
    ],
  },
  {
    id: "website",
    label: "Website",
    title: "Website e redes sociais",
    description: "URLs oficiais. Campos vazios não devem gerar links públicos.",
    icon: Globe,
    fields: [
      { key: "website_url", label: "URL do site", type: "url", placeholder: "https://seu-dominio.com" },
      { key: "facebook_url", label: "Facebook", type: "url", placeholder: "Opcional" },
      { key: "instagram_url", label: "Instagram", type: "url", placeholder: "Opcional" },
      { key: "twitter_url", label: "X / Twitter", type: "url", placeholder: "Opcional" },
      { key: "youtube_url", label: "YouTube", type: "url", placeholder: "Opcional" },
    ],
  },
  {
    id: "pricing",
    label: "Preços",
    title: "Configuração comercial oficial",
    description: "Estes valores são fonte oficial. O sistema não usa preços monetários de fallback.",
    icon: DollarSign,
    fields: [
      { key: "default_price_full", label: "Preço padrão cartão (R$)", type: "number", min: 0.01, step: "0.01", placeholder: "Obrigatório" },
      { key: "default_price_pix", label: "Preço padrão PIX (R$)", type: "number", min: 0.01, step: "0.01", placeholder: "Obrigatório" },
      { key: "default_deposit_amount", label: "Valor de entrada (R$)", type: "number", min: 0, step: "0.01", placeholder: "Obrigatório" },
      { key: "pix_discount_percentage", label: "Desconto PIX (%)", type: "number", min: 0, max: 100, step: "0.1", placeholder: "Obrigatório" },
      { key: "max_installments_no_interest", label: "Parcelas sem juros", type: "number", min: 1, step: "1", placeholder: "Obrigatório" },
      { key: "max_installments_with_interest", label: "Parcelas com juros", type: "number", min: 1, step: "1", placeholder: "Obrigatório" },
    ],
  },
  {
    id: "timing",
    label: "Prazos",
    title: "Prazos e cronogramas",
    description: "Parâmetros operacionais usados em produção, troca e entrega.",
    icon: Clock,
    fields: [
      { key: "shipping_business_days", label: "Dias úteis para envio", type: "number", min: 1, step: "1", placeholder: "Obrigatório" },
      { key: "exchange_deadline_days", label: "Prazo para troca (dias)", type: "number", min: 0, step: "1", placeholder: "Obrigatório" },
      { key: "days_to_next_delivery", label: "Dias para próxima entrega", type: "number", min: 1, step: "1", placeholder: "Obrigatório" },
    ],
  },
  {
    id: "ui",
    label: "Interface",
    title: "Interface e performance",
    description: "Parâmetros de experiência que podem ser ajustados sem alterar código.",
    icon: Palette,
    fields: [
      { key: "default_page_size", label: "Itens por página", type: "number", min: 5, step: "1", placeholder: "Obrigatório" },
      { key: "search_debounce_ms", label: "Debounce de busca (ms)", type: "number", min: 0, step: "1", placeholder: "Obrigatório" },
      { key: "input_debounce_ms", label: "Debounce de inputs (ms)", type: "number", min: 0, step: "1", placeholder: "Obrigatório" },
      { key: "image_compression_quality", label: "Qualidade de compressão de imagem", type: "number", min: 0.1, max: 1, step: "0.05", placeholder: "0.1 a 1" },
      { key: "max_image_size_mb", label: "Tamanho máximo de imagem (MB)", type: "number", min: 1, step: "1", placeholder: "Obrigatório" },
      { key: "user_online_threshold_minutes", label: "Threshold de usuário online (minutos)", type: "number", min: 1, step: "1", placeholder: "Obrigatório" },
      { key: "notification_polling_interval_ms", label: "Polling de notificações (ms)", type: "number", min: 1000, step: "1000", placeholder: "Obrigatório" },
      { key: "toast_duration_ms", label: "Duração de toast (ms)", type: "number", min: 1000, step: "500", placeholder: "Obrigatório" },
    ],
  },
];

const REQUIRED_COMMERCIAL_KEYS = [
  "default_price_full",
  "default_price_pix",
  "default_deposit_amount",
  "pix_discount_percentage",
  "max_installments_no_interest",
  "max_installments_with_interest",
] as const;

export default function AdminSystemSettings() {
  const { toast } = useToast();
  const [editedSettings, setEditedSettings] = useState<Record<string, string>>({});
  const { data: settings, isLoading, isError, error, refetch } = useAdminSystemSettings();
  const updateMutation = useUpdateAdminSystemSettings();

  const getValue = (key: string) =>
    editedSettings[key] ?? settings?.find((setting) => setting.key === key)?.value ?? "";

  const getDescription = (key: string) =>
    settings?.find((setting) => setting.key === key)?.description ?? "";

  const handleChange = (key: string, value: string) => {
    setEditedSettings((current) => ({ ...current, [key]: value }));
  };

  const validateCommercialSettings = (): string | null => {
    const values = Object.fromEntries(
      REQUIRED_COMMERCIAL_KEYS.map((key) => [key, Number(getValue(key))]),
    ) as Record<(typeof REQUIRED_COMMERCIAL_KEYS)[number], number>;

    if (!Number.isFinite(values.default_price_full) || values.default_price_full <= 0) {
      return "Preço padrão cartão deve ser maior que zero.";
    }
    if (
      !Number.isFinite(values.default_price_pix) ||
      values.default_price_pix <= 0 ||
      values.default_price_pix > values.default_price_full
    ) {
      return "Preço PIX deve ser maior que zero e não pode superar o preço cheio.";
    }
    if (
      !Number.isFinite(values.default_deposit_amount) ||
      values.default_deposit_amount < 0 ||
      values.default_deposit_amount > Math.min(values.default_price_full, values.default_price_pix)
    ) {
      return "Valor de entrada deve estar entre zero e o menor preço oficial.";
    }
    if (
      !Number.isFinite(values.pix_discount_percentage) ||
      values.pix_discount_percentage < 0 ||
      values.pix_discount_percentage > 100
    ) {
      return "Desconto PIX deve estar entre 0% e 100%.";
    }
    if (
      !Number.isInteger(values.max_installments_no_interest) ||
      values.max_installments_no_interest < 1 ||
      !Number.isInteger(values.max_installments_with_interest) ||
      values.max_installments_with_interest < 1
    ) {
      return "Quantidade de parcelas deve ser um número inteiro positivo.";
    }

    return null;
  };

  const handleSave = () => {
    if (Object.keys(editedSettings).length === 0) {
      toast({ title: "Nenhuma alteração", description: "Não há alterações para salvar." });
      return;
    }

    const commercialError = validateCommercialSettings();
    if (commercialError) {
      toast({
        title: "Configuração comercial inválida",
        description: commercialError,
        variant: "destructive",
      });
      return;
    }

    updateMutation.mutate(editedSettings, {
      onSuccess: () => {
        setEditedSettings({});
        toast({
          title: "Configurações atualizadas",
          description: "As alterações foram salvas com sucesso.",
        });
      },
      onError: (mutationError: Error) => {
        toast({
          title: "Erro ao atualizar",
          description: mutationError.message,
          variant: "destructive",
        });
      },
    });
  };

  const handleReset = () => {
    setEditedSettings({});
    toast({
      title: "Alterações descartadas",
      description: "As alterações não salvas foram descartadas.",
    });
  };

  if (isLoading) {
    return (
      <Page title="Configurações do Sistema - Admin" description="Carregando configurações">
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Page>
    );
  }

  if (isError) {
    return (
      <Page title="Configurações do Sistema - Admin" description="Configurações indisponíveis">
        <Card className="mx-auto mt-12 max-w-2xl border-destructive/40">
          <CardHeader>
            <CardTitle>Não foi possível carregar as configurações</CardTitle>
            <CardDescription>
              Nenhum valor local será usado como substituto. Restaure a fonte oficial antes de editar preços ou operação.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error instanceof Error && <p className="text-sm text-muted-foreground">{error.message}</p>}
            <Button variant="outline" onClick={() => void refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </Page>
    );
  }

  const hasChanges = Object.keys(editedSettings).length > 0;

  return (
    <Page title="Configurações do Sistema - Admin" description="Gerenciar configurações oficiais">
      <div className="container max-w-6xl py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Configurações do Sistema</h1>
            <p className="mt-2 text-muted-foreground">
              Edite somente valores reais. Campos comerciais não possuem fallback no runtime.
            </p>
          </div>
          <div className="flex gap-2">
            {hasChanges && (
              <Button variant="outline" onClick={handleReset}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Descartar
              </Button>
            )}
            <Button onClick={handleSave} disabled={!hasChanges || updateMutation.isPending}>
              {updateMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Salvar alterações
            </Button>
          </div>
        </div>

        <Tabs defaultValue="company" className="space-y-6">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 md:grid-cols-3 xl:grid-cols-6">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              return (
                <TabsTrigger key={section.id} value={section.id} className="gap-2">
                  <Icon className="h-4 w-4" />
                  {section.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {SECTIONS.map((section) => (
            <TabsContent key={section.id} value={section.id}>
              <Card>
                <CardHeader>
                  <CardTitle>{section.title}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {section.id === "ui" && (
                    <ImageUpload
                      label="Imagem do Hero (Página Coleções)"
                      description="Imagem opcional da página de coleções. O upload segue as políticas do bucket images."
                      currentImageUrl={getValue("hero_image_url")}
                      bucket="images"
                      folder="hero"
                      onUploadComplete={(url) => handleChange("hero_image_url", url)}
                      maxSizeMB={5}
                      acceptedFormats={["image/png", "image/jpeg", "image/jpg", "image/webp"]}
                    />
                  )}

                  <div className="grid gap-5 md:grid-cols-2">
                    {section.fields.map((field) => (
                      <div key={field.key} className="space-y-2">
                        <Label htmlFor={field.key}>{field.label}</Label>
                        <Input
                          id={field.key}
                          type={field.type ?? "text"}
                          min={field.min}
                          max={field.max}
                          step={field.step}
                          value={getValue(field.key)}
                          onChange={(event) => handleChange(field.key, event.target.value)}
                          placeholder={field.placeholder ?? "Não configurado"}
                        />
                        {getDescription(field.key) && (
                          <p className="text-xs text-muted-foreground">{getDescription(field.key)}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {hasChanges && (
          <Card className="mt-6 border-primary">
            <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">Alterações não salvas</p>
                <p className="text-sm text-muted-foreground">
                  {Object.keys(editedSettings).length} configuração(ões) modificada(s).
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleReset}>Descartar</Button>
                <Button onClick={handleSave} disabled={updateMutation.isPending}>
                  {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar alterações
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Page>
  );
}
