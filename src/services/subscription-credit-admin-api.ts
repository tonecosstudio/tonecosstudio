/**
 * Admin API Service for Subscription Credit System
 * Connects to the subscription-api backend admin endpoints
 */

import {
  Subscription,
  Character,
  ProductionCycle,
  OrderWithItems,
} from '@/types/subscription-credit-system';

// Get API base URL from environment variable
const API_BASE_URL = import.meta.env.VITE_SUBSCRIPTION_API_URL || 'http://localhost:3001';

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
      id: number;
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
    id: number;
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
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Get auth token from localStorage or your auth system
    const token = localStorage.getItem('auth_token');
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // ============ Dashboard ============

  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const response = await this.request<{ success: boolean; data: DashboardMetrics }>(
      '/admin/dashboard/metrics'
    );
    return response.data;
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
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(status && { status }),
      ...(planType && { planType }),
    });
    const response = await this.request<{
      success: boolean;
      data: SubscriptionWithUser[];
      pagination: any;
    }>(`/admin/subscriptions?${params}`);
    return {
      subscriptions: response.data,
      pagination: response.pagination,
    };
  }

  async adjustCredits(
    subscriptionId: number,
    amount: number,
    reason: string
  ): Promise<void> {
    await this.request(`/admin/subscriptions/${subscriptionId}/adjust-credits`, {
      method: 'POST',
      body: JSON.stringify({ amount, reason }),
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
    const response = await this.request<{ success: boolean; data: Character }>(
      '/admin/characters',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return response.data;
  }

  async updateCharacter(
    id: number,
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
    const response = await this.request<{ success: boolean; data: Character }>(
      `/admin/characters/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
    return response.data;
  }

  async deactivateCharacter(id: number): Promise<Character> {
    const response = await this.request<{ success: boolean; data: Character }>(
      `/admin/characters/${id}`,
      {
        method: 'DELETE',
      }
    );
    return response.data;
  }

  // ============ Production Cycles ============

  async createProductionCycle(data: {
    name: string;
    capacityLimit: number;
    closeDate: string;
  }): Promise<ProductionCycle> {
    const response = await this.request<{ success: boolean; data: ProductionCycle }>(
      '/admin/production-cycles',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return response.data;
  }

  async closeProductionCycle(id: number): Promise<{
    cycleId: number;
    confirmedOrders: number;
    pendingOrders: number;
    totalCreditsDebited: number;
  }> {
    const response = await this.request<{
      success: boolean;
      data: {
        cycleId: number;
        confirmedOrders: number;
        pendingOrders: number;
        totalCreditsDebited: number;
      };
    }>(`/admin/production-cycles/${id}/close`, {
      method: 'POST',
    });
    return response.data;
  }

  async getCycleStatistics(id: number): Promise<CycleStatistics> {
    const response = await this.request<{ success: boolean; data: CycleStatistics }>(
      `/admin/production-cycles/${id}/statistics`
    );
    return response.data;
  }
}

// Export singleton instance
export const subscriptionCreditAdminAPI = new SubscriptionCreditAdminAPI();
