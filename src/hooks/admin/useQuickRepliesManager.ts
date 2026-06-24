import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { adminQuickReplyQueryKeys } from "@/hooks/admin/admin-quick-reply-query-keys";
import {
  createQuickReply,
  deleteQuickReply,
  fetchQuickReplies,
  QuickReply,
  QuickReplyInput,
  toggleQuickReplyActive,
  updateQuickReply,
  updateQuickRepliesOrder,
} from "@/services/admin/support/quick-replies-service";

export type { QuickReply } from "@/services/admin/support/quick-replies-service";

export function useQuickRepliesManager() {
  const queryClient = useQueryClient();
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const data = await fetchQuickReplies();
    setQuickReplies(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const saveReply = async (editingReplyId: string | null, input: QuickReplyInput) => {
    if (editingReplyId) {
      await updateQuickReply(editingReplyId, input);
      await queryClient.invalidateQueries({ queryKey: adminQuickReplyQueryKeys.all() });
      return;
    }

    const maxOrder = Math.max(...quickReplies.map((reply) => reply.display_order), 0);
    await createQuickReply(input, maxOrder + 1);
    await queryClient.invalidateQueries({ queryKey: adminQuickReplyQueryKeys.all() });
  };

  const removeReply = async (id: string) => {
    await deleteQuickReply(id);
    await queryClient.invalidateQueries({ queryKey: adminQuickReplyQueryKeys.all() });
  };

  const toggleReplyActive = async (reply: QuickReply) => {
    await toggleQuickReplyActive(reply.id, reply.is_active);
    await queryClient.invalidateQueries({ queryKey: adminQuickReplyQueryKeys.all() });
  };

  const reorderReplies = async (updates: Array<{ id: string; display_order: number }>) => {
    const reordered = quickReplies.map((reply) => {
      const update = updates.find((item) => item.id === reply.id);
      return update ? { ...reply, display_order: update.display_order } : reply;
    });

    setQuickReplies(reordered);
    await updateQuickRepliesOrder(updates);
    await queryClient.invalidateQueries({ queryKey: adminQuickReplyQueryKeys.all() });
  };

  return {
    quickReplies,
    loading,
    reload,
    saveReply,
    removeReply,
    toggleReplyActive,
    reorderReplies,
    setQuickReplies,
  };
}
