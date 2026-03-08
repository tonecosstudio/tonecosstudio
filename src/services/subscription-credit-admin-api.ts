/**
 * Admin API Service for Subscription Credit System
 * Uses Supabase directly instead of external API
 */

import { supabase } from '@/integrations/supabase/client';
import {
  Subscription,
  Character,
  ProductionCycle,
  OrderWithItems,
} from '@/types/subscription-credit-system';

interface DashboardMetrics {
  subscriptions: {
    total: number;
    active: number;
    expired: number;
    cancelled: number;
    byPlan: Array<{ planType: string; count: number }>;
  };
  credits: {
    totalAllocated: number;
    totalUsed: number;
    totalAvailable: number;
    totalExpired: number;
  };
  productionCycles: {
    open: number;
    closed: number;
    current: {
      id: string;
      name: string;
      capacityUsed: number;
      capacityLimit: number;
      capacityPercentage: number;
      closeDate: string;
    } | null;
  };
  orders: {
    total: number;
    byType: Array<{ type: string; count: number }>;
    byStatus: Array<{ status: string; count: number }>;
  };
  characters: {
    total: number;
    active: number;
    exclusive: number;
  };
  revenue: {
    estimatedMonthly: number;
    currency: string;
  };
}

interface SubscriptionWithUser extends Subscription {
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  plan: {
    name: string;
    price: number;
    baseCredits: number;
    bonusCredits: number;
  };
}

interface CycleStatistics {
  cycle: ProductionCycle;
  statistics: {
    totalOrders: number;
    confirmedOrders: number;
    pendingOrders: number;
    totalCredits: number;
    ordersByType: Array<{ type: string; count: number }>;
    capacityUsed: number;
    capacityLimit: number;
    capacityPercentage: number;
  };
}

class SubscriptionCreditAdminAPI {
  // ============ Dashboard ============

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    // Get subscriptions metrics
    const { data: subscriptions, error: subError } = await supabase
      .from('subscription_credit_subscriptions')
      .select('status, plan_type');

    if (subError) throw subError;

    const total = subscriptions?.length || 0;
    const active = subscriptions?.filter(s => s.status === 'active').length || 0;
    const expired = subscriptions?.filter(s => s.status === 'expired').length || 0;
    const cancelled = subscriptions?.filter(s => s.status === 'cancelled').length || 0;

    const byPlan = [
      { planType: 'trimestral', count: subscriptions?.filter(s => s.plan_type === 'trimestral').length || 0 },
      { planType: 'semestral', count: subscriptions?.filter(s => s.plan_type === 'semestral').length || 0 },
    ];

    // Get credits metrics
    const { data: credits, error: creditsError } = await supabase
      .from('subscription_credit_user_credits')
      .select('total_credits, used_credits, available_credits, expired_credits');

    if (creditsError) throw creditsError;

    const totalAllocated = credits?.reduce((sum, c) => sum + c.total_credits, 0) || 0;
    const totalUsed = credits?.reduce((sum, c) => sum + c.used_credits, 0) || 0;
    const totalAvailable = credits?.reduce((sum, c) => sum + c.available_credits, 0) || 0;
    const totalExpired = credits?.reduce((sum, c) => sum + c.expired_credits, 0) || 0;

    // Get production cycles metrics
    const { data: cycles, error: cyclesError } = await supabase
      .from('subscription_credit_production_cycles')
      .select('*')
      .order('created_at', { ascending: false });

    if (cyclesError) throw cyclesError;

    const openCycles = cycles?.filter(c => c.status === 'open').length || 0;
    const closedCycles = cycles?.filter(c => c.status === 'closed').length || 0;
    const currentCycle = cycles?.find(c => c.status === 'open');

    // Get orders metrics
    const { data: orders, error: ordersError } = await supabase
      .from('subscription_credit_orders')
      .select('order_type, status');

    if (ordersError) throw ordersError;

    const totalOrders = orders?.length || 0;
    const byType = [
      { type: 'individual', count: orders?.filter(o => o.order_type === 'individual').length || 0 },
      { type: 'automatic', count: orders?.filter(o => o.order_type === 'automatic').length || 0 },
    ];
    const byStatus = [
      { status: 'pending', count: orders?.filter(o => o.status === 'pending').length || 0 },
      { status: 'confirmed', count: orders?.filter(o => o.status === 'confirmed').length || 0 },
      { status: 'in_production', count: orders?.filter(o => o.status === 'in_production').length || 0 },
      { status: 'shipped', count: orders?.filter(o => o.status === 'shipped').length || 0 },
    ];

    // Get characters metrics
    const { data: characters, error: charsError } = await supabase
      .from('subscription_credit_characters')
      .select('is_active, is_exclusive_semestral');

    if (charsError) throw charsError;

    const totalChars = characters?.length || 0;
    const activeChars = characters?.filter(c => c.is_active).length || 0;
    const exclusiveChars = characters?.filter(c => c.is_exclusive_semestral).length || 0;

