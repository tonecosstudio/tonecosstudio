// @ts-nocheck
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, FileText, DollarSign, Gauge, Scale, ExternalLink, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import AdminSystemSettings from "./AdminSystemSettings";
import AdminProductionLimit from "./AdminProductionLimit";
import AdminDeadlinesSettings from "./AdminDeadlinesSettings";
import LegalCompliance from "./LegalCompliance";

/**
 * AdminSettings - Página Unificada de Configurações
 *
 * Estrutura:
 * - Geral: Configurações básicas do sistema
 * - Operacional: Prazos, capacidade e limites de produção (SSOT)
 * - Legal: Conformidade e políticas
 */
export default function AdminSettings() {
  const navigate = useNavigate();

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie todas as configurações do sistema em um só lugar
          </p>
        </div>

        {/* Tabs Unificadas */}
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">
              <Settings className="h-4 w-4 mr-2" />
              Geral
            </TabsTrigger>
            <TabsTrigger value="operational">
              <Gauge className="h-4 w-4 mr-2" />
              Operacional
            </TabsTrigger>
            <TabsTrigger value="legal">
              <Scale className="h-4 w-4 mr-2" />
              Legal
            </TabsTrigger>
          </TabsList>

          {/* Geral - AdminSystemSettings sem AdminLayout */}
          <TabsContent value="general" className="space-y-4">
            <div className="rounded-lg border p-6">
              <AdminSystemSettings />
            </div>
          </TabsContent>

          {/* Operacional - Prazos, Capacidade e Produção */}
          <TabsContent value="operational" className="space-y-4">
            <div className="space-y-6">
              {/* Prazos & Capacidade */}
              <div className="rounded-lg border p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Prazos & Capacidade
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Configure os prazos de produção e capacidade mensal (SSOT)
                  </p>
                </div>
                <AdminDeadlinesSettings />
              </div>

              {/* Limites de Produção */}
              <div className="rounded-lg border p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Gauge className="h-5 w-5" />
                    Limites de Produção
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Controle de limites e vendas por coleção
                  </p>
                </div>
                <AdminProductionLimit />
              </div>
            </div>
          </TabsContent>

          {/* Legal - LegalCompliance sem AdminLayout */}
          <TabsContent value="legal" className="space-y-4">
            <div className="rounded-lg border p-6">
              <LegalCompliance />
            </div>
          </TabsContent>
        </Tabs>

        {/* Link para Gestão de Preços */}
        <div className="rounded-lg border p-6 bg-muted/50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Gestão de Preços
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Gerencie níveis de preço, modalidades, planos e atribuições de coleções
              </p>
            </div>
            <Button onClick={() => navigate("/admin/catalogo?tab=pricing")}>
              Ir para Preços
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
