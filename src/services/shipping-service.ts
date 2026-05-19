/**
 * Shipping Service
 *
 * Provides shipping carrier integration for label generation and tracking.
 * Currently implements a mock/stub that can be easily replaced with real API integration.
 *
 * Supported Carriers:
 * - Correios (Brazilian national postal service) - Default
 * - Private carriers (future implementation)
 *
 * Environment Variables Required:
 * - VITE_SHIPPING_CARRIER: 'correios' | 'private' (default: 'correios')
 * - VITE_SHIPPING_API_URL: Base URL for the carrier API (optional)
 * - VITE_SHIPPING_CONTRACT_CODE: Contract code for Correios (optional)
 * - VITE_SHIPPING_ADMIN_CODE: Admin code for Correios (optional)
 * - VITE_SHIPPING_SERVICE_CODE: Service code (e.g., '04014' for SEDEX) (default: '04014')
 *
 * @example
 * ```typescript
 * const shippingService = new ShippingService();
 *
 * // Generate shipping label
 * const label = await shippingService.generateLabel('delivery-id-123', {
 *   name: 'João Silva',
 *   street: 'Rua das Flores',
 *   number: '123',
 *   complement: 'Apt 45',
 *   neighborhood: 'Centro',
 *   city: 'Salvador',
 *   state: 'BA',
 *   zipCode: '40000-000'
 * });
 *
 * // Get tracking status
 * const status = await shippingService.getTrackingStatus('BR123456789BR');
 * ```
 */

import { supabase } from '@/integrations/supabase/client';
import { logDebug, logError } from '@/lib/logger';

/**
 * Address information for shipping
 */
export interface Address {
  name: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  phone?: string;
}

/**
 * Tracking status information
 */
export interface TrackingStatus {
  trackingCode: string;
  status: 'pending' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed' | 'returned';
  statusDescription: string;
  lastUpdate: Date;
  delivered: boolean;
  deliveredAt?: Date;
  events: TrackingEvent[];
}

/**
 * Individual tracking event
 */
export interface TrackingEvent {
  date: Date;
  location: string;
  description: string;
  status: string;
}

/**
 * Result of label generation
 */
export interface LabelResult {
  trackingCode: string;
  labelUrl: string;
  cost: number;
}

/**
 * Result of batch label generation
 */
export interface BatchLabelResult {
  successful: Array<{
    deliveryId: string;
    trackingCode: string;
    labelUrl: string;
  }>;
  failed: Array<{
    deliveryId: string;
    error: string;
  }>;
}

/**
 * Shipping carrier configuration
 */
interface ShippingConfig {
  carrier: 'correios' | 'private';
  apiUrl: string;
  contractCode?: string;
  adminCode?: string;
  serviceCode: string;
  maxRetries: number;
  retryDelay: number;
}

interface DeliveryInfo {
  id: string;
  subscription_id: string;
  address?: Address;
}

interface DeliveryQueryResult {
  data: DeliveryInfo | null;
  error: { message: string } | null;
}

/**
 * Custom error for shipping operations
 */
class ShippingServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'ShippingServiceError';
  }
}

/**
 * Shipping Service
 * Handles shipping carrier integration for label generation and tracking
 */
export class ShippingService {
  private config: ShippingConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  /**
   * Load shipping configuration from environment variables
   */
  private loadConfig(): ShippingConfig {
    const carrier = (import.meta.env.VITE_SHIPPING_CARRIER || 'correios') as ShippingConfig['carrier'];
    const apiUrl = import.meta.env.VITE_SHIPPING_API_URL || 'https://api.correios.com.br';
    const contractCode = import.meta.env.VITE_SHIPPING_CONTRACT_CODE || '';
    const adminCode = import.meta.env.VITE_SHIPPING_ADMIN_CODE || '';
    const serviceCode = import.meta.env.VITE_SHIPPING_SERVICE_CODE || '04014'; // SEDEX
    const maxRetries = parseInt(import.meta.env.VITE_SHIPPING_MAX_RETRIES || '3', 10);
    const retryDelay = parseInt(import.meta.env.VITE_SHIPPING_RETRY_DELAY || '2000', 10);

    return {
      carrier,
      apiUrl,
      contractCode,
      adminCode,
      serviceCode,
      maxRetries,
      retryDelay,
    };
  }

