import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { assertTonecosCommercialEnabled } from "@/config/tonecos-commercial-authority";
import { requireTonecosAdminAccess } from "@/services/auth/tonecos-admin-access";

const tonecos = supabase as unknown as SupabaseClient;

export type TonartAdminProfile = {
  id: string;
  email: string;
  fullName: string | null;
  createdAt: string;
};

export type TonartAdminCoinEntry = {
  id: string;
  userId: string;
  userEmail: string | null;
  type: "admin_credit" | "purchase_spend" | "refund";
  delta: number;
  reason: string;
  createdAt: string;
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const entryTypes = new Set(["admin_credit", "purchase_spend", "refund"]);

export type TonartAdminOverview = {
  profileCount: number;
  quoteCount: number;
  pendingQuoteCount: number;
  reviewingQuoteCount: number;
  coinEntryCount: number;
  recentProfiles: TonartAdminProfile[];
  recentCoinEntries: TonartAdminCoinEntry[];
};

/** One read-only server projection of the existing profiles, quotes and Coins ledger.
 * Both the service and the database reject access without the canonical admin membership.
 */
export async function getTonartAdminOverview(): Promise<TonartAdminOverview> {
  assertTonecosCommercialEnabled();
  await requireTonecosAdminAccess();

  const { data, error } = await tonecos.rpc("tonart_admin_workspace_overview");
  if (error) throw error;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("tonart_admin_overview_invalid");
  }
  const value = data as unknown as Record<string, unknown>;
  const countFields = [
    "profileCount", "quoteCount", "pendingQuoteCount",
    "reviewingQuoteCount", "coinEntryCount",
  ] as const;
  for (const key of countFields) {
    if (!Number.isSafeInteger(value[key]) || (value[key] as number) < 0) {
      throw new Error("tonart_admin_overview_invalid");
    }
  }
  if (!Array.isArray(value.recentProfiles) || value.recentProfiles.length > 25) {
    throw new Error("tonart_admin_overview_invalid");
  }
  const recentProfiles: TonartAdminProfile[] = value.recentProfiles.map((item: unknown) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error("tonart_admin_profile_invalid");
    }
    const p = item as Record<string, unknown>;
    if (typeof p.id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p.id) ||
      typeof p.email !== "string" || p.email.length < 3 || p.email.length > 320 ||
      !(p.fullName === null || typeof p.fullName === "string") ||
      typeof p.createdAt !== "string" || Number.isNaN(Date.parse(p.createdAt))) {
      throw new Error("tonart_admin_profile_invalid");
    }
    return { id: p.id, email: p.email, fullName: p.fullName, createdAt: p.createdAt };
  });
  if (!Array.isArray(value.recentCoinEntries) || value.recentCoinEntries.length > 25) {
    throw new Error("tonart_admin_overview_invalid");
  }
  const recentCoinEntries: TonartAdminCoinEntry[] = value.recentCoinEntries.map((item: unknown) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error("tonart_admin_coin_history_invalid");
    }
    const entry = item as Record<string, unknown>;
    if (typeof entry.id !== "string" || !uuid.test(entry.id) ||
      typeof entry.userId !== "string" || !uuid.test(entry.userId) ||
      !(entry.userEmail === null || (typeof entry.userEmail === "string" &&
        entry.userEmail.length > 2 && entry.userEmail.length <= 320)) ||
      typeof entry.type !== "string" || !entryTypes.has(entry.type) ||
      typeof entry.delta !== "number" || !Number.isSafeInteger(entry.delta) || entry.delta === 0 ||
      (entry.type === "purchase_spend" ? entry.delta > 0 : entry.delta < 0) ||
      typeof entry.reason !== "string" || entry.reason.length < 4 || entry.reason.length > 500 ||
      typeof entry.createdAt !== "string" || Number.isNaN(Date.parse(entry.createdAt))) {
      throw new Error("tonart_admin_coin_history_invalid");
    }
    return {
      id: entry.id, userId: entry.userId, userEmail: entry.userEmail,
      type: entry.type as TonartAdminCoinEntry["type"], delta: entry.delta,
      reason: entry.reason, createdAt: entry.createdAt,
    };
  });
  if ((value.pendingQuoteCount as number) > (value.quoteCount as number) ||
      (value.reviewingQuoteCount as number) > (value.quoteCount as number) ||
      recentProfiles.length > (value.profileCount as number) ||
      recentCoinEntries.length > (value.coinEntryCount as number)) {
    throw new Error("tonart_admin_overview_invalid");
  }
  return {
    profileCount: value.profileCount as number,
    quoteCount: value.quoteCount as number,
    pendingQuoteCount: value.pendingQuoteCount as number,
    reviewingQuoteCount: value.reviewingQuoteCount as number,
    coinEntryCount: value.coinEntryCount as number,
    recentProfiles,
    recentCoinEntries,
  };
}
