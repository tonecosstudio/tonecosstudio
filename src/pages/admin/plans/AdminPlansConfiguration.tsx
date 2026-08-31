import { useEffect, useState, type ComponentType } from "react";
import {
  Calendar,
  CheckCircle2,
  Coins,
  DollarSign,
  Loader2,
  Package,
  RefreshCw,
  Save,
} from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { CharacterPricesReference } from "@/components/admin/payments/CharacterPricesReference";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  useAdminPlansConfiguration,
  useCoinExchangeRate,
  useSavePricingTierPlan,
  type PricingTierPlan,
} from "@/hooks/admin/useAdminPlansConfiguration";
import { usePricingSettings } from "@/hooks/usePricingSettings";
import type { AdminPlanType } from "@/services/admin/config/admin-plans-configuration-service";

interface PlanTypeMeta {
  key: AdminPlanType;
  label: string;
  months: number;
  icon: ComponentType<{ className?: string }>;
}

const PLAN_TYPES: readonly PlanTypeMeta[] = [
  { key: "avulso", label: "Compra avulsa", months: 0, icon: Package },
  { key: "bimestral", label: "Bimestral", months: 2, icon: Calendar },
  { key: "trimestral", label: "Trimestral", months: 3, icon: Calendar },
  { key: "semestral", label: "Semestral", months: 6, icon: Calendar },
  { key: "anual", label: "Anual", months: 12, icon: Calendar },
];

function isPositiveFinite(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function CoinExchangeRateCard() {
  const { data: rate, isLoading, isError, error, refetch } = useCoinExchangeRate();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-6 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Validando a cotação de coins...
        </CardContent>
      </Card>
    );
  }

  if (isError || !rate || !isPositiveFinite(rate.reais_amount) || !isPositiveFinite(rate.coins_amount)) {
    return (
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle>Cotação de coins indisponível</CardTitle>
          <CardDescription>
            A cotação deve vir de uma categoria de preço ativa. Nenhum valor local é usado como fallback.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {error instanceof Error && <p className="text-sm text-muted-foreground">{error.message}</p>}
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  const unitValue = rate.reais_amount / rate.coins_amount;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5" />
          Cotação de coins
        </CardTitle>
        <CardDescription>
          Somente leitura. Derivada da primeira categoria de preço ativa no SSOT.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Referência</p>
          <p className="mt-1 text-xl font-bold">R$ {rate.reais_amount.toFixed(2)}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Coins</p>
          <p className="mt-1 text-xl font-bold">{rate.coins_amount.toLocaleString("pt-BR")}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Valor unitário</p>
          <p className="mt-1 text-xl font-bold">R$ {unitValue.toFixed(4)}</p>
        </div>
      </CardContent>
    </Card>
  );
}

interface PlanEditorProps {
  meta: PlanTypeMeta;
  existingPlan?: PricingTierPlan;
  pixDiscountPercentage: number;
  coinUnitValue: number;
}

