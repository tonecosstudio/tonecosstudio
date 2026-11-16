import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/tonecos-mvp.types";
import {
  getTonecosCurrentUser,
  isTonecosLocalPreviewEnabled,
} from "@/services/customer/tonecos-account-service";
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
  type:
    | "admin_credit"
    | "purchase_spend"
    | "refund"
    | "shipment_bonus"
    | "purchase_reversal"
    | "bonus_reversal"
    | "legacy_import";
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

export type TonecosCoinReversalResult = {
  transactionId: string;
  balance: number;
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
const coinTypeSet = new Set([
  "admin_credit",
  "purchase_spend",
  "refund",
  "shipment_bonus",
  "purchase_reversal",
  "bonus_reversal",
  "legacy_import",
]);
const LOCAL_PREVIEW_COIN_BALANCE: TonecosCoinBalance = {
  balance: 150,
  totalEarned: 150,
  totalSpent: 0,
  entryCount: 2,
  updatedAt: "2026-11-12T16:00:00.000Z",
};
const LOCAL_PREVIEW_COIN_ENTRIES: TonecosCoinEntry[] = [
  {
    id: "c0000000-0000-4000-8000-000000000001",
    delta: 100,
    type: "admin_credit",
    reason: "Bônus de boas-vindas",
    createdAt: "2026-11-12T16:00:00.000Z",
  },
  {
    id: "c0000000-0000-4000-8000-000000000002",
    delta: 50,
    type: "admin_credit",
    reason: "Crédito de fidelidade",
    createdAt: "2026-11-10T12:00:00.000Z",
  },
];

function integer(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}
function coinHundredths(value: unknown, allowNegative = false): number | null {
  const raw = typeof value === "number" ? String(value) : typeof value === "string" ? value : "";
  const pattern = allowNegative ? /^-?\d+(?:\.\d{1,2})?$/ : /^\d+(?:\.\d{1,2})?$/;
  if (!pattern.test(raw)) return null;
  const negative = raw.startsWith("-");
  const [whole, fraction = ""] = (negative ? raw.slice(1) : raw).split(".");
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(result) ? (negative ? -result : result) : null;
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
  if (isTonecosLocalPreviewEnabled()) {
    return { ...LOCAL_PREVIEW_COIN_BALANCE };
  }
  const { data, error } = await tonecos.rpc("get_my_tonecos_coin_balance");
  if (error) throw error;
  const o = object(data);
  const balanceHundredths = coinHundredths(o.balance);
  const earnedHundredths = coinHundredths(o.total_earned);
  const spentHundredths = coinHundredths(o.total_spent);
  const { entry_count, updated_at } = o;
  if (
    balanceHundredths === null ||
    earnedHundredths === null ||
    spentHundredths === null ||
    !integer(entry_count) ||
    balanceHundredths < 0 ||
    earnedHundredths < 0 ||
    spentHundredths < 0 ||
    entry_count < 0 ||
    balanceHundredths !== earnedHundredths - spentHundredths ||
    !(
      updated_at === null ||
      (typeof updated_at === "string" && !Number.isNaN(Date.parse(updated_at)))
    )
  ) {
    throw new Error("tonecos_coin_balance_invalid");
  }
  return {
    balance: balanceHundredths / 100,
    totalEarned: earnedHundredths / 100,
    totalSpent: spentHundredths / 100,
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
  if (isTonecosLocalPreviewEnabled()) {
    return LOCAL_PREVIEW_COIN_ENTRIES.slice(offset, offset + limit);
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
      coinHundredths(r.delta, true) === null ||
      (coinHundredths(r.delta, true) ?? 0) === 0 ||
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
      delta: Number(r.delta),
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
  if (isTonecosLocalPreviewEnabled()) {
    throw new Error("tonecos_local_preview_read_only");
  }
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
    coinHundredths(o.balance) === null ||
    (coinHundredths(o.balance) ?? 0) < input.amount * 100 ||
    (coinHundredths(o.balance) ?? Infinity) > 100000000 ||
    typeof o.transaction_id !== "string" ||
    !uuidPattern.test(o.transaction_id) ||
    typeof o.idempotent !== "boolean"
  ) {
    throw new Error("tonecos_coin_credit_result_invalid");
  }
  return {
    userId: o.user_id,
    credited: o.credited,
    balance: Number(o.balance),
    transactionId: o.transaction_id,
    idempotent: o.idempotent,
  };
}

/** Reverses an eligible ledger entry atomically; this never refunds BRL or edits an order. */
export async function reverseTonecosCoinEntry(input: {
  entryId: string;
  reason: string;
}): Promise<TonecosCoinReversalResult> {
  assertTonecosCoinsEnabled();
  if (isTonecosLocalPreviewEnabled()) {
    throw new Error("tonecos_local_preview_read_only");
  }
  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  if (!uuidPattern.test(input.entryId) || reason.length < 4 || reason.length > 500) {
    throw new Error("tonecos_coin_reversal_input_invalid");
  }
  await requireOwnAccount();
  const { data, error } = await tonecos.rpc("admin_reverse_tonecos_coin_entry", {
    p_entry_id: input.entryId,
    p_reason: reason,
  });
  if (error) throw error;
  const result = object(data);
  const balanceHundredths = coinHundredths(result.balance);
  if (
    typeof result.transaction_id !== "string" ||
    !uuidPattern.test(result.transaction_id) ||
    balanceHundredths === null ||
    balanceHundredths < 0 ||
    typeof result.idempotent !== "boolean"
  ) {
    throw new Error("tonecos_coin_reversal_result_invalid");
  }
  return {
    transactionId: result.transaction_id,
    balance: balanceHundredths / 100,
    idempotent: result.idempotent,
  };
}

/** Kept only for compatibility with older callers; quotes are never Coins-eligible. */
export async function applyTonecosCoinsToQuote(input: {
  quoteId: string;
  amount: number;
}): Promise<TonecosQuoteCoinPaymentResult> {
  assertTonecosCoinsEnabled();
  if (isTonecosLocalPreviewEnabled()) {
    throw new Error("tonecos_local_preview_read_only");
  }
  if (
    typeof input.quoteId !== "string" ||
    !uuidPattern.test(input.quoteId) ||
    !integer(input.amount) ||
    input.amount < 1 ||
    input.amount > 100000
  ) {
    throw new Error("tonecos_coin_quote_payment_input_invalid");
  }
  throw new Error("tonecos_coins_not_eligible_for_quotes");
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
  if (isTonecosLocalPreviewEnabled()) {
    throw new Error("tonecos_local_preview_read_only");
  }
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
