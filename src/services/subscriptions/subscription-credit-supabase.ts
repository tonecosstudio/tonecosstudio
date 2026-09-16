import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type PublicTables = Database["public"]["Tables"];

export type SubscriptionCreditSubscriptionRow =
  PublicTables["subscription_credit_subscriptions"]["Row"];
export type SubscriptionCreditOrderRow =
  PublicTables["subscription_credit_orders"]["Row"];
export type SubscriptionCreditOrderItemRow =
  PublicTables["subscription_credit_order_items"]["Row"];
export type SubscriptionCreditTransactionRow =
  PublicTables["subscription_credit_transactions"]["Row"];
export type SubscriptionCreditCharacterRow =
  PublicTables["subscription_credit_characters"]["Row"];
export type SubscriptionCreditProductionCycleRow =
  PublicTables["subscription_credit_production_cycles"]["Row"];
export type SubscriptionCreditUserCreditsRow =
  PublicTables["subscription_credit_user_credits"]["Row"];
export type SubscriptionCreditPlanRow =
  PublicTables["subscription_credit_plans"]["Row"];

/**
 * Compatibility export for the subscription-credit modules.
 *
 * This is the canonical typed Supabase client, not a parallel hand-maintained
 * database schema. New code should import `supabase` directly; this alias can
 * disappear as the remaining subscription-credit modules are simplified.
 */
export const subscriptionCreditSupabase = supabase;
