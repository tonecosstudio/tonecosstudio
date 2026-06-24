/**
 * Admin API Service for Subscription Credit System
 * Uses Supabase directly instead of external API
 */

import { supabase } from '@/integrations/supabase/client';
import { LOCALE } from '@/config/constants';
import {
  subscriptionCreditSupabase,
  type SubscriptionCreditCharacterRow,
  type SubscriptionCreditOrderRow,
  type SubscriptionCreditPlanRow,
  type SubscriptionCreditProductionCycleRow,
  type SubscriptionCreditSubscriptionRow,
  type SubscriptionCreditUserCreditsRow,
} from '@/services/subscriptions/subscription-credit-supabase';
import {
  Subscription,
  Character,
  ProductionCycle,
  isSubscriptionCreditPlanType,
  isSubscriptionCreditSubscriptionStatus,
} from '@/types/subscription-credit-system';
import {
  adjustSubscriptionCreditCreditsRpc,
  closeSubscriptionCreditProductionCycleRpc,
  createSubscriptionCreditCharacterRpc,
  createSubscriptionCreditProductionCycleRpc,
  deactivateSubscriptionCreditCharacterRpc,
  updateSubscriptionCreditCharacterRpc,
} from '@/services/subscriptions/subscription-credit-mutations-service';

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

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

type SubscriptionWithPlanRow = SubscriptionCreditSubscriptionRow & {
  plan: {
    name: string;
    price: number;
    base_credits: number;
    bonus_credits: number;
  } | null;
};

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

type SubscriptionMetricsRow = Pick<
  SubscriptionCreditSubscriptionRow,
  'status' | 'plan_type'
>;
type CreditMetricsRow = Pick<
  SubscriptionCreditUserCreditsRow,
  'total_credits' | 'used_credits' | 'available_credits' | 'expired_credits'
>;
type OrderMetricsRow = Pick<
  SubscriptionCreditOrderRow,
  'order_type' | 'status' | 'total_credits'
>;
type CharacterMetricsRow = Pick<
  SubscriptionCreditCharacterRow,
  'is_active' | 'is_exclusive_semestral'
>;
type PlanMetricsRow = Pick<SubscriptionCreditPlanRow, 'plan_type' | 'price'>;

function calculateCapacityPercentage(used: number, limit: number): number {
  return limit > 0 ? (used / limit) * 100 : 0;
}

class SubscriptionCreditAdminAPI {
  // ============ Dashboard ============

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    // Get subscriptions metrics
    const { data: subscriptions, error: subError } = await subscriptionCreditSupabase
      .from('subscription_credit_subscriptions')
      .select('status, plan_type');

    if (subError) throw subError;

    const subscriptionRows = (subscriptions ?? []) as unknown as SubscriptionMetricsRow[];

    const total = subscriptionRows.length;
    const active = subscriptionRows.filter(s => s.status === 'active').length;
    const expired = subscriptionRows.filter(s => s.status === 'expired').length;
    const cancelled = subscriptionRows.filter(s => s.status === 'cancelled').length;

    const byPlan = [
      { planType: 'trimestral', count: subscriptionRows.filter(s => s.plan_type === 'trimestral').length },
      { planType: 'semestral', count: subscriptionRows.filter(s => s.plan_type === 'semestral').length },
    ];

    // Get credits metrics
    const { data: credits, error: creditsError } = await subscriptionCreditSupabase
      .from('subscription_credit_user_credits')
      .select('total_credits, used_credits, available_credits, expired_credits');

    if (creditsError) throw creditsError;

    const creditRows = (credits ?? []) as unknown as CreditMetricsRow[];

    const totalAllocated = creditRows.reduce((sum, c) => sum + c.total_credits, 0);
    const totalUsed = creditRows.reduce((sum, c) => sum + c.used_credits, 0);
    const totalAvailable = creditRows.reduce((sum, c) => sum + c.available_credits, 0);
    const totalExpired = creditRows.reduce((sum, c) => sum + c.expired_credits, 0);

    // Get production cycles metrics
    const { data: cycles, error: cyclesError } = await subscriptionCreditSupabase
      .from('subscription_credit_production_cycles')
      .select('*')
      .order('created_at', { ascending: false });

    if (cyclesError) throw cyclesError;

    const cycleRows = (cycles ?? []) as unknown as SubscriptionCreditProductionCycleRow[];

    const openCycles = cycleRows.filter(c => c.status === 'open').length;
    const closedCycles = cycleRows.filter(c => c.status === 'closed').length;
    const currentCycle = cycleRows.find(c => c.status === 'open');

    // Get orders metrics
    const { data: orders, error: ordersError } = await subscriptionCreditSupabase
      .from('subscription_credit_orders')
      .select('order_type, status');

    if (ordersError) throw ordersError;

    const orderRows = (orders ?? []) as unknown as OrderMetricsRow[];

    const totalOrders = orderRows.length;
    const byType = [
      { type: 'individual', count: orderRows.filter(o => o.order_type === 'individual').length },
      { type: 'automatic', count: orderRows.filter(o => o.order_type === 'automatic').length },
    ];
    const byStatus = [
      { status: 'pending', count: orderRows.filter(o => o.status === 'pending').length },
      { status: 'confirmed', count: orderRows.filter(o => o.status === 'confirmed').length },
      { status: 'in_production', count: orderRows.filter(o => o.status === 'in_production').length },
      { status: 'shipped', count: orderRows.filter(o => o.status === 'shipped').length },
    ];

    // Get characters metrics
    const { data: characters, error: charsError } = await subscriptionCreditSupabase
      .from('subscription_credit_characters')
      .select('is_active, is_exclusive_semestral');

