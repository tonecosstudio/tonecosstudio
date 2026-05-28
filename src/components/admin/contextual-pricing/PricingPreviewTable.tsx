/**
 * Tabela de preview de preços calculados
 * 
 * Mostra como os preços finais são calculados para diferentes contextos,
 * ajudando admins a visualizar o impacto das configurações.
 * 
 * Spec: contextual-pricing-system
 * Task: 6.4
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Info, Coins } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useBasePricing } from "@/hooks/useBasePricing";
import { useContextPricing } from "@/hooks/useContextPricing";

export function PricingPreviewTable() {
  const { data: basePrices, isLoading: loadingBase } = useBasePricing();
  const { data: contexts, isLoading: loadingContexts } = useContextPricing();

  const isLoading = loadingBase || loadingContexts;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Encontrar contextos específicos
  const chosenContext = contexts?.find(c => c.user_context === "subscribed_chosen");
  const notChosenContext = contexts?.find(c => c.user_context === "subscribed_not_chosen");
  const noSubContext = contexts?.find(c => c.user_context === "no_subscription");

  const calculateChosenPrice = (basePrice: number) => {
    if (!chosenContext) return basePrice;
    const discount = chosenContext.chosen_collection_discount_percentage ?? 0;
    return Math.round(basePrice - (basePrice * discount / 100));
  };

  const calculateMultipliedPrice = (basePrice: number, multiplier: number) => {
    return Math.round(basePrice * multiplier);
  };

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Esta tabela mostra como os preços são calculados para diferentes contextos.
          Os valores são atualizados automaticamente quando você altera preços base ou multiplicadores.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Preview de Preços Contextuais</CardTitle>
          <CardDescription>
            Visualize os preços finais calculados para cada tipo de coleção e contexto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo de Coleção</TableHead>
                <TableHead>Preço Base</TableHead>
                <TableHead>Coleção Escolhida</TableHead>
                <TableHead>Não Escolhida</TableHead>
                <TableHead>Não Assinante</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {basePrices?.map((price) => {
                const basePrice = price.base_price_coins;
                const chosenPrice = calculateChosenPrice(basePrice);
                const notChosenPrice = notChosenContext 
                  ? calculateMultipliedPrice(basePrice, notChosenContext.multiplier)
                  : basePrice;
                const noSubPrice = noSubContext
                  ? calculateMultipliedPrice(basePrice, noSubContext.multiplier)
                  : basePrice;

                // Para catálogos, o preço é fixo
                const isFixedPrice = price.collection_type_name !== "subscription";

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
                        <span className="font-mono">{basePrice}</span>
                        <Coins className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </TableCell>
                    <TableCell>
                      {isFixedPrice ? (
                        <Badge variant="secondary">Preço Fixo</Badge>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-green-600 font-semibold">
                              {chosenPrice}
                            </span>
                            <Coins className="h-4 w-4 text-green-600" />
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {basePrice} - ({basePrice} × {chosenContext?.chosen_collection_discount_percentage}%)
                          </div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {isFixedPrice ? (
                        <Badge variant="secondary">Preço Fixo</Badge>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono">{notChosenPrice}</span>
                            <Coins className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {basePrice} × {notChosenContext?.multiplier}
                          </div>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {isFixedPrice ? (
                        <Badge variant="secondary">Preço Fixo</Badge>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono">{noSubPrice}</span>
                            <Coins className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {basePrice} × {noSubContext?.multiplier}
                          </div>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Legenda */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Legenda</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <Badge variant="default" className="bg-green-600">Coleção Escolhida</Badge>
            <span className="text-muted-foreground">
              Desconto aplicado: Preço Base - (Preço Base × Desconto%)
            </span>
          </div>
          <div className="flex items-start gap-2">
            <Badge variant="secondary">Não Escolhida</Badge>
            <span className="text-muted-foreground">
              Multiplicador aplicado: Preço Base × Multiplicador
            </span>
          </div>
          <div className="flex items-start gap-2">
            <Badge variant="outline">Não Assinante</Badge>
            <span className="text-muted-foreground">
              Multiplicador aplicado: Preço Base × Multiplicador
            </span>
          </div>
          <div className="flex items-start gap-2">
            <Badge variant="secondary">Preço Fixo</Badge>
            <span className="text-muted-foreground">
              Catálogos têm preço fixo independente de assinatura
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
