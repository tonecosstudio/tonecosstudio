// @ts-nocheck
/**
 * Componente para configurar multiplicador de preço por personagem
 * 
 * Permite admin definir multiplicador individual para cada personagem,
 * ajustando o preço final baseado em características como tamanho,
 * complexidade ou raridade.
 * 
 * Spec: contextual-pricing-system
 * Task: 6.8 (RN008 - Character Price Multiplier)
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2, Save, Info, Coins, X } from "lucide-react";
import {
  useCharacterMultiplier,
  useUpdateCharacterMultiplier,
  MULTIPLIER_PRESETS,
  formatMultiplier,
  formatMultiplierPercentage,
} from "@/hooks/useCharacterPriceMultiplier";
import { useCharacterPrice } from "@/hooks/useCharacterPrice";
import { useCollectionPrice } from "@/hooks/useCollectionPrice";
import { useToast } from "@/hooks/use-toast";

interface CharacterPriceMultiplierConfigProps {
  characterId: string;
  userId?: string; // Para calcular preview de preço contextual
}

export function CharacterPriceMultiplierConfig({
  characterId,
  userId,
}: CharacterPriceMultiplierConfigProps) {
  const { data: multiplierData, isLoading: loadingMultiplier } = useCharacterMultiplier(characterId);
  const { data: characterPrice, isLoading: loadingCharacterPrice } = useCharacterPrice(characterId, userId);
  const { data: collectionPrice, isLoading: loadingCollectionPrice } = useCollectionPrice(
    multiplierData?.collection_id,
    userId
  );
  const updateMutation = useUpdateCharacterMultiplier();
  const { toast } = useToast();

  const [multiplier, setMultiplier] = useState<string>("");
  const [hasChanges, setHasChanges] = useState(false);

  // Sincronizar com dados do servidor
  useEffect(() => {
    if (multiplierData) {
      setMultiplier(multiplierData.price_multiplier?.toString() || "");
      setHasChanges(false);
    }
  }, [multiplierData]);

  const handleMultiplierChange = (value: string) => {
    setMultiplier(value);
    setHasChanges(true);
  };

  const handlePresetClick = (presetValue: number) => {
    setMultiplier(presetValue.toString());
    setHasChanges(true);
  };

  const handleClear = () => {
    setMultiplier("");
    setHasChanges(true);
  };

  const handleSave = async () => {
    const numValue = multiplier === "" ? null : parseFloat(multiplier);

    if (numValue !== null && (isNaN(numValue) || numValue <= 0)) {
      toast({
        title: "Multiplicador inválido",
        description: "O multiplicador deve ser maior que 0 ou vazio para usar o padrão (1.0)",
        variant: "destructive",
      });
      return;
    }

    await updateMutation.mutateAsync({
      character_id: characterId,
      new_multiplier: numValue,
    });

    setHasChanges(false);
  };

  const currentMultiplier = multiplier === "" ? 1.0 : parseFloat(multiplier) || 1.0;
  const basePrice = collectionPrice || 0;
  const finalPrice = Math.round(basePrice * currentMultiplier);

  const isLoading = loadingMultiplier || loadingCharacterPrice || loadingCollectionPrice;

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
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Coins className="h-5 w-5" />
          Multiplicador de Preço
        </CardTitle>
        <CardDescription>
          Configure o multiplicador individual para ajustar o preço deste personagem
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            O multiplicador é aplicado ao preço contextual da coleção. Use valores maiores que 1.0
            para personagens especiais (grandes, complexos, raros). Deixe vazio para usar o padrão (1.0).
          </AlertDescription>
        </Alert>

        {/* Presets */}
        <div className="space-y-2">
          <Label>Presets Rápidos</Label>
          <div className="flex flex-wrap gap-2">
            {MULTIPLIER_PRESETS.map((preset) => (
              <TooltipProvider key={preset.value}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={currentMultiplier === preset.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePresetClick(preset.value)}
                    >
                      {preset.label} ({preset.value}x)
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{preset.description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </div>

        {/* Input Manual */}
        <div className="space-y-2">
          <Label htmlFor="multiplier">Multiplicador Customizado</Label>
          <div className="flex items-center gap-2">
            <Input
              id="multiplier"
              type="number"
              min="0.1"
              max="10"
              step="0.1"
              placeholder="1.0 (padrão)"
              value={multiplier}
              onChange={(e) => handleMultiplierChange(e.target.value)}
              className="w-32"
            />
            <span className="text-sm text-muted-foreground">×</span>
            {multiplier && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Deixe vazio para usar multiplicador padrão (1.0)
          </p>
        </div>

        {/* Preview de Cálculo */}
        <div className="space-y-2 p-4 bg-muted rounded-lg">
          <div className="text-sm font-medium">Preview de Preço</div>
          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Preço base da coleção:</span>
              <div className="flex items-center gap-1">
                <span className="font-mono">{basePrice}</span>
                <Coins className="h-3 w-3 text-muted-foreground" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Multiplicador:</span>
              <span className="font-mono">{currentMultiplier}x</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="font-medium">Preço final:</span>
              <div className="flex items-center gap-1">
                <span className="font-mono font-bold text-lg">{finalPrice}</span>
                <Coins className="h-4 w-4" />
              </div>
            </div>
            {currentMultiplier !== 1.0 && (
              <div className="text-xs text-muted-foreground text-right">
                {formatMultiplierPercentage(currentMultiplier)} do preço base
              </div>
            )}
          </div>
        </div>

        {/* Status Atual */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status atual:</span>
          <Badge variant={multiplierData?.price_multiplier ? "default" : "secondary"}>
            {formatMultiplier(multiplierData?.price_multiplier || null)}
          </Badge>
        </div>

        {/* Botão Salvar */}
        <Button
          onClick={handleSave}
          disabled={!hasChanges || updateMutation.isPending}
          className="w-full"
        >
          {updateMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salvar Multiplicador
        </Button>
      </CardContent>
    </Card>
  );
}
