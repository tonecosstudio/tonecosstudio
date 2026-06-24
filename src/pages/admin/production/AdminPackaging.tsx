import { useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin/shared/AdminLayout";
import SEOHead from "@/components/SEOHead";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, FileText, Image, Package } from "lucide-react";

type PackagingKey =
  | "certificate"
  | "thankYouCard"
  | "careManual"
  | "bubbleWrap"
  | "box"
  | "postcard"
  | "sticker"
  | "qrCode"
  | "bookmark"
  | "tissuePaper"
  | "customSeal"
  | "handwrittenNote"
  | "polaroidPhoto"
  | "surpriseGift";

interface PackagingOption {
  key: PackagingKey;
  label: string;
  cost?: number;
}

const ESSENTIAL_OPTIONS: PackagingOption[] = [
  { key: "certificate", label: "Certificado de autenticidade", cost: 1.0 },
  { key: "thankYouCard", label: "Cartao de agradecimento", cost: 0.5 },
  { key: "careManual", label: "Manual de cuidados", cost: 0.5 },
  { key: "bubbleWrap", label: "Plastico bolha", cost: 1.0 },
  { key: "box", label: "Caixa personalizada", cost: 3.0 },
];

const DIFFERENTIAL_OPTIONS: PackagingOption[] = [
  { key: "postcard", label: "Cartao postal", cost: 1.5 },
  { key: "sticker", label: "Adesivo da marca", cost: 0.5 },
  { key: "qrCode", label: "Codigo QR para grupo VIP" },
  { key: "bookmark", label: "Marcador de pagina", cost: 1.0 },
  { key: "tissuePaper", label: "Papel de seda", cost: 1.0 },
  { key: "customSeal", label: "Lacre personalizado", cost: 0.5 },
];

const PREMIUM_OPTIONS: PackagingOption[] = [
  { key: "handwrittenNote", label: "Mensagem manuscrita" },
  { key: "polaroidPhoto", label: "Foto Polaroid do processo" },
  { key: "surpriseGift", label: "Brinde surpresa" },
];

interface TemplateState {
  thankYouMessage: string;
  certificateText: string;
  postcardBack: string;
  careInstructions: string;
}

const DEFAULT_TEMPLATES: TemplateState = {
  thankYouMessage: `Parabens, colecionador!

Voce acaba de receber uma peca exclusiva da nossa colecao.

Esta miniatura foi cuidadosamente esculpida e pintada a mao.

Peca: #[NUMERO] de [TOTAL]
Personagem: [NOME]
Serie: [SERIE]
Data: [MES/ANO]

Compartilhe sua colecao:
#MinhaColecao[SERIE]

Obrigado por fazer parte da comunidade.

Assinatura:
[SUA ASSINATURA]`,

  certificateText: `CERTIFICADO ORDAX

Este documento certifica que a miniatura e original e faz parte do ciclo Ordax.

Personagem: [NOME COMPLETO]
Serie: [NOME DA SERIE]
Numero: #[XXX] de [TOTAL]
Material: Resina
Altura: [XX] cm
Pintada a mao
Data de producao: [MES/ANO]`,

  postcardBack: `[NOME] - [TITULO]
[SERIE] Collection

"[FRASE DO PERSONAGEM]"

[DESCRICAO BREVE DO PERSONAGEM EM 3 OU 4 LINHAS]

[MES/ANO]
Pintada a mao
Produto artistico artesanal. Produto nao oficial.

www.suamarca.com.br
@suamarca`,

  careInstructions: `GUIA DE CUIDADOS

Como cuidar da sua miniatura:

- Limpe com pincel macio
- Evite luz solar direta
- Mantenha em local seco
- Nao use produtos quimicos
- Temperatura ambiente ideal

DICAS DE EXPOSICAO:
- Use prateleiras com LED
- Crie cenarios tematicos
- Agrupe por serie
- Fotografe e compartilhe

ATENCAO:
Produto artesanal. Pequenas variacoes sao normais e tornam cada peca unica.`,
};

const DEFAULT_CONFIG: Record<PackagingKey, boolean> = {
  certificate: true,
  thankYouCard: true,
  careManual: true,
  bubbleWrap: true,
  box: true,
  postcard: true,
  sticker: true,
  qrCode: true,
  bookmark: true,
  tissuePaper: true,
  customSeal: true,
  handwrittenNote: false,
  polaroidPhoto: false,
  surpriseGift: false,
};

