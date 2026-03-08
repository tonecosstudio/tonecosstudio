/**
 * Formulário de Edição de Preços Avulsos (em R$) - 4 Tipos
 *
 * Mapeamento direto com preços em coins:
 * - Coleção Ativa (200 coins) → R$ 500
 * - Coleção Secundária (240 coins) → R$ 600
 * - Catálogo Geral (300 coins) → R$ 750
 * - Premium (450 coins) → R$ 900
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, AlertCircle, Star, Package, ShoppingCart, Sparkles } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface StandalonePricing {
  id: string;
  character_type: "colecao_ativa" | "colecao_secundaria" | "catalogo_geral" | "premium";
  price_full: number;
  price_pix: number;
  pix_discount_percentage: number;
  description: string;
}

export function EditStandalonePricingForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar preços atuais
  const { data: pricing, isLoading } = useQuery({
    queryKey: ["character-standalone-pricing"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("character_standalone_pricing")
        .select("*")
        .eq("is_active", true)
        .order("character_type");

      if (error) throw error;
      return data as StandalonePricing[];
    },
  });

  const colecaoAtiva = pricing?.find((p) => p.character_type === "colecao_ativa");
  const colecaoSecundaria = pricing?.find((p) => p.character_type === "colecao_secundaria");
  const catalogoGeral = pricing?.find((p) => p.character_type === "catalogo_geral");
  const premium = pricing?.find((p) => p.character_type === "premium");

  // Estados
  const [priceColecaoAtiva, setPriceColecaoAtiva] = useState(500);
  const [priceColecaoSecundaria, setPriceColecaoSecundaria] = useState(600);
  const [priceCatalogoGeral, setPriceCatalogoGeral] = useState(750);
  const [pricePremium, setPricePremium] = useState(900);
  const [pixDiscount, setPixDiscount] = useState(5);

  // Atualizar estados quando dados carregarem
  useEffect(() => {
    if (colecaoAtiva) {
      setPriceColecaoAtiva(colecaoAtiva.price_full);
      setPixDiscount(colecaoAtiva.pix_discount_percentage);
    }
    if (colecaoSecundaria) setPriceColecaoSecundaria(colecaoSecundaria.price_full);
    if (catalogoGeral) setPriceCatalogoGeral(catalogoGeral.price_full);
    if (premium) setPricePremium(premium.price_full);
  }, [colecaoAtiva, colecaoSecundaria, catalogoGeral, premium]);

  // Calcular preços PIX
  const pixColecaoAtiva = Math.round(priceColecaoAtiva * (1 - pixDiscount / 100) * 100) / 100;
  const pixColecaoSecundaria =
    Math.round(priceColecaoSecundaria * (1 - pixDiscount / 100) * 100) / 100;
  const pixCatalogoGeral = Math.round(priceCatalogoGeral * (1 - pixDiscount / 100) * 100) / 100;
  const pixPremium = Math.round(pricePremium * (1 - pixDiscount / 100) * 100) / 100;

  // Mutation para atualizar preços
  const updateMutation = useMutation({
    mutationFn: async () => {
      const updates = [
        { id: colecaoAtiva?.id, price: priceColecaoAtiva },
        { id: colecaoSecundaria?.id, price: priceColecaoSecundaria },
        { id: catalogoGeral?.id, price: priceCatalogoGeral },
        { id: premium?.id, price: pricePremium },
      ];

      for (const update of updates) {
        if (update.id) {
          const { error } = await supabase
            .from("character_standalone_pricing")
            .update({
              price_full: update.price,
              pix_discount_percentage: pixDiscount,
              updated_at: new Date().toISOString(),
            })
            .eq("id", update.id);

          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["character-standalone-pricing"] });
      toast({
        title: "Preços atualizados!",
        description: "Os preços avulsos foram atualizados com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar preços",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    // Validações
    if (
      priceColecaoAtiva < 1 ||
      priceColecaoSecundaria < 1 ||
      priceCatalogoGeral < 1 ||
      pricePremium < 1
    ) {
      toast({
        title: "Valores inválidos",
        description: "Todos os preços devem ser maiores que zero.",
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
        title: "Hierarquia inválida",
        description: "Preços devem seguir: Coleção Ativa < Secundária < Catálogo < Premium",
        variant: "destructive",
      });
      return;
    }

    if (pixDiscount < 0 || pixDiscount > 100) {
      toast({
        title: "Desconto inválido",
        description: "Desconto PIX deve estar entre 0% e 100%",
        variant: "destructive",
      });
      return;
    }

    updateMutation.mutate();
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
          Preços em REAIS (R$) para compras avulsas. Mapeamento direto com preços em coins.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Editar Preços Avulsos (em R$)</CardTitle>
          <CardDescription>
            Valores para compras avulsas - mapeamento direto com sistema de coins
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Desconto PIX Global */}
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setPixDiscount(Number(e.target.value))
                }
                disabled={updateMutation.isPending}
                className="max-w-xs"
              />
              <p className="text-xs text-blue-800">
                Desconto aplicado no pagamento via PIX (padrão: 5%)
              </p>
            </div>
          </div>

          {/* Grid de Preços */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Coleção Ativa */}
            <Card className="border-2 border-yellow-200 bg-yellow-50/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-600" />
                    <CardTitle className="text-lg">Coleção Ativa</CardTitle>
                  </div>
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                    200 coins
                  </Badge>
                </div>
                <CardDescription>Coleção escolhida pelo assinante</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="price-colecao-ativa">Preço Cheio (R$)</Label>
                  <Input
                    id="price-colecao-ativa"
                    type="number"
                    step="0.01"
                    min="1"
                    value={priceColecaoAtiva}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setPriceColecaoAtiva(Number(e.target.value))
                    }
                    disabled={updateMutation.isPending}
                  />
                </div>
                <div className="bg-yellow-50 rounded-lg p-3 space-y-1 border border-yellow-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Preço Cheio:</span>
                    <span className="font-semibold">R$ {priceColecaoAtiva.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Preço PIX:</span>
                    <span className="font-semibold text-green-600">
                      R$ {pixColecaoAtiva.toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Coleção Secundária */}
            <Card className="border-2 border-blue-200 bg-blue-50/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-blue-600" />
                    <CardTitle className="text-lg">Coleção Secundária</CardTitle>
                  </div>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    240 coins
                  </Badge>
                </div>
                <CardDescription>Outras coleções disponíveis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="price-colecao-secundaria">Preço Cheio (R$)</Label>
                  <Input
                    id="price-colecao-secundaria"
                    type="number"
                    step="0.01"
                    min="1"
                    value={priceColecaoSecundaria}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setPriceColecaoSecundaria(Number(e.target.value))
                    }
                    disabled={updateMutation.isPending}
                  />
                </div>
                <div className="bg-blue-50 rounded-lg p-3 space-y-1 border border-blue-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Preço Cheio:</span>
                    <span className="font-semibold">R$ {priceColecaoSecundaria.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Preço PIX:</span>
                    <span className="font-semibold text-green-600">
                      R$ {pixColecaoSecundaria.toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Catálogo Geral */}
            <Card className="border-2 border-purple-200 bg-purple-50/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5 text-purple-600" />
                    <CardTitle className="text-lg">Catálogo Geral</CardTitle>
                  </div>
                  <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                    300 coins
                  </Badge>
                </div>
                <CardDescription>Modelos especiais ou menos produzidos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="price-catalogo-geral">Preço Cheio (R$)</Label>
                  <Input
                    id="price-catalogo-geral"
                    type="number"
                    step="0.01"
                    min="1"
                    value={priceCatalogoGeral}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setPriceCatalogoGeral(Number(e.target.value))
                    }
                    disabled={updateMutation.isPending}
                  />
                </div>
                <div className="bg-purple-50 rounded-lg p-3 space-y-1 border border-purple-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Preço Cheio:</span>
                    <span className="font-semibold">R$ {priceCatalogoGeral.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Preço PIX:</span>
                    <span className="font-semibold text-green-600">
                      R$ {pixCatalogoGeral.toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Premium */}
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
                <CardDescription>Peças maiores ou mais complexas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="price-premium">Preço Cheio (R$)</Label>
                  <Input
                    id="price-premium"
                    type="number"
                    step="0.01"
                    min="1"
                    value={pricePremium}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setPricePremium(Number(e.target.value))
                    }
                    disabled={updateMutation.isPending}
                  />
                </div>
                <div className="bg-orange-50 rounded-lg p-3 space-y-1 border border-orange-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Preço Cheio:</span>
                    <span className="font-semibold">R$ {pricePremium.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Preço PIX:</span>
                    <span className="font-semibold text-green-600">R$ {pixPremium.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="w-full"
            size="lg"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Todos os Preços
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
