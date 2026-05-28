import { AdminLayout } from "@/components/admin/shared/AdminLayout";
import { GroupsContent } from "@/components/groups/GroupsContent";

/**
 * AdminGroupsPage - Standalone page for managing broadcast groups
 *
 * This is the legacy standalone entry point for group management.
 * Uses AdminLayout for sidebar navigation
 */
export default function AdminGroupsPage() {
  return (
    <AdminLayout>
      <GroupsContent showHeader={true} />
    </AdminLayout>
  );
}
