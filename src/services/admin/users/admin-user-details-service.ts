import { supabase } from "@/integrations/supabase/client";
import { log } from "@/lib/logger";
import type { DeliveryAddress, ProfileRow } from "@/lib/profile";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database as TonecosMvpDatabase } from "@/integrations/supabase/tonecos-mvp.types";
import { decimalToHundredths } from "@/services/commercial/tonart-commerce-rules";

const tonecos = supabase as unknown as SupabaseClient<TonecosMvpDatabase>;

export type AdminUserProfile = ProfileRow & {
  email_notifications: boolean;
  order_updates: boolean;
  marketing_emails: boolean;
  quote_updates: boolean;
  production_updates: boolean;
  preferred_contact_channel: string | null;
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
  const { data, error } = await tonecos.rpc("tonart_admin_profile_detail", {
    p_user_id: userId,
  });
  if (error) throw error;
  if (!data) throw new Error("User not found");
  if (typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Admin user profile response is invalid");
  }

  const value = data as Record<string, unknown>;
  const nullableText = (field: string, maxLength: number) => {
    const fieldValue = value[field];
    if (fieldValue === null) return null;
    if (typeof fieldValue !== "string" || fieldValue.length > maxLength) {
      throw new Error("Admin user profile response is invalid");
    }
    return fieldValue;
  };
  const profileId = value.id;
  const email = value.email;
  const createdAt = value.createdAt;
  const updatedAt = value.updatedAt;
  const profileCompletion = value.profileCompletion;
  if (
    profileId !== userId.toLowerCase() ||
    typeof email !== "string" ||
    typeof createdAt !== "string" ||
    typeof updatedAt !== "string" ||
    typeof profileCompletion !== "number" ||
    !Number.isInteger(profileCompletion) ||
    profileCompletion < 0 || profileCompletion > 100 ||
    typeof value.isAdmin !== "boolean" ||
    typeof value.quoteUpdates !== "boolean" ||
    typeof value.productionUpdates !== "boolean" ||
    typeof value.marketingEmails !== "boolean"
  ) {
    throw new Error("Admin user profile response is invalid");
  }
  const fullName = nullableText("fullName", 160);
  const phone = nullableText("phone", 40);
  const whatsapp = nullableText("whatsapp", 40);
  const cpf = nullableText("cpf", 14);
  const birthDate = nullableText("birthDate", 10);
  const preferredContactChannel = nullableText("preferredContactChannel", 20);
  const deliveryAddress =
    value.deliveryAddress &&
      typeof value.deliveryAddress === "object" &&
      !Array.isArray(value.deliveryAddress)
      ? value.deliveryAddress as DeliveryAddress
      : null;
  const profile: AdminUserProfile = {
    id: profileId,
    email,
    full_name: fullName,
    phone,
    whatsapp,
    cpf,
    birth_date: birthDate,
    delivery_address: deliveryAddress,
    preferences_text: null,
    preference_tags: null,
    preferred_contact_channel: preferredContactChannel,
    quote_updates: value.quoteUpdates,
    production_updates: value.productionUpdates,
    marketing_emails: value.marketingEmails,
    profile_completion: profileCompletion,
    display_name: fullName,
    role: value.isAdmin ? "admin" : null,
    created_at: createdAt,
    updated_at: updatedAt,
    email_notifications: true,
    order_updates: value.productionUpdates,
  };

  return profile;
}

export async function listAdminUserPaymentHistory(
  userId?: string,
): Promise<UserPaymentHistory[]> {
  if (!userId) return [];

  const { data, error } = await supabase
    .from("quote_payments")
    .select("id, amount, status, payment_method, paid_at, created_at")
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
    payment_date: payment.paid_at,
    created_at: payment.created_at,
  }));
}

export async function fetchAdminUserCoinsBalance(
  userId?: string,
): Promise<CoinsBalance | null> {
  if (!userId) return null;

  const { data, error } = await tonecos.rpc("tonart_admin_customer_coins_balance", {
    p_user_id: userId,
  });
  if (error) throw error;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("tonecos_admin_customer_coins_balance_invalid");
  }
  const value = data as Record<string, unknown>;
  const balance = Number(value.balance);
  const totalEarned = Number(value.total_earned);
  const totalSpent = Number(value.total_spent);
  let exactAmounts = false;
  try {
    decimalToHundredths(String(balance));
    decimalToHundredths(String(totalEarned));
    decimalToHundredths(String(totalSpent));
    exactAmounts = true;
  } catch {
    exactAmounts = false;
  }
  if (
    !exactAmounts || balance < 0 || totalEarned < 0 || totalSpent < 0 ||
    balance !== totalEarned - totalSpent
  ) {
    throw new Error("tonecos_admin_customer_coins_balance_invalid");
  }

  return {
    available_credits: balance,
    total_earned: totalEarned,
    total_spent: totalSpent,
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
      collection_characters:characters!character_choices_character_id_fkey(id, name, image_url),
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
