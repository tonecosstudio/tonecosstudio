/**
 * Capacity Service
 * 
 * Handles production capacity operations including availability checks,
 * capacity reservation, and capacity release for cycles.
 * 
 * Requirements: 3.2, 3.3, 3.5, 3.6
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * Capacity usage information for a cycle
 */
export interface CapacityUsage {
  /** Maximum capacity for the cycle */
  max: number;
  /** Current capacity used */
  current: number;
  /** Available capacity remaining (accounts for reserved capacity) */
  available: number;
  /** Percentage of capacity used (0-100) */
  percentage: number;
  /** Reserved capacity for special orders */
  reserved?: number;
}

/**
 * Check if capacity is available for a purchase
 * 
 * This function verifies if the requested quantity can be accommodated
 * within the cycle's capacity limits before confirming a purchase.
 * 
 * @param cycleId - The ID of the cycle to check
 * @param quantity - The number of pieces to reserve
 * @returns Promise<boolean> - True if capacity is available
 * @throws Error if database query fails
 * 
 * @example
 * // Check if 3 pieces can be added to a cycle
 * const available = await checkAvailability(cycleId, 3);
 * if (available) {
 *   // Proceed with purchase
 * }
 * 
 * Requirements: 3.2, 3.3
 */
export async function checkAvailability(
  cycleId: string,
  quantity: number
): Promise<boolean> {
  const { data, error } = await supabase.rpc('check_capacity_available' as any, {
    p_cycle_id: cycleId,
    p_quantity: quantity
  });

  if (error) {
    throw new Error(`Failed to check capacity availability: ${error.message}`);
  }

  return data === true;
}

/**
 * Reserve capacity for a subscription or standalone purchase
 * 
 * This function increments the cycle's capacity_current by the specified
 * quantity. It will fail if the capacity limit would be exceeded.
 * 
 * @param cycleId - The ID of the cycle to reserve capacity in
 * @param quantity - The number of pieces to reserve
 * @param referenceId - The subscription or standalone purchase ID (for logging)
 * @returns Promise<void>
 * @throws Error if capacity limit exceeded or database update fails
 * 
 * @example
 * // Reserve capacity for a new subscription
 * await reserveCapacity(cycleId, 1, subscriptionId);
 * 
 * Requirements: 3.2, 3.3
 */
export async function reserveCapacity(
  cycleId: string,
  quantity: number,
  referenceId: string
): Promise<void> {
  const { error } = await supabase.rpc('reserve_capacity' as any, {
    p_cycle_id: cycleId,
    p_quantity: quantity
  });

  if (error) {
    throw new Error(`Failed to reserve capacity: ${error.message}`);
  }

  console.log(`Reserved ${quantity} capacity for cycle ${cycleId} (reference: ${referenceId})`);
}

/**
 * Release capacity when a purchase is cancelled before cutoff
 * 
 * This function decrements the cycle's capacity_current by the specified
 * quantity. It ensures capacity_current never goes below 0.
 * 
 * @param cycleId - The ID of the cycle to release capacity from
 * @param quantity - The number of pieces to release
 * @param referenceId - The subscription or standalone purchase ID (for logging)
 * @returns Promise<void>
 * @throws Error if database update fails
 * 
 * @example
 * // Release capacity when subscription is cancelled
 * await releaseCapacity(cycleId, 1, subscriptionId);
 * 
 * Requirements: 3.6
 */
export async function releaseCapacity(
  cycleId: string,
  quantity: number,
  referenceId: string
): Promise<void> {
  const { error } = await supabase.rpc('release_capacity' as any, {
    p_cycle_id: cycleId,
    p_quantity: quantity
  });

  if (error) {
    throw new Error(`Failed to release capacity: ${error.message}`);
  }

  console.log(`Released ${quantity} capacity for cycle ${cycleId} (reference: ${referenceId})`);
}

/**
 * Get current capacity usage for a cycle
 * 
 * This function retrieves the capacity information for a cycle and
 * calculates the available capacity and usage percentage.
 * Available capacity accounts for reserved capacity.
 * 
 * @param cycleId - The ID of the cycle to query
 * @returns Promise<CapacityUsage> - Capacity usage information
 * @throws Error if cycle not found or database query fails
 * 
 * @example
 * // Get capacity usage for display in admin panel
 * const usage = await getCapacityUsage(cycleId);
 * console.log(`Capacity: ${usage.current}/${usage.max} (${usage.percentage}%)`);
 * 
 * Requirements: 3.5, 16.6
 */
export async function getCapacityUsage(cycleId: string): Promise<CapacityUsage> {
  const { data: cycle, error } = await supabase
    .from('cycles')
    .select('capacity_max, capacity_current, reserved_capacity')
    .eq('id', cycleId)
    .single();

  if (error) {
    throw new Error(`Failed to get cycle capacity: ${error.message}`);
  }

  if (!cycle) {
    throw new Error(`Cycle not found: ${cycleId}`);
  }

  // Use capacity_max (capacity_limit will be used once types are regenerated)
  const max = cycle.capacity_max ?? 100;
  const current = cycle.capacity_current ?? 0;
  const reserved = (cycle as any).reserved_capacity ?? 0;
  
  // Available capacity = max - current - reserved
  const available = Math.max(0, max - current - reserved);
  const percentage = max > 0 ? Math.round((current / max) * 100) : 0;

  return {
    max,
    current,
    available,
    percentage,
    reserved
  };
}