  /**
   * Generate shipping label for a delivery
   *
   * @param deliveryId - The delivery ID
   * @param address - Destination address
   * @returns Label information including tracking code, label URL, and cost
   *
   * @throws {ShippingServiceError} If label generation fails
   */
  async generateLabel(deliveryId: string, address: Address): Promise<LabelResult> {
    try {
      // Validate address
      this.validateAddress(address);

      // Get delivery information
      const delivery = await this.getDeliveryInfo(deliveryId);
      if (!delivery) {
        throw new ShippingServiceError(
          `Delivery not found: ${deliveryId}`,
          'DELIVERY_NOT_FOUND',
          false
        );
      }

      // Calculate shipping cost
      const cost = await this.calculateShippingCost(address, 0.5); // Default weight 0.5kg

      // Generate label based on carrier
      let labelResult: LabelResult;

      if (this.config.carrier === 'correios') {
        labelResult = await this.generateCorreiosLabel(deliveryId, address, cost);
      } else {
        labelResult = await this.generatePrivateCarrierLabel(deliveryId, address, cost);
      }

      // Store tracking code in delivery record
      await this.updateDeliveryTracking(deliveryId, labelResult.trackingCode);

      return labelResult;
    } catch (error) {
      if (error instanceof ShippingServiceError) {
        throw error;
      }
      throw new ShippingServiceError(
        `Failed to generate label: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'LABEL_GENERATION_FAILED',
        true
      );
    }
  }

  /**
   * Get tracking status for a tracking code
   *
   * @param trackingCode - The tracking code to query
   * @returns Current tracking status and event history
   *
   * @throws {ShippingServiceError} If tracking query fails
   */
  async getTrackingStatus(trackingCode: string): Promise<TrackingStatus> {
    try {
      if (!trackingCode) {
        throw new ShippingServiceError(
          'Tracking code is required',
          'INVALID_TRACKING_CODE',
          false
        );
      }

      // Query tracking status based on carrier
      if (this.config.carrier === 'correios') {
        return await this.getCorreiosTracking(trackingCode);
      } else {
        return await this.getPrivateCarrierTracking(trackingCode);
      }
    } catch (error) {
      if (error instanceof ShippingServiceError) {
        throw error;
      }
      throw new ShippingServiceError(
        `Failed to get tracking status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'TRACKING_QUERY_FAILED',
        true
      );
    }
  }

