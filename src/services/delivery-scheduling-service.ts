// @ts-nocheck
/**
 * Delivery Scheduling Service
 * 
 * Handles automatic scheduling of consecutive deliveries for subscriptions.
 * Determines delivery months based on entry cycle and creates delivery records
 * with appropriate cycle associations and shipping deadlines.
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7
 */

import { supabase } from "@/integrations/supabase/client";
import { calculate5thBusinessDay } from "@/lib/business-days";
import { getHolidayDates } from "./holiday-service";
import { checkAvailability } from "./capacity-service";
import { bonusPieceService } from "@/lib/services/bonusPieceService";

/**
 * Delivery information for scheduling
 */
export interface ScheduledDelivery {
  /** Delivery number in sequence (1-6) */
  deliveryNumber: number;
  /** Month of delivery (1-12) */
  month: number;
  /** Year of delivery */
  year: number;
  /** Cycle ID (if cycle exists) */
  cycleId: string | null;
  /** Expected delivery date (5th business day of month) */
  expectedDeliveryDate: Date;
  /** Shipping deadline (5th business day of month) */
  shippingDeadline: Date;
}

/**
 * Entry cycle information (monthly cycles)
 */
interface EntryCycle {
  id: string;
  month: number;
  year: number;
}

/**
 * Schedule consecutive deliveries for a subscription
 * 
 * This function implements the core delivery scheduling logic:
 * - First delivery starts in the month following subscription creation (Req 9.1)
 * - Creates delivery records for consecutive months (Req 9.3, 9.4, 9.5)
 * - Associates each delivery with appropriate monthly cycle (Req 9.6)
 * - Calculates shipping deadline for each delivery (Req 9.7)
 * - Checks capacity for all months (Req 9.9)
 * - Assigns bonus piece to 6th delivery for Semestral subscriptions (Req 11.1, 11.3)
 * 
 * Monthly cycle rules:
 * - First delivery: next month after subscription creation
 * - Subsequent deliveries: consecutive months
 * 
 * Bonus piece rules:
 * - Only Semestral subscriptions receive bonus pieces
 * - Bonus piece is automatically assigned to the 6th delivery
 * - Bonus piece is created and linked during delivery scheduling
 * 
 * @param subscriptionId - The ID of the subscription
 * @param entryCycleId - The ID of the cycle when subscription was created
 * @param planType - The subscription plan type ('trimestral' or 'semestral')
 * @returns Promise<Array> - Array of created delivery records
 * @throws Error if capacity unavailable or database operation fails
 * 
 * @example
 * // Schedule deliveries for a Trimestral subscription
 * const deliveries = await scheduleConsecutiveDeliveries(
 *   subscriptionId,
 *   entryCycleId,
 *   'trimestral'
 * );
 * // Creates 3 consecutive delivery records
 * 
 * @example
 * // Schedule deliveries for a Semestral subscription
 * const deliveries = await scheduleConsecutiveDeliveries(
 *   subscriptionId,
 *   entryCycleId,
 *   'semestral'
 * );
 * // Creates 6 consecutive delivery records with bonus piece assigned to 6th delivery
 * 
 * Requirements: 9.1, 9.3, 9.4, 9.5, 9.6, 9.7, 9.9, 11.1, 11.3
 */
