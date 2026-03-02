/**
 * Core types for the Subscription Credit System
 */

// Subscription Plan Types
export type PlanType = 'trimestral' | 'semestral';

export type SubscriptionStatus = 'active' | 'expired' | 'cancelled';

export type CancellationType = 'with_refund' | 'no_renewal';

// Credit Transaction Types
export type TransactionType =
  | 'allocation'
  | 'debit_immediate'
  | 'debit_cycle_close'
  | 'expiration'
  | 'adjustment';

// Order Types
export type OrderType = 'individual' | 'automatic';

export type OrderStatus = 'pending' | 'confirmed' | 'in_production' | 'shipped' | 'cancelled';

// Production Cycle Types
export type CycleStatus = 'open' | 'full' | 'closed';

// Subscription Plan Configuration
export interface SubscriptionPlan {
  id: number;
  planType: PlanType;
  name: string;
  durationMonths: number;
  price: number;
  baseCredits: number;
  bonusCredits: number;
  isActive: boolean;
}

// User Subscription
export interface Subscription {
  id: number;
  userId: number;
  planType: PlanType;
  status: SubscriptionStatus;
  startDate: Date;
  endDate: Date;
  nextBillingDate: Date | null;
  autoRenew: boolean;
  pendingPlanChange: PlanType | null;
  cancelledAt: Date | null;
  cancellationType: CancellationType | null;
}

// User Credits
export interface UserCredits {
  id: number;
  userId: number;
  subscriptionId: number;
  totalCredits: number;
  usedCredits: number;
  availableCredits: number;
  expiredCredits: number;
}

// Credit Transaction
export interface CreditTransaction {
  id: number;
  userId: number;
  subscriptionId: number;
  transactionType: TransactionType;
  creditsAmount: number;
  characterId: number | null;
  orderId: number | null;
  productionCycleId: number | null;
  description: string | null;
  createdAt: Date;
}

// Character
export interface Character {
  id: number;
  name: string;
  description: string | null;
  priceCash: number;
  priceCredits: number;
  isExclusiveSemestral: boolean;
  isActive: boolean;
  isStandardCollection: boolean;
  imageUrl: string | null;
}

// Production Cycle
export interface ProductionCycle {
  id: number;
  name: string;
  capacityLimit: number;
  currentCount: number;
  status: CycleStatus;
  closeDate: Date;
  closedAt: Date | null;
}

// Order
export interface Order {
  id: number;
  userId: number;
  subscriptionId: number;
  productionCycleId: number;
  orderType: OrderType;
  status: OrderStatus;
  isPriority: boolean;
  isLocked: boolean;
  totalCredits: number;
  creditsDebited: boolean;
  lockedAt: Date | null;
}

// Order Item
export interface OrderItem {
  id: number;
  orderId: number;
  characterId: number;
  creditsCost: number;
}

// Cycle Limit
export interface CycleLimit {
  id: number;
  productionCycleId: number;
  planType: PlanType | 'global';
  characterLimit: number;
}
