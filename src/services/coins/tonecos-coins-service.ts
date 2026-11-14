import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/tonecos-mvp.types";
import { getTonecosCurrentUser } from "@/services/customer/tonecos-account-service";
import { assertTonecosCommercialEnabled } from "@/config/tonecos-commercial-authority";

const tonecos = supabase as unknown as SupabaseClient<Database>;

export function assertTonecosCoinsEnabled(): void {
  assertTonecosCommercialEnabled();
}

export type TonecosCoinBalance = {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  entryCount: number;
  updatedAt: string | null;
};

export type TonecosCoinEntry = {
  id: string;
  delta: number;
  type: "admin_credit" | "purchase_spend" | "refund";
  reason: string;
  createdAt: string;
};

export type TonecosAdminCreditResult = {
  userId: string;
  credited: number;
  balance: number;
  transactionId: string;
  idempotent: boolean;
};

export type TonecosQuoteCoinPaymentResult = {
  quoteId: string;
  spent: number;
  balance: number;
  remainingAmount: number;
  idempotent: boolean;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const coinTypeSet = new Set(["admin_credit", "purchase_spend", "refund"]);

function integer(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("tonecos_coin_response_invalid");
  }
  return value as Record<string, unknown>;
}
async function requireOwnAccount(): Promise<string> {
  const user = await getTonecosCurrentUser();
  if (!user) throw new Error("tonecos_login_required");
  return user.id;
}

/** Never guess a zero balance on network or permission errors. */
export async function getMyTonecosCoinBalance(): Promise<TonecosCoinBalance> {
  assertTonecosCoinsEnabled();
  await requireOwnAccount();
  const { data, error } = await tonecos.rpc("get_my_tonecos_coin_balance");
  if (error) throw error;
  const o = object(data);
  const { balance, total_earned, total_spent, entry_count, updated_at } = o;
  if (
    !integer(balance) ||
    !integer(total_earned) ||
    !integer(total_spent) ||
    !integer(entry_count) ||
    balance < 0 ||
    total_earned < 0 ||
    total_spent < 0 ||
    entry_count < 0 ||
    balance !== total_earned - total_spent ||
    !(
      updated_at === null ||
      (typeof updated_at === "string" && !Number.isNaN(Date.parse(updated_at)))
    )
  ) {
    throw new Error("tonecos_coin_balance_invalid");
  }
  return {
    balance,
    totalEarned: total_earned,
    totalSpent: total_spent,
    entryCount: entry_count,
    updatedAt: updated_at,
  };
}

/** Strictly owner-scoped by both authenticated id and PostgreSQL RLS. */
export async function listMyTonecosCoinEntries(
  limit = 20,
  offset = 0,
): Promise<TonecosCoinEntry[]> {
  assertTonecosCoinsEnabled();
  if (
    !integer(limit) ||
    limit < 1 ||
    limit > 50 ||
    !integer(offset) ||
    offset < 0 ||
    offset > 100000
  ) {
    throw new Error("tonecos_coin_limit_invalid");
  }
  const userId = await requireOwnAccount();
  const { data, error } = await tonecos
    .from("tonecos_coin_entries")
    .select("id,delta,entry_type,reason,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return (data ?? []).map((v) => {
    const r = object(v);
    if (
      typeof r.id !== "string" ||
      !uuidPattern.test(r.id) ||
      !integer(r.delta) ||
      r.delta === 0 ||
      typeof r.entry_type !== "string" ||
      !coinTypeSet.has(r.entry_type) ||
      typeof r.reason !== "string" ||
      r.reason.length < 4 ||
      r.reason.length > 500 ||
      typeof r.created_at !== "string" ||
      Number.isNaN(Date.parse(r.created_at))
    ) {
      throw new Error("tonecos_coin_entry_invalid");
    }
    return {
      id: r.id,
      delta: r.delta,
      type: r.entry_type as TonecosCoinEntry["type"],
      reason: r.reason,
      createdAt: r.created_at,
    };
  });
}

