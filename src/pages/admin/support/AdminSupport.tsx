import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { List, Users } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { DashboardMetrics } from "@/components/admin/analytics/DashboardMetrics";
import { CustomerSidebar } from "@/components/admin/customers/CustomerSidebar";
import { CustomerGroupedList } from "@/components/admin/customers/CustomerGroupedList";
import { ChatInterface } from "@/components/admin/support/ChatInterface";
import { ConversationList } from "@/components/admin/support/ConversationList";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { adminSupportConversationPath } from "@/config/routes";

export default function AdminSupport() {
  const navigate = useNavigate();
  const { conversationId } = useParams<{ conversationId?: string }>();
  const selectedConversationId = conversationId ?? null;
  const [viewMode, setViewMode] = useState<"grouped" | "list">("grouped");
  const [showCustomerSidebar, setShowCustomerSidebar] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const handleSelectConversation = (conversationId: string) => {
    navigate(adminSupportConversationPath(conversationId), { replace: true });
  };

  const handleUserClick = (userId: string) => {
    setSelectedUserId(userId);
    setShowCustomerSidebar(true);
  };

  const handleToggleSidebar = () => {
    setShowCustomerSidebar((current) => !current);
  };

  return (
    <>
      <SEOHead
        title="Central de Suporte - Admin"
        description="Atendimento, acompanhamento e gestao de conversas com clientes"
      />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Central de suporte</h1>
            <p className="text-muted-foreground">
              Atendimento, triagem e contexto de cliente em uma unica tela.
            </p>
          </div>

          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "grouped" | "list")}>
            <TabsList>
              <TabsTrigger value="grouped" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Por cliente
              </TabsTrigger>
              <TabsTrigger value="list" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                Lista
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <DashboardMetrics />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <Card className="h-[calc(100vh-20rem)]">
              <CardContent className="h-full p-0">
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

          <div className={showCustomerSidebar ? "lg:col-span-1" : "lg:col-span-2"}>
            <Card className="h-[calc(100vh-20rem)]">
              <CardContent className="h-full p-0">
                {selectedConversationId ? (
                  <ChatInterface
                    conversationId={selectedConversationId}
                    onOpenUserSidebar={handleUserClick}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <Users className="mx-auto mb-4 h-16 w-16 opacity-20" />
                      <p className="text-lg font-medium">Nenhuma conversa selecionada</p>
                      <p className="text-sm">Selecione uma conversa para iniciar o atendimento</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {showCustomerSidebar && selectedUserId && (
            <div className="lg:col-span-1">
              <Card className="h-[calc(100vh-20rem)]">
                <CardContent className="h-full overflow-hidden p-0">
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
