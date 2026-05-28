/**
 * Types for Subscription Credit System API
 * Based on the design document in .kiro/specs/subscription-credit-system/design.md
 *
 * NOTE: This is a legacy system that will be migrated to the unified order system.
 * For new code, use types from @/types/admin/orders instead.
 */

export const SUBSCRIPTION_CREDIT_PLAN_TYPES = ['trimestral', 'semestral'] as const;
export type PlanType = (typeof SUBSCRIPTION_CREDIT_PLAN_TYPES)[number];

export const SUBSCRIPTION_CREDIT_SUBSCRIPTION_STATUSES = [
  'active',
  'expired',
  'cancelled',
] as const;
export type SubscriptionStatus =
  (typeof SUBSCRIPTION_CREDIT_SUBSCRIPTION_STATUSES)[number];

export type CancellationType = 'with_refund' | 'no_renewal';

// Legacy types - use specific types from @/types/admin/orders for new code
// DEPRECATED: Use OrderType from @/types/admin/orders instead
// This OrderType ('individual' | 'automatic') is specific to the legacy subscription credit system
// The modern OrderType is ('subscription_delivery' | 'standalone_purchase' | 'manual_payment' | 'quote')
export type OrderType = 'individual' | 'automatic';
// REMOVED: OrderStatus - use OrderStatus from @/types/admin/orders instead

export const SUBSCRIPTION_CREDIT_TRANSACTION_TYPES = [
  'allocation',
  'debit_immediate',
  'debit_cycle_close',
  'expiration',
  'adjustment',
] as const;
export type TransactionType = (typeof SUBSCRIPTION_CREDIT_TRANSACTION_TYPES)[number];

export const SUBSCRIPTION_CREDIT_CYCLE_STATUSES = ['open', 'full', 'closed'] as const;
export type CycleStatus = (typeof SUBSCRIPTION_CREDIT_CYCLE_STATUSES)[number];

const SUBSCRIPTION_CREDIT_PLAN_TYPE_SET = new Set<string>(
  SUBSCRIPTION_CREDIT_PLAN_TYPES
);
const SUBSCRIPTION_CREDIT_SUBSCRIPTION_STATUS_SET = new Set<string>(
  SUBSCRIPTION_CREDIT_SUBSCRIPTION_STATUSES
);
const SUBSCRIPTION_CREDIT_TRANSACTION_TYPE_SET = new Set<string>(
  SUBSCRIPTION_CREDIT_TRANSACTION_TYPES
);

export function isSubscriptionCreditPlanType(value: unknown): value is PlanType {
  return (
    typeof value === 'string' && SUBSCRIPTION_CREDIT_PLAN_TYPE_SET.has(value)
  );
}

export function isSubscriptionCreditSubscriptionStatus(
  value: unknown
): value is SubscriptionStatus {
  return (
    typeof value === 'string' &&
    SUBSCRIPTION_CREDIT_SUBSCRIPTION_STATUS_SET.has(value)
  );
}

export function isSubscriptionCreditTransactionType(
  value: unknown
): value is TransactionType {
  return (
    typeof value === 'string' &&
    SUBSCRIPTION_CREDIT_TRANSACTION_TYPE_SET.has(value)
  );
}

export interface SubscriptionPlan {
  id: string;
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
  id: string;
  user_id: string;
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
  id: string;
  user_id: string;
  subscription_id: string;
  total_credits: number;
  used_credits: number;
  available_credits: number;
  expired_credits: number;
  created_at: string;
  updated_at: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  subscription_id: string;
  transaction_type: TransactionType;
  credits_amount: number;
  character_id: string | null;
  order_id: string | null;
  production_cycle_id: string | null;
  description: string | null;
  created_at: string;
}

export interface Character {
  id: string;
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
  id: string;
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
  id: string;
  user_id: string;
  subscription_id: string;
  production_cycle_id: string;
  order_type: OrderType;
  status: string; // Use OrderStatus from @/types/admin/orders for type safety
  is_priority: boolean;
  is_locked: boolean;
  total_credits: number;
  credits_debited: boolean;
  created_at: string;
  updated_at: string;
  locked_at: string | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  character_id: string;
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
  expired_credits: number;
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
  subscription_id: string;
  credits_allocated: number;
  order_id: string | null;
  message?: string;
}

export interface PlanChangeResponse {
  subscription_id: string;
  pending_plan_change: PlanType;
  effective_date: string;
  message?: string;
}

export interface CancelWithRefundResponse {
  subscription_id: string;
  refund_amount: number;
  credits_expired: number;
  message?: string;
}

export interface NoRenewalResponse {
  subscription_id: string;
  end_date: string;
  credits_valid_until: string;
  message?: string;
}

export interface UserCycleCountResponse {
  cycle_count: number;
  current_count?: number;
  limit?: number;
  cycle_id?: string;
}
