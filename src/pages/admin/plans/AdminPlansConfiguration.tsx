import { useEffect, useState, type ComponentType } from "react";
import { Calendar, CheckCircle2, Coins, Loader2, Package, Save } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAdminPlansConfiguration, useSavePricingTierPlan, type PricingTierPlan } from "@/hooks/admin/useAdminPlansConfiguration";
import { decimalToHundredths, type TonartPlanPieceCount } from "@/services/commercial/tonart-commerce-rules";
import type { AdminPlanType } from "@/services/admin/config/admin-plans-configuration-service";

interface PlanTypeMeta {
  key: Exclude<AdminPlanType, "bimestral">;
  label: string;
  pieceCount: TonartPlanPieceCount;
  icon: ComponentType<{ className?: string }>;
}

const PLAN_TYPES: readonly PlanTypeMeta[] = [
  { key: "avulso", label: "Avulso", pieceCount: 1, icon: Package },
  { key: "trimestral", label: "Trimestral", pieceCount: 3, icon: Calendar },
  { key: "semestral", label: "Semestral", pieceCount: 6, icon: Calendar },
  { key: "anual", label: "Anual · preparação", pieceCount: 12, icon: Calendar },
];

function isConfiguredAmount(value: string, allowZero = false): boolean {
  try {
    const hundredths = decimalToHundredths(value);
    return allowZero ? true : hundredths > 0;
  } catch {
    return false;
  }
}

