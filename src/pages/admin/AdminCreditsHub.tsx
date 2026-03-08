/**
 * Admin Credits Hub
 * 
 * Consolidated hub for all credit system management:
 * - Dashboard with metrics
 * - Coins management
 * - Production cycles
 * - Credit plans configuration
 * - Analytics
 * 
 * Consolidates 5 separate pages into one unified interface.
 */

import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditsDashboard } from "@/components/admin/credits/CreditsDashboard";
import AdminCoinsSystem from "./AdminCoinsSystem";
import AdminCycleManager from "./AdminCycleManager";
import AdminPlansConfiguration from "./AdminPlansConfiguration";
import { useSearchParams } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { Coins, RefreshCw, Wallet, BarChart3, Gauge } from "lucide-react";

export default function AdminCreditsHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "dashboard";

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <AdminLayout>
      <SEOHead
        title="Sistema de Créditos - Admin"
        description="Gerencie coins, ciclos de produção, planos e análises do sistema de créditos"
      />

      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sistema de Créditos</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie coins, ciclos de produção, planos de assinatura e análises
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={currentTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Gauge className="h-4 w-4" />
              <span className="hidden sm:inline">Visão Geral</span>
              <span className="sm:hidden">Geral</span>
            </TabsTrigger>
            <TabsTrigger value="coins" className="flex items-center gap-2">
              <Coins className="h-4 w-4" />
              <span className="hidden sm:inline">Coins</span>
              <span className="sm:hidden">Coins</span>
            </TabsTrigger>
            <TabsTrigger value="cycles" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Ciclos</span>
              <span className="sm:hidden">Ciclos</span>
            </TabsTrigger>
            <TabsTrigger value="plans" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Planos</span>
              <span className="sm:hidden">Planos</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
              <span className="sm:hidden">Analytics</span>
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-4">
            <CreditsDashboard />
          </TabsContent>

          {/* Coins Tab */}
          <TabsContent value="coins" className="space-y-4">
            <div className="rounded-lg border bg-card">
              <AdminCoinsSystem />
            </div>
          </TabsContent>

          {/* Cycles Tab */}
          <TabsContent value="cycles" className="space-y-4">
            <div className="rounded-lg border bg-card">
              <AdminCycleManager />
            </div>
          </TabsContent>

          {/* Plans Tab */}
          <TabsContent value="plans" className="space-y-4">
            <div className="rounded-lg border bg-card">
              <AdminPlansConfiguration />
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="rounded-lg border bg-card p-6">
              <div className="text-center py-12">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Analytics em Desenvolvimento</h3>
                <p className="text-muted-foreground">
                  Análises detalhadas de uso de créditos estarão disponíveis em breve
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