export async function scheduleConsecutiveDeliveries(
  subscriptionId: string,
  entryCycleId: string,
  planType: 'trimestral' | 'semestral'
): Promise<any[]> {
  // Validate inputs
  if (!subscriptionId || typeof subscriptionId !== 'string') {
    throw new Error('subscriptionId is required and must be a string');
  }
  
  if (!entryCycleId || typeof entryCycleId !== 'string') {
    throw new Error('entryCycleId is required and must be a string');
  }
  
  if (planType !== 'trimestral' && planType !== 'semestral') {
    throw new Error('planType must be either "trimestral" or "semestral"');
  }

  // Get entry cycle information (monthly cycle)
  const { data: entryCycle, error: cycleError } = await supabase
    .from('cycles')
    .select('id, month, year')
    .eq('id', entryCycleId)
    .single();

  if (cycleError || !entryCycle) {
    throw new Error(`Failed to get entry cycle: ${cycleError?.message || 'Cycle not found'}`);
  }

  // Determine number of deliveries based on plan type
  const deliveryCount = planType === 'trimestral' ? 3 : 6;

  // Calculate delivery schedule
  const schedule = calculateDeliverySchedule(
    entryCycle as EntryCycle,
    deliveryCount
  );

  // Get holidays for shipping deadline calculations
  const currentYear = entryCycle.year;
  const nextYear = currentYear + 1;
  const holidays = [
    ...(await getHolidayDates(currentYear)),
    ...(await getHolidayDates(nextYear))
  ];

  // Check capacity for all scheduled deliveries
  await checkCapacityForSchedule(schedule);

  // Create delivery records
  const deliveries = [];
  
  for (const scheduledDelivery of schedule) {
    // Calculate shipping deadline (5th business day of delivery month)
    const shippingDeadline = calculate5thBusinessDay(
      scheduledDelivery.month,
      scheduledDelivery.year,
      holidays
    );

    // Get or create cycle for this delivery (monthly cycle)
    const cycleId = await getOrCreateCycle(
      scheduledDelivery.month,
      scheduledDelivery.year
    );

    // Create delivery record
    const { data: delivery, error: deliveryError } = await supabase
      .from('subscription_deliveries')
      .insert({
        subscription_id: subscriptionId,
        delivery_number: scheduledDelivery.deliveryNumber,
        status: 'scheduled',
        cycle_id: cycleId,
        expected_delivery_date: shippingDeadline.toISOString(),
        auto_maintained: false,
      })
      .select()
      .single();

    if (deliveryError) {
      throw new Error(`Failed to create delivery ${scheduledDelivery.deliveryNumber}: ${deliveryError.message}`);
    }

    deliveries.push(delivery);
    
    console.log(
      `Created delivery ${scheduledDelivery.deliveryNumber} for subscription ${subscriptionId}: ` +
      `${scheduledDelivery.month}/${scheduledDelivery.year}, ` +
      `shipping deadline: ${shippingDeadline.toISOString().split('T')[0]}`
    );
  }

  // Bonus piece assignment for Semestral subscriptions (Requirement 11.1, 11.3)
  if (planType === 'semestral' && deliveries.length === 6) {
    try {
      // Create bonus piece for the subscription
      const bonusPiece = await bonusPieceService.createBonusPiece(
        subscriptionId,
        'Exclusive bonus piece for Semestral plan'
      );
      
      // Link bonus piece to the 6th delivery
      const sixthDelivery = deliveries[5]; // Index 5 = 6th delivery
      await bonusPieceService.linkBonusToDelivery(bonusPiece.id, sixthDelivery.id);
      
      // Update the 6th delivery record to reference the bonus piece
      const { error: updateError } = await supabase
        .from('subscription_deliveries')
        .update({ bonus_piece_id: bonusPiece.id })
        .eq('id', sixthDelivery.id);
      
      if (updateError) {
        console.error(`Failed to update 6th delivery with bonus_piece_id: ${updateError.message}`);
        // Don't throw - bonus piece is created and linked, just the reference update failed
      }
      
      console.log(
        `Assigned bonus piece ${bonusPiece.id} to 6th delivery ${sixthDelivery.id} ` +
        `for Semestral subscription ${subscriptionId}`
      );
    } catch (error) {
      console.error(`Failed to assign bonus piece for subscription ${subscriptionId}:`, error);
      // Don't throw - deliveries are created, bonus piece assignment can be done manually
    }
  }

  return deliveries;
}

/**
 * Calculate delivery schedule based on entry cycle (monthly)
 * 
 * Implements the delivery scheduling rules:
 * - First delivery: next month after subscription creation
 * - Subsequent deliveries: consecutive months
 * 
 * @param entryCycle - The cycle when subscription was created
 * @param deliveryCount - Number of deliveries to schedule (3 or 6)
 * @returns Array of scheduled delivery information
 * 
 * @private
 */
