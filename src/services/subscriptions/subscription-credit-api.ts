/**
 * API Service for Subscription Credit System
 * Uses Supabase directly instead of external API
 */

import {
  subscriptionCreditSupabase,
  type SubscriptionCreditSubscriptionRow,
  type SubscriptionCreditTransactionRow,
  type SubscriptionCreditUserCreditsRow,
} from '@/services/subscriptions/subscription-credit-supabase';
import { requireAuthenticatedUserId } from "@/services/auth/current-user";
import {
  Subscription,
  Character,
  ProductionCycle,
  OrderWithItems,
  CreditsBalanceResponse,
  TransactionsResponse,
  PlanChangeResponse,
  CancelWithRefundResponse,
  NoRenewalResponse,
  UserCycleCountResponse,
  PlanType,
  isSubscriptionCreditTransactionType,
} from '@/types/subscription-credit-system';
import {
  cancelSubscriptionCreditWithRefundRpc,
  createSubscriptionCreditIndividualOrderRpc,
  reactivateSubscriptionCreditRenewalRpc,
  scheduleSubscriptionCreditPlanChangeRpc,
  setSubscriptionCreditNoRenewalRpc,
  updateSubscriptionCreditAutomaticOrderRpc,
} from '@/services/subscriptions/subscription-credit-mutations-service';

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

interface AutomaticOrderItem {
  character: Character;
}

interface AutomaticOrderRow {
  id: string;
  items: AutomaticOrderItem[];
  total_credits: number;
  is_locked: boolean;
  cycle: {
    close_date: string;
  };
}

type SubscriptionStatusRow = Pick<SubscriptionCreditSubscriptionRow, 'status'>;

class SubscriptionCreditAPI {
  private async getCurrentUserId(): Promise<string> {
    return requireAuthenticatedUserId();
  }

  // ============ Subscriptions ============

  async getMySubscription(): Promise<Subscription | null> {
    const userId = await this.getCurrentUserId();
    
    const { data, error } = await subscriptionCreditSupabase
      .from('subscription_credit_subscriptions')
      .select('*, plan:subscription_credit_plans(*)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows returned
      throw error;
    }

    return data as unknown as Subscription;
  }

  async schedulePlanChange(
    subscriptionId: string,
    newPlanType: PlanType
  ): Promise<PlanChangeResponse> {
    return scheduleSubscriptionCreditPlanChangeRpc(subscriptionId, newPlanType);
  }

  async cancelWithRefund(subscriptionId: string): Promise<CancelWithRefundResponse> {
    return cancelSubscriptionCreditWithRefundRpc(subscriptionId);
  }

  async setNoRenewal(subscriptionId: string): Promise<NoRenewalResponse> {
    return setSubscriptionCreditNoRenewalRpc(subscriptionId);
  }

  async reactivateRenewal(subscriptionId: string): Promise<NoRenewalResponse> {
    return reactivateSubscriptionCreditRenewalRpc(subscriptionId);
  }

  // ============ Credits ============

  async getCreditsBalance(): Promise<CreditsBalanceResponse> {
    const userId = await this.getCurrentUserId();
    
    const { data: subscription, error: subscriptionError } = await subscriptionCreditSupabase
      .from('subscription_credit_subscriptions')
      .select('status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (subscriptionError) throw subscriptionError;

    const subscriptionStatus =
      (subscription as unknown as SubscriptionStatusRow | null)?.status ?? 'cancelled';

    const { data, error } = await subscriptionCreditSupabase
      .from('subscription_credit_user_credits')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          total_credits: 0,
          used_credits: 0,
          available_credits: 0,
          expired_credits: 0,
          subscription_status: subscriptionStatus,
        };
      }
      throw error;
    }

    const credits = data as unknown as SubscriptionCreditUserCreditsRow;

    return {
      total_credits: credits.total_credits,
      used_credits: credits.used_credits,
      available_credits: credits.available_credits,
      expired_credits: credits.expired_credits,
      subscription_status: subscriptionStatus,
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
      .select('*, character:subscription_credit_characters(*)', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (transactionType) {
      if (!isSubscriptionCreditTransactionType(transactionType)) {
        throw new Error(`Invalid credit transaction type filter: ${transactionType}`);
      }
      query = query.eq('transaction_type', transactionType);
    }

    if (error) throw error;

    const transactions = (data ?? []) as unknown as SubscriptionCreditTransactionRow[];

    return {
      transactions,
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

    // Filter by plan type if specified
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

  async createIndividualOrder(
    characterId: string,
    _useCredits: boolean = true
  ): Promise<{
    order_id: string;
    credits_debited: number;
    production_cycle_id: string;
  }> {
    return createSubscriptionCreditIndividualOrderRpc(characterId);
  }

  async getAutomaticOrder(orderId: string): Promise<{
    order_id: string;
    characters: Character[];
    total_credits: number;
    is_locked: boolean;
    cycle_close_date: string;
  }> {
    const userId = await this.getCurrentUserId();

    const { data: order, error: orderError } = await subscriptionCreditSupabase
      .from('subscription_credit_orders')
      .select('*, items:subscription_credit_order_items(*, character:subscription_credit_characters(*)), cycle:subscription_credit_production_cycles(*)')
      .eq('id', orderId)
      .eq('user_id', userId)
      .single();

    if (orderError) throw orderError;

    const automaticOrder = order as unknown as AutomaticOrderRow;

    return {
      order_id: automaticOrder.id,
      characters: automaticOrder.items.map((item) => item.character),
      total_credits: automaticOrder.total_credits,
      is_locked: automaticOrder.is_locked,
      cycle_close_date: automaticOrder.cycle.close_date,
    };
  }

  async updateAutomaticOrder(
    orderId: string,
    characterIds: string[]
  ): Promise<{
    order_id: string;
    characters: Character[];
    total_credits: number;
  }> {
    return updateSubscriptionCreditAutomaticOrderRpc(orderId, characterIds);
  }

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
      .maybeSingle(); // Usa maybeSingle em vez de single para não dar erro se não houver dados

    if (error) throw error;

    // Se não houver ciclo aberto, retorna null
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

// Export singleton instance
export const subscriptionCreditAPI = new SubscriptionCreditAPI();
