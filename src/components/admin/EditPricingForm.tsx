/**
 * Formulário de Edição de Preços do Sistema de Coins
 *
 * Permite editar:
 * - Preços base (subscription, standard_catalog, premium_catalog)
 * - Multiplicadores por contexto
 *
 * SSOT: Atualiza diretamente no banco de dados
 */

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EditPricingFormProps {
  basePrices: any[];
  multipliers: any[];
}

export function EditPricingForm({ basePrices, multipliers }: EditPricingFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Estados para preços base
  const [subscriptionPrice, setSubscriptionPrice] = useState(
    basePrices?.find((p) => p.collection_types?.name === "subscription")?.base_price_coins || 200
  );
  const [standardPrice, setStandardPrice] = useState(
    basePrices?.find((p) => p.collection_types?.name === "standard_catalog")?.base_price_coins ||
      300
  );
  const [premiumPrice, setPremiumPrice] = useState(
    basePrices?.find((p) => p.collection_types?.name === "premium_catalog")?.base_price_coins || 450
  );

  // Estados para multiplicadores
  const [chosenMultiplier, setChosenMultiplier] = useState(
    multipliers?.find((m) => m.user_context === "subscribed_chosen")?.multiplier || 1.0
  );
  const [notChosenMultiplier, setNotChosenMultiplier] = useState(
    multipliers?.find((m) => m.user_context === "subscribed_not_chosen")?.multiplier || 1.2
  );
  const [noSubscriptionMultiplier, setNoSubscriptionMultiplier] = useState(
    multipliers?.find((m) => m.user_context === "no_subscription")?.multiplier || 1.5
  );

  // Mutation para atualizar preços base
  const updateBasePricesMutation = useMutation({
    mutationFn: async () => {
      // Buscar IDs dos tipos de coleção
      const { data: collectionTypes } = await supabase.from("collection_types").select("id, name");

      if (!collectionTypes) throw new Error("Tipos de coleção não encontrados");

      const subscriptionId = collectionTypes.find((t) => t.name === "subscription")?.id;
      const standardId = collectionTypes.find((t) => t.name === "standard_catalog")?.id;
      const premiumId = collectionTypes.find((t) => t.name === "premium_catalog")?.id;

      // Atualizar subscription
      if (subscriptionId) {
        const { error: subError } = await supabase
          .from("collection_base_pricing")
          .update({ base_price_coins: subscriptionPrice, updated_at: new Date().toISOString() })
          .eq("collection_type_id", subscriptionId);

        if (subError) throw subError;
      }

      // Atualizar standard_catalog
      if (standardId) {
        const { error: stdError } = await supabase
          .from("collection_base_pricing")
          .update({ base_price_coins: standardPrice, updated_at: new Date().toISOString() })
          .eq("collection_type_id", standardId);

        if (stdError) throw stdError;
      }

      // Atualizar premium_catalog
      if (premiumId) {
        const { error: premError } = await supabase
          .from("collection_base_pricing")
          .update({ base_price_coins: premiumPrice, updated_at: new Date().toISOString() })
          .eq("collection_type_id", premiumId);

        if (premError) throw premError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coins-pricing-config"] });
      toast({
        title: "Preços atualizados!",
        description: "Os preços base foram atualizados com sucesso.",
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

  // Mutation para atualizar multiplicadores
  const updateMultipliersMutation = useMutation({
    mutationFn: async () => {
      // Atualizar subscribed_chosen
      const { error: chosenError } = await supabase
        .from("pricing_context_multipliers")
        .update({
          multiplier: chosenMultiplier,
          updated_at: new Date().toISOString(),
        })
        .eq("user_context", "subscribed_chosen");

      if (chosenError) throw chosenError;

      // Atualizar subscribed_not_chosen
      const { error: notChosenError } = await supabase
        .from("pricing_context_multipliers")
        .update({
          multiplier: notChosenMultiplier,
          updated_at: new Date().toISOString(),
        })
        .eq("user_context", "subscribed_not_chosen");

      if (notChosenError) throw notChosenError;

      // Atualizar no_subscription
      const { error: noSubError } = await supabase
        .from("pricing_context_multipliers")
        .update({
          multiplier: noSubscriptionMultiplier,
          updated_at: new Date().toISOString(),
        })
        .eq("user_context", "no_subscription");

      if (noSubError) throw noSubError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coins-pricing-config"] });
      toast({
        title: "Multiplicadores atualizados!",
        description: "Os multiplicadores foram atualizados com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar multiplicadores",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSaveBasePrices = () => {
    // Validações
    if (subscriptionPrice < 1 || standardPrice < 1 || premiumPrice < 1) {
      toast({
        title: "Valores inválidos",
        description: "Todos os preços devem ser maiores que zero.",
        variant: "destructive",
      });
      return;
    }

    if (subscriptionPrice > standardPrice || standardPrice > premiumPrice) {
      toast({
        title: "Hierarquia inválida",
        description: "Os preços devem seguir: Subscription ≤ Standard ≤ Premium",
        variant: "destructive",
      });
      return;
    }

    updateBasePricesMutation.mutate();
  };

  const handleSaveMultipliers = () => {
    // Validações
    if (chosenMultiplier < 0.1 || notChosenMultiplier < 0.1 || noSubscriptionMultiplier < 0.1) {
      toast({
        title: "Valores inválidos",
        description: "Todos os multiplicadores devem ser maiores que 0.1",
        variant: "destructive",
      });
      return;
    }

    if (chosenMultiplier > notChosenMultiplier) {
      toast({
        title: "Lógica inválida",
        description: "Multiplicador 'Escolhida' deve ser ≤ 'Não Escolhida'",
        variant: "destructive",
      });
      return;
    }

    updateMultipliersMutation.mutate();
  };

  const isLoading = updateBasePricesMutation.isPending || updateMultipliersMutation.isPending;

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Alterações nos preços afetam TODOS os usuários imediatamente. Use com cuidado.
        </AlertDescription>
      </Alert>

      {/* Editar Preços Base */}
      <Card>
        <CardHeader>
          <CardTitle>Editar Preços Base</CardTitle>
          <CardDescription>Valores fixos para cada tipo de coleção (em coins)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="subscription-price">Subscription (Base de Referência)</Label>
              <Input
                id="subscription-price"
                type="number"
                min="1"
                value={subscriptionPrice}
                onChange={(e) => setSubscriptionPrice(Number(e.target.value))}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">Recomendado: 200 coins</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="standard-price">Catálogo Padrão</Label>
              <Input
                id="standard-price"
                type="number"
                min="1"
                value={standardPrice}
                onChange={(e) => setStandardPrice(Number(e.target.value))}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">Recomendado: 300 coins</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="premium-price">Catálogo Premium</Label>
              <Input
                id="premium-price"
                type="number"
                min="1"
                value={premiumPrice}
                onChange={(e) => setPremiumPrice(Number(e.target.value))}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">Recomendado: 450 coins</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Previsão:</strong> Coleção Ativa = {subscriptionPrice} coins, Catálogo Geral ={" "}
              {standardPrice} coins, Premium = {premiumPrice} coins
            </p>
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

      {/* Editar Multiplicadores */}
      <Card>
        <CardHeader>
          <CardTitle>Editar Multiplicadores</CardTitle>
          <CardDescription>
            Ajustes aplicados à base de referência por contexto de usuário
          </CardDescription>
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
                max="5"
                value={chosenMultiplier}
                onChange={(e) => setChosenMultiplier(Number(e.target.value))}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">Recomendado: 1.0 (sem acréscimo)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="not-chosen-multiplier">Coleção Não Escolhida</Label>
              <Input
                id="not-chosen-multiplier"
                type="number"
                step="0.1"
                min="0.1"
                max="5"
                value={notChosenMultiplier}
                onChange={(e) => setNotChosenMultiplier(Number(e.target.value))}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">Recomendado: 1.2 (+20%)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="no-subscription-multiplier">Sem Assinatura</Label>
              <Input
                id="no-subscription-multiplier"
                type="number"
                step="0.1"
                min="0.1"
                max="5"
                value={noSubscriptionMultiplier}
                onChange={(e) => setNoSubscriptionMultiplier(Number(e.target.value))}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">Recomendado: 1.5 (+50%)</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Previsão:</strong> Coleção Ativa ={" "}
              {Math.round(subscriptionPrice * chosenMultiplier)} coins, Secundária ={" "}
              {Math.round(subscriptionPrice * notChosenMultiplier)} coins, Sem Assinatura ={" "}
              {Math.round(subscriptionPrice * noSubscriptionMultiplier)} coins
            </p>
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
