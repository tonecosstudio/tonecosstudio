import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useUpdateBasePrices, useUpdateContextMultipliers } from "@/hooks/admin/useCoinsPricingAdmin";

interface CollectionTypeRef {
  name: string;
}

interface BasePriceEntry {
  base_price_coins: number;
  collection_types?: CollectionTypeRef | null;
}

interface MultiplierEntry {
  user_context: string;
  multiplier: number;
}

interface EditPricingFormProps {
  basePrices: BasePriceEntry[];
  multipliers: MultiplierEntry[];
}

interface PricingEditorValues {
  subscriptionPrice: number;
  standardPrice: number;
  premiumPrice: number;
  chosenMultiplier: number;
  notChosenMultiplier: number;
  noSubscriptionMultiplier: number;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Erro inesperado";
}

function getBasePrice(
  basePrices: BasePriceEntry[],
  names: readonly string[],
): number | null {
  const value = basePrices.find((entry) =>
    names.includes(entry.collection_types?.name ?? ""),
  )?.base_price_coins;

  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : null;
}

function getMultiplier(
  multipliers: MultiplierEntry[],
  context: string,
): number | null {
  const value = multipliers.find((entry) => entry.user_context === context)?.multiplier;

  return typeof value === "number" && Number.isFinite(value) && value >= 0.1 && value <= 10
    ? value
    : null;
}

function readOfficialValues(
  basePrices: BasePriceEntry[],
  multipliers: MultiplierEntry[],
): PricingEditorValues | null {
  const subscriptionPrice = getBasePrice(basePrices, ["subscription"]);
  const standardPrice = getBasePrice(basePrices, ["standard_catalog", "standard"]);
  const premiumPrice = getBasePrice(basePrices, ["premium_catalog", "premium"]);
  const chosenMultiplier = getMultiplier(multipliers, "subscribed_chosen");
  const notChosenMultiplier = getMultiplier(multipliers, "subscribed_not_chosen");
  const noSubscriptionMultiplier = getMultiplier(multipliers, "no_subscription");

  if (
    subscriptionPrice === null ||
    standardPrice === null ||
    premiumPrice === null ||
    chosenMultiplier === null ||
    notChosenMultiplier === null ||
    noSubscriptionMultiplier === null
  ) {
    return null;
  }

  return {
    subscriptionPrice,
    standardPrice,
    premiumPrice,
    chosenMultiplier,
    notChosenMultiplier,
    noSubscriptionMultiplier,
  };
}

