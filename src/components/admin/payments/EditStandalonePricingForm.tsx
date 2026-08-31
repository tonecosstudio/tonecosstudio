import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  AlertCircle,
  Loader2,
  Package,
  RefreshCw,
  Save,
  ShoppingCart,
  Sparkles,
  Star,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  useStandalonePricing,
  useUpdateStandalonePricing,
} from "@/hooks/admin/useStandalonePricingAdmin";
import type { StandalonePricing } from "@/services/admin/pricing/standalone-pricing-admin-service";

type StandaloneType = StandalonePricing["character_type"];

interface OfficialStandaloneValues {
  rows: Record<StandaloneType, StandalonePricing>;
  pixDiscount: number;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Erro inesperado";
}

function isValidMoney(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isValidDiscount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
}

function readOfficialValues(
  pricing: StandalonePricing[] | undefined,
): OfficialStandaloneValues | null {
  if (!pricing) return null;

  const requiredTypes: StandaloneType[] = [
    "colecao_ativa",
    "colecao_secundaria",
    "catalogo_geral",
    "premium",
  ];

  const rows = Object.fromEntries(
    requiredTypes.map((type) => [type, pricing.find((row) => row.character_type === type)]),
  ) as Partial<Record<StandaloneType, StandalonePricing | undefined>>;

  if (
    requiredTypes.some((type) => {
      const row = rows[type];
      return (
        !row?.id ||
        !isValidMoney(row.price_full) ||
        !isValidMoney(row.price_pix) ||
        !isValidDiscount(row.pix_discount_percentage)
      );
    })
  ) {
    return null;
  }

  const completeRows = rows as Record<StandaloneType, StandalonePricing>;
  const discounts = new Set(
    requiredTypes.map((type) => completeRows[type].pix_discount_percentage),
  );

  if (discounts.size !== 1) return null;

  return {
    rows: completeRows,
    pixDiscount: completeRows.colecao_ativa.pix_discount_percentage,
  };
}

