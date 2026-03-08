import { AdminLayout } from "@/components/admin/AdminLayout";
import { GroupsContent } from "@/components/groups/GroupsContent";

/**
 * AdminGroupsPage - Standalone page for managing broadcast groups
 *
 * This is the main entry point at /admin/grupos
 * Uses AdminLayout for sidebar navigation
 */
export default function AdminGroupsPage() {
  return (
    <AdminLayout>
      <GroupsContent showHeader={true} />
    </AdminLayout>
  );
}
