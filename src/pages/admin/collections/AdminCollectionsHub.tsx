/**
 * AdminCollectionsHub - Catalogo & Produtos (hub unificado)
 *
 * Consolida gerenciamento de modelos, colecoes e personagens de credito.
 */

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AdminLayout } from "@/components/admin/shared/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Coins, Layers3, Package } from "lucide-react";
import AdminCollections from "./AdminCollections";
import { CreditCharactersContent } from "@/components/admin/catalog/CreditCharactersContent";
import { CatalogCurationContent } from "@/components/admin/catalog/CatalogCurationContent";

const ADMIN_CATALOG_TABS = [
  "models",
  "collections",
  "credit-characters",
] as const;
type AdminCatalogTab = (typeof ADMIN_CATALOG_TABS)[number];

function normalizeCatalogTab(tab: string | null): AdminCatalogTab {
  if (tab === "curation") return "models";
  if (ADMIN_CATALOG_TABS.includes(tab as AdminCatalogTab))
    return tab as AdminCatalogTab;
  return "models";
}

export default function AdminCollectionsHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<AdminCatalogTab>(() =>
    normalizeCatalogTab(tabParam),
  );

  useEffect(() => {
    setActiveTab(normalizeCatalogTab(tabParam));
  }, [tabParam]);

  const handleTabChange = (value: string) => {
    const nextTab = normalizeCatalogTab(value);
    setActiveTab(nextTab);
    setSearchParams({ tab: nextTab });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1
            className="text-2xl md:text-3xl tracking-[0.2em] uppercase text-[hsl(var(--gold-accent))]"
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              textShadow: "0 0 20px hsl(var(--gold-accent) / 0.2)",
            }}
          >
            Catalogo & Produtos
          </h1>
          <p className="mt-1 font-mono text-xs uppercase tracking-wider text-[hsl(0,0%,45%)]">
            Modelos, colecoes e personagens de credito em um fluxo unico
          </p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="models">
              <Package className="mr-2 h-4 w-4" />
              Modelos
            </TabsTrigger>
            <TabsTrigger value="collections">
              <Layers3 className="mr-2 h-4 w-4" />
              Colecoes
            </TabsTrigger>
            <TabsTrigger value="credit-characters">
              <Coins className="mr-2 h-4 w-4" />
              Personagens (Coins)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="models" className="space-y-4">
            <CatalogCurationContent />
          </TabsContent>

          <TabsContent value="collections" className="space-y-4">
            <div>
              <h2 className="mb-2 text-2xl font-bold tracking-tight">
                Colecoes
              </h2>
              <p className="text-muted-foreground">
                Crie colecoes com modelos selecionados e atribua niveis de
                preco.
              </p>
            </div>
            <AdminCollections />
          </TabsContent>

          <TabsContent value="credit-characters" className="space-y-4">
            <CreditCharactersContent />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
