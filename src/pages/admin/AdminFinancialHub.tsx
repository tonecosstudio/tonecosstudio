/**
 * AdminFinancialHub - Hub de Relatórios Financeiros
 *
 * Consolida todos os relatórios de vendas e receita:
 * - Visão Geral (dashboard financeiro)
 * - Por Coleção (receita por coleção)
 * - Cupons & Descontos
 *
 * Foco: RECEITA e VENDAS (não criação de produtos)
 */

import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Package, Tag } from "lucide-react";
import AdminCollectionFinancials from "./AdminCollectionFinancials";
import AdminCoupons from "./AdminCoupons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminFinancialHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<string>(tabParam || "overview");

  // Sincronizar tab com URL
  useEffect(() => {
    if (tabParam && ["overview", "collections", "coupons"].includes(tabParam)) {
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
            Relatórios Financeiros
          </h1>
          <p className="text-muted-foreground">
            Acompanhe vendas, receita e desempenho financeiro
          </p>
        </div>

        {/* Tabs Unificadas */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-3">
            <TabsTrigger value="overview">
              <DollarSign className="h-4 w-4 mr-2" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="collections">
              <Package className="h-4 w-4 mr-2" />
              Por Coleção
            </TabsTrigger>
            <TabsTrigger value="coupons">
              <Tag className="h-4 w-4 mr-2" />
              Cupons & Descontos
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Visão Geral */}
          <TabsContent value="overview" className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-2">
                Visão Geral Financeira
              </h2>
              <p className="text-muted-foreground">
                Dashboard com métricas principais de receita e vendas
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Receita Total
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">R$ 0,00</div>
                  <p className="text-xs text-muted-foreground">
                    Em desenvolvimento
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Assinaturas Ativas
                  </CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground">
                    Em desenvolvimento
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Vendas Avulsas
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">0</div>
                  <p className="text-xs text-muted-foreground">
                    Em desenvolvimento
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Ticket Médio
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">R$ 0,00</div>
                  <p className="text-xs text-muted-foreground">
                    Em desenvolvimento
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Dashboard Financeiro</CardTitle>
                <CardDescription>
                  Métricas detalhadas e gráficos de receita serão implementados aqui
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  Dashboard financeiro em desenvolvimento
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Por Coleção */}
          <TabsContent value="collections" className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-2">
                Receita por Coleção
              </h2>
              <p className="text-muted-foreground">
                Análise financeira detalhada de cada coleção
              </p>
            </div>
            <AdminCollectionFinancials />
          </TabsContent>

          {/* Tab 3: Cupons & Descontos */}
          <TabsContent value="coupons" className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-2">
                Cupons & Descontos
              </h2>
              <p className="text-muted-foreground">
                Gerencie cupons promocionais e acompanhe seu impacto na receita
              </p>
            </div>
            <AdminCoupons />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
