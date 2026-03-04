/**
 * AdminCollectionsHub - Catálogo & Produtos (Hub Unificado)
 *
 * Consolida TUDO sobre produtos e preços em um único lugar:
 * - Franquias (organização do catálogo)
 * - Modelos (personagens individuais)
 * - Coleções (produtos de assinatura com preços)
 * - Níveis & Planos (sistema de preços)
 * - Pré-vendas
 *
 * Redução: 10 páginas → 1 hub
 */

import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Package, 
  Box, 
  Layers,
} from "lucide-react";
import AdminCollections from "./AdminCollections";
import { AdminModelsContent } from "./AdminModels";
import { AdminFranchisesContent } from "./AdminFranchises";
import { PricingHierarchyView } from "@/components/admin/pricing-tiers/PricingHierarchyView";

export default function AdminCollectionsHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<string>(tabParam || "collections");

  // Sincronizar tab com URL
  useEffect(() => {
    if (tabParam && ["collections", "models", "pricing"].includes(tabParam)) {
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
            Gerencie franquias, modelos, coleções, preços e pré-vendas em um só lugar
          </p>
        </div>

        {/* Tabs Unificadas */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="models">
              <Box className="h-4 w-4 mr-2" />
              Franquias & Modelos
            </TabsTrigger>
            <TabsTrigger value="collections">
              <Package className="h-4 w-4 mr-2" />
              Coleções
            </TabsTrigger>
            <TabsTrigger value="pricing">
              <Layers className="h-4 w-4 mr-2" />
              Preços & Planos
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Franquias & Modelos */}
          <TabsContent value="models" className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-2">
                Franquias & Modelos
              </h2>
              <p className="text-muted-foreground">
                Organize o catálogo por franquias e gerencie modelos individuais (personagens)
              </p>
            </div>
            
            {/* Sub-tabs para Modelos e Franquias */}
            <Tabs defaultValue="models" className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="models">Modelos</TabsTrigger>
                <TabsTrigger value="franchises">Franquias</TabsTrigger>
              </TabsList>

              <TabsContent value="models" className="mt-6">
                <AdminModelsContent />
              </TabsContent>

              <TabsContent value="franchises" className="mt-6">
                <AdminFranchisesContent />
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Tab 2: Coleções */}
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

          {/* Tab 3: Preços & Planos (Hierarquia Completa) */}
          <TabsContent value="pricing" className="space-y-4">
            <PricingHierarchyView />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
