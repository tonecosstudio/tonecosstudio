/**
 * Production Dashboard Page
 *
 * Dashboard principal para gestão de produção com múltiplas visualizações
 * (Kanban, Lista, Calendário) e filtros avançados.
 */

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, List, Calendar } from "lucide-react";

// Tipos
type ViewMode = "kanban" | "list" | "calendar";

export default function ProductionDashboardPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard de Produção</h1>
            <p className="text-sm text-gray-500">
              Gerencie a fila de produção e acompanhe o progresso dos pedidos
            </p>
          </div>

          {/* View Switcher */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="kanban" className="flex items-center gap-2">
                <LayoutGrid className="h-4 w-4" />
                Kanban
              </TabsTrigger>
              <TabsTrigger value="list" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                Lista
              </TabsTrigger>
              <TabsTrigger value="calendar" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Calendário
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      {/* Metrics Bar - TODO: Implementar em 2.1.2 */}
      <div className="border-b bg-white px-6 py-3">
        <div className="text-sm text-gray-500">Métricas serão exibidas aqui (Task 2.1.2)</div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Filters Sidebar - TODO: Implementar em 2.1.3 */}
        <aside className="w-64 border-r bg-white p-4">
          <h3 className="mb-4 font-semibold text-gray-900">Filtros</h3>
          <div className="text-sm text-gray-500">Filtros serão exibidos aqui (Task 2.1.3)</div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-6">
          {viewMode === "kanban" && (
            <div className="rounded-lg border bg-white p-8 text-center">
              <LayoutGrid className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <h3 className="mb-2 text-lg font-semibold text-gray-900">Visualização Kanban</h3>
              <p className="text-sm text-gray-500">Será implementado na Task 2.2.1</p>
            </div>
          )}

          {viewMode === "list" && (
            <div className="rounded-lg border bg-white p-8 text-center">
              <List className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <h3 className="mb-2 text-lg font-semibold text-gray-900">Visualização em Lista</h3>
              <p className="text-sm text-gray-500">Será implementado na Task 2.3.1</p>
            </div>
          )}

          {viewMode === "calendar" && (
            <div className="rounded-lg border bg-white p-8 text-center">
              <Calendar className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <h3 className="mb-2 text-lg font-semibold text-gray-900">
                Visualização em Calendário
              </h3>
              <p className="text-sm text-gray-500">Será implementado na Task 2.4.1</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
