/**
 * PricingHierarchyView - Visualizacao hierarquica completa de precos.
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Info, Loader2 } from "lucide-react";
import { TierHierarchyCard } from "./TierHierarchyCard";
import { CreateTierDialog } from "./CreateTierDialog";
import { EditTierDialog } from "./EditTierDialog";
import { PurchaseModesConfig } from "../pricing-restructure/PurchaseModesConfig";
import { useDeletePricingTier, usePricingHierarchy } from "@/hooks/admin/usePricingHierarchy";
import type { PricingTierWithStats } from "@/types/pricing-tiers";

interface CollectionByTierRow {
  collection_id: string;
  tier_id: string;
  collections: {
    id: string;
    name: string;
  } | null;
}

export function PricingHierarchyView() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<PricingTierWithStats | null>(null);

  const { data, isLoading: tiersLoading, refetch: refetchHierarchy } = usePricingHierarchy();
  const deleteTierMutation = useDeletePricingTier();

  const tiers = data?.tiers || [];
  const allPlans = data?.plans || [];
  const allCollections = data?.collections || [];

  const handleEdit = (tier: PricingTierWithStats) => {
    setSelectedTier(tier);
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (tierId: string) => {
    if (!confirm("Tem certeza que deseja deletar este nivel?")) return;

    try {
      await deleteTierMutation.mutateAsync(tierId);
      refetchHierarchy();
    } catch (error) {
      console.error("Erro ao deletar nivel:", error);
    }
  };

  const getPlansForTier = (tierId: string) => {
    return allPlans
      .filter((plan) => plan.tier_id === tierId)
      .map((plan) => ({
        id: plan.id,
        mode_name: plan.name || plan.plan_mode || "Desconhecido",
        price: plan.price_full,
        multiplier: plan.price_multiplier || 1,
      }));
  };

  const getCollectionsForTier = (tierId: string) => {
    return allCollections
      .filter((assignment: CollectionByTierRow) => assignment.tier_id === tierId)
      .map((assignment: CollectionByTierRow) => ({
        id: assignment.collections?.id || assignment.collection_id,
        name: assignment.collections?.name || "Desconhecida",
      }));
  };

  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-semibold">Como funciona a hierarquia:</p>
            <div className="ml-4 space-y-1 text-sm">
              <p>
                1. <strong>Modalidades</strong> {"->"} Definem multiplicadores (Avulso 1.0x, Trimestral
                0.93x, etc)
              </p>
              <p>
                2. <strong>Niveis</strong> {"->"} Definem preco base (ex: R$ 500)
              </p>
              <p>
                3. <strong>Planos</strong> {"->"} Gerados automaticamente (Nivel x Modalidade)
              </p>
              <p>
                4. <strong>Colecoes</strong> {"->"} Atribuidas aos niveis
              </p>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Modalidades de Compra</CardTitle>
          <CardDescription>
            Configure os multiplicadores aplicados ao preco base de cada nivel. Alteracoes
            recalculam automaticamente todos os planos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PurchaseModesConfig />
        </CardContent>
      </Card>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Niveis de Preco</h2>
            <p className="text-muted-foreground">
              Cada nivel gera automaticamente 4 planos (um para cada modalidade ativa)
            </p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Criar Nivel
          </Button>
        </div>

        {tiersLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : tiers.length > 0 ? (
          <div className="space-y-4">
            {tiers.map((tier) => (
              <TierHierarchyCard
                key={tier.id}
                tier={tier}
                plans={getPlansForTier(tier.id)}
                collections={getCollectionsForTier(tier.id)}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onRefresh={refetchHierarchy}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="mb-4 text-muted-foreground">Nenhum nivel de preco criado ainda</p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeiro Nivel
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <CreateTierDialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) refetchHierarchy();
        }}
      />

      {selectedTier && (
        <EditTierDialog
          tier={selectedTier}
          open={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
            setSelectedTier(null);
            refetchHierarchy();
          }}
          onOpenChange={(open) => {
            setIsEditDialogOpen(open);
            if (!open) {
              setSelectedTier(null);
              refetchHierarchy();
            }
          }}
        />
      )}
    </div>
  );
}
