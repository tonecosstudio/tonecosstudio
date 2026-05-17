/**
 * Componente para configurar modalidades de compra
 * 
 * Permite editar multiplicadores e visualizar impacto em todos os níveis.
 * Requisitos: 3.3, 3.4, 3.5
 * Tarefa: 8.1
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { usePurchaseModes, useUpdatePurchaseModeMultiplier } from "@/hooks/usePurchaseModes";
import { useAllTiersWithPlans } from "@/hooks/useTierWithPlans";
import { updateMultiplierSchema } from "@/lib/validations/pricing-restructure";
import { calculatePlanPrice } from "@/lib/validations/pricing-restructure";
import { formatCurrency } from "@/lib/utils";
import { Edit, AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import type { PurchaseMode } from "@/types/pricing-restructure";
import { z } from "zod";

type UpdateMultiplierFormData = z.infer<typeof updateMultiplierSchema>;

/**
 * Componente principal de configuração de modalidades
 */
export function PurchaseModesConfig() {
  const { data: modes, isLoading: modesLoading } = usePurchaseModes();
  const { data: tiersWithPlans, isLoading: tiersLoading } = useAllTiersWithPlans();
  const [editingMode, setEditingMode] = useState<PurchaseMode | null>(null);

  if (modesLoading || tiersLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!modes || modes.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Nenhuma modalidade de compra encontrada. Execute as migrations do banco de dados.
        </AlertDescription>
      </Alert>
    );
  }

  const totalTiers = tiersWithPlans?.length || 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Modalidades de Compra</CardTitle>
          <CardDescription>
            Configure os multiplicadores de preço para cada modalidade. Mudanças afetarão todos os níveis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Modalidade</TableHead>
                <TableHead>Multiplicador</TableHead>
                <TableHead>Coleções</TableHead>
                <TableHead>Entregas</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {modes.map((mode) => (
                <TableRow key={mode.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{mode.name}</div>
                      {mode.description && (
                        <div className="text-sm text-muted-foreground">
                          {mode.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {mode.price_multiplier.toFixed(2)}x
                    </Badge>
                  </TableCell>
                  <TableCell>{mode.collections_count}</TableCell>
                  <TableCell>{mode.deliveries_total}</TableCell>
                  <TableCell>
                    <Badge variant={mode.is_active ? "default" : "secondary"}>
                      {mode.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingMode(mode)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalTiers > 0 && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Alterações nos multiplicadores recalcularão automaticamente os preços de{" "}
                <strong>{totalTiers} níveis</strong> e todos os seus planos.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {editingMode && (
        <EditMultiplierDialog
          mode={editingMode}
          open={!!editingMode}
          onOpenChange={(open) => !open && setEditingMode(null)}
          tiersWithPlans={tiersWithPlans || []}
        />
      )}
    </div>
  );
}

/**
 * Dialog para editar multiplicador de uma modalidade
 */
interface EditMultiplierDialogProps {
  mode: PurchaseMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tiersWithPlans: Array<{ tier_name: string; tier_price_base: number }>;
}

function EditMultiplierDialog({
  mode,
  open,
  onOpenChange,
  tiersWithPlans,
}: EditMultiplierDialogProps) {
  const updateMultiplier = useUpdatePurchaseModeMultiplier();
  const form = useForm<UpdateMultiplierFormData>({
    resolver: zodResolver(updateMultiplierSchema),
    defaultValues: {
      mode_key: mode.mode_key,
      new_multiplier: mode.price_multiplier,
    },
  });

  const newMultiplier = form.watch("new_multiplier");

  // Calcular impacto da mudança
  const multiplierChange = newMultiplier - mode.price_multiplier;
  const multiplierChangePercent = (multiplierChange / mode.price_multiplier) * 100;
  const isIncrease = multiplierChange > 0;
  const isDecrease = multiplierChange < 0;

  // Calcular exemplos de impacto
  const impactExamples = tiersWithPlans.slice(0, 3).map((tier) => {
    const oldPrice = calculatePlanPrice(tier.tier_price_base, mode.price_multiplier);
    const newPrice = calculatePlanPrice(tier.tier_price_base, newMultiplier);
    return {
      tierName: tier.tier_name,
      oldPrice,
      newPrice,
      difference: newPrice - oldPrice,
    };
  });

  const onSubmit = async (data: UpdateMultiplierFormData) => {
    try {
      await updateMultiplier.mutateAsync({
        modeKey: data.mode_key,
        newMultiplier: data.new_multiplier,
      });
      onOpenChange(false);
    } catch (_error) {
      // Erro já tratado pelo hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Multiplicador - {mode.name}</DialogTitle>
          <DialogDescription>
            Altere o multiplicador de preço para esta modalidade
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="new_multiplier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Novo Multiplicador</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.1"
                      max="2.0"
                      {...field}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        field.onChange(value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {multiplierChange !== 0 && (
              <Alert>
                <div className="flex items-center gap-2">
                  {isIncrease && <TrendingUp className="h-4 w-4 text-red-500" />}
                  {isDecrease && <TrendingDown className="h-4 w-4 text-green-500" />}
                  <AlertDescription>
                    {isIncrease && (
                      <span className="text-red-600 font-medium">
                        Aumento de {multiplierChangePercent.toFixed(1)}%
                      </span>
                    )}
                    {isDecrease && (
                      <span className="text-green-600 font-medium">
                        Redução de {Math.abs(multiplierChangePercent).toFixed(1)}%
                      </span>
                    )}
                    {" "}nos preços desta modalidade
                  </AlertDescription>
                </div>
              </Alert>
            )}

            {impactExamples.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Prévia de Impacto</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nível</TableHead>
                      <TableHead>Preço Atual</TableHead>
                      <TableHead>Novo Preço</TableHead>
                      <TableHead>Diferença</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {impactExamples.map((example) => (
                      <TableRow key={example.tierName}>
                        <TableCell className="font-medium">
                          {example.tierName}
                        </TableCell>
                        <TableCell>{formatCurrency(example.oldPrice)}</TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(example.newPrice)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              example.difference > 0
                                ? "text-red-600"
                                : example.difference < 0
                                ? "text-green-600"
                                : ""
                            }
                          >
                            {example.difference > 0 ? "+" : ""}
                            {formatCurrency(example.difference)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {tiersWithPlans.length > 3 && (
                  <p className="text-sm text-muted-foreground">
                    ... e mais {tiersWithPlans.length - 3} níveis serão afetados
                  </p>
                )}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={updateMultiplier.isPending}>
                {updateMultiplier.isPending ? "Atualizando..." : "Atualizar Multiplicador"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

