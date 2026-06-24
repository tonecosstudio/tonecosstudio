import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calculator, DollarSign, TrendingDown, TrendingUp, Package } from "lucide-react";
import { PRICING, PLANS } from "@/config/constants";
import { calculateNetValues, formatCurrency, TAX_RATES, usePricingSettings } from "@/hooks/usePricingSettings";
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

function parseMoney(value: string): number {
  const parsed = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2).replace(".", ",")}%`;
}

function buildFallbackPresets(defaultPriceFull: number): Preset[] {
  return PLANS.TYPES.filter((planType) => planType !== "mensal").map((planType) => {
    const pieces = PLANS.DEFAULT_DELIVERIES[planType];
    return {
      label: PLAN_LABELS[planType] ?? planType,
      value: defaultPriceFull * pieces,
      pieces,
    };
  });
}

export default function PaymentCalculator() {
  const { data: pricingSettings } = usePricingSettings();
  const { data: subscriptionPlans = [] } = useQuery({
    queryKey: ["payment-calculator", "subscription-plans"],
    queryFn: listActiveSubscriptionPlans,
    staleTime: 5 * 60 * 1000,
  });

  const defaultPriceFull = pricingSettings?.defaultPriceFull ?? PRICING.DEFAULT_PRICE_FULL;
  const pixDiscountPercentage =
    pricingSettings?.pixDiscountPercentage ?? PRICING.PIX_DISCOUNT_PERCENTAGE;
  const [value, setValue] = useState<string>(() => String(PRICING.DEFAULT_PRICE_FULL));
  const [desiredNetValue, setDesiredNetValue] = useState<string>(() => String(PRICING.DEFAULT_PRICE_FULL));
  const [calculationMode, setCalculationMode] = useState<"charge" | "receive">("charge");
  const [hasCustomValue, setHasCustomValue] = useState(false);

  useEffect(() => {
    if (!hasCustomValue) {
      const nextValue = String(defaultPriceFull);
      setValue(nextValue);
      setDesiredNetValue(nextValue);
    }
  }, [defaultPriceFull, hasCustomValue]);

  const presets = useMemo(() => {
    const planPresets = subscriptionPlans
      .filter((plan) => plan.plan_type && plan.price_full && plan.price_full > 0)
      .map((plan) => ({
        label: PLAN_LABELS[plan.plan_type] ?? plan.name,
        value: Number(plan.price_full),
        pieces:
          plan.deliveries_total ??
          PLANS.DEFAULT_DELIVERIES[plan.plan_type as keyof typeof PLANS.DEFAULT_DELIVERIES] ??
          1,
      }));

    const standalonePreset: Preset = {
      label: PLAN_LABELS.avulso,
      value: defaultPriceFull,
      pieces: PLANS.DEFAULT_DELIVERIES.avulso,
    };

    const uniquePresets = [standalonePreset, ...planPresets].reduce<Preset[]>((acc, preset) => {
      if (!acc.some((item) => item.label === preset.label)) {
        acc.push(preset);
      }
      return acc;
    }, []);

    return uniquePresets.length > 1 ? uniquePresets : buildFallbackPresets(defaultPriceFull);
  }, [defaultPriceFull, subscriptionPlans]);

  const selectedPreset = presets.find((preset) => preset.value === parseMoney(value));
  const numericValue = parseMoney(value);
  const desiredNumericValue = parseMoney(desiredNetValue);
  const netValues = calculateNetValues(numericValue, pixDiscountPercentage);

  const pixDiscountRate = pixDiscountPercentage / 100;
  const sixInstallmentsTax = TAX_RATES.taxSaleInstallment + TAX_RATES.taxInstallment6x;
  const storeTenInstallmentsTax = TAX_RATES.taxSaleInstallment + TAX_RATES.taxInstallment10xStore;
  const clientTenInstallmentsNetRate = 1 - TAX_RATES.taxSaleInstallment;

  const chargeForPix =
    desiredNumericValue / ((1 - pixDiscountRate) * (1 - TAX_RATES.taxPix || 1));
  const chargeForSixInstallments = desiredNumericValue / (1 - sixInstallmentsTax || 1);
  const chargeForStoreTenInstallments = desiredNumericValue / (1 - storeTenInstallmentsTax || 1);
  const chargeForClientTenInstallments = desiredNumericValue / (clientTenInstallmentsNetRate || 1);

  const pixVsSixDifference = netValues.pix.youReceive - netValues.installment6x.youReceive;
  const pixVsSixPercentage =
    netValues.installment6x.youReceive > 0
      ? (pixVsSixDifference / netValues.installment6x.youReceive) * 100
      : 0;
  const pixVsClientTenDifference =
    netValues.pix.youReceive - netValues.installment10xClient.youReceive;
  const pixVsClientTenPercentage =
    netValues.installment10xClient.youReceive > 0
      ? (pixVsClientTenDifference / netValues.installment10xClient.youReceive) * 100
      : 0;

  const paymentScenarios = [
    {
      key: "pix",
      title: `PIX (${pixDiscountPercentage.toFixed(0)}% OFF)`,
      description: "Recebimento imediato",
      icon: DollarSign,
      color: "green",
      clientPays: netValues.pix.clientPays,
      feeLabel: `Taxa (${formatPercent(TAX_RATES.taxPix)})`,
      fees: netValues.pix.tax,
      youReceive: netValues.pix.youReceive,
      percentageLabel: `${netValues.pix.percentage.toFixed(1)}% liquido`,
      badge: "Melhor",
    },
    {
      key: "installment6x",
      title: `${PRICING.MAX_INSTALLMENTS_NO_INTEREST}x sem juros`,
      description: "Cliente nao paga juros",
      icon: TrendingUp,
      color: "blue",
      clientPays: netValues.installment6x.clientPays,
      installmentValue: netValues.installment6x.installmentValue,
      feeLabel: `Taxas (${formatPercent(sixInstallmentsTax)})`,
      fees: netValues.installment6x.taxes,
      youReceive: netValues.installment6x.youReceive,
      percentageLabel: `${netValues.installment6x.percentage.toFixed(1)}% liquido`,
    },
    {
      key: "installment10xStore",
      title: `${PRICING.MAX_INSTALLMENTS_WITH_INTEREST}x sem juros`,
      description: "Loja paga juros",
      icon: TrendingUp,
      color: "purple",
      clientPays: netValues.installment10xStore.clientPays,
      installmentValue: netValues.installment10xStore.installmentValue,
      feeLabel: `Taxas (${formatPercent(storeTenInstallmentsTax)})`,
      fees: netValues.installment10xStore.taxes,
      youReceive: netValues.installment10xStore.youReceive,
      percentageLabel: `${netValues.installment10xStore.percentage.toFixed(1)}% liquido`,
    },
    {
      key: "installment10xClient",
      title: `${PRICING.MAX_INSTALLMENTS_WITH_INTEREST}x com juros`,
      description: "Cliente paga juros",
      icon: TrendingUp,
      color: "orange",
      clientPays: netValues.installment10xClient.clientPays,
      installmentValue: netValues.installment10xClient.installmentValue,
      feeLabel: `Taxas (${formatPercent(TAX_RATES.taxSaleInstallment + TAX_RATES.taxInstallment10xClient)})`,
      fees: netValues.installment10xClient.taxes,
      surcharge: netValues.installment10xClient.surcharge,
      youReceive: netValues.installment10xClient.youReceive,
      percentageLabel: `${netValues.installment10xClient.percentage.toFixed(1)}% do valor base`,
      badge: "Cliente paga",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="mb-2 flex items-center gap-3 text-4xl font-bold tracking-tight">
          <Calculator className="h-10 w-10" />
          Calculadora Mercado Pago
        </h1>
        <p className="text-muted-foreground">
          Simule o valor liquido usando precos, planos e taxas centralizadas.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Valor da Venda</CardTitle>
          <CardDescription>Digite o valor ou escolha um preset vindo do cadastro de planos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
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
                    {preset.pieces} peca{preset.pieces > 1 ? "s" : ""}
                  </span>
                </Button>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor">Valor Personalizado (R$)</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                min="0"
                value={value}
                onChange={(event) => {
                  setHasCustomValue(true);
                  setValue(event.target.value);
                }}
                className="h-14 text-2xl font-bold"
                placeholder={defaultPriceFull.toFixed(2)}
              />
            </div>

            <div className="mt-4 border-t pt-4">
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
                  Quanto vou receber?
                </Button>
              </div>

              {calculationMode === "receive" && (
                <div className="space-y-2">
                  <Label htmlFor="valorDesejado">Quanto voce quer receber? (R$)</Label>
                  <Input
                    id="valorDesejado"
                    type="number"
                    step="0.01"
                    min="0"
                    value={desiredNetValue}
                    onChange={(event) => setDesiredNetValue(event.target.value)}
                    className="h-12 text-xl font-bold"
                    placeholder={defaultPriceFull.toFixed(2)}
                  />
                  <div className="space-y-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
                    <p className="text-sm font-semibold text-blue-900">
                      Para receber {formatCurrency(desiredNumericValue)}:
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded bg-white p-2">
                        <p className="text-muted-foreground">PIX:</p>
                        <p className="font-bold text-green-600">{formatCurrency(chargeForPix)}</p>
                      </div>
                      <div className="rounded bg-white p-2">
                        <p className="text-muted-foreground">{PRICING.MAX_INSTALLMENTS_NO_INTEREST}x:</p>
                        <p className="font-bold text-blue-600">
                          {formatCurrency(chargeForSixInstallments)}
                        </p>
                      </div>
                      <div className="rounded bg-white p-2">
                        <p className="text-muted-foreground">
                          {PRICING.MAX_INSTALLMENTS_WITH_INTEREST}x loja:
                        </p>
                        <p className="font-bold text-purple-600">
                          {formatCurrency(chargeForStoreTenInstallments)}
                        </p>
                      </div>
                      <div className="rounded bg-white p-2">
                        <p className="text-muted-foreground">
                          {PRICING.MAX_INSTALLMENTS_WITH_INTEREST}x cliente:
                        </p>
                        <p className="font-bold text-orange-600">
                          {formatCurrency(chargeForClientTenInstallments)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {paymentScenarios.map((scenario) => {
          const Icon = scenario.icon;
          const colorClasses: Record<string, string> = {
            green: "border-green-200 bg-green-50/50 text-green-600",
            blue: "border-blue-200 bg-blue-50/50 text-blue-600",
            purple: "border-purple-200 bg-purple-50/50 text-purple-600",
            orange: "border-orange-200 bg-orange-50/50 text-orange-600",
          };

          return (
            <Card key={scenario.key} className={colorClasses[scenario.color]}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2 text-base">
                  <span className="flex items-center gap-2">
                    <Icon className="h-5 w-5" />
                    {scenario.title}
                  </span>
                  {scenario.badge && (
                    <Badge variant={scenario.color === "green" ? "default" : "secondary"} className="text-xs">
                      {scenario.badge}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs">{scenario.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-slate-950">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Cliente paga:</span>
                    <span className="font-medium">{formatCurrency(scenario.clientPays)}</span>
                  </div>
                  {scenario.installmentValue !== undefined && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        {scenario.key === "installment6x"
                          ? PRICING.MAX_INSTALLMENTS_NO_INTEREST
                          : PRICING.MAX_INSTALLMENTS_WITH_INTEREST}
                        x de:
                      </span>
                      <span>{formatCurrency(scenario.installmentValue)}</span>
                    </div>
                  )}
                  {scenario.surcharge !== undefined && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">
                        Acrescimo ({formatPercent(TAX_RATES.taxInstallment10xClient)}):
                      </span>
                      <span className="text-orange-600">+ {formatCurrency(scenario.surcharge)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{scenario.feeLabel}:</span>
                    <span className="text-red-600">- {formatCurrency(scenario.fees)}</span>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex justify-between">
                    <span className="text-sm font-semibold">Voce recebe:</span>
                    <span className="text-xl font-bold">{formatCurrency(scenario.youReceive)}</span>
                  </div>
                  <div className="text-center text-xs text-muted-foreground">{scenario.percentageLabel}</div>
                  {selectedPreset && (
                    <div className="rounded bg-white/70 p-2 text-center">
                      <p className="text-xs font-medium">
                        {formatCurrency(scenario.youReceive / selectedPreset.pieces)} por peca
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ({selectedPreset.pieces} pecas)
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Comparacao entre Formas de Pagamento
          </CardTitle>
          <CardDescription>Analise das diferencas liquidas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="mb-2 text-sm font-semibold">PIX vs {PRICING.MAX_INSTALLMENTS_NO_INTEREST}x</h4>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border bg-muted/50 p-3">
                  <p className="mb-1 text-xs text-muted-foreground">Diferenca em R$</p>
                  <p className="text-xl font-bold text-orange-600">
                    {formatCurrency(Math.abs(pixVsSixDifference))}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    PIX recebe {pixVsSixDifference > 0 ? "mais" : "menos"}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/50 p-3">
                  <p className="mb-1 text-xs text-muted-foreground">Diferenca em %</p>
                  <p className="text-xl font-bold text-orange-600">
                    {Math.abs(pixVsSixPercentage).toFixed(1)}%
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {pixVsSixPercentage > 0 ? "A mais no PIX" : "A menos no PIX"}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/50 p-3">
                  <p className="mb-1 text-xs text-muted-foreground">Economia Cliente</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(numericValue - netValues.pix.clientPays)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {pixDiscountPercentage.toFixed(0)}% desconto PIX
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold">
                PIX vs {PRICING.MAX_INSTALLMENTS_WITH_INTEREST}x com juros
              </h4>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border bg-muted/50 p-3">
                  <p className="mb-1 text-xs text-muted-foreground">Diferenca em R$</p>
                  <p className="text-xl font-bold text-orange-600">
                    {formatCurrency(Math.abs(pixVsClientTenDifference))}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    10x juros recebe {pixVsClientTenDifference < 0 ? "mais" : "menos"}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/50 p-3">
                  <p className="mb-1 text-xs text-muted-foreground">Diferenca em %</p>
                  <p className="text-xl font-bold text-orange-600">
                    {Math.abs(pixVsClientTenPercentage).toFixed(1)}%
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {pixVsClientTenPercentage < 0 ? "10x juros melhor" : "PIX melhor"}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/50 p-3">
                  <p className="mb-1 text-xs text-muted-foreground">Cliente paga a mais</p>
                  <p className="text-xl font-bold text-orange-600">
                    {formatCurrency(netValues.installment10xClient.surcharge)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatPercent(TAX_RATES.taxInstallment10xClient)} de acrescimo
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Exemplos Rapidos</CardTitle>
          <CardDescription>Presets atuais e quanto voce recebe em cada metodo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left font-semibold">Valor</th>
                  <th className="p-2 text-right font-semibold">PIX</th>
                  <th className="p-2 text-right font-semibold">Recebe PIX</th>
                  <th className="p-2 text-right font-semibold">
                    Recebe {PRICING.MAX_INSTALLMENTS_NO_INTEREST}x
                  </th>
                  <th className="p-2 text-right font-semibold">
                    Recebe {PRICING.MAX_INSTALLMENTS_WITH_INTEREST}x juros
                  </th>
                  <th className="p-2 text-right font-semibold">Melhor</th>
                </tr>
              </thead>
              <tbody>
                {presets.map((preset) => {
                  const rowValues = calculateNetValues(preset.value, pixDiscountPercentage);
                  const best =
                    rowValues.installment10xClient.youReceive > rowValues.pix.youReceive &&
                    rowValues.installment10xClient.youReceive > rowValues.installment6x.youReceive
                      ? `${PRICING.MAX_INSTALLMENTS_WITH_INTEREST}x juros`
                      : rowValues.pix.youReceive > rowValues.installment6x.youReceive
                        ? "PIX"
                        : `${PRICING.MAX_INSTALLMENTS_NO_INTEREST}x`;

                  return (
                    <tr key={`${preset.label}-${preset.value}`} className="border-b hover:bg-muted/50">
                      <td className="p-2 font-medium">
                        {formatCurrency(preset.value)}
                        <span className="ml-2 text-xs text-muted-foreground">({preset.label})</span>
                      </td>
                      <td className="p-2 text-right text-green-600">
                        {formatCurrency(rowValues.pix.clientPays)}
                      </td>
                      <td className="p-2 text-right font-semibold text-green-600">
                        {formatCurrency(rowValues.pix.youReceive)}
                      </td>
                      <td className="p-2 text-right font-semibold text-blue-600">
                        {formatCurrency(rowValues.installment6x.youReceive)}
                      </td>
                      <td className="p-2 text-right font-semibold text-orange-600">
                        {formatCurrency(rowValues.installment10xClient.youReceive)}
                      </td>
                      <td className="p-2 text-right font-bold text-primary">{best}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informacoes Importantes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>Taxa PIX:</strong> {formatPercent(TAX_RATES.taxPix)}
          </p>
          <p>
            <strong>Desconto PIX:</strong> {pixDiscountPercentage.toFixed(2).replace(".", ",")}%
          </p>
          <p>
            <strong>Taxa venda parcelada:</strong> {formatPercent(TAX_RATES.taxSaleInstallment)}
          </p>
          <p>
            <strong>Taxa parcelamento {PRICING.MAX_INSTALLMENTS_NO_INTEREST}x:</strong>{" "}
            {formatPercent(TAX_RATES.taxInstallment6x)}
          </p>
          <p>
            <strong>Taxa parcelamento {PRICING.MAX_INSTALLMENTS_WITH_INTEREST}x loja:</strong>{" "}
            {formatPercent(TAX_RATES.taxInstallment10xStore)}
          </p>
          <p>
            <strong>Taxa/acrescimo {PRICING.MAX_INSTALLMENTS_WITH_INTEREST}x cliente:</strong>{" "}
            {formatPercent(TAX_RATES.taxInstallment10xClient)}
          </p>
          <p>
            <strong>Recebimento:</strong> imediato em todos os cenarios configurados.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
