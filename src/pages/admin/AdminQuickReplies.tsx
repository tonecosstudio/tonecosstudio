import { AdminLayout } from "@/components/admin/AdminLayout";
import { QuickRepliesManager } from "@/components/admin/QuickRepliesManager";

export default function AdminQuickReplies() {
  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <QuickRepliesManager />
      </div>
    </AdminLayout>
  );
}