    // Calculate estimated monthly revenue
    const { data: plans, error: plansError } = await supabase
      .from('subscription_credit_plans')
      .select('plan_type, price');

    if (plansError) throw plansError;

    const trimestralPrice = plans?.find(p => p.plan_type === 'trimestral')?.price || 0;
    const semestralPrice = plans?.find(p => p.plan_type === 'semestral')?.price || 0;
    const trimestralCount = byPlan.find(p => p.planType === 'trimestral')?.count || 0;
    const semestralCount = byPlan.find(p => p.planType === 'semestral')?.count || 0;
    const estimatedMonthly = (trimestralPrice * trimestralCount) + (semestralPrice * semestralCount);

    return {
      subscriptions: {
        total,
        active,
        expired,
        cancelled,
        byPlan,
      },
      credits: {
        totalAllocated,
        totalUsed,
        totalAvailable,
        totalExpired,
      },
      productionCycles: {
        open: openCycles,
        closed: closedCycles,
        current: currentCycle ? {
          id: currentCycle.id,
          name: currentCycle.name,
          capacityUsed: currentCycle.current_count,
          capacityLimit: currentCycle.capacity_limit,
          capacityPercentage: (currentCycle.current_count / currentCycle.capacity_limit) * 100,
          closeDate: currentCycle.close_date,
        } : null,
      },
      orders: {
        total: totalOrders,
        byType,
        byStatus,
      },
      characters: {
        total: totalChars,
        active: activeChars,
        exclusive: exclusiveChars,
      },
      revenue: {
        estimatedMonthly,
        currency: 'BRL',
      },
    };
  }

  // ============ Subscriptions ============

  async getSubscriptions(
    page: number = 1,
    limit: number = 20,
    status?: string,
    planType?: string
  ): Promise<{
    subscriptions: SubscriptionWithUser[];
    pagination: any;
  }> {
    const offset = (page - 1) * limit;

    let query = supabase
      .from('subscription_credit_subscriptions')
      .select(`
        *,
        plan:subscription_credit_plans(*)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (planType) {
      query = query.eq('plan_type', planType);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    // Get user emails separately (auth.users não pode ser acessado via REST API)
    const subscriptionsWithUsers = await Promise.all(
      (data || []).map(async (sub) => {
        const { data: userData } = await supabase.auth.admin.getUserById(sub.user_id);
        return {
          ...sub,
          user: {
            id: sub.user_id,
            email: userData?.user?.email || 'N/A',
            name: null,
          },
        };
      })
    );

    return {
      subscriptions: subscriptionsWithUsers as any[],
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
      },
    };
  }

  async adjustCredits(
    subscriptionId: string,
    amount: number,
    reason: string
  ): Promise<void> {
    // Get subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscription_credit_subscriptions')
      .select('user_id')
      .eq('id', subscriptionId)
      .single();

    if (subError) throw subError;

    // Get current credits
    const { data: credits, error: creditsError } = await supabase
      .from('subscription_credit_user_credits')
      .select('*')
      .eq('user_id', subscription.user_id)
      .single();

    if (creditsError) throw creditsError;

    // Update credits
    const newTotal = credits.total_credits + amount;
    const newAvailable = credits.available_credits + amount;

    await supabase
      .from('subscription_credit_user_credits')
      .update({
        total_credits: newTotal,
        available_credits: newAvailable,
      })
      .eq('user_id', subscription.user_id);

    // Log transaction
    await supabase
      .from('subscription_credit_transactions')
      .insert({
        user_id: subscription.user_id,
        subscription_id: subscriptionId,
        transaction_type: 'adjustment',
        credits_amount: amount,
        description: reason,
      });
  }

  // ============ Characters ============

  async createCharacter(data: {
    name: string;
    description?: string;
    priceCash: number;
    priceCredits: number;
    isExclusiveSemestral?: boolean;
    isStandardCollection?: boolean;
    imageUrl?: string;
  }): Promise<Character> {
    const { data: character, error } = await supabase
      .from('subscription_credit_characters')
      .insert({
        name: data.name,
        description: data.description,
        price_cash: data.priceCash,
        price_credits: data.priceCredits,
        is_exclusive_semestral: data.isExclusiveSemestral || false,
        is_standard_collection: data.isStandardCollection || false,
        image_url: data.imageUrl,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return character as any;
  }

  async updateCharacter(
    id: string,
    data: {
      name?: string;
      description?: string;
      priceCash?: number;
      priceCredits?: number;
      isExclusiveSemestral?: boolean;
      isStandardCollection?: boolean;
      isActive?: boolean;
      imageUrl?: string;
    }
  ): Promise<Character> {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.priceCash !== undefined) updateData.price_cash = data.priceCash;
    if (data.priceCredits !== undefined) updateData.price_credits = data.priceCredits;
    if (data.isExclusiveSemestral !== undefined) updateData.is_exclusive_semestral = data.isExclusiveSemestral;
    if (data.isStandardCollection !== undefined) updateData.is_standard_collection = data.isStandardCollection;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;
    if (data.imageUrl !== undefined) updateData.image_url = data.imageUrl;

    const { data: character, error } = await supabase
      .from('subscription_credit_characters')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return character as any;
  }

  async deactivateCharacter(id: string): Promise<Character> {
    const { data: character, error } = await supabase
      .from('subscription_credit_characters')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return character as any;
  }

  // ============ Production Cycles ============

  async createProductionCycle(data: {
    name: string;
    capacityLimit: number;
    closeDate: string;
  }): Promise<ProductionCycle> {
    const { data: cycle, error } = await supabase
      .from('subscription_credit_production_cycles')
      .insert({
        name: data.name,
        capacity_limit: data.capacityLimit,
        close_date: data.closeDate,
        status: 'open',
        current_count: 0,
      })
      .select()
      .single();

    if (error) throw error;

    return cycle as any;
  }

  async closeProductionCycle(id: string): Promise<{
    cycleId: string;
    confirmedOrders: number;
    pendingOrders: number;
    totalCreditsDebited: number;
  }> {
    // Get all automatic orders for this cycle
    const { data: orders, error: ordersError } = await supabase
      .from('subscription_credit_orders')
      .select('*, items:subscription_credit_order_items(*)')
      .eq('production_cycle_id', id)
      .eq('order_type', 'automatic')
      .eq('credits_debited', false);

    if (ordersError) throw ordersError;

    let totalCreditsDebited = 0;
    let confirmedOrders = 0;
    let pendingOrders = 0;

    // Process each order
    for (const order of orders || []) {
      // Debit credits
      const { data: credits, error: creditsError } = await supabase
        .from('subscription_credit_user_credits')
        .select('*')
        .eq('user_id', order.user_id)
        .single();

      if (creditsError) continue;

      if (credits.available_credits >= order.total_credits) {
        // Sufficient credits - confirm order
        await supabase
          .from('subscription_credit_user_credits')
          .update({
            used_credits: credits.used_credits + order.total_credits,
            available_credits: credits.available_credits - order.total_credits,
          })
          .eq('user_id', order.user_id);

        await supabase
          .from('subscription_credit_orders')
          .update({
            credits_debited: true,
            status: 'confirmed',
            is_locked: true,
          })
          .eq('id', order.id);

        // Log transaction
        await supabase
          .from('subscription_credit_transactions')
          .insert({
            user_id: order.user_id,
            subscription_id: order.subscription_id,
            transaction_type: 'debit_cycle_close',
            credits_amount: -order.total_credits,
            order_id: order.id,
            production_cycle_id: id,
            description: `Débito no fechamento do ciclo - ${order.total_credits} créditos`,
          });

        totalCreditsDebited += order.total_credits;
        confirmedOrders++;
      } else {
        // Insufficient credits - cancel order
        await supabase
          .from('subscription_credit_orders')
          .update({
            status: 'cancelled',
            is_locked: true,
          })
          .eq('id', order.id);

        pendingOrders++;
      }
    }

    // Close cycle
    await supabase
      .from('subscription_credit_production_cycles')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
      })
      .eq('id', id);

    return {
      cycleId: id,
      confirmedOrders,
      pendingOrders,
      totalCreditsDebited,
    };
  }

  async getCycleStatistics(id: string): Promise<CycleStatistics> {
    // Get cycle
    const { data: cycle, error: cycleError } = await supabase
      .from('subscription_credit_production_cycles')
      .select('*')
      .eq('id', id)
      .single();

    if (cycleError) throw cycleError;

    // Get orders
    const { data: orders, error: ordersError } = await supabase
      .from('subscription_credit_orders')
      .select('*')
      .eq('production_cycle_id', id);

    if (ordersError) throw ordersError;

    const totalOrders = orders?.length || 0;
    const confirmedOrders = orders?.filter(o => o.status === 'confirmed').length || 0;
    const pendingOrders = orders?.filter(o => o.status === 'pending').length || 0;
    const totalCredits = orders?.reduce((sum, o) => sum + o.total_credits, 0) || 0;

    const ordersByType = [
      { type: 'individual', count: orders?.filter(o => o.order_type === 'individual').length || 0 },
      { type: 'automatic', count: orders?.filter(o => o.order_type === 'automatic').length || 0 },
    ];

    return {
      cycle: cycle as any,
      statistics: {
        totalOrders,
        confirmedOrders,
        pendingOrders,
        totalCredits,
        ordersByType,
        capacityUsed: cycle.current_count,
        capacityLimit: cycle.capacity_limit,
        capacityPercentage: (cycle.current_count / cycle.capacity_limit) * 100,
      },
    };
  }
}

// Export singleton instance
export const subscriptionCreditAdminAPI = new SubscriptionCreditAdminAPI();
