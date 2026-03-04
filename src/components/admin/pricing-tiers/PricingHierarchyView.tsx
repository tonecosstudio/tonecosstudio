// @ts-nocheck
/**
 * PricingHierarchyView - Visualização hierárquica completa de preços
 * 
 * Mostra em uma única página:
 * - Modalidades (topo)
 * - Níveis com planos e coleções (hierarquia completa)
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Info, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TierHierarchyCard } from "./TierHierarchyCard";
import { CreateTierDialog } from "./CreateTierDialog";
import { EditTierDialog } from "./EditTierDialog";
import { PurchaseModesConfig } from "../pricing-restructure/PurchaseModesConfig";
import type { PricingTierWithStats } from "@/types/pricing-tiers";

export function PricingHierarchyView() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<PricingTierWithStats | null>(null);

  // Buscar níveis
  const {
    data: tiers,
    isLoading: tiersLoading,
    refetch: refetchTiers,
  } = useQuery({
    queryKey: ["pricing-tiers-hierarchy"],
    queryFn: async () => {
      // @ts-expect-error - Tabela pricing_tiers existe mas tipos podem estar desatualizados
      const { data, error } = await supabase
        .from("pricing_tiers")
        .select("*")
        .order("price_full", { ascending: true });

      if (error) throw error;
      return data as PricingTierWithStats[];
    },
  });

  // Buscar planos para cada nível
  // NOTA: Esta query requer que a migration 20260301150001_add_tier_hierarchy_to_plans.sql
  // tenha sido aplicada no banco de dados
  const { data: allPlans } = useQuery({
    queryKey: ["subscription-plans-all"],
    queryFn: async () => {
      // @ts-expect-error - Campos tier_id, plan_mode existem após migration, tipos serão regenerados
      const { data, error } = await supabase
        .from("subscription_plans")
        .select(`
          id,
          tier_id,
          plan_mode,
          price_multiplier,
          price_full,
          name
        `)
        .not("tier_id", "is", null)
        .order("price_full");

      if (error) throw error;
      return data;
    },
  });

  // Buscar coleções
  const { data: allCollections } = useQuery({
    queryKey: ["collections-by-tier"],
    queryFn: async () => {
      // @ts-expect-error - Tabela collection_tier_assignments existe mas tipos podem estar desatualizados
      const { data, error } = await supabase
        .from("collection_tier_assignments")
        .select(`
          collection_id,
          tier_id,
          collections (
            id,
            name
          )
        `);

      if (error) throw error;
      return data;
    },
  });

  const handleEdit = (tier: PricingTierWithStats) => {
    setSelectedTier(tier);
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (tierId: string) => {
    if (!confirm("Tem certeza que deseja deletar este nível?")) return;

    try {
      // @ts-expect-error - Tabela pricing_tiers existe mas tipos podem estar desatualizados
      const { error } = await supabase
        .from("pricing_tiers")
        .delete()
        .eq("id", tierId);

      if (error) throw error;
      refetchTiers();
    } catch (error) {
      console.error("Erro ao deletar nível:", error);
    }
  };

  const getPlansForTier = (tierId: string) => {
    if (!allPlans) return [];
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
    if (!allCollections) return [];
    return allCollections
      .filter((assignment: any) => assignment.tier_id === tierId)
      .map((assignment: any) => ({
        id: assignment.collections?.id || assignment.collection_id,
        name: assignment.collections?.name || "Desconhecida",
      }));
  };

  return (
    <div className="space-y-6">
      {/* Info da Hierarquia */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-semibold">Como funciona a hierarquia:</p>
            <div className="text-sm space-y-1 ml-4">
              <p>1️⃣ <strong>Modalidades</strong> → Definem multiplicadores (Avulso 1.0x, Trimestral 0.93x, etc)</p>
              <p>2️⃣ <strong>Níveis</strong> → Definem preço base (ex: R$ 500)</p>
              <p>3️⃣ <strong>Planos</strong> → Gerados automaticamente (Nível × Modalidade)</p>
              <p>4️⃣ <strong>Coleções</strong> → Atribuídas aos níveis</p>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {/* Modalidades (Topo) */}
      <Card>
        <CardHeader>
          <CardTitle>Modalidades de Compra</CardTitle>
          <CardDescription>
            Configure os multiplicadores aplicados ao preço base de cada nível.
            Alterações recalculam automaticamente todos os planos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PurchaseModesConfig />
        </CardContent>
      </Card>

      {/* Níveis de Preço */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold">Níveis de Preço</h2>
            <p className="text-muted-foreground">
              Cada nível gera automaticamente 4 planos (um para cada modalidade ativa)
            </p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Criar Nível
          </Button>
        </div>

        {tiersLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : tiers && tiers.length > 0 ? (
          <div className="space-y-4">
            {tiers.map((tier) => (
              <TierHierarchyCard
                key={tier.id}
                tier={tier}
                plans={getPlansForTier(tier.id)}
                collections={getCollectionsForTier(tier.id)}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onRefresh={refetchTiers}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                Nenhum nível de preço criado ainda
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeiro Nível
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialogs */}
      <CreateTierDialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) refetchTiers();
        }}
      />

      {selectedTier && (
        <EditTierDialog
          tier={selectedTier}
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            setIsEditDialogOpen(open);
            if (!open) {
              setSelectedTier(null);
              refetchTiers();
            }
          }}
        />
      )}
    </div>
  );
}
