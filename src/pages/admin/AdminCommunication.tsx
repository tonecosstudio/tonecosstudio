import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HeadphonesIcon, Megaphone, MessageSquare, FileText } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import AdminSupport from "./AdminSupport";
import { GroupsContent } from "@/components/groups/GroupsContent";
import AdminQuickReplies from "./AdminQuickReplies";
import CommunicationTemplates from "./CommunicationTemplates";

/**
 * AdminCommunication - Página Unificada de Comunicação
 *
 * Mescla 4 páginas em uma só com tabs:
 * - AdminSupport (Tickets de Suporte)
 * - AdminGroupsPage (Grupos de Broadcast)
 * - AdminQuickReplies (Respostas Rápidas)
 * - CommunicationTemplates (Templates)
 */
export default function AdminCommunication() {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "support";

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Central de Comunicação</h1>
          <p className="text-muted-foreground">
            Gerencie suporte, grupos, respostas rápidas e templates em um só lugar
          </p>
        </div>

        {/* Tabs Unificadas */}
        <Tabs defaultValue={defaultTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
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
        </Tabs>
      </div>
    </AdminLayout>
  );
}
