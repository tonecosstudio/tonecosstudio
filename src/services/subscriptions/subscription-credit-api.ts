/**
 * API Service for Subscription Credit System
 * Uses Supabase directly instead of external API
 */

import {
  subscriptionCreditSupabase,
  type SubscriptionCreditSubscriptionRow,
  type SubscriptionCreditTransactionRow,
} from '@/services/subscriptions/subscription-credit-supabase';
import { requireAuthenticatedUserId } from "@/services/auth/current-user";
import {
  type Subscription,
  type Character,
  type CreditTransaction,
  type ProductionCycle,
  type OrderWithItems,
  type CreditsBalanceResponse,
  type TransactionsResponse,
  type UserCycleCountResponse,
  type PlanType,
  isSubscriptionCreditPlanType,
  isSubscriptionCreditSubscriptionStatus,
  isSubscriptionCreditTransactionType,
} from '@/types/subscription-credit-system';

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

function toSubscription(row: SubscriptionCreditSubscriptionRow): Subscription {
  if (!isSubscriptionCreditPlanType(row.plan_type)) {
    throw new Error(`Invalid subscription credit plan type: ${row.plan_type}`);
  }

  if (!isSubscriptionCreditSubscriptionStatus(row.status)) {
    throw new Error(`Invalid subscription credit status: ${row.status}`);
  }

  if (
    row.pending_plan_change !== null &&
    !isSubscriptionCreditPlanType(row.pending_plan_change)
  ) {
    throw new Error(`Invalid pending subscription credit plan: ${row.pending_plan_change}`);
  }

  if (
    row.cancellation_type !== null &&
    row.cancellation_type !== 'with_refund' &&
    row.cancellation_type !== 'no_renewal'
  ) {
    throw new Error(`Invalid subscription credit cancellation type: ${row.cancellation_type}`);
  }

  return {
    id: row.id,
    user_id: row.user_id,
    plan_type: row.plan_type,
    status: row.status,
    start_date: row.start_date,
    end_date: row.end_date,
    next_billing_date: row.next_billing_date,
    auto_renew: row.auto_renew,
    pending_plan_change: row.pending_plan_change,
    created_at: row.created_at,
    updated_at: row.updated_at,
    cancelled_at: row.cancelled_at,
    cancellation_type: row.cancellation_type,
  };
}

function toCreditTransaction(row: SubscriptionCreditTransactionRow): CreditTransaction {
  if (!isSubscriptionCreditTransactionType(row.transaction_type)) {
    throw new Error(`Invalid subscription credit transaction type: ${row.transaction_type}`);
  }

  return {
    id: row.id,
    user_id: row.user_id,
    subscription_id: row.subscription_id,
    transaction_type: row.transaction_type,
    credits_amount: row.credits_amount,
    character_id: row.character_id,
    order_id: row.order_id,
    production_cycle_id: row.production_cycle_id,
    description: row.description,
    created_at: row.created_at,
  };
}

class SubscriptionCreditAPI {
  private async getCurrentUserId(): Promise<string> {
    return requireAuthenticatedUserId();
  }

  // ============ Subscriptions ============