  /**
   * Update tracking statuses for all in-transit deliveries
   * Called by cron job to poll carrier API for status updates
   *
   * @returns Number of deliveries updated
   */
  async updateTrackingStatuses(): Promise<number> {
    try {
      // Get all deliveries with tracking codes that are not delivered
      const { data: deliveries, error } = await supabase
        .from('subscription_deliveries')
        .select('id, tracking_code')
        .not('tracking_code', 'is', null)
        .in('status', ['shipped', 'in_transit']);

      if (error) {
        throw new Error(`Failed to fetch deliveries: ${error.message}`);
      }

      if (!deliveries || deliveries.length === 0) {
        return 0;
      }

      let updatedCount = 0;

      // Update each delivery's tracking status
      for (const delivery of deliveries) {
        try {
          const status = await this.getTrackingStatus(delivery.tracking_code!);

          // Update delivery status if delivered
          if (status.delivered) {
            await supabase
              .from('subscription_deliveries')
              .update({
                status: 'delivered',
                actual_delivery_date: status.deliveredAt?.toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', delivery.id);

            updatedCount++;
          }
        } catch (error) {
          logError(`Failed to update tracking for delivery ${delivery.id}`, error, 'shipping');
          // Continue with other deliveries
        }
      }

      return updatedCount;
    } catch (error) {
      throw new ShippingServiceError(
        `Failed to update tracking statuses: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'BATCH_UPDATE_FAILED',
        true
      );
    }
  }

  /**
   * Calculate shipping cost based on destination address and weight
   *
   * @param address - Destination address
   * @param weight - Package weight in kg
   * @returns Shipping cost in BRL
   */
  async calculateShippingCost(address: Address, weight: number): Promise<number> {
    try {
      // Validate inputs
      if (weight <= 0) {
        throw new ShippingServiceError(
          'Weight must be greater than 0',
          'INVALID_WEIGHT',
          false
        );
      }

      // Mock implementation - calculate based on state
      // In production, this would call the carrier API
      const basePrice = 15.00;
      const weightPrice = weight * 5.00;

      // Add regional surcharge for states outside Bahia
      const regionalSurcharge = address.state !== 'BA' ? 10.00 : 0;

      return basePrice + weightPrice + regionalSurcharge;
    } catch (error) {
      if (error instanceof ShippingServiceError) {
        throw error;
      }
      throw new ShippingServiceError(
        `Failed to calculate shipping cost: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'COST_CALCULATION_FAILED',
        true
      );
    }
  }

  /**
   * Generate batch shipping labels for multiple deliveries
   *
   * @param deliveryIds - Array of delivery IDs
   * @returns Results of batch generation with successful and failed items
   */
  async generateBatchLabels(deliveryIds: string[]): Promise<BatchLabelResult> {
    const result: BatchLabelResult = {
      successful: [],
      failed: [],
    };

    for (const deliveryId of deliveryIds) {
      try {
        // Get delivery address
        const delivery = await this.getDeliveryInfo(deliveryId);
        if (!delivery || !delivery.address) {
          result.failed.push({
            deliveryId,
            error: 'Delivery or address not found',
          });
          continue;
        }

        // Generate label
        const label = await this.generateLabel(deliveryId, delivery.address);

        result.successful.push({
          deliveryId,
          trackingCode: label.trackingCode,
          labelUrl: label.labelUrl,
        });
      } catch (error) {
        result.failed.push({
          deliveryId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return result;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Validate address fields
   */
  private validateAddress(address: Address): void {
    const required = ['name', 'street', 'number', 'neighborhood', 'city', 'state', 'zipCode'];
    const missing = required.filter(field => !address[field as keyof Address]);

    if (missing.length > 0) {
      throw new ShippingServiceError(
        `Missing required address fields: ${missing.join(', ')}`,
        'INVALID_ADDRESS',
        false
      );
    }

    // Validate zip code format (Brazilian CEP)
    const zipCodeRegex = /^\d{5}-?\d{3}$/;
    if (!zipCodeRegex.test(address.zipCode)) {
      throw new ShippingServiceError(
        'Invalid zip code format. Expected: 12345-678 or 12345678',
        'INVALID_ZIP_CODE',
        false
      );
    }

    // Validate state code
    const validStates = [
      'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
      'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
      'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
    ];
    if (!validStates.includes(address.state.toUpperCase())) {
      throw new ShippingServiceError(
        `Invalid state code: ${address.state}`,
        'INVALID_STATE',
        false
      );
    }
  }

  /**
   * Get delivery information from database
   */
  private async getDeliveryInfo(deliveryId: string): Promise<DeliveryInfo | null> {
    const { data, error } = await supabase
      .from('subscription_deliveries')
      .select(`
        id,
        subscription_id,
        subscriptions (
          user_id,
          users (
            full_name,
            phone
          )
        )
      `)
      .eq('id', deliveryId)
      .single() as unknown as DeliveryQueryResult;

    if (error) {
      throw new Error(`Failed to fetch delivery: ${error.message}`);
    }

    return data;
  }

  /**
   * Update delivery record with tracking code
   */
  private async updateDeliveryTracking(deliveryId: string, trackingCode: string): Promise<void> {
    const { error } = await supabase
      .from('subscription_deliveries')
      .update({
        tracking_code: trackingCode,
        updated_at: new Date().toISOString(),
      })
      .eq('id', deliveryId);

    if (error) {
      throw new Error(`Failed to update delivery tracking: ${error.message}`);
    }
  }

  // ============================================================================
  // Correios Integration (Mock Implementation)
  // ============================================================================

  /**
   * Generate Correios shipping label (MOCK IMPLEMENTATION)
   *
   * In production, this would:
   * 1. Call Correios API to create shipment
   * 2. Get tracking code from response
   * 3. Download label PDF
   * 4. Store label in Supabase Storage
   *
   * @private
   */
  private async generateCorreiosLabel(
    deliveryId: string,
    address: Address,
    cost: number
  ): Promise<LabelResult> {
    // Mock implementation - generates fake tracking code
    // In production, replace with actual Correios API call

    logDebug('Generating Correios label for delivery', { deliveryId, address, cost }, 'shipping');
    if (!import.meta.env.PROD) {
      logDebug('Mock Correios label generation', { deliveryId }, 'shipping');
    }

    // Generate mock tracking code (Correios format: BR123456789BR)
    const trackingCode = `BR${Math.random().toString().slice(2, 11)}BR`;

    // Mock label URL (in production, this would be the actual PDF URL)
    const labelUrl = `https://mock-correios.com/labels/${trackingCode}.pdf`;

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      trackingCode,
      labelUrl,
      cost,
    };
  }

  /**
   * Get Correios tracking status (MOCK IMPLEMENTATION)
   *
   * In production, this would call Correios tracking API
   *
   * @private
   */
  private async getCorreiosTracking(trackingCode: string): Promise<TrackingStatus> {
    // Mock implementation
    logDebug('Getting Correios tracking', { trackingCode }, 'shipping');

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));

    // Return mock tracking data
    return {
      trackingCode,
      status: 'in_transit',
      statusDescription: 'Objeto em trânsito - por favor aguarde',
      lastUpdate: new Date(),
      delivered: false,
      events: [
        {
          date: new Date(Date.now() - 86400000), // 1 day ago
          location: 'Salvador/BA',
          description: 'Objeto postado',
          status: 'posted',
        },
        {
          date: new Date(),
          location: 'Centro de Distribuição - Salvador/BA',
          description: 'Objeto em trânsito',
          status: 'in_transit',
        },
      ],
    };
  }

  // ============================================================================
  // Private Carrier Integration (Mock Implementation)
  // ============================================================================

  /**
   * Generate private carrier shipping label (MOCK IMPLEMENTATION)
   *
   * @private
   */
  private async generatePrivateCarrierLabel(
    deliveryId: string,
    address: Address,
    cost: number
  ): Promise<LabelResult> {
    // Mock implementation for private carriers
    logDebug('Generating private carrier label', { deliveryId }, 'shipping');
    if (!import.meta.env.PROD) {
      logDebug('Mock private carrier label generation', { deliveryId }, 'shipping');
    }

    const trackingCode = `PC${Math.random().toString().slice(2, 11)}`;
    const labelUrl = `https://mock-carrier.com/labels/${trackingCode}.pdf`;

    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      trackingCode,
      labelUrl,
      cost,
    };
  }

  /**
   * Get private carrier tracking status (MOCK IMPLEMENTATION)
   *
   * @private
   */
  private async getPrivateCarrierTracking(trackingCode: string): Promise<TrackingStatus> {
    logDebug('Getting private carrier tracking', { trackingCode }, 'shipping');

    await new Promise(resolve => setTimeout(resolve, 300));

    return {
      trackingCode,
      status: 'in_transit',
      statusDescription: 'Package in transit',
      lastUpdate: new Date(),
      delivered: false,
      events: [
        {
          date: new Date(Date.now() - 86400000),
          location: 'Origin Hub',
          description: 'Package picked up',
          status: 'picked_up',
        },
        {
          date: new Date(),
          location: 'Distribution Center',
          description: 'In transit',
          status: 'in_transit',
        },
      ],
    };
  }
}

// Export singleton instance
export const shippingService = new ShippingService();
