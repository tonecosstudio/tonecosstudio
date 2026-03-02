/**
 * API Service for Subscription Credit System
 * Connects to the subscription-api backend
 */

import {
  Subscription,
  UserCredits,
  CreditTransaction,
  Character,
  ProductionCycle,
  Order,
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

// Get API base URL from environment variable
const API_BASE_URL = import.meta.env.VITE_SUBSCRIPTION_API_URL || 'http://localhost:3001';

class SubscriptionCreditAPI {
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

  // ============ Subscriptions ============

  async getMySubscription(): Promise<Subscription | null> {
    try {
      return await this.request<Subscription>('/api/subscriptions/me');
    } catch (error) {
      // If 404, user has no subscription
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  async activateSubscription(
    planType: PlanType,
    paymentMethodId: string
  ): Promise<SubscriptionActivationResponse> {
    return this.request<SubscriptionActivationResponse>('/api/subscriptions/activate', {
      method: 'POST',
      body: JSON.stringify({ plan_type: planType, payment_method_id: paymentMethodId }),
    });
  }

  async schedulePlanChange(
    subscriptionId: number,
    newPlanType: PlanType
  ): Promise<PlanChangeResponse> {
    return this.request<PlanChangeResponse>(
      `/api/subscriptions/${subscriptionId}/schedule-plan-change`,
      {
        method: 'POST',
        body: JSON.stringify({ new_plan_type: newPlanType }),
      }
    );
  }

  async cancelWithRefund(subscriptionId: number): Promise<CancelWithRefundResponse> {
    return this.request<CancelWithRefundResponse>(
      `/api/subscriptions/${subscriptionId}/cancel`,
      {
        method: 'POST',
        body: JSON.stringify({ cancellation_type: 'with_refund' }),
      }
    );
  }

  async setNoRenewal(subscriptionId: number): Promise<NoRenewalResponse> {
    return this.request<NoRenewalResponse>(
      `/api/subscriptions/${subscriptionId}/no-renewal`,
      {
        method: 'POST',
        body: JSON.stringify({ cancellation_type: 'no_renewal' }),
      }
    );
  }

  // ============ Credits ============

  async getCreditsBalance(): Promise<CreditsBalanceResponse> {
    return this.request<CreditsBalanceResponse>('/api/credits/balance');
  }

  async getCreditTransactions(
    page: number = 1,
    limit: number = 20,
    transactionType?: string
  ): Promise<TransactionsResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(transactionType && { transaction_type: transactionType }),
    });
    return this.request<TransactionsResponse>(`/api/credits/transactions?${params}`);
  }

  async validateCredits(creditsRequired: number): Promise<{
    has_sufficient_credits: boolean;
    available_credits: number;
    shortfall: number;
  }> {
    return this.request('/api/credits/validate', {
      method: 'POST',
      body: JSON.stringify({ credits_required: creditsRequired }),
    });
  }

  // ============ Characters ============

  async getCharacters(
    page: number = 1,
    limit: number = 20,
    planType?: PlanType
  ): Promise<{
    characters: Character[];
    pagination: any;
  }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(planType && { plan_type: planType }),
    });
    return this.request(`/api/characters?${params}`);
  }

  async getCharacterById(id: number): Promise<Character> {
    return this.request<Character>(`/api/characters/${id}`);
  }

  async getStandardCollection(): Promise<{ characters: Character[] }> {
    return this.request('/api/characters/standard-collection');
  }

  // ============ Orders ============

  async createIndividualOrder(
    characterId: number,
    useCredits: boolean = true
  ): Promise<{
    order_id: number;
    credits_debited: number;
    production_cycle_id: number;
  }> {
    return this.request('/api/orders/individual', {
      method: 'POST',
      body: JSON.stringify({ character_id: characterId, use_credits: useCredits }),
    });
  }

  async getAutomaticOrder(orderId: number): Promise<{
    order_id: number;
    characters: Character[];
    total_credits: number;
    is_locked: boolean;
    cycle_close_date: string;
  }> {
    return this.request(`/api/orders/automatic/${orderId}`);
  }

  async updateAutomaticOrder(
    orderId: number,
    characterIds: number[]
  ): Promise<{
    order_id: number;
    characters: Character[];
    total_credits: number;
  }> {
    return this.request(`/api/orders/automatic/${orderId}`, {
      method: 'PUT',
      body: JSON.stringify({ character_ids: characterIds }),
    });
  }

  async getUserOrders(): Promise<{ orders: OrderWithItems[] }> {
    return this.request('/api/orders');
  }

  async getUserCycleCount(): Promise<UserCycleCountResponse> {
    return this.request('/api/orders/user-cycle-count');
  }

  // ============ Production Cycles ============

  async getCurrentCycle(): Promise<ProductionCycle> {
    return this.request<ProductionCycle>('/api/production-cycles/current');
  }

  async getCycleById(id: number): Promise<ProductionCycle> {
    return this.request<ProductionCycle>(`/api/production-cycles/${id}`);
  }

  async getCycleOrders(
    cycleId: number,
    page: number = 1,
    limit: number = 20,
    priorityOnly: boolean = false
  ): Promise<{
    orders: OrderWithItems[];
    pagination: any;
  }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(priorityOnly && { priority_only: 'true' }),
    });
    return this.request(`/api/production-cycles/${cycleId}/orders?${params}`);
  }
}

// Export singleton instance
export const subscriptionCreditAPI = new SubscriptionCreditAPI();
