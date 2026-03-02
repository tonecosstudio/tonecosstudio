/**
 * Componente para prévia de cálculo de preços
 * 
 * Mostra prévia de preços antes de salvar, com fórmulas de cálculo.
 * Requisitos: 6.4, 6.6, 6.7
 * Tarefa: 8.4
 */

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useActivePurchaseModes } from "@/hooks/usePurchaseModes";
import { calculatePlanPrice, calculatePixPrice } from "@/lib/validations/pricing-restructure";
import { formatCurrency } from "@/lib/utils";
import { Calculator, CheckCircle2, AlertCircle } from "lucide-react";

interface PriceCalculatorPreviewProps {
  tierPrice: number;
  pixDiscountPercentage: number;
  depositAmount?: number;
}

/**
 * Prévia de cálculo de preços para todas as modalidades
 */
export function PriceCalculatorPreview({
  tierPrice,
  pixDiscountPercentage,
  depositAmount,
}: PriceCalculatorPreviewProps) {
  const { data: modes } = useActivePurchaseModes();

  // Calcular preços para todas as modalidades
  const calculatedPrices = useMemo(() => {
    if (!modes || !tierPrice) return [];

    return modes.map((mode) => {
      const priceFull = calculatePlanPrice(tierPrice, mode.price_multiplier);
      const pricePix = calculatePixPrice(priceFull, pixDiscountPercentage);
      const isValid = priceFull > 0 && pricePix > 0;

      return {
        modeKey: mode.mode_key,
        modeName: mode.name,
        multiplier: mode.price_multiplier,
        priceFull,
        pricePix,
        pixSavings: priceFull - pricePix,
        isValid,
        collectionsCount: mode.collections_count,
        deliveriesTotal: mode.deliveries_total,
      };
    });
  }, [modes, tierPrice, pixDiscountPercentage]);

  const allPricesValid = calculatedPrices.every((p) => p.isValid);
  const totalPlansToCreate = calculatedPrices.length;

  // Validar entrada
  const depositValid = !depositAmount || (depositAmount > 0 && depositAmount < tierPrice);

  if (!modes || modes.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Nenhuma modalidade ativa encontrada. Ative pelo menos uma modalidade para criar planos.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Prévia de Preços
            </CardTitle>
            <CardDescription>
              Preços calculados para {totalPlansToCreate} modalidades ativas
            </CardDescription>
          </div>
          {allPricesValid && depositValid ? (
            <Badge variant="default" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Válido
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              Inválido
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Resumo do Nível */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Preço Base</p>
            <p className="text-lg font-bold">{formatCurrency(tierPrice)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Desconto PIX</p>
            <p className="text-lg font-bold">{pixDiscountPercentage.toFixed(1)}%</p>
          </div>
          {depositAmount !== undefined && (
            <div>
              <p className="text-sm text-muted-foreground">Entrada</p>
              <p className="text-lg font-bold">
                {formatCurrency(depositAmount)}
                {!depositValid && (
                  <span className="text-xs text-destructive ml-2">Inválida</span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Tabela de Preços Calculados */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Modalidade</TableHead>
              <TableHead>Multiplicador</TableHead>
              <TableHead>Preço Cheio</TableHead>
              <TableHead>Preço PIX</TableHead>
              <TableHead>Economia PIX</TableHead>
              <TableHead>Detalhes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {calculatedPrices.map((price) => (
              <TableRow key={price.modeKey}>
                <TableCell className="font-medium">{price.modeName}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono">
                    {price.multiplier.toFixed(2)}x
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className={price.isValid ? "" : "text-destructive"}>
                    {formatCurrency(price.priceFull)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={price.isValid ? "text-green-600 font-medium" : "text-destructive"}>
                    {formatCurrency(price.pricePix)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {formatCurrency(price.pixSavings)}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="text-xs text-muted-foreground">
                    {price.collectionsCount} coleções • {price.deliveriesTotal} entregas
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Fórmulas de Cálculo */}
        <div className="p-4 bg-muted rounded-lg space-y-2">
          <p className="text-sm font-medium">Fórmulas de Cálculo</p>
          <div className="space-y-1 text-sm text-muted-foreground font-mono">
            <p>
              <strong>Preço Cheio:</strong> {formatCurrency(tierPrice)} × Multiplicador
            </p>
            <p>
              <strong>Preço PIX:</strong> Preço Cheio × (1 - {pixDiscountPercentage}% / 100)
            </p>
            <p>
              <strong>Economia PIX:</strong> Preço Cheio - Preço PIX
            </p>
          </div>
        </div>

        {/* Validações */}
        {!allPricesValid && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Alguns preços calculados são inválidos (≤ 0). Verifique o preço base e os multiplicadores.
            </AlertDescription>
          </Alert>
        )}

        {depositAmount !== undefined && !depositValid && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              O valor da entrada deve ser maior que zero e menor que o preço base.
            </AlertDescription>
          </Alert>
        )}

        {allPricesValid && depositValid && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Todos os preços são válidos. {totalPlansToCreate} planos serão criados automaticamente.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
