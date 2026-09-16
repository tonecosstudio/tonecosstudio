import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Database, Users, Settings, List } from "lucide-react";
import { PricingTiersList } from "./PricingTiersList";
import { CreateTierDialog } from "./CreateTierDialog";
import { EditTierDialog } from "./EditTierDialog";
import { BulkAssignDialog } from "./BulkAssignDialog";
import { PurchaseModesConfig } from "../pricing-restructure/PurchaseModesConfig";
import { TierPlansView } from "../pricing-restructure/TierPlansView";
import type { PricingTierWithStats } from "@/types/pricing-tiers";

/**
 * Componente principal para gerenciamento de níveis de preço.
 * O sistema atual trabalha diretamente com pricing_tiers e
 * collection_tier_assignments; migrações históricas não fazem parte da UI de runtime.
 */
export function PricingTiersManager() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isBulkAssignDialogOpen, setIsBulkAssignDialogOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<PricingTierWithStats | null>(null);
  const [viewTierId, setViewTierId] = useState<string | null>(null);

  const handleEdit = (tier: PricingTierWithStats) => {
    setSelectedTier(tier);
    setIsEditDialogOpen(true);
  };

  const handleCloseEdit = () => {
    setIsEditDialogOpen(false);
    setSelectedTier(null);
  };

  const handleViewPlans = (tierId: string) => {
    setViewTierId(tierId);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Gestão de Preços</CardTitle>
              <CardDescription>
                Gerencie níveis de preço, modalidades e visualize a hierarquia completa
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsBulkAssignDialogOpen(true)}
              >
                <Users className="mr-2 h-4 w-4" />
                Atribuição em Massa
              </Button>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Nível
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="tiers" className="space-y-4">
            <TabsList>
              <TabsTrigger value="tiers" className="gap-2">
                <List className="h-4 w-4" />
                Níveis de Preço
              </TabsTrigger>
              <TabsTrigger value="modes" className="gap-2">
                <Settings className="h-4 w-4" />
                Modalidades
              </TabsTrigger>
              {viewTierId && (
                <TabsTrigger value="plans" className="gap-2">
                  <Database className="h-4 w-4" />
                  Planos do Nível
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="tiers" className="space-y-4">
              <PricingTiersList
                onEdit={handleEdit}
                onViewPlans={handleViewPlans}
              />
            </TabsContent>

            <TabsContent value="modes" className="space-y-4">
              <PurchaseModesConfig />
            </TabsContent>

            {viewTierId && (
              <TabsContent value="plans" className="space-y-4">
                <TierPlansView tierId={viewTierId} />
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>

      <CreateTierDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      <EditTierDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        tier={selectedTier}
        onClose={handleCloseEdit}
      />

      <BulkAssignDialog
        open={isBulkAssignDialogOpen}
        onOpenChange={setIsBulkAssignDialogOpen}
      />
    </div>
  );
}
