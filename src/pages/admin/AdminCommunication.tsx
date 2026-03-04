// @ts-nocheck
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HeadphonesIcon, Megaphone, MessageSquare, FileText, Bell, History } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useState } from "react";
import AdminSupport from "./AdminSupport";
import { GroupsContent } from "@/components/groups/GroupsContent";
import AdminQuickReplies from "./AdminQuickReplies";
import CommunicationTemplates from "./CommunicationTemplates";
import AdminNotificationSettings from "./AdminNotificationSettings";
import AdminNotificationHistory from "./AdminNotificationHistory";

/**
 * AdminCommunication - Hub Consolidado de Comunicação
 *
 * Consolida 6 páginas em uma só com tabs:
 * - AdminSupport (Tickets de Suporte)
 * - GroupsContent (Grupos de Broadcast)
 * - AdminQuickReplies (Respostas Rápidas)
 * - CommunicationTemplates (Templates)
 * - AdminNotificationSettings (Configurações de Notificações)
 * - AdminNotificationHistory (Histórico de Notificações)
 *
 * Redução: 6 páginas → 1 hub (83%)
 */
export default function AdminCommunication() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<string>(tabParam || "support");

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Central de Comunicação</h1>
          <p className="text-muted-foreground">
            Gerencie suporte, grupos, respostas rápidas, templates e notificações em um só lugar
          </p>
        </div>

        {/* Tabs Unificadas */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="support">
              <HeadphonesIcon className="h-4 w-4 mr-2" />
              Suporte
            </TabsTrigger>
            <TabsTrigger value="groups">
              <Megaphone className="h-4 w-4 mr-2" />
              Grupos
            </TabsTrigger>
            <TabsTrigger value="quick-replies">
              <MessageSquare className="h-4 w-4 mr-2" />
              Respostas Rápidas
            </TabsTrigger>
            <TabsTrigger value="templates">
              <FileText className="h-4 w-4 mr-2" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="h-4 w-4 mr-2" />
              Notificações
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="h-4 w-4 mr-2" />
              Histórico
            </TabsTrigger>
          </TabsList>

          {/* Tickets de Suporte */}
          <TabsContent value="support" className="space-y-4">
            <AdminSupport />
          </TabsContent>

          {/* Grupos de Broadcast */}
          <TabsContent value="groups" className="space-y-4">
            <GroupsContent showHeader={false} />
          </TabsContent>

          {/* Respostas Rápidas */}
          <TabsContent value="quick-replies" className="space-y-4">
            <AdminQuickReplies />
          </TabsContent>

          {/* Templates */}
          <TabsContent value="templates" className="space-y-4">
            <CommunicationTemplates />
          </TabsContent>

          {/* Configurações de Notificações */}
          <TabsContent value="notifications" className="space-y-4">
            <AdminNotificationSettings />
          </TabsContent>

          {/* Histórico de Notificações */}
          <TabsContent value="history" className="space-y-4">
            <AdminNotificationHistory />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
