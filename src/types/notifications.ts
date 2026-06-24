export type UserNotificationPriority = "low" | "medium" | "high" | "critical";

export interface UserNotificationCenterItem {
  id: string;
  user_id: string;
  type: string;
  priority: UserNotificationPriority;
  title: string;
  message: string;
  icon?: string;
  related_id?: string;
  related_type?: string;
  action_url?: string;
  action_label?: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export type UserNotificationFilter = "all" | "unread" | "read";