function calculateDeliverySchedule(
  entryCycle: EntryCycle,
  deliveryCount: number
): ScheduledDelivery[] {
  const schedule: ScheduledDelivery[] = [];
  
  // First delivery starts in the next month after subscription creation
  let currentMonth = entryCycle.month + 1;
  let currentYear = entryCycle.year;
  
  if (currentMonth > 12) {
    currentMonth = 1;
    currentYear += 1;
  }
  
  // Schedule consecutive monthly deliveries (Requirement 9.3)
  for (let i = 0; i < deliveryCount; i++) {
    schedule.push({
      deliveryNumber: i + 1,
      month: currentMonth,
      year: currentYear,
      cycleId: null, // Will be populated when creating delivery
      expectedDeliveryDate: new Date(currentYear, currentMonth - 1, 1), // Placeholder
      shippingDeadline: new Date(currentYear, currentMonth - 1, 1), // Placeholder
    });
    
    // Move to next month for next delivery (Requirement 9.3)
    currentMonth += 1;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear += 1;
    }
  }
  
  return schedule;
}

/**
 * Check capacity availability for all scheduled deliveries
 * 
 * Verifies that capacity is available for all months in the delivery schedule.
 * Throws an error if any month exceeds capacity.
 * 
 * @param schedule - Array of scheduled deliveries
 * @throws Error if capacity unavailable for any month
 * 
 * @private
 * Requirements: 9.9
 */
async function checkCapacityForSchedule(
  schedule: ScheduledDelivery[]
): Promise<void> {
  for (const scheduledDelivery of schedule) {
    // Try to find existing monthly cycle
    const { data: existingCycle } = await supabase
      .from('cycles')
      .select('id')
      .eq('month', scheduledDelivery.month)
      .eq('year', scheduledDelivery.year)
      .maybeSingle();

    if (existingCycle) {
      // Check capacity using capacity service
      const hasCapacity = await checkAvailability(existingCycle.id, 1);
      
      if (!hasCapacity) {
        throw new Error(
          `Capacity unavailable for delivery ${scheduledDelivery.deliveryNumber} ` +
          `(${scheduledDelivery.month}/${scheduledDelivery.year})`
        );
      }
    }
    // If cycle doesn't exist yet, it will be created with available capacity
  }
}

/**
 * Get or create a monthly cycle
 * 
 * Looks up an existing cycle or creates a new one if it doesn't exist.
 * Uses the SSOT (system_settings) to calculate cycle dates automatically.
 * 
 * @param month - Month (1-12)
 * @param year - Year
 * @returns Promise<string> - Cycle ID
 * @throws Error if cycle creation fails
 * 
 * @private
 */
async function getOrCreateCycle(
  month: number,
  year: number
): Promise<string> {
  // Try to find existing monthly cycle
  const { data: existingCycle } = await supabase
    .from('cycles')
    .select('id')
    .eq('month', month)
    .eq('year', year)
    .maybeSingle();

  if (existingCycle) {
    return existingCycle.id;
  }

  // Create new monthly cycle using SSOT
  // The cycle dates will be calculated automatically by the database
  // based on system_settings (production_days, shipping_business_days)
  const { data: newCycle, error: createError } = await supabase
    .rpc('populate_cycles', {
      p_start_month: month,
      p_start_year: year,
      p_num_months: 1
    });

  if (createError) {
    throw new Error(`Failed to create cycle: ${createError.message}`);
  }

  // Fetch the newly created cycle
  const { data: createdCycle, error: fetchError } = await supabase
    .from('cycles')
    .select('id')
    .eq('month', month)
    .eq('year', year)
    .single();

  if (fetchError || !createdCycle) {
    throw new Error(`Failed to fetch created cycle: ${fetchError?.message || 'Unknown error'}`);
  }

  console.log(`Created new monthly cycle: ${month}/${year} (ID: ${createdCycle.id})`);
  
  return createdCycle.id;
}
