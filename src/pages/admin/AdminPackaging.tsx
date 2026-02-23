import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Package, FileText, Image, Gift, CheckCircle2, AlertCircle } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AdminPackaging() {
  const [packagingConfig, setPackagingConfig] = useState({
    // Essenciais
    certificate: true,
    thankYouCard: true,
    careManual: true,
    bubbleWrap: true,
    box: true,
    
    // Diferenciais
    postcard: true,
    sticker: true,
    qrCode: true,
    bookmark: true,
    tissuePaper: true,
    customSeal: true,
    
    // Premium
    handwrittenNote: false,
    polaroidPhoto: false,
    surpriseGift: false,
  });

  const [templates, setTemplates] = useState({
    thankYouMessage: `🎉 Parabéns, Colecionador!

Você acaba de receber uma peça exclusiva da nossa coleção!

Esta miniatura foi cuidadosamente esculpida e pintada à mão.

Peça: #[NUMERO] de [TOTAL]
Personagem: [NOME]
Série: [SERIE]
Data: [MES/ANO]

📸 Compartilhe sua coleção!
Use #MinhaColecao[SERIE]

Obrigado por fazer parte da nossa comunidade!

Com carinho,
[SUA ASSINATURA]`,
    
    certificateText: `✨ CERTIFICADO ORDAX

Este documento certifica que a miniatura é original e faz parte do ciclo Ordax.

Personagem: [NOME COMPLETO]
Série: [NOME DA SERIE]
Número: #[XXX] de [TOTAL]
Material: Resina
Altura: [XX]cm
Pintada à mão
Data de produção: [MES/ANO]`,
    
    postcardBack: `[NOME] - [TÍTULO]
[Série] Collection

"[Frase icônica do personagem]"

[Descrição breve do personagem em 3-4 linhas]

📅 [Mês/Ano]
🎨 Pintada à mão
⚠️ Produto artístico artesanal. Produto não oficial.

www.suamarca.com.br
@suamarca`,
    
    careInstructions: `🛡️ GUIA DE CUIDADOS

Como cuidar da sua miniatura:

✅ Limpe com pincel macio
✅ Evite luz solar direta
✅ Mantenha em local seco
✅ Não use produtos químicos
✅ Temperatura ambiente ideal

💡 DICAS DE EXPOSIÇÃO:
• Use prateleiras com LED
• Crie cenários temáticos
• Agrupe por série
• Fotografe e compartilhe!

⚠️ ATENÇÃO:
Produto artesanal. Pequenas variações são normais e fazem cada peça única!`,
  });

  const [costs, setCosts] = useState({
    box: 3.00,
    postcard: 1.50,
    certificate: 1.00,
    careManual: 0.50,
    thankYouCard: 0.50,
    tissuePaper: 1.00,
    bubbleWrap: 1.00,
    sticker: 0.50,
    bookmark: 1.00,
    customSeal: 0.50,
  });

  const calculateTotalCost = () => {
    let total = 0;
    if (packagingConfig.box) total += costs.box;
    if (packagingConfig.postcard) total += costs.postcard;
    if (packagingConfig.certificate) total += costs.certificate;
    if (packagingConfig.careManual) total += costs.careManual;
    if (packagingConfig.thankYouCard) total += costs.thankYouCard;
    if (packagingConfig.tissuePaper) total += costs.tissuePaper;
    if (packagingConfig.bubbleWrap) total += costs.bubbleWrap;
    if (packagingConfig.sticker) total += costs.sticker;
    if (packagingConfig.bookmark) total += costs.bookmark;
    if (packagingConfig.customSeal) total += costs.customSeal;
    return total.toFixed(2);
  };

  return (
    <>
      <SEOHead
        title="Admin - Embalagem do Produto"
        description="Configurar conteúdo e templates da embalagem"
        noindex={true}
      />

      <AdminLayout>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Embalagem do Produto</h1>
          <p className="text-muted-foreground mt-2">
            Configure o conteúdo da caixa e templates de impressão
          </p>
        </div>

        {/* Alert de Custo */}
        <Alert className="mb-6">
          <Package className="h-4 w-4" />
          <AlertDescription>
            <strong>Custo Total por Embalagem:</strong> R$ {calculateTotalCost()}
          </AlertDescription>
        </Alert>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Checklist de Itens */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Itens da Embalagem
              </CardTitle>
              <CardDescription>
                Selecione o que incluir em cada caixa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Essenciais */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Badge variant="default">Essenciais</Badge>
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="certificate"
                      checked={packagingConfig.certificate}
                      onCheckedChange={(checked) =>
                        setPackagingConfig({ ...packagingConfig, certificate: checked as boolean })
                      }
                    />
                    <label htmlFor="certificate" className="text-sm cursor-pointer">
                      Certificado de Autenticidade (R$ {costs.certificate.toFixed(2)})
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="thankYouCard"
                      checked={packagingConfig.thankYouCard}
                      onCheckedChange={(checked) =>
                        setPackagingConfig({ ...packagingConfig, thankYouCard: checked as boolean })
                      }
                    />
                    <label htmlFor="thankYouCard" className="text-sm cursor-pointer">
                      Cartão de Agradecimento (R$ {costs.thankYouCard.toFixed(2)})
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="careManual"
                      checked={packagingConfig.careManual}
                      onCheckedChange={(checked) =>
                        setPackagingConfig({ ...packagingConfig, careManual: checked as boolean })
                      }
                    />
                    <label htmlFor="careManual" className="text-sm cursor-pointer">
                      Manual de Cuidados (R$ {costs.careManual.toFixed(2)})
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="bubbleWrap"
                      checked={packagingConfig.bubbleWrap}
                      onCheckedChange={(checked) =>
                        setPackagingConfig({ ...packagingConfig, bubbleWrap: checked as boolean })
                      }
                    />
                    <label htmlFor="bubbleWrap" className="text-sm cursor-pointer">
                      Plástico Bolha (R$ {costs.bubbleWrap.toFixed(2)})
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="box"
                      checked={packagingConfig.box}
                      onCheckedChange={(checked) =>
                        setPackagingConfig({ ...packagingConfig, box: checked as boolean })
                      }
                    />
                    <label htmlFor="box" className="text-sm cursor-pointer">
                      Caixa Personalizada (R$ {costs.box.toFixed(2)})
                    </label>
                  </div>
                </div>
              </div>

              {/* Diferenciais */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Badge variant="secondary">Diferenciais</Badge>
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="postcard"
                      checked={packagingConfig.postcard}
                      onCheckedChange={(checked) =>
                        setPackagingConfig({ ...packagingConfig, postcard: checked as boolean })
                      }
                    />
                    <label htmlFor="postcard" className="text-sm cursor-pointer">
                      Cartão Postal (R$ {costs.postcard.toFixed(2)})
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sticker"
                      checked={packagingConfig.sticker}
                      onCheckedChange={(checked) =>
                        setPackagingConfig({ ...packagingConfig, sticker: checked as boolean })
                      }
                    />
                    <label htmlFor="sticker" className="text-sm cursor-pointer">
                      Adesivo da Marca (R$ {costs.sticker.toFixed(2)})
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="qrCode"
                      checked={packagingConfig.qrCode}
                      onCheckedChange={(checked) =>
                        setPackagingConfig({ ...packagingConfig, qrCode: checked as boolean })
                      }
                    />
                    <label htmlFor="qrCode" className="text-sm cursor-pointer">
                      Código QR (Grupo VIP)
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="bookmark"
                      checked={packagingConfig.bookmark}
                      onCheckedChange={(checked) =>
                        setPackagingConfig({ ...packagingConfig, bookmark: checked as boolean })
                      }
                    />
                    <label htmlFor="bookmark" className="text-sm cursor-pointer">
                      Marcador de Página (R$ {costs.bookmark.toFixed(2)})
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="tissuePaper"
                      checked={packagingConfig.tissuePaper}
                      onCheckedChange={(checked) =>
                        setPackagingConfig({ ...packagingConfig, tissuePaper: checked as boolean })
                      }
                    />
                    <label htmlFor="tissuePaper" className="text-sm cursor-pointer">
                      Papel de Seda (R$ {costs.tissuePaper.toFixed(2)})
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="customSeal"
                      checked={packagingConfig.customSeal}
                      onCheckedChange={(checked) =>
                        setPackagingConfig({ ...packagingConfig, customSeal: checked as boolean })
                      }
                    />
                    <label htmlFor="customSeal" className="text-sm cursor-pointer">
                      Lacre Personalizado (R$ {costs.customSeal.toFixed(2)})
                    </label>
                  </div>
                </div>
              </div>

              {/* Premium */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Badge variant="outline">Premium</Badge>
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="handwrittenNote"
                      checked={packagingConfig.handwrittenNote}
                      onCheckedChange={(checked) =>
                        setPackagingConfig({ ...packagingConfig, handwrittenNote: checked as boolean })
                      }
                    />
                    <label htmlFor="handwrittenNote" className="text-sm cursor-pointer">
                      Mensagem Manuscrita
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="polaroidPhoto"
                      checked={packagingConfig.polaroidPhoto}
                      onCheckedChange={(checked) =>
                        setPackagingConfig({ ...packagingConfig, polaroidPhoto: checked as boolean })
                      }
                    />
                    <label htmlFor="polaroidPhoto" className="text-sm cursor-pointer">
                      Foto Polaroid do Processo
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="surpriseGift"
                      checked={packagingConfig.surpriseGift}
                      onCheckedChange={(checked) =>
                        setPackagingConfig({ ...packagingConfig, surpriseGift: checked as boolean })
                      }
                    />
                    <label htmlFor="surpriseGift" className="text-sm cursor-pointer">
                      Brinde Surpresa
                    </label>
                  </div>
                </div>
              </div>

              <Button className="w-full">
                Salvar Configuração
              </Button>
            </CardContent>
          </Card>

          {/* Templates de Texto */}
          <div className="space-y-6">
            {/* Cartão de Agradecimento */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Cartão de Agradecimento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={templates.thankYouMessage}
                  onChange={(e) => setTemplates({ ...templates, thankYouMessage: e.target.value })}
                  rows={12}
                  className="font-mono text-sm"
                />
                <Button className="w-full mt-4">
                  Salvar Template
                </Button>
              </CardContent>
            </Card>

            {/* Certificado */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Certificado de Autenticidade
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={templates.certificateText}
                  onChange={(e) => setTemplates({ ...templates, certificateText: e.target.value })}
                  rows={10}
                  className="font-mono text-sm"
                />
                <Button className="w-full mt-4">
                  Salvar Template
                </Button>
              </CardContent>
            </Card>

            {/* Manual de Cuidados */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Manual de Cuidados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={templates.careInstructions}
                  onChange={(e) => setTemplates({ ...templates, careInstructions: e.target.value })}
                  rows={12}
                  className="font-mono text-sm"
                />
                <Button className="w-full mt-4">
                  Salvar Template
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Guia de Impressão */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Guia de Impressão
            </CardTitle>
            <CardDescription>
              Especificações técnicas para impressão dos materiais
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <h4 className="font-semibold">Cartão de Agradecimento</h4>
                <p className="text-sm text-muted-foreground">
                  Tamanho: 10x15cm<br />
                  Papel: Couché 250g<br />
                  Impressão: Colorida frente
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold">Certificado</h4>
                <p className="text-sm text-muted-foreground">
                  Tamanho: A5 (14,8x21cm)<br />
                  Papel: Vergê 180g<br />
                  Impressão: Colorida frente
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold">Cartão Postal</h4>
                <p className="text-sm text-muted-foreground">
                  Tamanho: 10x15cm<br />
                  Papel: Couché 300g<br />
                  Impressão: Colorida frente/verso
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </AdminLayout>
    </>
  );
}
