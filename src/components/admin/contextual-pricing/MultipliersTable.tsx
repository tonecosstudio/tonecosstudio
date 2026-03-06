/**
 * Tabela para editar multiplicadores de contexto e desconto
 * 
 * Permite configurar:
 * - Multiplicadores para diferentes contextos (assinante, não assinante)
 * - Desconto percentual para coleções escolhidas
 * 
 * Spec: contextual-pricing-system
 * Task: 6.3
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Save, AlertCircle, Percent } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  useContextPricing, 
  useUpdateMultiplier, 
  useUpdateChosenDiscount 
} from "@/hooks/useContextPricing";
import { useToast } from "@/hooks/use-toast";

export function MultipliersTable() {
  const { data: contexts, isLoading } = useContextPricing();
  const updateMultiplierMutation = useUpdateMultiplier();
  const updateDiscountMutation = useUpdateChosenDiscount();
  const { toast } = useToast();

  // Estado local para edição
  const [editingMultipliers, setEditingMultipliers] = useState<Record<string, number>>({});
  const [editingDiscount, setEditingDiscount] = useState<number | null>(null);

  const handleMultiplierChange = (context: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setEditingMultipliers(prev => ({
      ...prev,
      [context]: numValue,
    }));
  };

  const handleDiscountChange = (value: string) => {
    const numValue = parseInt(value) || 0;
    setEditingDiscount(numValue);
  };

  const handleSaveMultiplier = async (context: string, description: string) => {
    const newMultiplier = editingMultipliers[context];
    
    if (!newMultiplier || newMultiplier <= 0) {
      toast({
        title: "Multiplicador inválido",
        description: "O multiplicador deve ser maior que 0",
        variant: "destructive",
      });
      return;
    }

    await updateMultiplierMutation.mutateAsync({
      user_context: context,
      new_multiplier: newMultiplier,
      reason: `Atualização manual via admin - ${description}`,
    });

    // Limpar estado de edição
    setEditingMultipliers(prev => {
      const newState = { ...prev };
      delete newState[context];
      return newState;
    });
  };

  const handleSaveDiscount = async () => {
    if (editingDiscount === null || editingDiscount < 0 || editingDiscount > 100) {
      toast({
        title: "Desconto inválido",
        description: "O desconto deve estar entre 0 e 100%",
        variant: "destructive",
      });
      return;
    }

    await updateDiscountMutation.mutateAsync({
      new_discount_percentage: editingDiscount,
      reason: "Atualização manual via admin - Desconto coleções escolhidas",
    });

    setEditingDiscount(null);
  };

  const getDisplayMultiplier = (context: string, currentMultiplier: number) => {
    return editingMultipliers[context] !== undefined ? editingMultipliers[context] : currentMultiplier;
  };

  const chosenContext = contexts?.find(c => c.user_context === "subscribed_chosen");
  const displayDiscount = editingDiscount !== null 
    ? editingDiscount 
    : chosenContext?.chosen_collection_discount_percentage || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Multiplicadores ajustam o preço base para diferentes contextos. 
          1.0 = 100% (sem alteração), 1.2 = 120% (acréscimo de 20%), 0.8 = 80% (desconto de 20%).
          O desconto de coleções escolhidas é aplicado como subtração percentual direta.
        </AlertDescription>
      </Alert>

      {/* Tabela de Multiplicadores */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Multiplicadores de Contexto</CardTitle>
          <CardDescription>
            Configure multiplicadores para coleções não escolhidas e não assinantes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contexto</TableHead>
                <TableHead>Multiplicador</TableHead>
                <TableHead>Percentual</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contexts
                ?.filter(c => c.user_context !== "subscribed_chosen")
                .map((context) => {
                  const isEditing = editingMultipliers[context.user_context] !== undefined;
                  const displayMultiplier = getDisplayMultiplier(context.user_context, context.multiplier);
                  const percentage = Math.round(displayMultiplier * 100);

                  return (
                    <TableRow key={context.user_context}>
                      <TableCell className="font-medium">
                        {context.description}
                        <div className="text-sm text-muted-foreground">
                          {context.user_context}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0.1"
                          max="10"
                          step="0.1"
                          value={displayMultiplier}
                          onChange={(e) => handleMultiplierChange(context.user_context, e.target.value)}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">{percentage}%</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleSaveMultiplier(context.user_context, context.description)}
                          disabled={!isEditing || updateMultiplierMutation.isPending}
                        >
                          {updateMultiplierMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              Salvar
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Card de Desconto para Coleções Escolhidas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Desconto para Coleções Escolhidas</CardTitle>
          <CardDescription>
            Configure o percentual de desconto aplicado quando o usuário escolhe uma coleção na assinatura
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <Percent className="h-4 w-4" />
              <AlertDescription>
                Este desconto é aplicado como: Preço Base - (Preço Base × {displayDiscount}%)
                <br />
                Exemplo: 1000 coins - (1000 × {displayDiscount}%) = {1000 - (1000 * displayDiscount / 100)} coins
              </AlertDescription>
            </Alert>

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={displayDiscount}
                    onChange={(e) => handleDiscountChange(e.target.value)}
                    className="w-32"
                  />
                  <Percent className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <Button
                onClick={handleSaveDiscount}
                disabled={editingDiscount === null || updateDiscountMutation.isPending}
              >
                {updateDiscountMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Desconto
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