    if (charsError) throw charsError;

    const characterRows = (characters ?? []) as unknown as CharacterMetricsRow[];

    const totalChars = characterRows.length;
    const activeChars = characterRows.filter(c => c.is_active).length;
    const exclusiveChars = characterRows.filter(c => c.is_exclusive_semestral).length;

    // Calculate estimated monthly revenue
    const { data: plans, error: plansError } = await subscriptionCreditSupabase
      .from('subscription_credit_plans')
      .select('plan_type, price');

    if (plansError) throw plansError;

    const planRows = (plans ?? []) as unknown as PlanMetricsRow[];

    const trimestralPrice = planRows.find(p => p.plan_type === 'trimestral')?.price || 0;
    const semestralPrice = planRows.find(p => p.plan_type === 'semestral')?.price || 0;
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
          capacityPercentage: calculateCapacityPercentage(
            currentCycle.current_count,
            currentCycle.capacity_limit
          ),
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
        currency: LOCALE.CURRENCY,
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
    pagination: PaginationMeta;
  }> {
    const offset = (page - 1) * limit;

    let query = subscriptionCreditSupabase
      .from('subscription_credit_subscriptions')
      .select(`
        *,
        plan:subscription_credit_plans(*)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      if (!isSubscriptionCreditSubscriptionStatus(status)) {
        throw new Error(`Invalid subscription status filter: ${status}`);
      }
      query = query.eq('status', status);
    }

    if (planType) {
      if (!isSubscriptionCreditPlanType(planType)) {
        throw new Error(`Invalid subscription plan filter: ${planType}`);
      }
      query = query.eq('plan_type', planType);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    const subscriptionRows = (data ?? []) as unknown as SubscriptionWithPlanRow[];

    // Supabase Admin API is service-role only and must never run in the browser.
    // Admin users can read profiles through RLS, so use the public profile SSOT.
    const userIds = Array.from(
      new Set(subscriptionRows.map((sub) => String(sub.user_id)).filter(Boolean))
    );
    const { data: profiles, error: profilesError } = userIds.length
      ? await supabase
          .from('profiles')
          .select('id, email, full_name, display_name')
          .in('id', userIds)
      : { data: [], error: null };

    if (profilesError) throw profilesError;

    const profilesById = new Map(
      (profiles || []).map((profile) => [String(profile.id), profile])
    );

    const subscriptionsWithUsers = subscriptionRows.map((sub) => {
      const userId = String(sub.user_id);
      const profile = profilesById.get(userId);

      return {
        ...sub,
        plan: {
          name: sub.plan?.name ?? sub.plan_type,
          price: sub.plan?.price ?? 0,
          baseCredits: sub.plan?.base_credits ?? 0,
          bonusCredits: sub.plan?.bonus_credits ?? 0,
        },
        user: {
          id: userId,
          email: profile?.email || 'N/A',
          name: profile?.full_name || profile?.display_name || null,
        },
      };
    });

    return {
      subscriptions: subscriptionsWithUsers as SubscriptionWithUser[],
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
    await adjustSubscriptionCreditCreditsRpc(subscriptionId, amount, reason);
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
    return createSubscriptionCreditCharacterRpc(data);
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
    return updateSubscriptionCreditCharacterRpc(id, data);
  }

  async deactivateCharacter(id: string): Promise<Character> {
    return deactivateSubscriptionCreditCharacterRpc(id);
  }

  // ============ Production Cycles ============

  async createProductionCycle(data: {
    name: string;
    capacityLimit: number;
    closeDate: string;
  }): Promise<ProductionCycle> {
    return createSubscriptionCreditProductionCycleRpc(data);
  }

  async closeProductionCycle(id: string): Promise<{
    cycleId: string;
    confirmedOrders: number;
    pendingOrders: number;
    totalCreditsDebited: number;
  }> {
    return closeSubscriptionCreditProductionCycleRpc(id);
  }

  async getCycleStatistics(id: string): Promise<CycleStatistics> {
    // Get cycle
    const { data: cycle, error: cycleError } = await subscriptionCreditSupabase
      .from('subscription_credit_production_cycles')
      .select('*')
      .eq('id', id)
      .single();

    if (cycleError) throw cycleError;

    // Get orders
    const { data: orders, error: ordersError } = await subscriptionCreditSupabase
      .from('subscription_credit_orders')
      .select('*')
      .eq('production_cycle_id', id);

    if (ordersError) throw ordersError;

    const cycleRow = cycle as unknown as SubscriptionCreditProductionCycleRow;
    const orderRows = (orders ?? []) as unknown as SubscriptionCreditOrderRow[];

    const totalOrders = orderRows.length;
    const confirmedOrders = orderRows.filter(o => o.status === 'confirmed').length;
    const pendingOrders = orderRows.filter(o => o.status === 'pending').length;
    const totalCredits = orderRows.reduce((sum, o) => sum + o.total_credits, 0);

    const ordersByType = [
      { type: 'individual', count: orderRows.filter(o => o.order_type === 'individual').length },
      { type: 'automatic', count: orderRows.filter(o => o.order_type === 'automatic').length },
    ];

    return {
      cycle: cycleRow as ProductionCycle,
      statistics: {
        totalOrders,
        confirmedOrders,
        pendingOrders,
        totalCredits,
        ordersByType,
        capacityUsed: cycleRow.current_count,
        capacityLimit: cycleRow.capacity_limit,
        capacityPercentage: calculateCapacityPercentage(
          cycleRow.current_count,
          cycleRow.capacity_limit
        ),
      },
    };
  }
}

// Export singleton instance
export const subscriptionCreditAdminAPI = new SubscriptionCreditAdminAPI();
