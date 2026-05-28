import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type {
  Character,
  CreditTransaction,
  Order,
  OrderItem,
  PlanType,
  ProductionCycle,
  Subscription,
  SubscriptionPlan,
  UserCredits,
} from "@/types/subscription-credit-system";

type SubscriptionCreditRow<Row extends object> = Row & Record<string, unknown>;

type SubscriptionCreditTable<Row extends object> = {
  Row: SubscriptionCreditRow<Row>;
  Insert: Partial<SubscriptionCreditRow<Row>>;
  Update: Partial<SubscriptionCreditRow<Row>>;
  Relationships: [];
};

export type SubscriptionCreditSubscriptionRow = Subscription & {
  plan_id: string | null;
};

export type SubscriptionCreditOrderRow = Order;
export type SubscriptionCreditOrderItemRow = OrderItem;
export type SubscriptionCreditTransactionRow = CreditTransaction;
export type SubscriptionCreditCharacterRow = Character;
export type SubscriptionCreditProductionCycleRow = ProductionCycle;
export type SubscriptionCreditUserCreditsRow = UserCredits;
export type SubscriptionCreditPlanRow = SubscriptionPlan & {
  plan_type: PlanType;
};

type SubscriptionCreditDatabase = {
  public: {
    Tables: {
      subscription_credit_plans: SubscriptionCreditTable<SubscriptionCreditPlanRow>;
      subscription_credit_subscriptions: SubscriptionCreditTable<SubscriptionCreditSubscriptionRow>;
      subscription_credit_user_credits: SubscriptionCreditTable<SubscriptionCreditUserCreditsRow>;
      subscription_credit_transactions: SubscriptionCreditTable<SubscriptionCreditTransactionRow>;
      subscription_credit_characters: SubscriptionCreditTable<SubscriptionCreditCharacterRow>;
      subscription_credit_production_cycles: SubscriptionCreditTable<SubscriptionCreditProductionCycleRow>;
      subscription_credit_orders: SubscriptionCreditTable<SubscriptionCreditOrderRow>;
      subscription_credit_order_items: SubscriptionCreditTable<SubscriptionCreditOrderItemRow>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export const subscriptionCreditSupabase =
  supabase as unknown as SupabaseClient<SubscriptionCreditDatabase>;
