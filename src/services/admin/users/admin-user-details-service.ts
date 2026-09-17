import { supabase } from "@/integrations/supabase/client";
import { log } from "@/lib/logger";
import type { ProfileRow } from "@/lib/profile";

export type AdminUserProfile = ProfileRow & {
  email_notifications: boolean;
  order_updates: boolean;
  marketing_emails: boolean;
};

export type AdminUserRole = {
  role: string;
};

export type UserPaymentHistory = {
  id: string;
  amount: number;
  status: string | null;
  payment_method: string | null;
  payment_date: string | null;
  created_at: string;
};

export interface CharacterChoice {
  id: string;
  order_id: string;
  order_type?: string | null;
  status: string;
  character_name?: string | null;
  chosen_at?: string | null;
  deadline?: string | null;
  approved_at?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  collection_characters?: { id: string; name: string; image_url?: string | null } | null;
  collections?: { id: string; name: string } | null;
}

export interface CoinsBalance {
  available_credits: number;
  total_earned: number;
  total_spent: number;
}

export async function fetchAdminUserProfile(userId: string): Promise<AdminUserProfile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("User not found");

  const profile = data as unknown as ProfileRow;

  return {
    ...profile,
    email_notifications: profile.email_notifications ?? true,
    order_updates: profile.order_updates ?? true,
    marketing_emails: profile.marketing_emails ?? false,
  };
}

export async function listAdminUserPaymentHistory(
  userId?: string,
): Promise<UserPaymentHistory[]> {
  if (!userId) return [];

  const { data, error } = await supabase
    .from("manual_payments")
    .select("id, amount, status, payment_method, approved_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    log.error("Failed to fetch user payment history", { error, userId });
    return [];
  }

  return (data ?? []).map((payment) => ({
    id: payment.id,
    amount: payment.amount,
    status: payment.status,
    payment_method: payment.payment_method,
    payment_date: payment.approved_at,
    created_at: payment.created_at,
  }));
}

export async function fetchAdminUserCoinsBalance(
  userId?: string,
): Promise<CoinsBalance | null> {
  if (!userId) return null;

  const { data } = await supabase
    .from("user_coins")
    .select("balance, total_earned, total_spent")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return { available_credits: 0, total_earned: 0, total_spent: 0 };

  return {
    available_credits: data.balance || 0,
    total_earned: data.total_earned || 0,
    total_spent: data.total_spent || 0,
  };
}

export async function listAdminUserMonthlySelections(userId?: string): Promise<CharacterChoice[]> {
  if (!userId) return [];

  const { data: choices, error } = await supabase
    .from("character_choices")
    .select(
      `
      id, order_id, order_type, status,
      character_name, submitted_at, deadline,
      approved_at, rejected_at, rejection_reason,
      created_at,
      collection_characters:collection_characters!character_choices_character_id_fkey(id, name, image_url),
      collections:collections!character_choices_collection_id_fkey(id, name)
    `,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    log.error("Failed to fetch user character choices", { error, userId });
    return [];
  }

  return (choices ?? []).map((choice) => ({
    id: choice.id,
    order_id: choice.order_id ?? choice.id,
    order_type: choice.order_type,
    status: choice.status,
    character_name: choice.character_name,
    chosen_at: choice.submitted_at,
    deadline: choice.deadline,
    approved_at: choice.approved_at,
    rejected_at: choice.rejected_at,
    rejection_reason: choice.rejection_reason,
    created_at: choice.created_at,
    collection_characters: choice.collection_characters,
    collections: choice.collections,
  }));
}