export function EditPricingForm({ basePrices, multipliers }: EditPricingFormProps) {
  const { toast } = useToast();
  const updateBasePricesMutation = useUpdateBasePrices();
  const updateMultipliersMutation = useUpdateContextMultipliers();

  const officialValues = useMemo(
    () => readOfficialValues(basePrices, multipliers),
    [basePrices, multipliers],
  );

  const [subscriptionPrice, setSubscriptionPrice] = useState<number | null>(
    officialValues?.subscriptionPrice ?? null,
  );
  const [standardPrice, setStandardPrice] = useState<number | null>(
    officialValues?.standardPrice ?? null,
  );
  const [premiumPrice, setPremiumPrice] = useState<number | null>(
    officialValues?.premiumPrice ?? null,
  );
  const [chosenMultiplier, setChosenMultiplier] = useState<number | null>(
    officialValues?.chosenMultiplier ?? null,
  );
  const [notChosenMultiplier, setNotChosenMultiplier] = useState<number | null>(
    officialValues?.notChosenMultiplier ?? null,
  );
  const [noSubscriptionMultiplier, setNoSubscriptionMultiplier] = useState<number | null>(
    officialValues?.noSubscriptionMultiplier ?? null,
  );

  useEffect(() => {
    if (!officialValues) return;

    setSubscriptionPrice(officialValues.subscriptionPrice);
    setStandardPrice(officialValues.standardPrice);
    setPremiumPrice(officialValues.premiumPrice);
    setChosenMultiplier(officialValues.chosenMultiplier);
    setNotChosenMultiplier(officialValues.notChosenMultiplier);
    setNoSubscriptionMultiplier(officialValues.noSubscriptionMultiplier);
  }, [officialValues]);

  if (!officialValues) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          A configuração oficial de preços em coins está incompleta ou inválida. O editor foi
          bloqueado para evitar salvar valores de exemplo como se fossem preços reais. Corrija as
          linhas canônicas de preços base e multiplicadores no banco antes de editar por esta tela.
        </AlertDescription>
      </Alert>
    );
  }

  const handleSaveBasePrices = () => {
    if (
      subscriptionPrice === null ||
      standardPrice === null ||
      premiumPrice === null ||
      !Number.isInteger(subscriptionPrice) ||
      !Number.isInteger(standardPrice) ||
      !Number.isInteger(premiumPrice) ||
      subscriptionPrice < 1 ||
      standardPrice < 1 ||
      premiumPrice < 1
    ) {
      toast({
        title: "Valores inválidos",
        description: "Todos os preços devem ser números inteiros maiores que zero.",
        variant: "destructive",
      });
      return;
    }

    if (subscriptionPrice > standardPrice || standardPrice > premiumPrice) {
      toast({
        title: "Hierarquia inválida",
        description: "Os preços devem seguir: Subscription <= Standard <= Premium.",
        variant: "destructive",
      });
      return;
    }

    updateBasePricesMutation.mutate(
      { subscriptionPrice, standardPrice, premiumPrice },
      {
        onSuccess: () =>
          toast({
            title: "Preços atualizados!",
            description: "Os preços base foram atualizados com sucesso.",
          }),
        onError: (error) =>
          toast({
            title: "Erro ao atualizar preços",
            description: getErrorMessage(error),
            variant: "destructive",
          }),
      },
    );
  };

  const handleSaveMultipliers = () => {
    if (
      chosenMultiplier === null ||
      notChosenMultiplier === null ||
      noSubscriptionMultiplier === null ||
      !Number.isFinite(chosenMultiplier) ||
      !Number.isFinite(notChosenMultiplier) ||
      !Number.isFinite(noSubscriptionMultiplier) ||
      chosenMultiplier < 0.1 ||
      notChosenMultiplier < 0.1 ||
      noSubscriptionMultiplier < 0.1 ||
      chosenMultiplier > 10 ||
      notChosenMultiplier > 10 ||
      noSubscriptionMultiplier > 10
    ) {
      toast({
        title: "Valores inválidos",
        description: "Todos os multiplicadores devem estar entre 0,1 e 10.",
        variant: "destructive",
      });
      return;
    }

    if (chosenMultiplier > notChosenMultiplier) {
      toast({
        title: "Lógica inválida",
        description: "Multiplicador 'Escolhida' deve ser <= 'Não Escolhida'.",
        variant: "destructive",
      });
      return;
    }

    updateMultipliersMutation.mutate(
      { chosenMultiplier, notChosenMultiplier, noSubscriptionMultiplier },
      {
        onSuccess: () =>
          toast({
            title: "Multiplicadores atualizados!",
            description: "Os multiplicadores foram atualizados com sucesso.",
          }),
        onError: (error) =>
          toast({
            title: "Erro ao atualizar multiplicadores",
            description: getErrorMessage(error),
            variant: "destructive",
          }),
      },
    );
  };

  const isLoading = updateBasePricesMutation.isPending || updateMultipliersMutation.isPending;

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Alterações nos preços afetam todos os usuários imediatamente.</AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Editar Preços Base</CardTitle>
          <CardDescription>Valores oficiais para cada tipo de coleção (em coins)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="subscription-price">Subscription</Label>
              <Input
                id="subscription-price"
                type="number"
                min="1"
                step="1"
                value={subscriptionPrice ?? ""}
                onChange={(e) => setSubscriptionPrice(e.target.value === "" ? null : Number(e.target.value))}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="standard-price">Catálogo Padrão</Label>
              <Input
                id="standard-price"
                type="number"
                min="1"
                step="1"
                value={standardPrice ?? ""}
                onChange={(e) => setStandardPrice(e.target.value === "" ? null : Number(e.target.value))}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="premium-price">Catálogo Premium</Label>
              <Input
                id="premium-price"
                type="number"
                min="1"
                step="1"
                value={premiumPrice ?? ""}
                onChange={(e) => setPremiumPrice(e.target.value === "" ? null : Number(e.target.value))}
                disabled={isLoading}
              />
            </div>
          </div>
          <Button onClick={handleSaveBasePrices} disabled={isLoading} className="w-full">
            {updateBasePricesMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Preços Base
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Editar Multiplicadores</CardTitle>
          <CardDescription>Ajustes oficiais por contexto de usuário</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="chosen-multiplier">Coleção Escolhida</Label>
              <Input
                id="chosen-multiplier"
                type="number"
                step="0.1"
                min="0.1"
                max="10"
                value={chosenMultiplier ?? ""}
                onChange={(e) => setChosenMultiplier(e.target.value === "" ? null : Number(e.target.value))}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="not-chosen-multiplier">Coleção Não Escolhida</Label>
              <Input
                id="not-chosen-multiplier"
                type="number"
                step="0.1"
                min="0.1"
                max="10"
                value={notChosenMultiplier ?? ""}
                onChange={(e) => setNotChosenMultiplier(e.target.value === "" ? null : Number(e.target.value))}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="no-subscription-multiplier">Sem Assinatura</Label>
              <Input
                id="no-subscription-multiplier"
                type="number"
                step="0.1"
                min="0.1"
                max="10"
                value={noSubscriptionMultiplier ?? ""}
                onChange={(e) => setNoSubscriptionMultiplier(e.target.value === "" ? null : Number(e.target.value))}
                disabled={isLoading}
              />
            </div>
          </div>
          <Button onClick={handleSaveMultipliers} disabled={isLoading} className="w-full">
            {updateMultipliersMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Multiplicadores
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
