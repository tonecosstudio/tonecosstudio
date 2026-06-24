import { matchPath, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  FileText,
  HeadphonesIcon,
  History,
  Megaphone,
  MessageSquare,
} from "lucide-react";
import { GroupsContent } from "@/components/groups/GroupsContent";
import { AdminLayout } from "@/components/admin/shared/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ADMIN_ROUTES } from "@/config/routes";
import AdminNotificationHistory from "./AdminNotificationHistory";
import AdminNotificationSettings from "./AdminNotificationSettings";
import AdminQuickReplies from "./AdminQuickReplies";
import AdminSupport from "./AdminSupport";
import CommunicationTemplates from "./CommunicationTemplates";

type CommunicationTab =
  | "support"
  | "groups"
  | "quick-replies"
  | "templates"
  | "notifications"
  | "history";

const COMMUNICATION_TAB_PATHS: Record<CommunicationTab, string> = {
  support: ADMIN_ROUTES.communication,
  groups: ADMIN_ROUTES.communicationGroups,
  "quick-replies": ADMIN_ROUTES.communicationQuickReplies,
  templates: ADMIN_ROUTES.communicationTemplates,
  notifications: ADMIN_ROUTES.communicationNotifications,
  history: ADMIN_ROUTES.communicationHistory,
};

function isCommunicationTab(value: string): value is CommunicationTab {
  return value in COMMUNICATION_TAB_PATHS;
}

function getCurrentTab(pathname: string): CommunicationTab {
  if (pathname === ADMIN_ROUTES.communicationGroups) return "groups";
  if (pathname === ADMIN_ROUTES.communicationQuickReplies) return "quick-replies";
  if (pathname === ADMIN_ROUTES.communicationTemplates) return "templates";
  if (pathname === ADMIN_ROUTES.communicationNotifications) return "notifications";
  if (pathname === ADMIN_ROUTES.communicationHistory) return "history";
  if (matchPath(ADMIN_ROUTES.communicationConversation, pathname)) return "support";
  return "support";
}

export default function AdminCommunication() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = getCurrentTab(location.pathname);

  const handleTabChange = (value: string) => {
    if (isCommunicationTab(value)) {
      navigate(COMMUNICATION_TAB_PATHS[value]);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1
            className="text-2xl uppercase tracking-[0.2em] text-[hsl(var(--gold-accent))] md:text-3xl"
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              textShadow: "0 0 20px hsl(var(--gold-accent) / 0.2)",
            }}
          >
            Central de comunicacao
          </h1>
          <p className="mt-1 text-xs uppercase tracking-wider text-[hsl(0,0%,45%)]">
            Suporte, grupos, respostas rapidas e notificacoes administrativas
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
            <TabsTrigger value="support">
              <HeadphonesIcon className="mr-2 h-4 w-4" />
              Suporte
            </TabsTrigger>
            <TabsTrigger value="groups">
              <Megaphone className="mr-2 h-4 w-4" />
              Grupos
            </TabsTrigger>
            <TabsTrigger value="quick-replies">
              <MessageSquare className="mr-2 h-4 w-4" />
              Respostas rapidas
            </TabsTrigger>
            <TabsTrigger value="templates">
              <FileText className="mr-2 h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="mr-2 h-4 w-4" />
              Notificacoes
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="mr-2 h-4 w-4" />
              Historico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="support" className="space-y-4">
            <AdminSupport />
          </TabsContent>

          <TabsContent value="groups" className="space-y-4">
            <GroupsContent showHeader={false} />
          </TabsContent>

          <TabsContent value="quick-replies" className="space-y-4">
            <AdminQuickReplies />
          </TabsContent>

          <TabsContent value="templates" className="space-y-4">
            <CommunicationTemplates />
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <AdminNotificationSettings />
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <AdminNotificationHistory />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
