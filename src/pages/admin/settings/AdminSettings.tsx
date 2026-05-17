import { AdminLayout } from "@/components/admin/shared/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, DollarSign, Gauge, Scale, ExternalLink, Clock, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams } from "react-router-dom";
import AdminSystemSettings from "./AdminSystemSettings";
import AdminProductionLimit from "../production/AdminProductionLimit";
import AdminDeadlinesSettings from "../production/AdminDeadlinesSettings";
import LegalCompliance from "./LegalCompliance";
import AdminHolidayManager from "../production/AdminHolidayManager";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "general";

  const handleTabChange = (value: string) => {
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
            Configurações
          </h1>
          <p className="text-[hsl(0,0%,45%)] text-xs tracking-wider font-mono uppercase mt-1">
            Gerencie todas as configurações do sistema em um só lugar
          </p>
        </div>

        {/* Tabs Unificadas */}
        <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">
              <Settings className="h-4 w-4 mr-2" />
              Geral
            </TabsTrigger>
            <TabsTrigger value="operational">
              <Gauge className="h-4 w-4 mr-2" />
              Operacional
            </TabsTrigger>
            <TabsTrigger value="holidays">
              <Calendar className="h-4 w-4 mr-2" />
              Feriados
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

          {/* Feriados - AdminHolidayManager sem AdminLayout */}
          <TabsContent value="holidays" className="space-y-4">
            <div className="rounded-lg border p-6">
              <AdminHolidayManager />
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