/**
 * Information about subscription capacity availability
 */
export interface SubscriptionCapacityCheck {
  /** Whether capacity is available for all deliveries */
  available: boolean;
  /** First unavailable cycle information (if any) */
  firstUnavailableCycle?: {
    cycleNumber: 1 | 2;
    month: number;
    year: number;
    deliveryNumber: number;
  };
  /** Estimated next available date (if capacity unavailable) */
  estimatedAvailableDate?: Date;
}

/**
 * Calculate delivery cycles for a subscription
 * 
 * This function determines which cycles will be used for each delivery
 * based on the entry cycle and number of deliveries.
 * 
 * @param entryCycle - The cycle where subscription starts
 * @param deliveryCount - Number of deliveries (3 for Trimestral, 6 for Semestral)
 * @returns Array of cycle information for each delivery
 */
function calculateDeliveryCycles(
  entryCycle: { cycle_number: 1 | 2; month: number; year: number },
  deliveryCount: number
): Array<{ cycleNumber: 1 | 2; month: number; year: number }> {
  const cycles: Array<{ cycleNumber: 1 | 2; month: number; year: number }> = [];
  
  let currentCycleNumber = entryCycle.cycle_number;
  let currentMonth = entryCycle.month;
  let currentYear = entryCycle.year;
  
  for (let i = 0; i < deliveryCount; i++) {
    // Advance to next cycle
    if (currentCycleNumber === 1) {
      // Cycle 1 -> Cycle 2 (same month)
      currentCycleNumber = 2;
    } else {
      // Cycle 2 -> Cycle 1 (next month)
      currentCycleNumber = 1;
      currentMonth = currentMonth + 1;
      
      // Roll over year if necessary
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear = currentYear + 1;
      }
    }
    
    cycles.push({
      cycleNumber: currentCycleNumber,
      month: currentMonth,
      year: currentYear
    });
  }
  
  return cycles;
}

/**
 * Check if capacity is available for all deliveries in a subscription
 * 
 * This function verifies capacity for all consecutive cycles that would be
 * used by a subscription. It's used to show "Sold Out" messages before
 * customers enter payment information.
 * 
 * @param deliveryCount - Number of deliveries (3 for Trimestral, 6 for Semestral)
 * @returns Promise<SubscriptionCapacityCheck> - Capacity availability information
 * @throws Error if database query fails
 * 
 * @example
 * // Check capacity for Trimestral subscription (3 deliveries)
 * const check = await checkSubscriptionCapacity(3);
 * if (!check.available) {
 *   console.log('Sold out! First unavailable:', check.firstUnavailableCycle);
 * }
 * 
 * Requirements: 3.2, 9.9, 22.1, 22.2, 22.3
 */
export async function checkSubscriptionCapacity(
  deliveryCount: number
): Promise<SubscriptionCapacityCheck> {
  // Get current cycle
  const { data: currentCycle, error: cycleError } = await supabase.rpc('get_or_create_current_cycle' as any);
  
  if (cycleError) {
    throw new Error(`Failed to get current cycle: ${cycleError.message}`);
  }
  
  if (!currentCycle) {
    throw new Error('Could not get current cycle');
  }
  
  // Calculate which cycles will be used for deliveries
  const deliveryCycles = calculateDeliveryCycles(
    {
      cycle_number: (currentCycle as any).cycle_number,
      month: (currentCycle as any).month,
      year: (currentCycle as any).year
    },
    deliveryCount
  );
  
  // Check capacity for each cycle
  for (let i = 0; i < deliveryCycles.length; i++) {
    const cycleInfo = deliveryCycles[i];
    
    // Try to find existing cycle
    const { data: existingCycle } = await supabase
      .from('cycles')
      .select('id, capacity_current, capacity_max')
      .eq('cycle_number', cycleInfo.cycleNumber)
      .eq('month', cycleInfo.month)
      .eq('year', cycleInfo.year)
      .maybeSingle();
    
    if (existingCycle) {
      // Check capacity using database function
      const { data: hasCapacity, error } = await supabase.rpc('check_capacity_available' as any, {
        p_cycle_id: existingCycle.id,
        p_quantity: 1
      });
      
      if (error) {
        throw new Error(`Failed to check capacity: ${error.message}`);
      }
      
      if (!hasCapacity) {
        // Capacity unavailable - calculate estimated available date
        // Next available would be the cycle after this one
        let nextMonth = cycleInfo.month;
        let nextYear = cycleInfo.year;
        let nextCycleNumber: 1 | 2 = cycleInfo.cycleNumber;
        
        if (cycleInfo.cycleNumber === 1) {
          nextCycleNumber = 2;
        } else {
          nextCycleNumber = 1;
          nextMonth = nextMonth + 1;
          if (nextMonth > 12) {
            nextMonth = 1;
            nextYear = nextYear + 1;
          }
        }
        
        // Estimated date is the start of the next cycle
        const estimatedDate = new Date(nextYear, nextMonth - 1, nextCycleNumber === 1 ? 1 : 16);
        
        return {
          available: false,
          firstUnavailableCycle: {
            cycleNumber: cycleInfo.cycleNumber,
            month: cycleInfo.month,
            year: cycleInfo.year,
            deliveryNumber: i + 1
          },
          estimatedAvailableDate: estimatedDate
        };
      }
    }
    // If cycle doesn't exist yet, it will be created with available capacity
  }
  
  return {
    available: true
  };
}
