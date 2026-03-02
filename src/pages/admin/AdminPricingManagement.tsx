/**
 * Página Unificada: Gerenciamento Completo de Preços
 * 
 * Hierarquia correta implementada:
 * Níveis de Preço → Modalidades de Compra → Planos → Coleções
 * 
 * Esta página consolida TODA a gestão de preços em um único lugar:
 * - Níveis de Preço (pricing_tiers)
 * - Modalidades de Compra (purchase_modes)
 * - Planos Gerados Automaticamente (subscription_plans)
 * - Atribuição de Coleções
 * - Migração de Dados Antigos
 */

import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Layers, 
  Settings, 
  FileText, 
  Package, 
  Database,
  Info
} from "lucide-react";

// Componentes do novo sistema
import { PricingTiersManager } from "@/components/admin/pricing-tiers/PricingTiersManager";
import { PurchaseModesConfig } from "@/components/admin/pricing-restructure/PurchaseModesConfig";
import { CollectionTierAssignment } from "@/components/admin/pricing-tiers/CollectionTierAssignment";
import { MigrationWizard } from "@/components/admin/pricing-tiers/MigrationWizard";

export default function AdminPricingManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<string>(tabParam || "tiers");

  // Sincronizar tab com URL
  useEffect(() => {
    if (tabParam && ["tiers", "modes", "collections", "migration"].includes(tabParam)) {
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
            Gestão Completa de Preços
          </h1>
          <p className="text-muted-foreground">
            Sistema unificado para gerenciar toda a hierarquia de preços
          </p>
        </div>

        {/* Info da Hierarquia */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-semibold">Hierarquia do Sistema:</p>
              <div className="text-sm space-y-1 ml-4">
                <p>1️⃣ <strong>Níveis de Preço</strong> → Define preço base (ex: R$ 500)</p>
                <p>2️⃣ <strong>Modalidades</strong> → Multiplica o preço (Avulso 1.0x, Trimestral 0.93x, etc)</p>
                <p>3️⃣ <strong>Planos</strong> → Gerados automaticamente (Nível × Modalidade)</p>
                <p>4️⃣ <strong>Coleções</strong> → Atribuídas aos níveis</p>
              </div>
            </div>
          </AlertDescription>
        </Alert>

        {/* Tabs Principais */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full max-w-3xl grid-cols-4">
            <TabsTrigger value="tiers" className="gap-2">
              <Layers className="h-4 w-4" />
              Níveis & Planos
            </TabsTrigger>
            <TabsTrigger value="modes" className="gap-2">
              <Settings className="h-4 w-4" />
              Modalidades
            </TabsTrigger>
            <TabsTrigger value="collections" className="gap-2">
              <Package className="h-4 w-4" />
              Coleções
            </TabsTrigger>
            <TabsTrigger value="migration" className="gap-2">
              <Database className="h-4 w-4" />
              Migração
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Níveis de Preço e Planos */}
          <TabsContent value="tiers" className="mt-6 space-y-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-2">
                Níveis de Preço e Planos
              </h2>
              <p className="text-muted-foreground">
                Crie níveis de preço que geram automaticamente planos para todas as modalidades ativas.
                Cada nível cria 4 planos: Avulso, Trimestral, Semestral e Anual.
              </p>
            </div>
            <PricingTiersManager />
          </TabsContent>

          {/* Tab 2: Modalidades de Compra */}
          <TabsContent value="modes" className="mt-6 space-y-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-2">
                Modalidades de Compra
              </h2>
              <p className="text-muted-foreground">
                Configure os multiplicadores de preço para cada modalidade. 
                Alterações recalculam automaticamente todos os planos de todos os níveis.
              </p>
            </div>
            <PurchaseModesConfig />
          </TabsContent>

          {/* Tab 3: Atribuição de Coleções */}
          <TabsContent value="collections" className="mt-6 space-y-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-2">
                Atribuição de Coleções aos Níveis
              </h2>
              <p className="text-muted-foreground">
                Atribua coleções aos níveis de preço. Os preços das coleções serão atualizados automaticamente
                quando o nível for modificado.
              </p>
            </div>
            <CollectionTierAssignment />
          </TabsContent>

          {/* Tab 4: Migração de Dados */}
          <TabsContent value="migration" className="mt-6 space-y-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-2">
                Migração de Dados Antigos
              </h2>
              <p className="text-muted-foreground">
                Migre planos e coleções do sistema antigo para a nova estrutura hierárquica.
                Execute um dry run primeiro para visualizar as mudanças.
              </p>
            </div>
            
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Atenção:</strong> A migração agrupa planos existentes por modalidade e preços similares,
                criando níveis automaticamente. Assinaturas ativas são preservadas.
              </AlertDescription>
            </Alert>

            <MigrationWizard />
          </TabsContent>
        </Tabs>

        {/* Footer Info */}
        <div className="border-t pt-6 mt-12">
          <div className="text-sm text-muted-foreground space-y-2">
            <p><strong>Como funciona:</strong></p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Crie um <strong>Nível de Preço</strong> (ex: "Nível Premium" com preço base R$ 500)</li>
              <li>O sistema gera automaticamente <strong>4 planos</strong> (um para cada modalidade ativa)</li>
              <li>Os preços dos planos são calculados: <code>preço_base × multiplicador_modalidade</code></li>
              <li>Atribua <strong>coleções</strong> ao nível para aplicar os preços</li>
              <li>Ao atualizar o nível, todos os planos e coleções são recalculados automaticamente</li>
            </ol>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
