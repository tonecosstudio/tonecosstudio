// @ts-nocheck
/**
 * AdminCollectionsHub - Catálogo & Produtos (Hub Unificado)
 *
 * Consolida gerenciamento de produtos e preços:
 * - Coleções (produtos de assinatura com preços)
 * - Personagens de Crédito (sistema de coins)
 * - Níveis & Planos (sistema de preços)
 *
 * Nota: Franquias e Modelos foram removidos da interface admin.
 * Os dados permanecem no banco para uso no catálogo público.
 */

import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Package, 
  Layers,
  Coins,
} from "lucide-react";
import AdminCollections from "./AdminCollections";
import { PricingHierarchyView } from "@/components/admin/pricing-tiers/PricingHierarchyView";
import { CreditCharactersContent } from "@/components/admin/catalog/CreditCharactersContent";

export default function AdminCollectionsHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<string>(tabParam || "collections");

  // Sincronizar tab com URL
  useEffect(() => {
    if (tabParam && ["collections", "pricing", "credit-characters"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            Catálogo & Produtos
          </h1>
          <p className="text-muted-foreground">
            Gerencie coleções, personagens de crédito e preços em um só lugar
          </p>
        </div>

        {/* Tabs Unificadas */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="collections">
              <Package className="h-4 w-4 mr-2" />
              Coleções
            </TabsTrigger>
            <TabsTrigger value="credit-characters">
              <Coins className="h-4 w-4 mr-2" />
              Personagens (Coins)
            </TabsTrigger>
            <TabsTrigger value="pricing">
              <Layers className="h-4 w-4 mr-2" />
              Preços & Planos
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Coleções */}
          <TabsContent value="collections" className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-2">
                Coleções
              </h2>
              <p className="text-muted-foreground">
                Crie coleções com modelos selecionados e atribua níveis de preço
              </p>
            </div>
            <AdminCollections />
          </TabsContent>

          {/* Tab 2: Personagens de Crédito (Coins) */}
          <TabsContent value="credit-characters" className="space-y-4">
            <CreditCharactersContent />
          </TabsContent>

          {/* Tab 3: Preços & Planos (Hierarquia Completa) */}
          <TabsContent value="pricing" className="space-y-4">
            <PricingHierarchyView />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
