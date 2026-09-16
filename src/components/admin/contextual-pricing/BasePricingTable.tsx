/**
 * Tabela para editar preços base por tipo de coleção.
 *
 * Permite atualizar preços base que servem como referência
 * para cálculo de preços contextuais.
 *
 * Spec: contextual-pricing-system
 * Task: 6.3
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Save, AlertCircle, Coins } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useBasePricing, useUpdateBasePrice } from "@/hooks/useBasePricing";
import { useToast } from "@/hooks/use-toast";

export function BasePricingTable() {
  const { data: basePrices, isLoading } = useBasePricing();
  const updateMutation = useUpdateBasePrice();
  const { toast } = useToast();

  const [editingPrices, setEditingPrices] = useState<Record<string, number>>({});

  const handlePriceChange = (typeId: string, value: string) => {
    const numValue = Number.parseInt(value, 10) || 0;
    setEditingPrices((prev) => ({
      ...prev,
      [typeId]: numValue,
    }));
  };

  const handleSave = async (typeId: string) => {
    const newPrice = editingPrices[typeId];

    if (!Number.isInteger(newPrice) || newPrice <= 0) {
      toast({
        title: "Preço inválido",
        description: "O preço deve ser um número inteiro maior que 0",
        variant: "destructive",
      });
      return;
    }

    await updateMutation.mutateAsync({
      collection_type_id: typeId,
      new_base_price_coins: newPrice,
    });

    setEditingPrices((prev) => {
      const newState = { ...prev };
      delete newState[typeId];
      return newState;
    });
  };

  const getDisplayPrice = (typeId: string, currentPrice: number) =>
    editingPrices[typeId] !== undefined ? editingPrices[typeId] : currentPrice;

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
          Os preços base afetam todos os contextos. Mudanças aqui impactam o cálculo de preços
          para assinantes e não assinantes e são aplicadas somente pela fronteira administrativa
          autenticada do backend.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Preços Base por Tipo</CardTitle>
          <CardDescription>
            Configure o preço base em coins para cada tipo de coleção
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo de Coleção</TableHead>
                <TableHead>Preço Base</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {basePrices?.map((price) => {
                const isEditing = editingPrices[price.collection_type_id] !== undefined;
                const displayPrice = getDisplayPrice(
                  price.collection_type_id,
                  price.base_price_coins,
                );

                return (
                  <TableRow key={price.collection_type_id}>
                    <TableCell className="font-medium">
                      {price.collection_type_display_name}
                      <div className="text-sm text-muted-foreground">
                        {price.collection_type_name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          value={displayPrice}
                          onChange={(event) =>
                            handlePriceChange(price.collection_type_id, event.target.value)
                          }
                          className="w-32"
                        />
                        <Coins className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => handleSave(price.collection_type_id)}
                        disabled={!isEditing || updateMutation.isPending}
                      >
                        {updateMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
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
    </div>
  );
}
