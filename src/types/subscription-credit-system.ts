/**
 * Types for Subscription Credit System API
 * Based on the design document in .kiro/specs/subscription-credit-system/design.md
 *
 * NOTE: This is a legacy system that will be migrated to the unified order system.
 * For new code, use types from @/types/admin/orders instead.
 */

export type PlanType = 'trimestral' | 'semestral';
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled';
export type CancellationType = 'with_refund' | 'no_renewal';

// Legacy types - use specific types from @/types/admin/orders for new code
export type OrderType = 'individual' | 'automatic';
export type OrderStatus = 'pending' | 'confirmed' | 'in_production' | 'shipped' | 'cancelled';

export type TransactionType = 'allocation' | 'debit_immediate' | 'debit_cycle_close' | 'expiration' | 'adjustment';
export type CycleStatus = 'open' | 'full' | 'closed';

export interface SubscriptionPlan {
  id: number;
  plan_type: PlanType;
  name: string;
  duration_months: number;
  price: number;
  base_credits: number;
  bonus_credits: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: number;
  user_id: number;
  plan_type: PlanType;
  status: SubscriptionStatus;
  start_date: string;
  end_date: string;
  next_billing_date: string | null;
  auto_renew: boolean;
  pending_plan_change: PlanType | null;
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
  cancellation_type: CancellationType | null;
}

export interface UserCredits {
  id: number;
  user_id: number;
  subscription_id: number;
  total_credits: number;
  used_credits: number;
  available_credits: number;
  expired_credits: number;
  created_at: string;
  updated_at: string;
}

export interface CreditTransaction {
  id: number;
  user_id: number;
  subscription_id: number;
  transaction_type: TransactionType;
  credits_amount: number;
  character_id: number | null;
  order_id: number | null;
  production_cycle_id: number | null;
  description: string | null;
  created_at: string;
}

export interface Character {
  id: number;
  name: string;
  description: string | null;
  price_cash: number;
  price_credits: number;
  is_exclusive_semestral: boolean;
  is_active: boolean;
  is_standard_collection: boolean;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductionCycle {
  id: number;
  name: string;
  capacity_limit: number;
  current_count: number;
  status: CycleStatus;
  close_date: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export interface Order {
  id: number;
  user_id: number;
  subscription_id: number;
  production_cycle_id: number;
  order_type: OrderType;
  status: OrderStatus;
  is_priority: boolean;
  is_locked: boolean;
  total_credits: number;
  credits_debited: boolean;
  created_at: string;
  updated_at: string;
  locked_at: string | null;
}

export interface OrderItem {
  id: number;
  order_id: number;
  character_id: number;
  credits_cost: number;
  created_at: string;
  character?: Character;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
  production_cycle?: ProductionCycle;
}

// API Response Types
export interface CreditsBalanceResponse {
  total_credits: number;
  used_credits: number;
  available_credits: number;
  subscription_status: SubscriptionStatus;
}

export interface TransactionsResponse {
  transactions: CreditTransaction[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface SubscriptionActivationResponse {
  subscription_id: number;
  credits_allocated: number;
  order_id: number;
}

export interface PlanChangeResponse {
  pending_plan_change: PlanType;
  effective_date: string;
}

export interface CancelWithRefundResponse {
  refund_amount: number;
  credits_expired: number;
}

export interface NoRenewalResponse {
  end_date: string;
  credits_valid_until: string;
}

export interface UserCycleCountResponse {
  current_count: number;
  limit: number;
  cycle_id: number;
}
