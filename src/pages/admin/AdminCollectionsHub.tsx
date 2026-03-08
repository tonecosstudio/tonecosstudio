/**
 * AdminCollectionsHub - Catálogo & Produtos (Hub Unificado)
 *
 * Consolida gerenciamento de produtos:
 * - Coleções (produtos de assinatura)
 * - Personagens de Crédito (sistema de coins)
 *
 * Nota: Preços e Planos foram movidos para /admin/planos (SSOT)
 */

import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Package, 
  Coins,
} from "lucide-react";
import AdminCollections from "./AdminCollections";
import { CreditCharactersContent } from "@/components/admin/catalog/CreditCharactersContent";

export default function AdminCollectionsHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<string>(tabParam || "collections");

  // Sincronizar tab com URL
  useEffect(() => {
    if (tabParam && ["collections", "credit-characters"].includes(tabParam)) {
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
          <h1
            className="text-2xl md:text-3xl tracking-[0.2em] uppercase text-[hsl(var(--gold-accent))]"
            style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", textShadow: "0 0 20px hsl(var(--gold-accent) / 0.2)" }}
          >
            Catálogo & Produtos
          </h1>
          <p className="text-[hsl(0,0%,45%)] text-xs tracking-wider font-mono uppercase mt-1">
            Gerencie coleções e personagens de crédito
          </p>
        </div>

        {/* Tabs Unificadas */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="collections">
              <Package className="h-4 w-4 mr-2" />
              Coleções
            </TabsTrigger>
            <TabsTrigger value="credit-characters">
              <Coins className="h-4 w-4 mr-2" />
              Personagens (Coins)
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
        </Tabs>
      </div>
    </AdminLayout>
  );
}
