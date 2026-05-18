import { useCallback, useEffect, useState } from "react";
import {
  createQuickReply,
  deleteQuickReply,
  fetchQuickReplies,
  QuickReply,
  QuickReplyInput,
  toggleQuickReplyActive,
  updateQuickReply,
  updateQuickRepliesOrder,
} from "@/services/admin/quick-replies-service";

export type { QuickReply } from "@/services/admin/quick-replies-service";

export function useQuickRepliesManager() {
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
      return;
    }

    const maxOrder = Math.max(...quickReplies.map((reply) => reply.display_order), 0);
    await createQuickReply(input, maxOrder + 1);
  };

  const removeReply = async (id: string) => {
    await deleteQuickReply(id);
  };

  const toggleReplyActive = async (reply: QuickReply) => {
    await toggleQuickReplyActive(reply.id, reply.is_active);
  };

  const reorderReplies = async (updates: Array<{ id: string; display_order: number }>) => {
    const reordered = quickReplies.map((reply) => {
      const update = updates.find((item) => item.id === reply.id);
      return update ? { ...reply, display_order: update.display_order } : reply;
    });

    setQuickReplies(reordered);
    await updateQuickRepliesOrder(updates);
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
