import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calculator, DollarSign, Package, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PRICING } from "@/config/constants";
import {
  calculateNetValues,
  formatCurrency,
  TAX_RATES,
  usePricingSettings,
} from "@/hooks/usePricingSettings";
import { listActiveSubscriptionPlans } from "@/services/subscriptions/subscription-plans-service";

type Preset = {
  label: string;
  value: number;
  pieces: number;
};

const PLAN_LABELS: Record<string, string> = {
  avulso: "Avulso",
  mensal: "Mensal",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
};

function parseMoney(value: string): number | null {
  const parsed = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function validPercentage(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value) && value >= 0 && value <= 100;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2).replace(".", ",")}%`;
}

export default function PaymentCalculator() {
  const {
    data: pricingSettings,
    isLoading: pricingLoading,
    isError: pricingError,
    error: pricingQueryError,
  } = usePricingSettings();
  const { data: subscriptionPlans = [] } = useQuery({
    queryKey: ["payment-calculator", "subscription-plans"],
    queryFn: listActiveSubscriptionPlans,
    staleTime: 5 * 60 * 1000,
  });

  const defaultPriceFull = pricingSettings?.defaultPriceFull;
  const pixDiscountPercentage = pricingSettings?.pixDiscountPercentage;
  const pricingAvailable =
    defaultPriceFull !== undefined &&
    Number.isFinite(defaultPriceFull) &&
    defaultPriceFull > 0 &&
    validPercentage(pixDiscountPercentage);

  const [value, setValue] = useState("");
  const [desiredNetValue, setDesiredNetValue] = useState("");
  const [calculationMode, setCalculationMode] = useState<"charge" | "receive">("charge");
  const [hasCustomValue, setHasCustomValue] = useState(false);

  useEffect(() => {
    if (!hasCustomValue && pricingAvailable) {
      const next = String(defaultPriceFull);
      setValue(next);
      setDesiredNetValue(next);
    }
  }, [defaultPriceFull, hasCustomValue, pricingAvailable]);

  const presets = useMemo<Preset[]>(() => {
    if (!pricingAvailable) return [];

    const officialPlans = subscriptionPlans
      .filter(
        (plan) =>
          plan.plan_type &&
          typeof plan.price_full === "number" &&
          Number.isFinite(plan.price_full) &&
          plan.price_full > 0 &&
          typeof plan.deliveries_total === "number" &&
          Number.isInteger(plan.deliveries_total) &&
          plan.deliveries_total > 0,
      )
      .map((plan) => ({
        label: PLAN_LABELS[plan.plan_type] ?? plan.name,
        value: Number(plan.price_full),
        pieces: plan.deliveries_total as number,
      }));

    const standalone: Preset = {
      label: PLAN_LABELS.avulso,
      value: defaultPriceFull,
      pieces: 1,
    };

    return [standalone, ...officialPlans].reduce<Preset[]>((acc, preset) => {
      if (!acc.some((item) => item.label === preset.label && item.value === preset.value)) {
        acc.push(preset);
      }
      return acc;
    }, []);
  }, [defaultPriceFull, pricingAvailable, subscriptionPlans]);

  if (pricingLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Calculadora de pagamentos</CardTitle>
          <CardDescription>Validando a configuração comercial oficial...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (pricingError || !pricingAvailable) {
    return (
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle>Calculadora temporariamente indisponível</CardTitle>
          <CardDescription>
            Não foi possível validar preço base e desconto PIX no cadastro oficial. A calculadora não usa valores de fallback.
          </CardDescription>
        </CardHeader>
        {pricingQueryError instanceof Error && (
          <CardContent>
            <p className="text-sm text-muted-foreground">{pricingQueryError.message}</p>
          </CardContent>
        )}
      </Card>
    );
  }

  const numericValue = parseMoney(value);
  const desiredNumericValue = parseMoney(desiredNetValue);
  const selectedPreset = numericValue
    ? presets.find((preset) => preset.value === numericValue)
    : undefined;
  const netValues = numericValue
    ? calculateNetValues(numericValue, pixDiscountPercentage)
    : null;

  const pixDiscountRate = pixDiscountPercentage / 100;
  const sixInstallmentsTax = TAX_RATES.taxSaleInstallment + TAX_RATES.taxInstallment6x;
  const storeTenInstallmentsTax = TAX_RATES.taxSaleInstallment + TAX_RATES.taxInstallment10xStore;
  const clientTenInstallmentsNetRate = 1 - TAX_RATES.taxSaleInstallment;

  const receiveTargets = desiredNumericValue
    ? {
        pix:
          desiredNumericValue /
          ((1 - pixDiscountRate) * (1 - TAX_RATES.taxPix || 1)),
        six: desiredNumericValue / (1 - sixInstallmentsTax || 1),
        tenStore: desiredNumericValue / (1 - storeTenInstallmentsTax || 1),
        tenClient: desiredNumericValue / (clientTenInstallmentsNetRate || 1),
      }
    : null;

  const scenarios = netValues
    ? [
        {
          key: "pix",
          title: `PIX (${pixDiscountPercentage.toFixed(0)}% OFF)`,
          icon: DollarSign,
          clientPays: netValues.pix.clientPays,
          fees: netValues.pix.tax,
          youReceive: netValues.pix.youReceive,
          feeLabel: `Taxa ${formatPercent(TAX_RATES.taxPix)}`,
        },
        {
          key: "six",
          title: `${PRICING.MAX_INSTALLMENTS_NO_INTEREST}x sem juros`,
          icon: TrendingUp,
          clientPays: netValues.installment6x.clientPays,
          fees: netValues.installment6x.taxes,
          youReceive: netValues.installment6x.youReceive,
          installmentValue: netValues.installment6x.installmentValue,
          feeLabel: `Taxas ${formatPercent(sixInstallmentsTax)}`,
        },
        {
          key: "ten-store",
          title: `${PRICING.MAX_INSTALLMENTS_WITH_INTEREST}x — loja absorve juros`,
          icon: TrendingUp,
          clientPays: netValues.installment10xStore.clientPays,
          fees: netValues.installment10xStore.taxes,
          youReceive: netValues.installment10xStore.youReceive,
          installmentValue: netValues.installment10xStore.installmentValue,
          feeLabel: `Taxas ${formatPercent(storeTenInstallmentsTax)}`,
        },
        {
          key: "ten-client",
          title: `${PRICING.MAX_INSTALLMENTS_WITH_INTEREST}x — cliente paga juros`,
          icon: TrendingUp,
          clientPays: netValues.installment10xClient.clientPays,
          fees: netValues.installment10xClient.taxes,
          youReceive: netValues.installment10xClient.youReceive,
          installmentValue: netValues.installment10xClient.installmentValue,
          feeLabel: `Taxas ${formatPercent(
            TAX_RATES.taxSaleInstallment + TAX_RATES.taxInstallment10xClient,
          )}`,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-2 flex items-center gap-3 text-4xl font-bold tracking-tight">
          <Calculator className="h-10 w-10" />
          Calculadora Mercado Pago
        </h1>
        <p className="text-muted-foreground">
          Simulação administrativa baseada somente na configuração comercial oficial carregada do banco.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Valor da venda</CardTitle>
          <CardDescription>
            Escolha um preço oficial ou informe manualmente um valor para simulação.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {presets.length > 0 && (
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {presets.map((preset) => (
                <Button
                  key={`${preset.label}-${preset.value}`}
                  variant={numericValue === preset.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setHasCustomValue(true);
                    setValue(String(preset.value));
                  }}
                  className="flex h-auto flex-col py-3"
                >
                  <Package className="mb-1 h-4 w-4" />
                  <span className="font-semibold">{preset.label}</span>
                  <span className="text-xs opacity-70">{formatCurrency(preset.value)}</span>
                  <span className="text-xs opacity-60">
                    {preset.pieces} peça{preset.pieces > 1 ? "s" : ""}
                  </span>
                </Button>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="payment-calculator-value">Valor para simular (R$)</Label>
            <Input
              id="payment-calculator-value"
              type="number"
              step="0.01"
              min="0.01"
              value={value}
              onChange={(event) => {
                setHasCustomValue(true);
                setValue(event.target.value);
              }}
              placeholder="Informe um valor"
              className="h-14 text-2xl font-bold"
            />
          </div>

          <div className="border-t pt-4">
            <div className="mb-3 flex gap-2">
              <Button
                variant={calculationMode === "charge" ? "default" : "outline"}
                size="sm"
                onClick={() => setCalculationMode("charge")}
                className="flex-1"
              >
                Quanto cobrar?
              </Button>
              <Button
                variant={calculationMode === "receive" ? "default" : "outline"}
                size="sm"
                onClick={() => setCalculationMode("receive")}
                className="flex-1"
              >
                Quanto preciso cobrar para receber?
              </Button>
            </div>

            {calculationMode === "receive" && (
              <div className="space-y-3">
                <Label htmlFor="payment-calculator-net">Valor líquido desejado (R$)</Label>
                <Input
                  id="payment-calculator-net"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={desiredNetValue}
                  onChange={(event) => setDesiredNetValue(event.target.value)}
                  placeholder="Informe o valor líquido desejado"
                />
                {receiveTargets && (
                  <div className="grid gap-2 rounded-lg border p-3 text-sm md:grid-cols-2">
                    <p>PIX: <strong>{formatCurrency(receiveTargets.pix)}</strong></p>
                    <p>{PRICING.MAX_INSTALLMENTS_NO_INTEREST}x: <strong>{formatCurrency(receiveTargets.six)}</strong></p>
                    <p>{PRICING.MAX_INSTALLMENTS_WITH_INTEREST}x loja: <strong>{formatCurrency(receiveTargets.tenStore)}</strong></p>
                    <p>{PRICING.MAX_INSTALLMENTS_WITH_INTEREST}x cliente: <strong>{formatCurrency(receiveTargets.tenClient)}</strong></p>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {!numericValue ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Informe um valor positivo para executar a simulação.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {scenarios.map((scenario) => {
            const Icon = scenario.icon;
            return (
              <Card key={scenario.key}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="h-5 w-5" />
                    {scenario.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cliente paga</span>
                    <strong>{formatCurrency(scenario.clientPays)}</strong>
                  </div>
                  {scenario.installmentValue !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Parcela</span>
                      <span>{formatCurrency(scenario.installmentValue)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{scenario.feeLabel}</span>
                    <span className="text-destructive">- {formatCurrency(scenario.fees)}</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between text-base">
                      <span>Você recebe</span>
                      <strong>{formatCurrency(scenario.youReceive)}</strong>
                    </div>
                  </div>
                  {selectedPreset && selectedPreset.pieces > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Líquido por peça: {formatCurrency(scenario.youReceive / selectedPreset.pieces)}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Fonte dos números</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Preço avulso oficial: {formatCurrency(defaultPriceFull)}.</p>
          <p>Desconto PIX oficial: {pixDiscountPercentage.toFixed(2).replace(".", ",")}%.</p>
          <p>As taxas de processamento continuam centralizadas no serviço de pricing e devem ser validadas contra o provedor antes da RC.</p>
          <p>Nenhum preço monetário de fallback é usado nesta tela.</p>
        </CardContent>
      </Card>
    </div>
  );
}
