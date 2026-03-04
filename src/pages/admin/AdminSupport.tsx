// @ts-nocheck
import { useState } from "react";
import SEOHead from "@/components/SEOHead";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, List } from "lucide-react";
import { CustomerGroupedList } from "@/components/admin/CustomerGroupedList";
import { ConversationList } from "@/components/admin/ConversationList";
import { ChatInterface } from "@/components/admin/ChatInterface";
import { CustomerSidebar } from "@/components/admin/CustomerSidebar";
import { DashboardMetrics } from "@/components/admin/DashboardMetrics";

export default function AdminSupport() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grouped" | "list">("grouped");
  const [showCustomerSidebar, setShowCustomerSidebar] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
  };

  const handleUserClick = (userId: string) => {
    setSelectedUserId(userId);
    setShowCustomerSidebar(true);
  };

  const handleToggleSidebar = () => {
    setShowCustomerSidebar(!showCustomerSidebar);
  };

  return (
    <>
      <SEOHead
        title="Central de Suporte - Admin"
        description="Gerenciamento avançado de conversas com clientes"
      />

      <div className="space-y-6">
        {/* Header com toggle de visualização */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Central de Suporte</h1>
            <p className="text-muted-foreground">Gerencie conversas e atendimento ao cliente</p>
          </div>

          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "grouped" | "list")}>
            <TabsList>
              <TabsTrigger value="grouped" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Por Cliente
              </TabsTrigger>
              <TabsTrigger value="list" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                Lista
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Métricas do Dashboard */}
        <DashboardMetrics />

        {/* Layout principal em 3 colunas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna 1: Lista de conversas (agrupada ou simples) */}
          <div className="lg:col-span-1">
            <Card className="h-[calc(100vh-20rem)]">
              <CardContent className="p-0 h-full">
                {viewMode === "grouped" ? (
                  <CustomerGroupedList
                    selectedConversationId={selectedConversationId}
                    onSelectConversation={handleSelectConversation}
                  />
                ) : (
                  <ConversationList
                    selectedId={selectedConversationId}
                    onSelect={handleSelectConversation}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Coluna 2: Chat Interface (expande se sidebar estiver fechada) */}
          <div className={showCustomerSidebar ? "lg:col-span-1" : "lg:col-span-2"}>
            <Card className="h-[calc(100vh-20rem)]">
              <CardContent className="p-0 h-full">
                {selectedConversationId ? (
                  <ChatInterface
                    conversationId={selectedConversationId}
                    onOpenUserSidebar={handleUserClick}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-muted-foreground">
                      <Users className="h-16 w-16 mx-auto mb-4 opacity-20" />
                      <p className="text-lg font-medium">Nenhuma conversa selecionada</p>
                      <p className="text-sm">Selecione uma conversa para começar o atendimento</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Coluna 3: Sidebar do cliente (condicional) */}
          {showCustomerSidebar && selectedUserId && (
            <div className="lg:col-span-1">
              <Card className="h-[calc(100vh-20rem)]">
                <CardContent className="p-0 h-full overflow-hidden">
                  <CustomerSidebar
                    userId={selectedUserId}
                    isOpen={showCustomerSidebar}
                    onToggle={handleToggleSidebar}
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