/** Single server-authorized, auditable coin credit. No client-side minting or purchases. */
export async function creditTonecosCoins(input: {
  userId: string;
  amount: number;
  referenceKey: string;
  reason: string;
}): Promise<TonecosAdminCreditResult> {
  assertTonecosCoinsEnabled();
  if (
    typeof input.userId !== "string" ||
    !uuidPattern.test(input.userId) ||
    typeof input.referenceKey !== "string" ||
    !uuidPattern.test(input.referenceKey) ||
    !integer(input.amount) ||
    input.amount < 1 ||
    input.amount > 10000 ||
    typeof input.reason !== "string" ||
    input.reason.trim().length < 4 ||
    input.reason.trim().length > 500
  ) {
    throw new Error("tonecos_coin_credit_input_invalid");
  }
  await requireOwnAccount();
  const { data, error } = await tonecos.rpc("admin_credit_tonecos_coins", {
    p_user_id: input.userId,
    p_amount: input.amount,
    p_reference_key: input.referenceKey,
    p_reason: input.reason.trim(),
  });
  if (error) throw error;
  const o = object(data);
  if (
    o.user_id !== input.userId ||
    o.credited !== input.amount ||
    !integer(o.balance) ||
    o.balance < input.amount ||
    o.balance > 1000000 ||
    typeof o.transaction_id !== "string" ||
    !uuidPattern.test(o.transaction_id) ||
    typeof o.idempotent !== "boolean"
  ) {
    throw new Error("tonecos_coin_credit_result_invalid");
  }
  return {
    userId: o.user_id,
    credited: o.credited,
    balance: o.balance,
    transactionId: o.transaction_id,
    idempotent: o.idempotent,
  };
}

/** Spends an owner's virtual Coins against one answered quote at R$1 per Coin. */
export async function applyTonecosCoinsToQuote(input: {
  quoteId: string;
  amount: number;
}): Promise<TonecosQuoteCoinPaymentResult> {
  assertTonecosCoinsEnabled();
  if (
    typeof input.quoteId !== "string" ||
    !uuidPattern.test(input.quoteId) ||
    !integer(input.amount) ||
    input.amount < 1 ||
    input.amount > 100000
  ) {
    throw new Error("tonecos_coin_quote_payment_input_invalid");
  }
  await requireOwnAccount();
  const { data, error } = await tonecos.rpc("apply_tonecos_coins_to_quote", {
    p_quote_id: input.quoteId.toLowerCase(),
    p_amount: input.amount,
  });
  if (error) throw error;
  const o = object(data);
  const remainingAmount = Number(o.remaining_amount);
  if (
    o.quote_id !== input.quoteId.toLowerCase() ||
    o.spent !== input.amount ||
    !integer(o.balance) ||
    o.balance < 0 ||
    o.balance > 1000000 ||
    !Number.isFinite(remainingAmount) ||
    remainingAmount < 0 ||
    typeof o.idempotent !== "boolean"
  ) {
    throw new Error("tonecos_coin_quote_payment_result_invalid");
  }
  return {
    quoteId: o.quote_id,
    spent: o.spent,
    balance: o.balance,
    remainingAmount,
    idempotent: o.idempotent,
  };
}

export type TonecosCoinRecipient = {
  id: string;
  email: string;
  fullName: string | null;
};

/** One exact-email lookup authorized and executed by the database, never a directory list. */
export async function findTonecosCoinRecipient(
  email: string,
): Promise<TonecosCoinRecipient | null> {
  assertTonecosCoinsEnabled();
  const normalized =
    typeof email === "string" ? email.trim().toLowerCase() : "";
  if (
    normalized.length > 320 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
  ) {
    throw new Error("tonecos_coin_recipient_email_invalid");
  }
  await requireOwnAccount();
  const { data, error } = await tonecos.rpc("find_tonecos_coin_recipient", {
    p_email: normalized,
  });
  if (error) throw error;
  if (data === null) return null;
  const o = object(data);
  if (
    typeof o.id !== "string" ||
    !uuidPattern.test(o.id) ||
    typeof o.email !== "string" ||
    o.email.toLowerCase() !== normalized ||
    !(o.full_name === null || typeof o.full_name === "string")
  ) {
    throw new Error("tonecos_coin_recipient_invalid");
  }
  return { id: o.id, email: o.email, fullName: o.full_name };
}
