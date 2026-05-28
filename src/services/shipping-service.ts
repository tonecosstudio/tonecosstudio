/**
 * Shipping Service
 *
 * Provides shipping carrier integration for label generation and tracking.
 * Development and test builds use a local simulator. Production builds fail
 * closed until a real carrier API adapter is configured.
 *
 * Supported Carriers:
 * - Correios (Brazilian national postal service) - Default
 * - Private carriers (future implementation)
 *
 * Environment Variables Required:
 * - VITE_SHIPPING_CARRIER: 'correios' | 'private' (default: 'correios')
 * - VITE_SHIPPING_API_URL: Base URL for the carrier API (optional)
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

function secureNumericCode(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => String(byte % 10)).join('');
}

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

interface ShippingRpcError {
  message: string;
}

interface ShippingRpcClient {
  rpc(
    name: 'admin_mark_subscription_delivery_delivered_from_tracking',
    args: { p_delivery_id: string; p_delivered_at: string }
  ): Promise<{ data: unknown; error: ShippingRpcError | null }>;
}

const shippingRpc = supabase as unknown as ShippingRpcClient;

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
    const serviceCode = import.meta.env.VITE_SHIPPING_SERVICE_CODE || '04014'; // SEDEX
    const maxRetries = parseInt(import.meta.env.VITE_SHIPPING_MAX_RETRIES || '3', 10);
    const retryDelay = parseInt(import.meta.env.VITE_SHIPPING_RETRY_DELAY || '2000', 10);

    return {
      carrier,
      apiUrl,
      serviceCode,
      maxRetries,
      retryDelay,
    };
  }

  private isProductionBuild(): boolean {
    return import.meta.env.PROD === true || String(import.meta.env.PROD) === 'true';
  }

  private assertSimulatorAllowed(operation: string): void {
    if (this.isProductionBuild()) {
      throw new ShippingServiceError(
        `${operation} requires a configured shipping carrier integration. Development simulator is disabled in production.`,
        'SHIPPING_INTEGRATION_REQUIRED',
        false
      );
    }
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
            const { error: updateError } = await shippingRpc.rpc(
              'admin_mark_subscription_delivery_delivered_from_tracking',
              {
                p_delivery_id: delivery.id,
                p_delivered_at: (status.deliveredAt ?? new Date()).toISOString(),
              }
            );

            if (updateError) {
              throw new Error(`Failed to mark delivery as delivered: ${updateError.message}`);
            }

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

      this.assertSimulatorAllowed('Shipping cost calculation');

      // Development simulator - calculate based on state until a carrier adapter is configured.
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

  // ============================================================================
  // Correios Integration (Development Simulator)
  // ============================================================================

  /**
   * Generate a Correios shipping label in development/test only.
   * Production must use a real carrier adapter and must not issue simulated
   * tracking codes.
   *
   * @private
   */
  private async generateCorreiosLabel(
    deliveryId: string,
    address: Address,
    cost: number
  ): Promise<LabelResult> {
    this.assertSimulatorAllowed('Correios label generation');

    logDebug('Generating Correios label for delivery', { deliveryId, address, cost }, 'shipping');
    logDebug('Development Correios label simulator', { deliveryId }, 'shipping');

    // Generate simulated tracking code (Correios format: BR123456789BR)
    const trackingCode = `BR${secureNumericCode(9)}BR`;

    const labelUrl = `https://simulator.local/correios/labels/${trackingCode}.pdf`;

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      trackingCode,
      labelUrl,
      cost,
    };
  }

  /**
   * Get Correios tracking status in development/test only.
   *
   * @private
   */
  private async getCorreiosTracking(trackingCode: string): Promise<TrackingStatus> {
    this.assertSimulatorAllowed('Correios tracking query');
    logDebug('Getting Correios tracking', { trackingCode }, 'shipping');

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));

    // Return simulated tracking data
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
  // Private Carrier Integration (Development Simulator)
  // ============================================================================

  /**
   * Generate private carrier shipping label in development/test only.
   *
   * @private
   */
  private async generatePrivateCarrierLabel(
    deliveryId: string,
    address: Address,
    cost: number
  ): Promise<LabelResult> {
    this.assertSimulatorAllowed('Private carrier label generation');
    logDebug('Generating private carrier label', { deliveryId, destinationState: address.state }, 'shipping');
    logDebug('Development private carrier label simulator', { deliveryId }, 'shipping');

    const trackingCode = `PC${secureNumericCode(9)}`;
    const labelUrl = `https://simulator.local/private-carrier/labels/${trackingCode}.pdf`;

    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      trackingCode,
      labelUrl,
      cost,
    };
  }

  /**
   * Get private carrier tracking status in development/test only.
   *
   * @private
   */
  private async getPrivateCarrierTracking(trackingCode: string): Promise<TrackingStatus> {
    this.assertSimulatorAllowed('Private carrier tracking query');
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
