/**
 * Delivery Scheduling Shared Module
 * 
 * Shared delivery scheduling logic that can be used by both edge functions
 * and the frontend TypeScript service.
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 20.1, 20.2, 20.3, 20.4, 20.5, 20.7
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

/**
 * Delivery information for scheduling
 */
export interface ScheduledDelivery {
  deliveryNumber: number;
  month: number;
  year: number;
  cycleNumber: 1 | 2;
  cycleId: string | null;
}

/**
 * Entry cycle information
 */
interface EntryCycle {
  id: string;
  cycle_number: 1 | 2;
  month: number;
  year: number;
}

/**
 * Schedule consecutive deliveries for a subscription
 * 
 * This function implements the core delivery scheduling logic:
 * - Determines first delivery month based on entry cycle (Req 9.1, 9.2)
 * - Creates delivery records for consecutive months (Req 9.3, 9.4, 9.5)
 * - Associates each delivery with appropriate cycle (Req 9.6)
 * - Calculates shipping deadline for each delivery (Req 9.7)
 * 
 * Entry cycle rules:
 * - If subscription created in Cycle 1: first delivery in next month's Cycle 1
 * - If subscription created in Cycle 2: first delivery in second subsequent month's Cycle 1
 * 
 * @param supabase - Supabase client instance
 * @param subscriptionId - The ID of the subscription
 * @param entryCycleId - The ID of the cycle when subscription was created
 * @param planType - The subscription plan type ('trimestral' or 'semestral')
 * @returns Promise<Array> - Array of created delivery records
 * @throws Error if database operation fails
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 20.5
 */
export async function scheduleConsecutiveDeliveries(
  supabase: SupabaseClient,
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

  // Get entry cycle information (Requirement 20.1, 20.4)
  const { data: entryCycle, error: cycleError } = await supabase
    .from('cycles')
    .select('id, cycle_number, month, year')
    .eq('id', entryCycleId)
    .single();

  if (cycleError || !entryCycle) {
    throw new Error(`Failed to get entry cycle: ${cycleError?.message || 'Cycle not found'}`);
  }

  // Determine number of deliveries based on plan type
  const deliveryCount = planType === 'trimestral' ? 3 : 6;

  // Calculate delivery schedule (Requirements 9.1, 9.2, 9.3, 20.5)
  const schedule = calculateDeliverySchedule(
    entryCycle as EntryCycle,
    deliveryCount
  );

  // Create delivery records
  const deliveries = [];
  
  for (const scheduledDelivery of schedule) {
    // Get or create cycle for this delivery (Requirement 9.6)
    const cycleId = await getOrCreateCycle(
      supabase,
      scheduledDelivery.cycleNumber,
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
      `${scheduledDelivery.month}/${scheduledDelivery.year} Cycle ${scheduledDelivery.cycleNumber}`
    );
  }

  return deliveries;
}

/**
 * Calculate delivery schedule based on entry cycle
 * 
 * Implements the delivery scheduling rules:
 * - Cycle 1 entry: first delivery in next month's Cycle 1 (Requirement 9.1, 20.2)
 * - Cycle 2 entry: first delivery in second subsequent month's Cycle 1 (Requirement 9.2, 20.3)
 * - Subsequent deliveries in consecutive months (Requirement 9.3)
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
  
  // Determine first delivery month based on entry cycle (Requirements 20.2, 20.3, 20.5)
  let currentMonth = entryCycle.month;
  let currentYear = entryCycle.year;
  
  if (entryCycle.cycle_number === 1) {
    // Cycle 1 entry: first delivery in next month (Requirement 9.1, 20.2)
    currentMonth += 1;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear += 1;
    }
  } else {
    // Cycle 2 entry: first delivery in second subsequent month (Requirement 9.2, 20.3)
    currentMonth += 2;
    if (currentMonth > 12) {
      currentMonth -= 12;
      currentYear += 1;
    }
  }
  
  // All deliveries start in Cycle 1 of their respective months
  // (Deliveries are created at the start of the month, which is Cycle 1)
  
  // Schedule consecutive deliveries (Requirement 9.3)
  for (let i = 0; i < deliveryCount; i++) {
    schedule.push({
      deliveryNumber: i + 1,
      month: currentMonth,
      year: currentYear,
      cycleNumber: 1, // Deliveries are associated with Cycle 1 (start of month)
      cycleId: null, // Will be populated when creating delivery
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
 * Get or create a cycle for a specific month and cycle number
 * 
 * Looks up an existing cycle or creates a new one if it doesn't exist.
 * 
 * @param supabase - Supabase client instance
 * @param cycleNumber - Cycle number (1 or 2)
 * @param month - Month (1-12)
 * @param year - Year
 * @returns Promise<string> - Cycle ID
 * @throws Error if cycle creation fails
 * 
 * @private
 */
async function getOrCreateCycle(
  supabase: SupabaseClient,
  cycleNumber: 1 | 2,
  month: number,
  year: number
): Promise<string> {
  // Try to find existing cycle
  const { data: existingCycle } = await supabase
    .from('cycles')
    .select('id')
    .eq('cycle_number', cycleNumber)
    .eq('month', month)
    .eq('year', year)
    .maybeSingle();

  if (existingCycle) {
    return existingCycle.id;
  }

  // Create new cycle
  // Calculate cycle dates
  const startDay = cycleNumber === 1 ? 1 : 16;
  const endDay = cycleNumber === 1 ? 15 : new Date(year, month, 0).getDate(); // Last day of month
  
  const openStart = new Date(year, month - 1, startDay, 0, 0, 0);
  const openEnd = new Date(year, month - 1, endDay, 23, 59, 59);
  
  // Calculate production dates
  let productionStart: Date;
  let productionEnd: Date;
  let shippingMonth: number;
  let shippingYear: number;
  
  if (cycleNumber === 1) {
    // Cycle 1: production from day 16 to end of month
    productionStart = new Date(year, month - 1, 16, 0, 0, 0);
    productionEnd = new Date(year, month, 0, 23, 59, 59); // Last day of month
    
    // Shipping in next month
    shippingMonth = month === 12 ? 1 : month + 1;
    shippingYear = month === 12 ? year + 1 : year;
  } else {
    // Cycle 2: production in next month
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    
    productionStart = new Date(nextYear, nextMonth - 1, 1, 0, 0, 0);
    productionEnd = new Date(nextYear, nextMonth, 0, 23, 59, 59); // Last day of next month
    
    // Shipping in month after next
    shippingMonth = nextMonth === 12 ? 1 : nextMonth + 1;
    shippingYear = nextMonth === 12 ? nextYear + 1 : nextYear;
  }
  
  // Calculate shipping date (5th day of shipping month as placeholder)
  // In production, this should use calculate_nth_business_day function
  const shippingDate = new Date(shippingYear, shippingMonth - 1, 5);
  
  const { data: newCycle, error: createError } = await supabase
    .from('cycles')
    .insert({
      cycle_number: cycleNumber,
      month,
      year,
      open_start: openStart.toISOString(),
      open_end: openEnd.toISOString(),
      production_start: productionStart.toISOString(),
      production_end: productionEnd.toISOString(),
      shipping_date: shippingDate.toISOString().split('T')[0], // Date only
      status: 'open',
      capacity_max: 100, // Default capacity
      capacity_current: 0,
    })
    .select('id')
    .single();

  if (createError || !newCycle) {
    throw new Error(`Failed to create cycle: ${createError?.message || 'Unknown error'}`);
  }

  console.log(`Created new cycle: ${month}/${year} Cycle ${cycleNumber} (ID: ${newCycle.id})`);
  
  return newCycle.id;
}