  async getMySubscription(): Promise<Subscription | null> {
    const userId = await this.getCurrentUserId();

    const { data, error } = await subscriptionCreditSupabase
      .from('subscription_credit_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) throw error;
    return data ? toSubscription(data) : null;
  }

  // ============ Credits ============

  async getCreditsBalance(): Promise<CreditsBalanceResponse> {
    const userId = await this.getCurrentUserId();

    const { data: subscription, error: subscriptionError } = await subscriptionCreditSupabase
      .from('subscription_credit_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (subscriptionError) throw subscriptionError;

    if (!subscription) {
      return {
        total_credits: 0,
        used_credits: 0,
        available_credits: 0,
        expired_credits: 0,
        subscription_status: 'cancelled',
      };
    }

    const { data, error } = await subscriptionCreditSupabase
      .from('subscription_credit_user_credits')
      .select('total_credits, used_credits, available_credits, expired_credits')
      .eq('user_id', userId)
      .eq('subscription_id', subscription.id)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return {
        total_credits: 0,
        used_credits: 0,
        available_credits: 0,
        expired_credits: 0,
        subscription_status: 'active',
      };
    }

    return {
      total_credits: data.total_credits,
      used_credits: data.used_credits,
      available_credits: data.available_credits,
      expired_credits: data.expired_credits,
      subscription_status: 'active',
    };
  }

  async getCreditTransactions(
    page: number = 1,
    limit: number = 20,
    transactionType?: string
  ): Promise<TransactionsResponse> {
    const userId = await this.getCurrentUserId();
    const offset = (page - 1) * limit;

    let query = subscriptionCreditSupabase
      .from('subscription_credit_transactions')
      .select(
        'id,user_id,subscription_id,transaction_type,credits_amount,character_id,order_id,production_cycle_id,description,created_at',
        { count: 'exact' },
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (transactionType) {
      if (!isSubscriptionCreditTransactionType(transactionType)) {
        throw new Error(`Invalid credit transaction type filter: ${transactionType}`);
      }
      query = query.eq('transaction_type', transactionType);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      transactions: (data ?? []).map(toCreditTransaction),
      pagination: {
        current_page: page,
        per_page: limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
        has_next: page < Math.ceil((count || 0) / limit),
        has_prev: page > 1,
      },
    };
  }

  async validateCredits(creditsRequired: number): Promise<{
    has_sufficient_credits: boolean;
    available_credits: number;
    shortfall: number;
  }> {
    const balance = await this.getCreditsBalance();
    const hasSufficient = balance.available_credits >= creditsRequired;
    const shortfall = hasSufficient ? 0 : creditsRequired - balance.available_credits;

    return {
      has_sufficient_credits: hasSufficient,
      available_credits: balance.available_credits,
      shortfall,
    };
  }

  // ============ Characters ============

  async getCharacters(
    page: number = 1,
    limit: number = 20,
    planType?: PlanType
  ): Promise<{
    characters: Character[];
    pagination: PaginationMeta;
  }> {
    const offset = (page - 1) * limit;

    let query = subscriptionCreditSupabase
      .from('subscription_credit_characters')
      .select('*', { count: 'exact' })
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (planType === 'trimestral') {
      query = query.eq('is_exclusive_semestral', false);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      characters: data as Character[],
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
      },
    };
  }

  async getCharacterById(id: string): Promise<Character> {
    const { data, error } = await subscriptionCreditSupabase
      .from('subscription_credit_characters')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    return data as Character;
  }

  async getStandardCollection(): Promise<{ characters: Character[] }> {
    const { data, error } = await subscriptionCreditSupabase
      .from('subscription_credit_characters')
      .select('*')
      .eq('is_standard_collection', true)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;

    return { characters: data as Character[] };
  }

  // ============ Orders ============

  async getUserOrders(): Promise<{ orders: OrderWithItems[] }> {
    const userId = await this.getCurrentUserId();

    const { data, error } = await subscriptionCreditSupabase
      .from('subscription_credit_orders')
      .select('*, items:subscription_credit_order_items(*, character:subscription_credit_characters(*)), cycle:subscription_credit_production_cycles(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { orders: data as unknown as OrderWithItems[] };
  }

  async getUserCycleCount(): Promise<UserCycleCountResponse> {
    const userId = await this.getCurrentUserId();

    const { count, error } = await subscriptionCreditSupabase
      .from('subscription_credit_orders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) throw error;

    return { cycle_count: count || 0 };
  }

  // ============ Production Cycles ============

  async getCurrentCycle(): Promise<ProductionCycle> {
    const { data, error } = await subscriptionCreditSupabase
      .from('subscription_credit_production_cycles')
      .select('*')
      .eq('status', 'open')
      .order('close_date', { ascending: true })
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      throw new Error('Nenhum ciclo de produção aberto encontrado');
    }

    return data as ProductionCycle;
  }

  async getCycleById(id: string): Promise<ProductionCycle> {
    const { data, error } = await subscriptionCreditSupabase
      .from('subscription_credit_production_cycles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    return data as ProductionCycle;
  }

  async getCycleOrders(
    cycleId: string,
    page: number = 1,
    limit: number = 20,
    priorityOnly: boolean = false
  ): Promise<{
    orders: OrderWithItems[];
    pagination: PaginationMeta;
  }> {
    const userId = await this.getCurrentUserId();
    const offset = (page - 1) * limit;

    let query = subscriptionCreditSupabase
      .from('subscription_credit_orders')
      .select('*, items:subscription_credit_order_items(*, character:subscription_credit_characters(*))', { count: 'exact' })
      .eq('production_cycle_id', cycleId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (priorityOnly) {
      query = query.eq('is_priority', true);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      orders: data as unknown as OrderWithItems[],
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
      },
    };
  }
}

export const subscriptionCreditAPI = new SubscriptionCreditAPI();