function OptionGroup({
  title,
  badgeVariant,
  options,
  values,
  onToggle,
}: {
  title: string;
  badgeVariant: "default" | "secondary" | "outline";
  options: PackagingOption[];
  values: Record<PackagingKey, boolean>;
  onToggle: (key: PackagingKey, checked: boolean) => void;
}) {
  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 font-semibold">
        <Badge variant={badgeVariant}>{title}</Badge>
      </h3>
      <div className="space-y-3">
        {options.map((option) => (
          <div key={option.key} className="flex items-center space-x-2">
            <Checkbox
              id={option.key}
              checked={values[option.key]}
              onCheckedChange={(checked) => onToggle(option.key, checked === true)}
            />
            <label htmlFor={option.key} className="cursor-pointer text-sm">
              {option.label}
              {typeof option.cost === "number" ? ` (R$ ${option.cost.toFixed(2)})` : ""}
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

function TemplateCard({
  title,
  value,
  rows,
  onChange,
}: {
  title: string;
  value: string;
  rows: number;
  onChange: (value: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={rows}
          className="font-mono text-sm"
        />
        <Button className="mt-4 w-full">Salvar template</Button>
      </CardContent>
    </Card>
  );
}

export default function AdminPackaging() {
  const [packagingConfig, setPackagingConfig] = useState(DEFAULT_CONFIG);
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES);

  const totalCost = useMemo(() => {
    const allOptions = [...ESSENTIAL_OPTIONS, ...DIFFERENTIAL_OPTIONS, ...PREMIUM_OPTIONS];
    return allOptions.reduce((sum, option) => {
      if (!option.cost || !packagingConfig[option.key]) {
        return sum;
      }
      return sum + option.cost;
    }, 0);
  }, [packagingConfig]);

  const updateOption = (key: PackagingKey, checked: boolean) => {
    setPackagingConfig((current) => ({
      ...current,
      [key]: checked,
    }));
  };

  return (
    <>
      <SEOHead
        title="Admin - Embalagem do produto"
        description="Configurar conteudo e templates da embalagem"
        noindex={true}
      />

      <AdminLayout>
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Embalagem do produto</h1>
          <p className="mt-2 text-muted-foreground">
            Configure o conteudo da caixa, os itens opcionais e os templates de impressao.
          </p>
        </div>

        <Alert className="mb-6">
          <Package className="h-4 w-4" />
          <AlertDescription>
            <strong>Custo total por embalagem:</strong> R$ {totalCost.toFixed(2)}
          </AlertDescription>
        </Alert>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Itens da embalagem
              </CardTitle>
              <CardDescription>Selecione o que entra em cada caixa.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <OptionGroup
                title="Essenciais"
                badgeVariant="default"
                options={ESSENTIAL_OPTIONS}
                values={packagingConfig}
                onToggle={updateOption}
              />
              <OptionGroup
                title="Diferenciais"
                badgeVariant="secondary"
                options={DIFFERENTIAL_OPTIONS}
                values={packagingConfig}
                onToggle={updateOption}
              />
              <OptionGroup
                title="Premium"
                badgeVariant="outline"
                options={PREMIUM_OPTIONS}
                values={packagingConfig}
                onToggle={updateOption}
              />
              <Button className="w-full">Salvar configuracao</Button>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <TemplateCard
              title="Cartao de agradecimento"
              value={templates.thankYouMessage}
              rows={12}
              onChange={(value) => setTemplates((current) => ({ ...current, thankYouMessage: value }))}
            />
            <TemplateCard
              title="Certificado de autenticidade"
              value={templates.certificateText}
              rows={10}
              onChange={(value) => setTemplates((current) => ({ ...current, certificateText: value }))}
            />
            <TemplateCard
              title="Manual de cuidados"
              value={templates.careInstructions}
              rows={12}
              onChange={(value) => setTemplates((current) => ({ ...current, careInstructions: value }))}
            />
          </div>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Guia de impressao
            </CardTitle>
            <CardDescription>Especificacoes tecnicas para cada material impresso.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <h4 className="font-semibold">Cartao de agradecimento</h4>
                <p className="text-sm text-muted-foreground">
                  Tamanho: 10x15 cm
                  <br />
                  Papel: couche 250 g
                  <br />
                  Impressao: colorida frente
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold">Certificado</h4>
                <p className="text-sm text-muted-foreground">
                  Tamanho: A5 (14,8x21 cm)
                  <br />
                  Papel: verge 180 g
                  <br />
                  Impressao: colorida frente
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold">Cartao postal</h4>
                <p className="text-sm text-muted-foreground">
                  Tamanho: 10x15 cm
                  <br />
                  Papel: couche 300 g
                  <br />
                  Impressao: frente e verso
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </AdminLayout>
    </>
  );
}
