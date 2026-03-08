// @ts-nocheck
/**
 * Componente para configurar limite de coleções por plano
 * 
 * Permite admin definir quantas coleções cada plano de assinatura permite.
 * -1 = ilimitado, N > 0 = limite específico
 * 
 * Spec: contextual-pricing-system
 * Task: 7.1 (RN003 - Collection Limit per Plan)
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Save, Info, Infinity as InfinityIcon } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CollectionLimitConfigProps {
  planId: string;
  planType: string;
  currentLimit: number;
  onUpdate?: (newLimit: number) => void;
}

export function CollectionLimitConfig({
  planId,
  planType,
  currentLimit,
  onUpdate,
}: CollectionLimitConfigProps) {
  const [limit, setLimit] = useState<string>(currentLimit.toString());
  const [hasChanges, setHasChanges] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Sincronizar com prop
  useEffect(() => {
    setLimit(currentLimit.toString());
    setHasChanges(false);
  }, [currentLimit]);

  const updateMutation = useMutation({
    mutationFn: async (newLimit: number) => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .update({ collections_count: newLimit })
        .eq("id", planId)
        .select()
        .single();

      if (error) {
        throw new Error(`Erro ao atualizar limite: ${error.message}`);
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["subscription-plans"] });
      queryClient.invalidateQueries({ queryKey: ["collection-limit"] });

      toast({
        title: "Limite atualizado",
        description: `Limite de coleções do plano ${planType} atualizado com sucesso`,
      });

      setHasChanges(false);
      onUpdate?.(data.collections_count);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar limite",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLimitChange = (value: string) => {
    setLimit(value);
    setHasChanges(true);
  };

  const handleSetUnlimited = () => {
    setLimit("-1");
    setHasChanges(true);
  };

  const handleSave = async () => {
    const numValue = parseInt(limit);

    if (isNaN(numValue) || numValue < -1 || numValue === 0) {
      toast({
        title: "Limite inválido",
        description: "O limite deve ser -1 (ilimitado) ou um número positivo",
        variant: "destructive",
      });
      return;
    }

    await updateMutation.mutateAsync(numValue);
  };

  const isUnlimited = parseInt(limit) === -1;
  const displayLimit = isUnlimited ? "Ilimitado" : limit;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Limite de Coleções</CardTitle>
        <CardDescription>
          Configure quantas coleções os usuários deste plano podem escolher
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            -1 = Ilimitado (todas as coleções) | Número positivo = Limite específico de coleções
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="limit">Quantidade de Coleções</Label>
          <div className="flex items-center gap-2">
            <Input
              id="limit"
              type="number"
              min="-1"
              step="1"
              value={limit}
              onChange={(e) => handleLimitChange(e.target.value)}
              className="w-32"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleSetUnlimited}
            >
              <InfinityIcon className="h-4 w-4 mr-2" />
              Ilimitado
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Define quantas coleções o usuário pode escolher na assinatura
          </p>
        </div>

        {/* Preview */}
        <div className="p-4 bg-muted rounded-lg space-y-2">
          <div className="text-sm font-medium">Preview</div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Plano:</span>
            <Badge variant="outline">{planType}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Limite atual:</span>
            <Badge variant="secondary">
              {currentLimit === -1 ? "Ilimitado" : `${currentLimit} coleções`}
            </Badge>
          </div>
          {hasChanges && (
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm font-medium">Novo limite:</span>
              <Badge variant="default">
                {isUnlimited ? "Ilimitado" : `${limit} coleções`}
              </Badge>
            </div>
          )}
        </div>

        {/* Exemplos */}
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="font-medium">Exemplos de configuração:</div>
          <ul className="list-disc list-inside space-y-1">
            <li>Plano Trimestral: 1 coleção</li>
            <li>Plano Semestral: 3 coleções</li>
            <li>Plano Anual: -1 (ilimitado)</li>
          </ul>
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
          Salvar Limite
        </Button>
      </CardContent>
    </Card>
  );
}
