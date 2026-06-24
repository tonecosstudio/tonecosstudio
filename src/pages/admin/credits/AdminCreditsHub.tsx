import { useLocation, useNavigate } from "react-router-dom";
import { BarChart3, Coins, Gauge, RefreshCw, Wallet } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { CreditsDashboard } from "@/components/admin/credits/CreditsDashboard";
import { AdminLayout } from "@/components/admin/shared/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ADMIN_ROUTES } from "@/config/routes";
import AdminPlansConfiguration from "../plans/AdminPlansConfiguration";
import AdminCycleManager from "../production/AdminCycleManager";
import AdminCoinsSystem from "./AdminCoinsSystem";

type CreditsTab = "dashboard" | "coins" | "cycles" | "plans" | "analytics";

const CREDIT_TAB_PATHS: Record<CreditsTab, string> = {
  dashboard: ADMIN_ROUTES.credits,
  coins: ADMIN_ROUTES.creditsCoins,
  cycles: ADMIN_ROUTES.creditsCycles,
  plans: ADMIN_ROUTES.creditsPlans,
  analytics: ADMIN_ROUTES.creditsAnalytics,
};

function isCreditsTab(value: string): value is CreditsTab {
  return value in CREDIT_TAB_PATHS;
}

function getCurrentTab(pathname: string): CreditsTab {
  if (pathname === ADMIN_ROUTES.creditsCoins) return "coins";
  if (pathname === ADMIN_ROUTES.creditsCycles) return "cycles";
  if (pathname === ADMIN_ROUTES.creditsPlans) return "plans";
  if (pathname === ADMIN_ROUTES.creditsAnalytics) return "analytics";
  return "dashboard";
}

export default function AdminCreditsHub() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentTab = getCurrentTab(location.pathname);

  const handleTabChange = (value: string) => {
    if (isCreditsTab(value)) {
      navigate(CREDIT_TAB_PATHS[value]);
    }
  };

  return (
    <AdminLayout>
      <SEOHead
        title="Sistema de Creditos - Admin"
        description="Gerencie coins, ciclos, planos e indicadores operacionais do sistema de creditos."
      />

      <div className="space-y-6">
        <div>
          <h1
            className="text-2xl uppercase tracking-[0.2em] text-[hsl(var(--gold-accent))] md:text-3xl"
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              textShadow: "0 0 20px hsl(var(--gold-accent) / 0.2)",
            }}
          >
            Sistema de creditos
          </h1>
          <p className="mt-1 font-mono text-xs uppercase tracking-wider text-[hsl(0,0%,45%)]">
            Coins, ciclos, planos e indicadores sob a mesma base operacional
          </p>
        </div>

        <Tabs value={currentTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Gauge className="h-4 w-4" />
              <span className="hidden sm:inline">Visao geral</span>
              <span className="sm:hidden">Geral</span>
            </TabsTrigger>
            <TabsTrigger value="coins" className="flex items-center gap-2">
              <Coins className="h-4 w-4" />
              <span>Coins</span>
            </TabsTrigger>
            <TabsTrigger value="cycles" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              <span>Ciclos</span>
            </TabsTrigger>
            <TabsTrigger value="plans" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              <span>Planos</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span>Analises</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4">
            <CreditsDashboard />
          </TabsContent>

          <TabsContent value="coins" className="space-y-4">
            <div className="rounded-lg border bg-card">
              <AdminCoinsSystem />
            </div>
          </TabsContent>

          <TabsContent value="cycles" className="space-y-4">
            <div className="rounded-lg border bg-card">
              <AdminCycleManager />
            </div>
          </TabsContent>

          <TabsContent value="plans" className="space-y-4">
            <div className="rounded-lg border bg-card">
              <AdminPlansConfiguration />
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="rounded-lg border bg-card p-6">
              <div className="py-12 text-center">
                <BarChart3 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">Analises em evolucao</h3>
                <p className="text-muted-foreground">
                  A camada detalhada de comportamento e consumo de creditos ainda sera consolidada.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
