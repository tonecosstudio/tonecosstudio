import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, AlertCircle, Star, Package, ShoppingCart, Sparkles } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useStandalonePricing, useUpdateStandalonePricing } from "@/hooks/admin/useStandalonePricingAdmin";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Erro inesperado";
}

export function EditStandalonePricingForm() {
  const { toast } = useToast();
  const { data: pricing, isLoading } = useStandalonePricing();
  const updateMutation = useUpdateStandalonePricing();

  const colecaoAtiva = pricing?.find((p) => p.character_type === "colecao_ativa");
  const colecaoSecundaria = pricing?.find((p) => p.character_type === "colecao_secundaria");
  const catalogoGeral = pricing?.find((p) => p.character_type === "catalogo_geral");
  const premium = pricing?.find((p) => p.character_type === "premium");

  const [priceColecaoAtiva, setPriceColecaoAtiva] = useState(500);
  const [priceColecaoSecundaria, setPriceColecaoSecundaria] = useState(600);
  const [priceCatalogoGeral, setPriceCatalogoGeral] = useState(750);
  const [pricePremium, setPricePremium] = useState(900);
  const [pixDiscount, setPixDiscount] = useState(5);

  useEffect(() => {
    if (colecaoAtiva) {
      setPriceColecaoAtiva(colecaoAtiva.price_full);
      setPixDiscount(colecaoAtiva.pix_discount_percentage);
    }
    if (colecaoSecundaria) setPriceColecaoSecundaria(colecaoSecundaria.price_full);
    if (catalogoGeral) setPriceCatalogoGeral(catalogoGeral.price_full);
    if (premium) setPricePremium(premium.price_full);
  }, [colecaoAtiva, colecaoSecundaria, catalogoGeral, premium]);

  const pixColecaoAtiva = Math.round(priceColecaoAtiva * (1 - pixDiscount / 100) * 100) / 100;
  const pixColecaoSecundaria = Math.round(priceColecaoSecundaria * (1 - pixDiscount / 100) * 100) / 100;
  const pixCatalogoGeral = Math.round(priceCatalogoGeral * (1 - pixDiscount / 100) * 100) / 100;
  const pixPremium = Math.round(pricePremium * (1 - pixDiscount / 100) * 100) / 100;

  const handleSave = () => {
    if (
      priceColecaoAtiva < 1 ||
      priceColecaoSecundaria < 1 ||
      priceCatalogoGeral < 1 ||
      pricePremium < 1
    ) {
      toast({
        title: "Valores invalidos",
        description: "Todos os precos devem ser maiores que zero.",
        variant: "destructive",
      });
      return;
    }

    if (
      priceColecaoAtiva >= priceColecaoSecundaria ||
      priceColecaoSecundaria >= priceCatalogoGeral ||
      priceCatalogoGeral >= pricePremium
    ) {
      toast({
        title: "Hierarquia invalida",
        description: "Precos devem seguir: Colecao Ativa < Secundaria < Catalogo < Premium",
        variant: "destructive",
      });
      return;
    }

    if (pixDiscount < 0 || pixDiscount > 100) {
      toast({
        title: "Desconto invalido",
        description: "Desconto PIX deve estar entre 0% e 100%",
        variant: "destructive",
      });
      return;
    }

    updateMutation.mutate(
      {
        updates: [
          { id: colecaoAtiva?.id, price: priceColecaoAtiva },
          { id: colecaoSecundaria?.id, price: priceColecaoSecundaria },
          { id: catalogoGeral?.id, price: priceCatalogoGeral },
          { id: premium?.id, price: pricePremium },
        ],
        pixDiscount,
      },
      {
        onSuccess: () => {
          toast({
            title: "Precos atualizados!",
            description: "Os precos avulsos foram atualizados com sucesso.",
          });
        },
        onError: (error: unknown) => {
          toast({
            title: "Erro ao atualizar precos",
            description: getErrorMessage(error),
            variant: "destructive",
          });
        },
      }
    );
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

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Precos em REAIS (R$) para compras avulsas. Mapeamento direto com precos em coins.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Editar Precos Avulsos (em R$)</CardTitle>
          <CardDescription>Valores para compras avulsas - mapeamento direto com sistema de coins</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="space-y-2">
              <Label htmlFor="pix-discount" className="text-blue-900 font-semibold">
                Desconto PIX (%)
              </Label>
              <Input
                id="pix-discount"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={pixDiscount}
                onChange={(e) => setPixDiscount(Number(e.target.value))}
                disabled={updateMutation.isPending}
                className="max-w-xs"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-2 border-yellow-200 bg-yellow-50/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-600" />
                    <CardTitle className="text-lg">Colecao Ativa</CardTitle>
                  </div>
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                    200 coins
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Label htmlFor="price-colecao-ativa">Preco Cheio (R$)</Label>
                <Input
                  id="price-colecao-ativa"
                  type="number"
                  step="0.01"
                  min="1"
                  value={priceColecaoAtiva}
                  onChange={(e) => setPriceColecaoAtiva(Number(e.target.value))}
                  disabled={updateMutation.isPending}
                />
                <div className="text-sm">PIX: R$ {pixColecaoAtiva.toFixed(2)}</div>
              </CardContent>
            </Card>

            <Card className="border-2 border-blue-200 bg-blue-50/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-blue-600" />
                    <CardTitle className="text-lg">Colecao Secundaria</CardTitle>
                  </div>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    240 coins
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Label htmlFor="price-colecao-secundaria">Preco Cheio (R$)</Label>
                <Input
                  id="price-colecao-secundaria"
                  type="number"
                  step="0.01"
                  min="1"
                  value={priceColecaoSecundaria}
                  onChange={(e) => setPriceColecaoSecundaria(Number(e.target.value))}
                  disabled={updateMutation.isPending}
                />
                <div className="text-sm">PIX: R$ {pixColecaoSecundaria.toFixed(2)}</div>
              </CardContent>
            </Card>

            <Card className="border-2 border-purple-200 bg-purple-50/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5 text-purple-600" />
                    <CardTitle className="text-lg">Catalogo Geral</CardTitle>
                  </div>
                  <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                    300 coins
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Label htmlFor="price-catalogo-geral">Preco Cheio (R$)</Label>
                <Input
                  id="price-catalogo-geral"
                  type="number"
                  step="0.01"
                  min="1"
                  value={priceCatalogoGeral}
                  onChange={(e) => setPriceCatalogoGeral(Number(e.target.value))}
                  disabled={updateMutation.isPending}
                />
                <div className="text-sm">PIX: R$ {pixCatalogoGeral.toFixed(2)}</div>
              </CardContent>
            </Card>

            <Card className="border-2 border-orange-200 bg-orange-50/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-orange-600" />
                    <CardTitle className="text-lg">Premium</CardTitle>
                  </div>
                  <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                    450 coins
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Label htmlFor="price-premium">Preco Cheio (R$)</Label>
                <Input
                  id="price-premium"
                  type="number"
                  step="0.01"
                  min="1"
                  value={pricePremium}
                  onChange={(e) => setPricePremium(Number(e.target.value))}
                  disabled={updateMutation.isPending}
                />
                <div className="text-sm">PIX: R$ {pixPremium.toFixed(2)}</div>
              </CardContent>
            </Card>
          </div>

          <Button onClick={handleSave} disabled={updateMutation.isPending} className="w-full" size="lg">
            {updateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Todos os Precos
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
