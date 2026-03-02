/**
 * Componente para visualizar nível com todos os planos
 * 
 * Exibe nível com planos em formato de tabela, mostrando fórmulas de cálculo.
 * Requisitos: 4.5, 6.1, 6.2
 * Tarefa: 8.3
 */

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTierWithPlans } from "@/hooks/useTierWithPlans";
import { formatCurrency } from "@/lib/utils";
import { AlertCircle, Calculator, Star, Package, Users } from "lucide-react";

interface TierPlansViewProps {
  tierId: string;
}

/**
 * Visualização de nível com todos os planos
 */
export function TierPlansView({ tierId }: TierPlansViewProps) {
  const { data: tierWithPlans, isLoading } = useTierWithPlans(tierId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!tierWithPlans) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Nível não encontrado</AlertDescription>
      </Alert>
    );
  }

  const hasPlans = tierWithPlans.plans && tierWithPlans.plans.length > 0;

  return (
    <div className="space-y-6">
      {/* Informações do Nível */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {tierWithPlans.tier_name}
                {tierWithPlans.tier_is_default && (
                  <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                )}
              </CardTitle>
              {tierWithPlans.tier_description && (
                <CardDescription className="mt-2">
                  {tierWithPlans.tier_description}
                </CardDescription>
              )}
            </div>
            <Badge variant={tierWithPlans.tier_is_active ? "default" : "secondary"}>
              {tierWithPlans.tier_is_active ? "Ativo" : "Inativo"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Preço Base</p>
              <p className="text-2xl font-bold">
                {formatCurrency(tierWithPlans.tier_price_base)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Preço PIX Base</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(tierWithPlans.tier_price_pix_base)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Entrada</p>
              <p className="text-2xl font-bold">
                {formatCurrency(tierWithPlans.tier_deposit)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Desconto PIX</p>
              <p className="text-2xl font-bold">
                {(
                  ((tierWithPlans.tier_price_base - tierWithPlans.tier_price_pix_base) /
                    tierWithPlans.tier_price_base) *
                  100
                ).toFixed(1)}
                %
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Coleções Atribuídas</p>
                <p className="text-lg font-semibold">
                  {tierWithPlans.assigned_collections_count}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Assinaturas Ativas</p>
                <p className="text-lg font-semibold">
                  {tierWithPlans.total_active_subscriptions}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Planos do Nível */}
      <Card>
        <CardHeader>
          <CardTitle>Planos (Modalidades)</CardTitle>
          <CardDescription>
            Preços calculados automaticamente para cada modalidade de compra
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!hasPlans ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Este nível ainda não possui planos. Execute a função create_tier_with_plans
                para gerar planos automaticamente.
              </AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Modalidade</TableHead>
                  <TableHead>Multiplicador</TableHead>
                  <TableHead>Preço Cheio</TableHead>
                  <TableHead>Preço PIX</TableHead>
                  <TableHead>Coleções</TableHead>
                  <TableHead>Entregas</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tierWithPlans.plans.map((plan) => {
                  const expectedPrice =
                    tierWithPlans.tier_price_base * plan.price_multiplier;
                  const priceMatches =
                    Math.abs(plan.price_full - expectedPrice) < 0.01;

                  return (
                    <TableRow key={plan.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{plan.name}</div>
                          {plan.description && (
                            <div className="text-sm text-muted-foreground">
                              {plan.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge variant="outline" className="font-mono">
                                {plan.price_multiplier.toFixed(2)}x
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="flex items-center gap-2">
                                <Calculator className="h-4 w-4" />
                                <span>
                                  {formatCurrency(tierWithPlans.tier_price_base)} × {plan.price_multiplier.toFixed(2)} ={" "}
                                  {formatCurrency(expectedPrice)}
                                </span>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {formatCurrency(plan.price_full)}
                          </span>
                          {!priceMatches && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Preço não corresponde à fórmula esperada</p>
                                  <p className="text-xs">
                                    Esperado: {formatCurrency(expectedPrice)}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-green-600">
                          {formatCurrency(plan.price_pix)}
                        </span>
                      </TableCell>
                      <TableCell>{plan.collections_count}</TableCell>
                      <TableCell>{plan.deliveries_total}</TableCell>
                      <TableCell>
                        <Badge variant={plan.is_active ? "default" : "secondary"}>
                          {plan.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {hasPlans && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <div className="flex items-start gap-2">
                <Calculator className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="space-y-1 text-sm">
                  <p className="font-medium">Fórmula de Cálculo</p>
                  <p className="text-muted-foreground">
                    <strong>Preço Cheio:</strong> Preço Base × Multiplicador
                  </p>
                  <p className="text-muted-foreground">
                    <strong>Preço PIX:</strong> Preço Cheio × (1 - Desconto PIX %)
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
