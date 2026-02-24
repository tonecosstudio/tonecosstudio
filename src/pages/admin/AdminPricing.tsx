import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Save, RefreshCw, Settings } from "lucide-react";
import { toast } from "sonner";

export default function AdminPricing() {
  const queryClient = useQueryClient();

  // Buscar configurações globais
  const { data: globalSettings } = useQuery({
    queryKey: ["global-pricing-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings")
        .select("*")
        .in("key", [
          "default_price_full",
          "default_price_pix",
          "default_deposit_amount",
          "pix_discount_percentage",
        ]);

      if (error) throw error;

      return data.reduce(
        (acc, setting) => {
          acc[setting.key] = parseFloat(setting.value);
          return acc;
        },
        {} as Record<string, number>
      );
    },
  });

  // Buscar coleções
  const { data: collections } = useQuery({
    queryKey: ["collections-pricing"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("id, name, slug, price_full, price_pix, deposit_amount, is_price_custom, is_active")
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  // Atualizar configurações globais
  const updateGlobalSettingsMutation = useMutation({
    mutationFn: async (settings: Record<string, number>) => {
      const updates = Object.entries(settings).map(([key, value]) => ({
        key,
        value: value.toString(),
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from("system_settings")
          .update({ value: update.value, updated_at: new Date().toISOString() })
          .eq("key", update.key);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["global-pricing-settings"] });
      queryClient.invalidateQueries({ queryKey: ["collections-pricing"] });
      toast.success("Configurações globais atualizadas!");
    },
    onError: () => {
      toast.error("Erro ao atualizar configurações");
    },
  });

  // Atualizar preço de coleção
  const updateCollectionPricingMutation = useMutation({
    mutationFn: async (params: {
      collectionId: string;
      price_full: number;
      deposit_amount: number;
      is_price_custom: boolean;
    }) => {
      const { error } = await supabase
        .from("collections")
        .update({
          price_full: params.price_full,
          deposit_amount: params.deposit_amount,
          is_price_custom: params.is_price_custom,
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.collectionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections-pricing"] });
      toast.success("Preço da coleção atualizado!");
    },
    onError: () => {
      toast.error("Erro ao atualizar preço");
    },
  });

  const [globalForm, setGlobalForm] = useState({
    default_price_full: 500,
    default_deposit_amount: 100,
    pix_discount_percentage: 5,
  });

  // Atualizar form quando dados carregarem
  useState(() => {
    if (globalSettings) {
      setGlobalForm({
        default_price_full: globalSettings.default_price_full || 500,
        default_deposit_amount: globalSettings.default_deposit_amount || 100,
        pix_discount_percentage: globalSettings.pix_discount_percentage || 5,
      });
    }
  });

  const handleSaveGlobalSettings = () => {
    updateGlobalSettingsMutation.mutate(globalForm);
  };

  const calculatePixPrice = (fullPrice: number, discount: number) => {
    return fullPrice * (1 - discount / 100);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2 flex items-center gap-3">
            <DollarSign className="h-10 w-10" />
            Gerenciar Preços
          </h1>
          <p className="text-muted-foreground">
            Configure preços globais e personalize por coleção
          </p>
        </div>

        {/* Configurações Globais */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurações Globais (Padrão)
            </CardTitle>
            <CardDescription>
              Estes valores serão usados para todas as coleções que não tiverem preço customizado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              {/* Preço Full */}
              <div className="space-y-2">
                <Label htmlFor="default_price_full">Preço Cheio (R$)</Label>
                <Input
                  id="default_price_full"
                  type="number"
                  step="0.01"
                  value={globalForm.default_price_full}
                  onChange={(e) =>
                    setGlobalForm({ ...globalForm, default_price_full: parseFloat(e.target.value) })
                  }
                />
                <p className="text-xs text-muted-foreground">Preço sem desconto</p>
              </div>

              {/* Entrada */}
              <div className="space-y-2">
                <Label htmlFor="default_deposit_amount">Entrada (R$)</Label>
                <Input
                  id="default_deposit_amount"
                  type="number"
                  step="0.01"
                  value={globalForm.default_deposit_amount}
                  onChange={(e) =>
                    setGlobalForm({
                      ...globalForm,
                      default_deposit_amount: parseFloat(e.target.value),
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">Valor fixo da entrada</p>
              </div>

              {/* Desconto PIX */}
              <div className="space-y-2">
                <Label htmlFor="pix_discount_percentage">Desconto PIX (%)</Label>
                <Input
                  id="pix_discount_percentage"
                  type="number"
                  step="0.01"
                  value={globalForm.pix_discount_percentage}
                  onChange={(e) =>
                    setGlobalForm({
                      ...globalForm,
                      pix_discount_percentage: parseFloat(e.target.value),
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">Percentual de desconto</p>
              </div>
            </div>

            {/* Preview */}
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <h4 className="font-semibold text-sm">Preview dos Valores:</h4>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Preço PIX:</span>
                  <p className="font-bold text-green-600">
                    R${" "}
                    {calculatePixPrice(
                      globalForm.default_price_full,
                      globalForm.pix_discount_percentage
                    ).toFixed(2)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Restante PIX:</span>
                  <p className="font-bold">
                    R${" "}
                    {(
                      calculatePixPrice(
                        globalForm.default_price_full,
                        globalForm.pix_discount_percentage
                      ) - globalForm.default_deposit_amount
                    ).toFixed(2)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Restante Parcelado:</span>
                  <p className="font-bold">
                    R${" "}
                    {(globalForm.default_price_full - globalForm.default_deposit_amount).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleSaveGlobalSettings}
              disabled={updateGlobalSettingsMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {updateGlobalSettingsMutation.isPending
                ? "Salvando..."
                : "Salvar Configurações Globais"}
            </Button>
          </CardContent>
        </Card>

        {/* Preços por Coleção */}
        <Card>
          <CardHeader>
            <CardTitle>Preços por Coleção</CardTitle>
            <CardDescription>Personalize preços para coleções específicas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {collections?.map((collection) => (
                <CollectionPricingRow
                  key={collection.id}
                  collection={collection}
                  globalSettings={globalSettings}
                  onUpdate={(data) =>
                    updateCollectionPricingMutation.mutate({
                      collectionId: collection.id,
                      ...data,
                    })
                  }
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

// Componente para linha de coleção
function CollectionPricingRow({
  collection,
  globalSettings,
  onUpdate,
}: {
  collection: any;
  globalSettings: any;
  onUpdate: (data: any) => void;
}) {
  const [isCustom, setIsCustom] = useState(collection.is_price_custom);
  const [priceFull, setPriceFull] = useState(collection.price_full || 500);
  const [depositAmount, setDepositAmount] = useState(collection.deposit_amount || 100);

  const effectivePriceFull = isCustom ? priceFull : globalSettings?.default_price_full || 500;
  const effectiveDeposit = isCustom ? depositAmount : globalSettings?.default_deposit_amount || 100;
  const pixDiscount = globalSettings?.pix_discount_percentage || 5;
  const pricePix = effectivePriceFull * (1 - pixDiscount / 100);

  const handleSave = () => {
    onUpdate({
      price_full: priceFull,
      deposit_amount: depositAmount,
      is_price_custom: isCustom,
    });
  };

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold">{collection.name}</h4>
          <p className="text-sm text-muted-foreground">{collection.slug}</p>
        </div>
        <div className="flex items-center gap-4">
          {isCustom ? (
            <Badge variant="default">Preço Customizado</Badge>
          ) : (
            <Badge variant="secondary">Usando Padrão</Badge>
          )}
          <div className="flex items-center gap-2">
            <Label htmlFor={`custom-${collection.id}`} className="text-sm">
              Customizar
            </Label>
            <Switch
              id={`custom-${collection.id}`}
              checked={isCustom}
              onCheckedChange={setIsCustom}
            />
          </div>
        </div>
      </div>

      {isCustom && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Preço Cheio (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={priceFull}
              onChange={(e) => setPriceFull(parseFloat(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label>Entrada (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={depositAmount}
              onChange={(e) => setDepositAmount(parseFloat(e.target.value))}
            />
          </div>
        </div>
      )}

      <div className="p-3 bg-muted/50 rounded text-sm space-y-1">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Preço PIX ({pixDiscount}% OFF):</span>
          <span className="font-semibold text-green-600">R$ {pricePix.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Entrada:</span>
          <span className="font-semibold">R$ {effectiveDeposit.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Restante PIX:</span>
          <span className="font-semibold">R$ {(pricePix - effectiveDeposit).toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Restante Parcelado:</span>
          <span className="font-semibold">
            R$ {(effectivePriceFull - effectiveDeposit).toFixed(2)}
          </span>
        </div>
      </div>

      {isCustom && (
        <Button onClick={handleSave} size="sm">
          <Save className="h-4 w-4 mr-2" />
          Salvar Preços
        </Button>
      )}
    </div>
  );
}