export function EditStandalonePricingForm() {
  const { toast } = useToast();
  const pricingQuery = useStandalonePricing();
  const updateMutation = useUpdateStandalonePricing();
  const officialValues = useMemo(
    () => readOfficialValues(pricingQuery.data),
    [pricingQuery.data],
  );

  const [priceColecaoAtiva, setPriceColecaoAtiva] = useState<number | null>(null);
  const [priceColecaoSecundaria, setPriceColecaoSecundaria] = useState<number | null>(null);
  const [priceCatalogoGeral, setPriceCatalogoGeral] = useState<number | null>(null);
  const [pricePremium, setPricePremium] = useState<number | null>(null);
  const [pixDiscount, setPixDiscount] = useState<number | null>(null);

  useEffect(() => {
    if (!officialValues) return;

    setPriceColecaoAtiva(officialValues.rows.colecao_ativa.price_full);
    setPriceColecaoSecundaria(officialValues.rows.colecao_secundaria.price_full);
    setPriceCatalogoGeral(officialValues.rows.catalogo_geral.price_full);
    setPricePremium(officialValues.rows.premium.price_full);
    setPixDiscount(officialValues.pixDiscount);
  }, [officialValues]);

  if (pricingQuery.isPending) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (pricingQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Não foi possível carregar os preços avulsos oficiais. Nenhum valor de exemplo foi
            carregado no editor.
          </span>
          <Button variant="outline" size="sm" onClick={() => void pricingQuery.refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!officialValues) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          A configuração de preços avulsos está incompleta, inválida ou usa descontos PIX
          inconsistentes entre categorias. O editor foi bloqueado para impedir que valores
          fictícios sejam persistidos como preços reais.
        </AlertDescription>
      </Alert>
    );
  }

  const effectiveDiscount = pixDiscount ?? Number.NaN;
  const calculatePix = (price: number | null) =>
    price !== null && Number.isFinite(effectiveDiscount)
      ? Math.round(price * (1 - effectiveDiscount / 100) * 100) / 100
      : null;

  const handleSave = () => {
    const prices = [
      priceColecaoAtiva,
      priceColecaoSecundaria,
      priceCatalogoGeral,
      pricePremium,
    ];

    if (prices.some((price) => price === null || !isValidMoney(price))) {
      toast({
        title: "Valores inválidos",
        description: "Todos os preços devem ser números maiores que zero.",
        variant: "destructive",
      });
      return;
    }

    if (!isValidDiscount(pixDiscount)) {
      toast({
        title: "Desconto inválido",
        description: "Desconto PIX deve estar entre 0% e 100%.",
        variant: "destructive",
      });
      return;
    }

    const [active, secondary, standard, premium] = prices as number[];
    if (active >= secondary || secondary >= standard || standard >= premium) {
      toast({
        title: "Hierarquia inválida",
        description: "Preços devem seguir: Coleção Ativa < Secundária < Catálogo < Premium.",
        variant: "destructive",
      });
      return;
    }

    updateMutation.mutate(
      {
        updates: [
          { id: officialValues.rows.colecao_ativa.id, price: active },
          { id: officialValues.rows.colecao_secundaria.id, price: secondary },
          { id: officialValues.rows.catalogo_geral.id, price: standard },
          { id: officialValues.rows.premium.id, price: premium },
        ],
        pixDiscount,
      },
      {
        onSuccess: () => {
          toast({
            title: "Preços atualizados!",
            description: "Os preços avulsos foram atualizados com sucesso.",
          });
        },
        onError: (error: unknown) => {
          toast({
            title: "Erro ao atualizar preços",
            description: getErrorMessage(error),
            variant: "destructive",
          });
        },
      },
    );
  };

  const cards = [
    {
      type: "Coleção Ativa",
      icon: Star,
      value: priceColecaoAtiva,
      setValue: setPriceColecaoAtiva,
      pix: calculatePix(priceColecaoAtiva),
    },
    {
      type: "Coleção Secundária",
      icon: Package,
      value: priceColecaoSecundaria,
      setValue: setPriceColecaoSecundaria,
      pix: calculatePix(priceColecaoSecundaria),
    },
    {
      type: "Catálogo Geral",
      icon: ShoppingCart,
      value: priceCatalogoGeral,
      setValue: setPriceCatalogoGeral,
      pix: calculatePix(priceCatalogoGeral),
    },
    {
      type: "Premium",
      icon: Sparkles,
      value: pricePremium,
      setValue: setPricePremium,
      pix: calculatePix(pricePremium),
    },
  ];

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Esta tela edita somente preços avulsos em reais. Ela não presume equivalência fixa entre
          reais e coins.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Editar Preços Avulsos (R$)</CardTitle>
          <CardDescription>Valores carregados exclusivamente das quatro linhas oficiais ativas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="space-y-2">
              <Label htmlFor="pix-discount" className="font-semibold text-blue-900">
                Desconto PIX (%)
              </Label>
              <Input
                id="pix-discount"
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={pixDiscount ?? ""}
                onChange={(e) => setPixDiscount(e.target.value === "" ? null : Number(e.target.value))}
                disabled={updateMutation.isPending}
                className="max-w-xs"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {cards.map((card) => {
              const Icon = card.icon;
              const inputId = `standalone-${card.type.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

              return (
                <Card key={card.type}>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">{card.type}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Label htmlFor={inputId}>Preço Cheio (R$)</Label>
                    <Input
                      id={inputId}
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={card.value ?? ""}
                      onChange={(e) => card.setValue(e.target.value === "" ? null : Number(e.target.value))}
                      disabled={updateMutation.isPending}
                    />
                    <div className="text-sm text-muted-foreground">
                      PIX: {card.pix === null ? "indisponível" : `R$ ${card.pix.toFixed(2)}`}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
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
