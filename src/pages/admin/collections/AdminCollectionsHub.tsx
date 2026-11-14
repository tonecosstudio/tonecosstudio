/**
 * AdminCollectionsHub - Catalogo & Produtos (hub unificado)
 *
 * Consolida gerenciamento de modelos, colecoes e personagens de credito.
 */

import { useLocation, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/shared/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Coins, Layers3, Package } from "lucide-react";
import { ADMIN_ROUTES, PUBLIC_SUBSCRIPTIONS_ENABLED } from "@/config/routes";
import AdminCollections from "./AdminCollections";
import { CreditCharactersContent } from "@/components/admin/catalog/CreditCharactersContent";
import { CatalogCurationContent } from "@/components/admin/catalog/CatalogCurationContent";
import { SubscriptionCollectionCuration } from "@/components/admin/collections/SubscriptionCollectionCuration";

type AdminCatalogTab = "models" | "collections" | "credit-characters";

const CATALOG_TAB_PATHS: Record<AdminCatalogTab, string> = {
  models: ADMIN_ROUTES.catalog,
  collections: ADMIN_ROUTES.catalogCollections,
  "credit-characters": ADMIN_ROUTES.catalogCreditCharacters,
};

function isCatalogTab(value: string): value is AdminCatalogTab {
  return value in CATALOG_TAB_PATHS;
}

function getCurrentTab(pathname: string): AdminCatalogTab {
  if (pathname === ADMIN_ROUTES.catalogCollections) return "collections";
  if (pathname === ADMIN_ROUTES.catalogCreditCharacters) return "credit-characters";
  return "models";
}

export default function AdminCollectionsHub() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = getCurrentTab(location.pathname);

  const handleTabChange = (value: string) => {
    if (isCatalogTab(value)) {
      navigate(CATALOG_TAB_PATHS[value]);
    }
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
            {PUBLIC_SUBSCRIPTIONS_ENABLED && <SubscriptionCollectionCuration />}
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
