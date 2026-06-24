/**
 * TierHierarchyCard - Card que mostra a hierarquia completa de um nível
 * 
 * Exibe:
 * - Informações do nível (nome, preço base)
 * - Planos gerados automaticamente
 * - Coleções atribuídas ao nível
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { PricingTierWithStats } from "@/types/pricing-tiers";
import { CollectionTierAssignmentDialog } from "./CollectionTierAssignmentDialog";

interface TierHierarchyCardProps {
  tier: PricingTierWithStats;
  plans: Array<{
    id: string;
    mode_name: string;
    price: number;
    multiplier: number;
  }>;
  collections: Array<{
    id: string;
    name: string;
  }>;
  onEdit: (tier: PricingTierWithStats) => void;
  onDelete: (tierId: string) => void;
  onRefresh?: () => void;
}

export function TierHierarchyCard({
  tier,
  plans,
  collections,
  onEdit,
  onDelete,
  onRefresh,
}: TierHierarchyCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);

  const formatPrice = (price: number) => formatCurrency(price);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <CardTitle className="text-xl">{tier.name}</CardTitle>
                <Badge variant="outline" className="font-mono">
                  {formatPrice(tier.price_full)}
                </Badge>
                <Badge variant="secondary">
                  {plans.length} planos
                </Badge>
                <Badge variant="secondary">
                  {collections.length} coleções
                </Badge>
              </div>
              {tier.description && (
                <CardDescription className="mt-2">
                  {tier.description}
                </CardDescription>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(tier)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(tier.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="space-y-6">
            {/* Planos Gerados Automaticamente */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                📦 Planos Gerados Automaticamente
                <Badge variant="outline">{plans.length}</Badge>
              </h4>
              {plans.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {plans.map((plan) => (
                    <div
                      key={plan.id}
                      className="flex justify-between items-center p-3 bg-muted rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{plan.mode_name}</div>
                        <div className="text-xs text-muted-foreground">
                          Multiplicador: {plan.multiplier}x
                        </div>
                      </div>
                      <div className="font-mono font-semibold">
                        {formatPrice(plan.price)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground p-4 bg-muted rounded-lg">
                  Nenhum plano gerado. Verifique se as modalidades estão ativas.
                </div>
              )}
            </div>

            {/* Coleções Atribuídas */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold flex items-center gap-2">
                  🎯 Coleções neste Nível
                  <Badge variant="outline">{collections.length}</Badge>
                </h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAssignDialogOpen(true)}
                >
                  Gerenciar Coleções
                </Button>
              </div>
              {collections.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {collections.map((collection) => (
                    <Badge key={collection.id} variant="secondary" className="text-sm py-1 px-3">
                      {collection.name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground p-4 bg-muted rounded-lg">
                  Nenhuma coleção atribuída a este nível.
                  <Button
                    variant="link"
                    size="sm"
                    className="ml-2"
                    onClick={() => setIsAssignDialogOpen(true)}
                  >
                    Atribuir agora
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Dialog de Atribuição de Coleções */}
      <CollectionTierAssignmentDialog
        tierId={tier.id}
        tierName={tier.name}
        open={isAssignDialogOpen}
        onOpenChange={setIsAssignDialogOpen}
        onSuccess={() => {
          setIsAssignDialogOpen(false);
          onRefresh?.();
        }}
      />
    </>
  );
}
