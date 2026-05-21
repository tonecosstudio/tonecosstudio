export type ProfilePaymentMethod = {
  id: string;
  type: string | null;
  card_brand?: string | null;
  card_last4?: string | null;
  card_holder_name?: string | null;
  card_expiry_month?: number | null;
  card_expiry_year?: number | null;
  is_default?: boolean | null;
};

export type ActiveSubscription = {
  id: string;
  user_id: string;
  plan_type: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
};

export type SupportConversation = {
  id: string;
  user_id: string;
  subject: string;
  status: string;
  created_at: string;
  last_message_at: string | null;
};

export type SupportMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  is_internal?: boolean | null;
};
