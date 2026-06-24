export const adminQuickReplyQueryKeys = {
  all: () => ["admin-quick-replies"] as const,
  list: () => ["admin-quick-replies", "list"] as const,
  active: () => ["admin-quick-replies", "active"] as const,
};
