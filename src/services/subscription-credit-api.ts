/**
 * API Service for Subscription Credit System
 * Uses Supabase directly instead of external API
 */

import { supabase } from '@/integrations/supabase/client';
import {
  Subscription,
  Character,
  ProductionCycle,
  OrderWithItems,
  CreditsBalanceResponse,
  TransactionsResponse,
  SubscriptionActivationResponse,
  PlanChangeResponse,
  CancelWithRefundResponse,
  NoRenewalResponse,
  UserCycleCountResponse,
  PlanType,
} from '@/types/subscription-credit-system';

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

class SubscriptionCreditAPI {
  private async getCurrentUserId(): Promise<string> {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      throw new Error('User not authenticated');
    }
    return user.id;
  }

  // ============ Subscriptions ============

  async getMySubscription(): Promise<Subscription | null> {
    const userId = await this.getCurrentUserId();
    
    const { data, error } = await supabase
      .from('subscription_credit_subscriptions')
      .select('*, plan:subscription_credit_plans(*)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows returned
      throw error;
    }

    return data as Subscription;
  }

  async activateSubscription(
    planType: PlanType,
    _paymentMethodId: string
  ): Promise<SubscriptionActivationResponse> {
    const userId = await this.getCurrentUserId();
    
    // Get plan details
    const { data: plan, error: planError } = await supabase
      .from('subscription_credit_plans')
      .select('*')
      .eq('plan_type', planType)
      .eq('is_active', true)
      .single();

    if (planError) throw planError;

    // Calculate dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + plan.duration_months);

    // Create subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscription_credit_subscriptions')
      .insert({
        user_id: userId,
        plan_id: plan.id,
        plan_type: planType,
        status: 'active',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        next_billing_date: endDate.toISOString(),
        auto_renew: true,
      })
      .select()
      .single();

    if (subError) throw subError;

    // Allocate credits
    const totalCredits = plan.base_credits + plan.bonus_credits;
    const { error: creditsError } = await supabase
      .from('subscription_credit_user_credits')
      .insert({
        user_id: userId,
        subscription_id: subscription.id,
        total_credits: totalCredits,
        used_credits: 0,
        available_credits: totalCredits,
        expired_credits: 0,
      });

    if (creditsError) throw creditsError;

    // Log transaction
    await supabase
      .from('subscription_credit_transactions')
      .insert({
        user_id: userId,
        subscription_id: subscription.id,
        transaction_type: 'allocation',
        credits_amount: totalCredits,
        description: `Créditos alocados - Plano ${planType}`,
      });

    return {
      subscription_id: subscription.id,
      credits_allocated: totalCredits,
      message: 'Assinatura ativada com sucesso',
    };
  }

  async schedulePlanChange(
    subscriptionId: string,
    newPlanType: PlanType
  ): Promise<PlanChangeResponse> {
    const { error } = await supabase
      .from('subscription_credit_subscriptions')
      .update({ pending_plan_change: newPlanType })
      .eq('id', subscriptionId)
      .select()
      .single();

    if (error) throw error;

    return {
      subscription_id: subscriptionId,
      pending_plan_change: newPlanType,
      message: 'Mudança de plano agendada para próxima renovação',
    };
  }

  async cancelWithRefund(subscriptionId: string): Promise<CancelWithRefundResponse> {
    const { error } = await supabase
      .from('subscription_credit_subscriptions')
      .update({
        status: 'cancelled',
        cancellation_type: 'with_refund',
        cancelled_at: new Date().toISOString(),
        auto_renew: false,
      })
      .eq('id', subscriptionId)
      .select()
      .single();

    if (error) throw error;

    return {
      subscription_id: subscriptionId,
      refund_amount: 0, // Calculate based on remaining days
      message: 'Assinatura cancelada com reembolso',
    };
  }

  async setNoRenewal(subscriptionId: string): Promise<NoRenewalResponse> {
    const { data, error } = await supabase
      .from('subscription_credit_subscriptions')
      .update({
        auto_renew: false,
        cancellation_type: 'no_renewal',
      })
      .eq('id', subscriptionId)
      .select()
      .single();

    if (error) throw error;

    return {
      subscription_id: subscriptionId,
      end_date: data.end_date,
      message: 'Renovação automática desativada',
    };
  }

  // ============ Credits ============

  async getCreditsBalance(): Promise<CreditsBalanceResponse> {
    const userId = await this.getCurrentUserId();
    
    const { data, error } = await supabase
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
        };
      }
      throw error;
    }

    return {
      total_credits: data.total_credits,
      used_credits: data.used_credits,
      available_credits: data.available_credits,
      expired_credits: data.expired_credits,
    };
  }

  async getCreditTransactions(
    page: number = 1,
    limit: number = 20,
    transactionType?: string
  ): Promise<TransactionsResponse> {
    const userId = await this.getCurrentUserId();
    const offset = (page - 1) * limit;

    let query = supabase
      .from('subscription_credit_transactions')
      .select('*, character:subscription_credit_characters(*)', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (transactionType) {
      query = query.eq('transaction_type', transactionType);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      transactions: data as TransactionsResponse['transactions'],
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
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

    let query = supabase
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
    const { data, error } = await supabase
      .from('subscription_credit_characters')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    return data as Character;
  }

  async getStandardCollection(): Promise<{ characters: Character[] }> {
    const { data, error } = await supabase
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
    const userId = await this.getCurrentUserId();
    
    // Get current cycle
    const { data: cycle, error: cycleError } = await supabase
      .from('subscription_credit_production_cycles')
      .select('*')
      .eq('status', 'open')
      .order('close_date', { ascending: true })
      .limit(1)
      .single();

    if (cycleError) throw new Error('Nenhum ciclo de produção aberto');

    // Get character
    const { data: character, error: charError } = await supabase
      .from('subscription_credit_characters')
      .select('*')
      .eq('id', characterId)
      .single();

    if (charError) throw charError;

    // Get subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscription_credit_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (subError) throw new Error('Assinatura não encontrada');

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('subscription_credit_orders')
      .insert({
        user_id: userId,
        subscription_id: subscription.id,
        production_cycle_id: cycle.id,
        order_type: 'individual',
        status: 'pending',
        total_credits: character.price_credits,
        credits_debited: true,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Add order item
    await supabase
      .from('subscription_credit_order_items')
      .insert({
        order_id: order.id,
        character_id: characterId,
        credits_cost: character.price_credits,
      });

    // Debit credits
    const { data: credits, error: creditsError } = await supabase
      .from('subscription_credit_user_credits')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (creditsError) throw creditsError;

    await supabase
      .from('subscription_credit_user_credits')
      .update({
        used_credits: credits.used_credits + character.price_credits,
        available_credits: credits.available_credits - character.price_credits,
      })
      .eq('user_id', userId);

    // Log transaction
    await supabase
      .from('subscription_credit_transactions')
      .insert({
        user_id: userId,
        subscription_id: subscription.id,
        transaction_type: 'debit_immediate',
        credits_amount: -character.price_credits,
        character_id: characterId,
        order_id: order.id,
        production_cycle_id: cycle.id,
        description: `Compra individual - ${character.name}`,
      });

    return {
      order_id: order.id,
      credits_debited: character.price_credits,
      production_cycle_id: cycle.id,
    };
  }

  async getAutomaticOrder(orderId: string): Promise<{
    order_id: string;
    characters: Character[];
    total_credits: number;
    is_locked: boolean;
    cycle_close_date: string;
  }> {
    const { data: order, error: orderError } = await supabase
      .from('subscription_credit_orders')
      .select('*, items:subscription_credit_order_items(*, character:subscription_credit_characters(*)), cycle:subscription_credit_production_cycles(*)')
      .eq('id', orderId)
      .single();

    if (orderError) throw orderError;

    return {
      order_id: order.id,
      characters: (order as AutomaticOrderRow).items.map((item) => item.character),
      total_credits: order.total_credits,
      is_locked: order.is_locked,
      cycle_close_date: (order as AutomaticOrderRow).cycle.close_date,
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
    // Delete existing items
    await supabase
      .from('subscription_credit_order_items')
      .delete()
      .eq('order_id', orderId);

    // Get characters
    const { data: characters, error: charError } = await supabase
      .from('subscription_credit_characters')
      .select('*')
      .in('id', characterIds);

    if (charError) throw charError;

    // Add new items
    const items = characters.map(char => ({
      order_id: orderId,
      character_id: char.id,
      credits_cost: char.price_credits,
    }));

    await supabase
      .from('subscription_credit_order_items')
      .insert(items);

    // Update order total
    const totalCredits = characters.reduce((sum, char) => sum + char.price_credits, 0);
    await supabase
      .from('subscription_credit_orders')
      .update({ total_credits: totalCredits })
      .eq('id', orderId);

    return {
      order_id: orderId,
      characters: characters as Character[],
      total_credits: totalCredits,
    };
  }

  async getUserOrders(): Promise<{ orders: OrderWithItems[] }> {
    const userId = await this.getCurrentUserId();
    
    const { data, error } = await supabase
      .from('subscription_credit_orders')
      .select('*, items:subscription_credit_order_items(*, character:subscription_credit_characters(*)), cycle:subscription_credit_production_cycles(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { orders: data as OrderWithItems[] };
  }

  async getUserCycleCount(): Promise<UserCycleCountResponse> {
    const userId = await this.getCurrentUserId();
    
    const { count, error } = await supabase
      .from('subscription_credit_orders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) throw error;

    return { cycle_count: count || 0 };
  }

  // ============ Production Cycles ============

  async getCurrentCycle(): Promise<ProductionCycle> {
    const { data, error } = await supabase
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
    const { data, error } = await supabase
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
    const offset = (page - 1) * limit;

    let query = supabase
      .from('subscription_credit_orders')
      .select('*, items:subscription_credit_order_items(*, character:subscription_credit_characters(*)), user:auth.users(email)', { count: 'exact' })
      .eq('production_cycle_id', cycleId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (priorityOnly) {
      query = query.eq('is_priority', true);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      orders: data as OrderWithItems[],
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