function PlanEditor({ meta, existingPlan, pixDiscountPercentage, coinUnitValue }: PlanEditorProps) {
  const { toast } = useToast();
  const saveMutation = useSavePricingTierPlan();
  const [isEditing, setIsEditing] = useState(!existingPlan);
  const [name, setName] = useState(existingPlan?.name ?? `Plano ${meta.label}`);
  const [priceFull, setPriceFull] = useState(
    isPositiveFinite(existingPlan?.price_full ?? existingPlan?.price)
      ? String(existingPlan?.price_full ?? existingPlan?.price)
      : "",
  );
  const [deliveries, setDeliveries] = useState(
    existingPlan?.pieces_per_subscription != null
      ? String(existingPlan.pieces_per_subscription)
      : "",
  );
  const [coinsIncluded, setCoinsIncluded] = useState(
    existingPlan?.base_credits != null ? String(existingPlan.base_credits) : "0",
  );
  const [isActive, setIsActive] = useState(existingPlan?.is_active ?? false);

  useEffect(() => {
    setName(existingPlan?.name ?? `Plano ${meta.label}`);
    setPriceFull(
      isPositiveFinite(existingPlan?.price_full ?? existingPlan?.price)
        ? String(existingPlan?.price_full ?? existingPlan?.price)
        : "",
    );
    setDeliveries(
      existingPlan?.pieces_per_subscription != null
        ? String(existingPlan.pieces_per_subscription)
        : "",
    );
    setCoinsIncluded(existingPlan?.base_credits != null ? String(existingPlan.base_credits) : "0");
    setIsActive(existingPlan?.is_active ?? false);
  }, [existingPlan, meta.label]);

  const numericPrice = Number(priceFull);
  const numericDeliveries = Number(deliveries);
  const numericCoins = Number(coinsIncluded);
  const pricePix = numericPrice * (1 - pixDiscountPercentage / 100);
  const priceCoins = numericPrice / coinUnitValue;

  const canSave =
    name.trim().length > 0 &&
    Number.isFinite(numericPrice) &&
    numericPrice > 0 &&
    Number.isInteger(numericDeliveries) &&
    numericDeliveries > 0 &&
    Number.isInteger(numericCoins) &&
    numericCoins >= 0 &&
    Number.isFinite(pricePix) &&
    pricePix > 0 &&
    Number.isFinite(priceCoins) &&
    priceCoins > 0;

  const handleSave = () => {
    if (!canSave) {
      toast({
        title: "Plano inválido",
        description: "Preencha nome, preço e quantidade de entregas com valores oficiais válidos.",
        variant: "destructive",
      });
      return;
    }

    saveMutation.mutate(
      {
        id: existingPlan?.id,
        planType: meta.key,
        data: {
          name: name.trim(),
          display_name: name.trim(),
          price_coins: Math.round(priceCoins),
          price_brl: numericPrice,
          price_full: numericPrice,
          price_pix: pricePix,
          deposit_amount: 0,
          coins_included: numericCoins,
          deliveries_total: numericDeliveries,
          is_active: isActive,
          description:
            meta.months > 0 ? `${meta.months} meses de assinatura` : "Compra avulsa",
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Plano salvo", description: `${name.trim()} foi atualizado.` });
          setIsEditing(false);
        },
        onError: (mutationError: Error) => {
          toast({
            title: "Erro ao salvar plano",
            description: mutationError.message,
            variant: "destructive",
          });
        },
      },
    );
  };

  const Icon = meta.icon;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-muted p-3">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                {meta.label}
                {existingPlan && isActive && (
                  <Badge>
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Ativo
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {meta.months > 0 ? `${meta.months} meses` : "Compra única"}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Label htmlFor={`plan-active-${meta.key}`}>Ativo</Label>
            <Switch
              id={`plan-active-${meta.key}`}
              checked={isActive}
              onCheckedChange={(checked) => {
                setIsActive(checked);
                setIsEditing(true);
              }}
            />
            <Button variant="outline" size="sm" onClick={() => setIsEditing((current) => !current)}>
              {isEditing ? "Fechar edição" : "Editar"}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {isEditing ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor={`plan-name-${meta.key}`}>Nome</Label>
                <Input
                  id={`plan-name-${meta.key}`}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`plan-price-${meta.key}`}>Preço cheio (R$)</Label>
                <Input
                  id={`plan-price-${meta.key}`}
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={priceFull}
                  onChange={(event) => setPriceFull(event.target.value)}
                  placeholder="Obrigatório"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`plan-deliveries-${meta.key}`}>Entregas / peças</Label>
                <Input
                  id={`plan-deliveries-${meta.key}`}
                  type="number"
                  min="1"
                  step="1"
                  value={deliveries}
                  onChange={(event) => setDeliveries(event.target.value)}
                  placeholder="Obrigatório"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`plan-coins-${meta.key}`}>Coins incluídos</Label>
                <Input
                  id={`plan-coins-${meta.key}`}
                  type="number"
                  min="0"
                  step="1"
                  value={coinsIncluded}
                  onChange={(event) => setCoinsIncluded(event.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-3 rounded-lg border bg-muted/30 p-4 text-sm sm:grid-cols-3">
              <div>
                <p className="text-muted-foreground">PIX oficial</p>
                <strong>{canSave ? `R$ ${pricePix.toFixed(2)}` : "Indisponível"}</strong>
              </div>
              <div>
                <p className="text-muted-foreground">Equivalência em coins</p>
                <strong>{canSave ? `${Math.round(priceCoins)} coins` : "Indisponível"}</strong>
              </div>
              <div>
                <p className="text-muted-foreground">Desconto PIX aplicado</p>
                <strong>{pixDiscountPercentage.toFixed(2).replace(".", ",")}%</strong>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={!canSave || saveMutation.isPending}>
                {saveMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Salvar plano
              </Button>
            </div>
          </>
        ) : (
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Preço cheio</p>
              <p className="font-semibold">
                {isPositiveFinite(existingPlan?.price_full ?? existingPlan?.price)
                  ? `R$ ${Number(existingPlan?.price_full ?? existingPlan?.price).toFixed(2)}`
                  : "Não configurado"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Entregas</p>
              <p className="font-semibold">{existingPlan?.pieces_per_subscription ?? "Não configurado"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Coins incluídos</p>
              <p className="font-semibold">{existingPlan?.base_credits ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="font-semibold">{isActive ? "Ativo" : "Inativo"}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminPlansConfiguration() {
  const plansQuery = useAdminPlansConfiguration();
  const exchangeRateQuery = useCoinExchangeRate();
  const pricingQuery = usePricingSettings();

  const plans = plansQuery.data ?? [];
  const rate = exchangeRateQuery.data;
  const officialDiscount = pricingQuery.data?.pixDiscountPercentage;
  const coinUnitValue =
    rate && isPositiveFinite(rate.reais_amount) && isPositiveFinite(rate.coins_amount)
      ? rate.reais_amount / rate.coins_amount
      : null;
  const pricingReady =
    coinUnitValue !== null &&
    officialDiscount !== undefined &&
    Number.isFinite(officialDiscount) &&
    officialDiscount >= 0 &&
    officialDiscount <= 100;

  return (
    <div className="space-y-6">
      <SEOHead
        title="Admin - Gestão de Planos & Preços"
        description="Configuração administrativa de planos usando fontes oficiais"
        noindex
      />

      <div>
        <h1 className="text-4xl font-bold tracking-tight">Gestão de Planos & Preços</h1>
        <p className="mt-2 text-muted-foreground">
          Planos, cotação de coins e desconto PIX sem valores monetários de fallback.
        </p>
      </div>

      <Alert>
        <DollarSign className="h-4 w-4" />
        <AlertDescription>
          A tela só permite salvar planos quando a cotação de coins e o desconto PIX oficial estão válidos.
        </AlertDescription>
      </Alert>

      <CharacterPricesReference />
      <CoinExchangeRateCard />

      {plansQuery.isLoading || pricingQuery.isLoading || exchangeRateQuery.isLoading ? (
        <Card>
          <CardContent className="flex items-center gap-3 py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Validando fontes oficiais...
          </CardContent>
        </Card>
      ) : !pricingReady ? (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle>Edição de planos bloqueada</CardTitle>
            <CardDescription>
              Corrija a configuração comercial ou a categoria de preço ativa antes de alterar planos.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void pricingQuery.refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Recarregar preços
            </Button>
            <Button variant="outline" onClick={() => void exchangeRateQuery.refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Recarregar cotação
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {PLAN_TYPES.map((meta) => (
            <PlanEditor
              key={meta.key}
              meta={meta}
              existingPlan={plans.find((plan) => plan.plan_type === meta.key)}
              pixDiscountPercentage={officialDiscount}
              coinUnitValue={coinUnitValue}
            />
          ))}
        </div>
      )}
    </div>
  );
}