function formatCurrency(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return "Não configurado";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface PlanEditorProps {
  meta: PlanTypeMeta;
  existingPlan?: PricingTierPlan;
}

function PlanEditor({ meta, existingPlan }: PlanEditorProps) {
  const { toast } = useToast();
  const saveMutation = useSavePricingTierPlan();
  const [isEditing, setIsEditing] = useState(!existingPlan);
  const [name, setName] = useState(existingPlan?.name ?? `Plano ${meta.label}`);
  const [price, setPrice] = useState(
    typeof existingPlan?.price_full === "number" && existingPlan.price_full > 0
      ? String(existingPlan.price_full)
      : "",
  );
  const [bonusPerShipment, setBonusPerShipment] = useState(
    existingPlan ? String(existingPlan.coin_bonus_per_shipment) : "",
  );
  const [bonusCap, setBonusCap] = useState(existingPlan ? String(existingPlan.coin_bonus_cap) : "");
  const [isActive, setIsActive] = useState(
    meta.key !== "anual" && (existingPlan?.is_active ?? false),
  );

  useEffect(() => {
    setName(existingPlan?.name ?? `Plano ${meta.label}`);
    setPrice(
      typeof existingPlan?.price_full === "number" && existingPlan.price_full > 0
        ? String(existingPlan.price_full)
        : "",
    );
    setBonusPerShipment(existingPlan ? String(existingPlan.coin_bonus_per_shipment) : "");
    setBonusCap(existingPlan ? String(existingPlan.coin_bonus_cap) : "");
    setIsActive(meta.key !== "anual" && (existingPlan?.is_active ?? false));
  }, [existingPlan, meta.key, meta.label]);

  const parsedPrice = Number(price);
  const parsedBonusPerShipment = Number(bonusPerShipment);
  const parsedBonusCap = Number(bonusCap);
  const bonusTotal = Math.min(parsedBonusPerShipment * meta.pieceCount, parsedBonusCap);
  const amountConfigurationValid =
    isConfiguredAmount(price) &&
    Number.isFinite(parsedPrice) &&
    isConfiguredAmount(bonusPerShipment, true) &&
    isConfiguredAmount(bonusCap, true) &&
    Number.isFinite(parsedBonusPerShipment) &&
    Number.isFinite(parsedBonusCap) &&
    parsedBonusPerShipment >= 0 &&
    parsedBonusCap >= parsedBonusPerShipment;
  const canSave =
    name.trim().length > 0 &&
    amountConfigurationValid &&
    (meta.key !== "anual" || !isActive);

  const handleSave = () => {
    if (!canSave) {
      toast({
        title: "Plano inválido",
        description: "Informe o total, o bônus por envio e o limite máximo em centésimos válidos.",
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
          price_brl: parsedPrice,
          price_full: parsedPrice,
          coin_bonus_per_shipment: parsedBonusPerShipment,
          coin_bonus_cap: parsedBonusCap,
          deliveries_total: meta.pieceCount,
          model_selection_limit: meta.pieceCount,
          is_active: meta.key === "anual" ? false : isActive,
          description: `${meta.pieceCount} ${meta.pieceCount === 1 ? "peça" : "peças"}; compra integral em pagamento único`,
        },
      },
      {
        onSuccess: () => {
          toast({
            title: "Plano salvo",
            description: `${name.trim()} foi atualizado. O principal permanece como compra de peças.`,
          });
          setIsEditing(false);
        },
        onError: (error: Error) => {
          toast({ title: "Erro ao salvar plano", description: error.message, variant: "destructive" });
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
            <div className="rounded-lg bg-muted p-3"><Icon className="h-5 w-5" /></div>
            <div>
              <CardTitle className="flex flex-wrap items-center gap-2">
                {meta.label}
                {existingPlan?.is_active && meta.key !== "anual" && <Badge><CheckCircle2 className="mr-1 h-3 w-3" />Ativo</Badge>}
                {meta.key === "anual" && <Badge variant="outline">Desativado</Badge>}
              </CardTitle>
              <CardDescription>{meta.pieceCount} {meta.pieceCount === 1 ? "peça" : "peças"} · pagamento único</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Label htmlFor={`plan-active-${meta.key}`}>{meta.key === "anual" ? "Indisponível" : "Oferta ativa"}</Label>
            <Switch
              id={`plan-active-${meta.key}`}
              checked={meta.key === "anual" ? false : isActive}
              disabled={meta.key === "anual"}
              onCheckedChange={(checked) => { setIsActive(checked); setIsEditing(true); }}
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
                <Label htmlFor={`plan-name-${meta.key}`}>Nome da oferta</Label>
                <Input id={`plan-name-${meta.key}`} value={name} onChange={(event) => setName(event.target.value)} maxLength={120} />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`plan-price-${meta.key}`}>Total pelas peças (R$)</Label>
                <Input id={`plan-price-${meta.key}`} type="number" min="0.01" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="Configurar valor total" />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`plan-pieces-${meta.key}`}>Peças do plano</Label>
                <Input id={`plan-pieces-${meta.key}`} value={`${meta.pieceCount}`} readOnly aria-readonly="true" />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`plan-bonus-per-shipment-${meta.key}`}>Coins por peça enviada</Label>
                <Input id={`plan-bonus-per-shipment-${meta.key}`} type="number" min="0" step="0.01" value={bonusPerShipment} onChange={(event) => setBonusPerShipment(event.target.value)} placeholder="Configurar bônus" />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`plan-bonus-cap-${meta.key}`}>Limite de bônus do plano</Label>
                <Input id={`plan-bonus-cap-${meta.key}`} type="number" min="0" step="0.01" value={bonusCap} onChange={(event) => setBonusCap(event.target.value)} placeholder="Configurar limite" />
              </div>
            </div>

            <div className="grid gap-3 rounded-lg border bg-muted/30 p-4 text-sm sm:grid-cols-3">
              <div><p className="text-muted-foreground">Total pago uma vez</p><strong>{amountConfigurationValid ? formatCurrency(parsedPrice) : "Não configurado"}</strong></div>
              <div><p className="text-muted-foreground">Bônus após cada envio PIX confirmado</p><strong>{amountConfigurationValid ? `${parsedBonusPerShipment.toLocaleString("pt-BR")} Coins` : "Não configurado"}</strong></div>
              <div><p className="text-muted-foreground">Máximo em todo o plano</p><strong>{amountConfigurationValid ? `${bonusTotal.toLocaleString("pt-BR")} Coins` : "Não configurado"}</strong></div>
            </div>

            <p className="text-xs leading-5 text-muted-foreground">
              O pagamento compra as peças e não é convertido em Coins. Bônus só é lançado após PIX integral confirmado e envio real; cartão, parcelas e frete não geram Coins. O frete é informado à parte.
              {meta.key === "anual" ? " O plano anual está preparado e permanece desativado." : ""}
            </p>
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={!canSave || saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Salvar configuração
              </Button>
            </div>
          </>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div><p className="text-xs text-muted-foreground">Total do plano</p><p className="font-semibold">{formatCurrency(existingPlan?.price_full ?? existingPlan?.price)}</p></div>
            <div><p className="text-xs text-muted-foreground">Peças</p><p className="font-semibold">{existingPlan?.pieces_per_subscription ?? meta.pieceCount}</p></div>
            <div><p className="text-xs text-muted-foreground">Coins por envio PIX</p><p className="font-semibold">{existingPlan?.coin_bonus_per_shipment ?? "Não configurado"}</p></div>
            <div><p className="text-xs text-muted-foreground">Status</p><p className="font-semibold">{meta.key === "anual" ? "Preparado · desativado" : isActive ? "Ativo" : "Inativo"}</p></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminPlansConfiguration() {
  const plansQuery = useAdminPlansConfiguration();
  const plans = plansQuery.data ?? [];
  return (
    <div className="space-y-6">
      <SEOHead title="Admin - Planos TONART" description="Configuração comercial dos planos de peças e Coins" noindex />
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Planos de coleção</h1>
        <p className="mt-2 text-muted-foreground">Configure totais, quantidade de peças e bônus de envio. O plano não cria saldo livre com o valor principal.</p>
      </div>
      <Alert>
        <Coins className="h-4 w-4" />
        <AlertDescription>O bônus do cliente é concedido por peça enviada após pagamento PIX integral confirmado. O plano anual fica configurável, mas não pode ser ativado nesta versão.</AlertDescription>
      </Alert>
      {plansQuery.isLoading ? (
        <Card><CardContent className="flex items-center gap-3 py-8 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Carregando configuração comercial...</CardContent></Card>
      ) : plansQuery.isError ? (
        <Card className="border-destructive/40"><CardHeader><CardTitle>Configuração indisponível</CardTitle><CardDescription>Não foi possível ler o SSOT dos planos. Nenhum preço estimado será usado.</CardDescription></CardHeader><CardContent><Button variant="outline" onClick={() => void plansQuery.refetch()}>Tentar novamente</Button></CardContent></Card>
      ) : (
        <div className="space-y-4">
          {PLAN_TYPES.map((meta) => <PlanEditor key={meta.key} meta={meta} existingPlan={plans.find((plan) => plan.plan_type === meta.key)} />)}
        </div>
      )}
    </div>
  );
}
