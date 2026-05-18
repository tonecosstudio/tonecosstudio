import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useUpdateBasePrices, useUpdateContextMultipliers } from "@/hooks/admin/useCoinsPricingAdmin";

type CollectionTypeRef = { name: string };
type BasePriceEntry = { base_price_coins: number; collection_types?: CollectionTypeRef | null };
type MultiplierEntry = { user_context: string; multiplier: number };

interface EditPricingFormProps {
  basePrices: BasePriceEntry[];
  multipliers: MultiplierEntry[];
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Erro inesperado";
}

export function EditPricingForm({ basePrices, multipliers }: EditPricingFormProps) {
  const { toast } = useToast();
  const updateBasePricesMutation = useUpdateBasePrices();
  const updateMultipliersMutation = useUpdateContextMultipliers();

  const [subscriptionPrice, setSubscriptionPrice] = useState(
    basePrices?.find((p) => p.collection_types?.name === "subscription")?.base_price_coins || 200
  );
  const [standardPrice, setStandardPrice] = useState(
    basePrices?.find((p) => p.collection_types?.name === "standard_catalog")?.base_price_coins || 300
  );
  const [premiumPrice, setPremiumPrice] = useState(
    basePrices?.find((p) => p.collection_types?.name === "premium_catalog")?.base_price_coins || 450
  );

  const [chosenMultiplier, setChosenMultiplier] = useState(
    multipliers?.find((m) => m.user_context === "subscribed_chosen")?.multiplier || 1.0
  );
  const [notChosenMultiplier, setNotChosenMultiplier] = useState(
    multipliers?.find((m) => m.user_context === "subscribed_not_chosen")?.multiplier || 1.2
  );
  const [noSubscriptionMultiplier, setNoSubscriptionMultiplier] = useState(
    multipliers?.find((m) => m.user_context === "no_subscription")?.multiplier || 1.5
  );

  const handleSaveBasePrices = () => {
    if (subscriptionPrice < 1 || standardPrice < 1 || premiumPrice < 1) {
      toast({ title: "Valores invalidos", description: "Todos os precos devem ser maiores que zero.", variant: "destructive" });
      return;
    }
    if (subscriptionPrice > standardPrice || standardPrice > premiumPrice) {
      toast({ title: "Hierarquia invalida", description: "Os precos devem seguir: Subscription <= Standard <= Premium", variant: "destructive" });
      return;
    }
    updateBasePricesMutation.mutate(
      { subscriptionPrice, standardPrice, premiumPrice },
      {
        onSuccess: () => toast({ title: "Precos atualizados!", description: "Os precos base foram atualizados com sucesso." }),
        onError: (error) => toast({ title: "Erro ao atualizar precos", description: getErrorMessage(error), variant: "destructive" }),
      }
    );
  };

  const handleSaveMultipliers = () => {
    if (chosenMultiplier < 0.1 || notChosenMultiplier < 0.1 || noSubscriptionMultiplier < 0.1) {
      toast({ title: "Valores invalidos", description: "Todos os multiplicadores devem ser maiores que 0.1", variant: "destructive" });
      return;
    }
    if (chosenMultiplier > notChosenMultiplier) {
      toast({ title: "Logica invalida", description: "Multiplicador 'Escolhida' deve ser <= 'Nao Escolhida'", variant: "destructive" });
      return;
    }
    updateMultipliersMutation.mutate(
      { chosenMultiplier, notChosenMultiplier, noSubscriptionMultiplier },
      {
        onSuccess: () => toast({ title: "Multiplicadores atualizados!", description: "Os multiplicadores foram atualizados com sucesso." }),
        onError: (error) => toast({ title: "Erro ao atualizar multiplicadores", description: getErrorMessage(error), variant: "destructive" }),
      }
    );
  };

  const isLoading = updateBasePricesMutation.isPending || updateMultipliersMutation.isPending;

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Alteracoes nos precos afetam todos os usuarios imediatamente.</AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Editar Precos Base</CardTitle>
          <CardDescription>Valores fixos para cada tipo de colecao (em coins)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="subscription-price">Subscription</Label>
              <Input id="subscription-price" type="number" min="1" value={subscriptionPrice} onChange={(e) => setSubscriptionPrice(Number(e.target.value))} disabled={isLoading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="standard-price">Catalogo Padrao</Label>
              <Input id="standard-price" type="number" min="1" value={standardPrice} onChange={(e) => setStandardPrice(Number(e.target.value))} disabled={isLoading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="premium-price">Catalogo Premium</Label>
              <Input id="premium-price" type="number" min="1" value={premiumPrice} onChange={(e) => setPremiumPrice(Number(e.target.value))} disabled={isLoading} />
            </div>
          </div>
          <Button onClick={handleSaveBasePrices} disabled={isLoading} className="w-full">
            {updateBasePricesMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : <><Save className="mr-2 h-4 w-4" />Salvar Precos Base</>}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Editar Multiplicadores</CardTitle>
          <CardDescription>Ajustes por contexto de usuario</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="chosen-multiplier">Colecao Escolhida</Label>
              <Input id="chosen-multiplier" type="number" step="0.1" min="0.1" max="5" value={chosenMultiplier} onChange={(e) => setChosenMultiplier(Number(e.target.value))} disabled={isLoading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="not-chosen-multiplier">Colecao Nao Escolhida</Label>
              <Input id="not-chosen-multiplier" type="number" step="0.1" min="0.1" max="5" value={notChosenMultiplier} onChange={(e) => setNotChosenMultiplier(Number(e.target.value))} disabled={isLoading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="no-subscription-multiplier">Sem Assinatura</Label>
              <Input id="no-subscription-multiplier" type="number" step="0.1" min="0.1" max="5" value={noSubscriptionMultiplier} onChange={(e) => setNoSubscriptionMultiplier(Number(e.target.value))} disabled={isLoading} />
            </div>
          </div>
          <Button onClick={handleSaveMultipliers} disabled={isLoading} className="w-full">
            {updateMultipliersMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : <><Save className="mr-2 h-4 w-4" />Salvar Multiplicadores</>}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
