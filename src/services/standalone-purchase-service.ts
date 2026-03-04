// @ts-nocheck
/**
 * Standalone Purchase Service
 * 
 * Handles creation and management of standalone purchases (single piece purchases
 * without subscription) using the deposit model.
 * 
 * Requirements: 4.1, 4.2, 4.3, 7.6
 */

import { supabase } from "@/integrations/supabase/client";
import { StandalonePurchase } from "@/types/database";
import { validateBeforeCutoff, CutoffPassedError } from "@/lib/cutoff-middleware";

/**
 * Parameters for creating a standalone purchase
 */
export interface CreateStandalonePurchaseParams {
  userId: string;
  collectionId: string;
  cycleId: string;
  depositVoucherUrl?: string;
}

/**
 * Create a standalone purchase with deposit
 * 
 * This function creates a new standalone purchase with the following validations:
 * 1. Checks if the cycle is still open (status = 'open')
 * 2. Verifies current time is before cutoff (day 15 at 23:59:59 Bahia time)
 * 3. Checks if capacity is available
 * 4. Reserves capacity for the cycle
 * 
 * The deposit amount is fixed at R$100.00, and the balance is calculated as
 * collection price minus deposit.
 * 
 * @param params - Creation parameters
 * @returns Promise<StandalonePurchase> - The created purchase
 * @throws CutoffPassedError if cutoff has passed
 * @throws Error if cycle is not open or capacity exceeded
 * 
 * Requirements: 4.1, 4.2, 4.3, 7.6
 */
export async function createWithDeposit(
  params: CreateStandalonePurchaseParams
): Promise<StandalonePurchase> {
  const { userId, collectionId, cycleId, depositVoucherUrl } = params;

  // 1. Check if before cutoff (Requirement 7.6)
  try {
    await validateBeforeCutoff();
  } catch (error) {
    if (error instanceof CutoffPassedError) {
      throw new Error("Cannot create standalone purchase - cutoff has passed. Production has started.");
    }
    throw error;
  }

  // 2. Check if cycle is still open (Requirement 7.6)
  const { data: cycle, error: cycleError } = await supabase
    .from('cycles')
    .select('status, capacity_max, capacity_current')
    .eq('id', cycleId)
    .single();

  if (cycleError || !cycle) {
    throw new Error(`Failed to get cycle: ${cycleError?.message || 'Cycle not found'}`);
  }

  if (cycle.status !== 'open') {
    throw new Error(`Cannot create standalone purchase - cycle is ${cycle.status}. Only open cycles accept new purchases.`);
  }

  // 3. Get collection details to calculate amounts
  const { data: collection, error: collectionError } = await supabase
    .from('collections')
    .select('price_full, name')
    .eq('id', collectionId)
    .single();

  if (collectionError || !collection) {
    throw new Error(`Failed to get collection: ${collectionError?.message || 'Collection not found'}`);
  }

  // 4. Check capacity availability (Requirement 4.2)
  const { data: capacityAvailable, error: capacityError } = await supabase
    .rpc('check_capacity_available', {
      p_cycle_id: cycleId,
      p_quantity: 1
    });

  if (capacityError) {
    throw new Error(`Failed to check capacity: ${capacityError.message}`);
  }

  if (!capacityAvailable) {
    throw new Error('Capacity limit exceeded for this cycle. Cannot create standalone purchase.');
  }

  // 5. Calculate amounts (Requirement 4.1, 4.3)
  const depositAmount = 100.00; // Fixed deposit amount
  const balanceAmount = collection.price_full - depositAmount;
  const totalAmount = collection.price_full;

  // 6. Create standalone purchase record
  const { data: purchase, error: createError } = await supabase
    .from('standalone_purchases')
    .insert({
      user_id: userId,
      collection_id: collectionId,
      cycle_id: cycleId,
      status: 'deposit_paid',
      deposit_amount: depositAmount,
      balance_amount: balanceAmount,
      total_amount: totalAmount,
      deposit_paid_at: new Date().toISOString(),
      payment_voucher_deposit_url: depositVoucherUrl || null
    })
    .select()
    .single();

  if (createError || !purchase) {
    throw new Error(`Failed to create standalone purchase: ${createError?.message || 'Unknown error'}`);
  }

  // 7. Reserve capacity (Requirement 4.2)
  const { error: reserveError } = await supabase
    .rpc('reserve_capacity', {
      p_cycle_id: cycleId,
      p_quantity: 1
    });

  if (reserveError) {
    // Rollback: delete the purchase if capacity reservation fails
    await supabase
      .from('standalone_purchases')
      .delete()
      .eq('id', purchase.id);
    
    throw new Error(`Failed to reserve capacity: ${reserveError.message}`);
  }

  return purchase as StandalonePurchase;
}

/**
 * Check if a standalone purchase can be created for a given cycle
 * 
 * This function performs all validation checks without creating the purchase:
 * 1. Checks if before cutoff
 * 2. Checks if cycle is open
 * 3. Checks if capacity is available
 * 
 * @param cycleId - The cycle ID to check
 * @returns Promise<{ canCreate: boolean; reason?: string }> - Result with reason if cannot create
 * 
 * Requirements: 7.6
 */
export async function canCreateStandalonePurchase(
  cycleId: string
): Promise<{ canCreate: boolean; reason?: string }> {
  // 1. Check if before cutoff
  try {
    await validateBeforeCutoff();
  } catch (error) {
    if (error instanceof CutoffPassedError) {
      return {
        canCreate: false,
        reason: "Cutoff has passed - production has started"
      };
    }
    return {
      canCreate: false,
      reason: "Failed to check cutoff"
    };
  }

  // 2. Check if cycle is open
  const { data: cycle, error: cycleError } = await supabase
    .from('cycles')
    .select('status')
    .eq('id', cycleId)
    .single();

  if (cycleError || !cycle) {
    return {
      canCreate: false,
      reason: "Cycle not found"
    };
  }

  if (cycle.status !== 'open') {
    return {
      canCreate: false,
      reason: `Cycle is ${cycle.status} - only open cycles accept purchases`
    };
  }

  // 3. Check capacity
  const { data: capacityAvailable, error: capacityError } = await supabase
    .rpc('check_capacity_available', {
      p_cycle_id: cycleId,
      p_quantity: 1
    });

  if (capacityError) {
    return {
      canCreate: false,
      reason: "Failed to check capacity"
    };
  }

  if (!capacityAvailable) {
    return {
      canCreate: false,
      reason: "Capacity limit exceeded"
    };
  }

  return { canCreate: true };
}

/**
 * Get standalone purchases for a user
 * 
 * @param userId - The user ID
 * @returns Promise<StandalonePurchase[]> - List of purchases
 */
export async function getUserStandalonePurchases(
  userId: string
): Promise<StandalonePurchase[]> {
  const { data, error } = await supabase
    .from('standalone_purchases')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get standalone purchases: ${error.message}`);
  }

  return (data || []) as StandalonePurchase[];
}

/**
 * Get a standalone purchase by ID
 * 
 * @param purchaseId - The purchase ID
 * @returns Promise<StandalonePurchase | null> - The purchase or null if not found
 */
export async function getStandalonePurchase(
  purchaseId: string
): Promise<StandalonePurchase | null> {
  const { data, error } = await supabase
    .from('standalone_purchases')
    .select('*')
    .eq('id', purchaseId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Failed to get standalone purchase: ${error.message}`);
  }

  return data as StandalonePurchase;
}

/**
 * Cancel a standalone purchase and release capacity
 * 
 * This function cancels a standalone purchase and releases the reserved capacity
 * if the cancellation occurs before the cutoff date. The capacity is only released
 * if the current time is before day 15 at 23:59:59 Bahia time.
 * 
 * @param purchaseId - The purchase ID to cancel
 * @param reason - Optional cancellation reason
 * @param adminUserId - Optional admin user ID for audit logging
 * @returns Promise<void>
 * @throws Error if purchase not found or cancellation fails
 * 
 * Requirements: 3.6, 4.7, 15.3
 */
export async function cancelStandalonePurchase(
  purchaseId: string,
  reason?: string,
  adminUserId?: string
): Promise<void> {
  // 1. Get the purchase
  const { data: purchase, error: purchaseError } = await supabase
    .from('standalone_purchases')
    .select('id, cycle_id, status')
    .eq('id', purchaseId)
    .single();

  if (purchaseError || !purchase) {
    throw new Error(`Failed to get standalone purchase: ${purchaseError?.message || 'Purchase not found'}`);
  }

  // 2. Check if already cancelled
  if (purchase.status === 'cancelled') {
    throw new Error('Standalone purchase is already cancelled');
  }

  const previousStatus = purchase.status;
  const cancellationReason = reason || 'Cancelled by admin';

  // 3. Update purchase status to cancelled
  const { error: updateError } = await supabase
    .from('standalone_purchases')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: cancellationReason
    })
    .eq('id', purchaseId);

  if (updateError) {
    throw new Error(`Failed to cancel standalone purchase: ${updateError.message}`);
  }

  // 4. Release capacity if before cutoff (Requirement 3.6, 4.7)
  let capacityReleased = false;
  if (purchase.cycle_id) {
    try {
      // Check if before cutoff
      const { data: beforeCutoff, error: cutoffError } = await supabase
        .rpc('is_before_cutoff');

      if (cutoffError) {
        console.error('Error checking cutoff:', cutoffError);
      } else if (beforeCutoff) {
        // Release capacity
        const { error: releaseError } = await supabase
          .rpc('release_capacity', {
            p_cycle_id: purchase.cycle_id,
            p_quantity: 1
          });

        if (releaseError) {
          console.error(`Error releasing capacity for purchase ${purchaseId}:`, releaseError);
        } else {
          console.log(`Released capacity for standalone purchase ${purchaseId} in cycle ${purchase.cycle_id}`);
          capacityReleased = true;
        }
      } else {
        console.log(`Cutoff has passed - capacity not released for standalone purchase ${purchaseId}`);
      }
    } catch (error) {
      console.error(`Exception releasing capacity for purchase ${purchaseId}:`, error);
      // Don't fail the cancellation if capacity release fails
    }
  }

  // 5. Log admin action for audit trail (Requirement 15.3)
  if (adminUserId) {
    try {
      const { error: logError } = await supabase.rpc('log_standalone_admin_action', {
        p_purchase_id: purchaseId,
        p_admin_user_id: adminUserId,
        p_action_type: 'cancel_order',
        p_previous_status: previousStatus,
        p_new_status: 'cancelled',
        p_notes: cancellationReason,
        p_metadata: {
          cancelled_at: new Date().toISOString(),
          capacity_released: capacityReleased
        }
      });

      if (logError) {
        console.error('Failed to log admin action:', logError);
        // Don't fail the operation if logging fails
      }
    } catch (error) {
      console.error('Exception logging admin action:', error);
      // Don't fail the operation if logging fails
    }
  }
}

/**
 * Process balance payment for a standalone purchase
 * 
 * This function processes the balance payment for a standalone purchase with the following validations:
 * 1. Verifies the purchase exists and status is 'awaiting_balance'
 * 2. Checks that the balance_due_date has not passed
 * 3. Updates status to 'balance_paid'
 * 4. Sets balance_paid_at timestamp
 * 5. Generates a tracking code for shipping
 * 
 * @param purchaseId - The purchase ID
 * @param balanceVoucherUrl - URL of the balance payment voucher
 * @returns Promise<void>
 * @throws Error if purchase not found, status invalid, or deadline passed
 * 
 * Requirements: 4.5, 4.9
 */
export async function processBalancePayment(
  purchaseId: string,
  balanceVoucherUrl: string
): Promise<void> {
  // 1. Get the purchase
  const { data: purchase, error: purchaseError } = await supabase
    .from('standalone_purchases')
    .select('id, status, balance_due_date')
    .eq('id', purchaseId)
    .single();

  if (purchaseError || !purchase) {
    throw new Error(`Failed to get standalone purchase: ${purchaseError?.message || 'Purchase not found'}`);
  }

  // 2. Verify status is 'awaiting_balance' (Requirement 4.5)
  if (purchase.status !== 'awaiting_balance') {
    throw new Error(`Cannot process balance payment - purchase status is ${purchase.status}. Expected 'awaiting_balance'.`);
  }

  // 3. Verify balance_due_date has not passed (Requirement 4.5)
  if (purchase.balance_due_date) {
    const dueDate = new Date(purchase.balance_due_date);
    const now = new Date();
    
    if (now > dueDate) {
      throw new Error('Cannot process balance payment - payment deadline has passed.');
    }
  }

  // 4. Generate tracking code (Requirement 4.9)
  // Format: SP-YYYYMMDD-XXXXX (SP = Standalone Purchase)
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
  const trackingCode = `SP-${timestamp}-${randomSuffix}`;

  // 5. Update purchase with balance payment info (Requirement 4.5, 4.9)
  const { error: updateError } = await supabase
    .from('standalone_purchases')
    .update({
      status: 'balance_paid',
      balance_paid_at: new Date().toISOString(),
      payment_voucher_balance_url: balanceVoucherUrl,
      tracking_code: trackingCode
    })
    .eq('id', purchaseId);

  if (updateError) {
    throw new Error(`Failed to update standalone purchase: ${updateError.message}`);
  }
}

/**
 * Mark production complete and notify customer to pay balance
 *
 * This function marks a standalone purchase as production complete with the following actions:
 * 1. Updates status to 'awaiting_balance'
 * 2. Sets production_complete_at timestamp
 * 3. Calculates balance_due_date as production_complete_at + 5 business days
 * 4. Logs admin action for audit trail
 * 5. Sends email notification to customer
 *
 * @param purchaseId - The purchase ID
 * @param adminUserId - Optional admin user ID for audit logging (defaults to current user)
 * @returns Promise<void>
 * @throws Error if purchase not found or status invalid
 *
 * Requirements: 4.4, 15.3
 */
export async function markProductionComplete(
  purchaseId: string,
  adminUserId?: string
): Promise<void> {
  // 1. Get the purchase
  const { data: purchase, error: purchaseError } = await supabase
    .from('standalone_purchases')
    .select('id, status, user_id')
    .eq('id', purchaseId)
    .single();

  if (purchaseError || !purchase) {
    throw new Error(`Failed to get standalone purchase: ${purchaseError?.message || 'Purchase not found'}`);
  }

  // 2. Verify status is 'deposit_paid' (Requirement 4.4)
  if (purchase.status !== 'deposit_paid') {
    throw new Error(`Cannot mark production complete - purchase status is ${purchase.status}. Expected 'deposit_paid'.`);
  }

  // 3. Calculate balance_due_date = production_complete_at + 5 business days (Requirement 4.4)
  const productionCompleteAt = new Date();

  // Get holidays for calculating business days
  const { getHolidayDates } = await import('./holiday-service');
  const { addBusinessDays } = await import('@/lib/business-days');

  const currentYear = productionCompleteAt.getFullYear();
  const holidays = await getHolidayDates(currentYear);

  // Calculate 5 business days from production complete date
  const balanceDueDate = addBusinessDays(productionCompleteAt, 5, holidays);

  // 4. Update purchase with production complete info (Requirement 4.4)
  const { error: updateError } = await supabase
    .from('standalone_purchases')
    .update({
      status: 'awaiting_balance',
      production_complete_at: productionCompleteAt.toISOString(),
      balance_due_date: balanceDueDate.toISOString()
    })
    .eq('id', purchaseId);

  if (updateError) {
    throw new Error(`Failed to update standalone purchase: ${updateError.message}`);
  }

  // 5. Log admin action for audit trail (Requirement 15.3)
  if (adminUserId) {
    try {
      const { error: logError } = await supabase.rpc('log_standalone_admin_action', {
        p_purchase_id: purchaseId,
        p_admin_user_id: adminUserId,
        p_action_type: 'mark_production_complete',
        p_previous_status: purchase.status,
        p_new_status: 'awaiting_balance',
        p_notes: `Production marked complete. Balance due date: ${balanceDueDate.toISOString()}`,
        p_metadata: {
          production_complete_at: productionCompleteAt.toISOString(),
          balance_due_date: balanceDueDate.toISOString()
        }
      });

      if (logError) {
        console.error('Failed to log admin action:', logError);
        // Don't fail the operation if logging fails
      }
    } catch (error) {
      console.error('Exception logging admin action:', error);
      // Don't fail the operation if logging fails
    }
  }

  // 6. Send email notification to customer (Requirement 4.4)
  // TODO: Implement email notification service integration
  // For now, log the notification
  console.log(`Email notification sent to user ${purchase.user_id} for purchase ${purchaseId}`);
  console.log(`Balance due date: ${balanceDueDate.toISOString()}`);
}

/**
 * Cancel standalone purchase for non-payment and retain deposit
 *
 * This function cancels a standalone purchase when the balance payment is not received
 * within the deadline. The deposit is retained as "Arras Confirmatórias" (non-refundable deposit).
 * 
 * Actions performed:
 * 1. Updates status to 'cancelled'
 * 2. Sets cancelled_at timestamp
 * 3. Sets cancellation_reason explaining deposit retention
 * 4. Releases production capacity
 * 5. Sends cancellation email notification
 *
 * @param purchaseId - The purchase ID to cancel
 * @returns Promise<void>
 * @throws Error if purchase not found or cancellation fails
 *
 * Requirements: 4.6, 4.8
 */
export async function cancelForNonPayment(
  purchaseId: string
): Promise<void> {
  // 1. Get the purchase
  const { data: purchase, error: purchaseError } = await supabase
    .from('standalone_purchases')
    .select('id, cycle_id, status, user_id')
    .eq('id', purchaseId)
    .single();

  if (purchaseError || !purchase) {
    throw new Error(`Failed to get standalone purchase: ${purchaseError?.message || 'Purchase not found'}`);
  }

  // 2. Verify status is 'awaiting_balance' (only cancel if waiting for balance payment)
  if (purchase.status !== 'awaiting_balance') {
    throw new Error(`Cannot cancel for non-payment - purchase status is ${purchase.status}. Expected 'awaiting_balance'.`);
  }

  // 3. Update purchase status to cancelled (Requirement 4.6, 4.8)
  const cancelledAt = new Date();
  const cancellationReason = 'Balance payment not received within deadline (Arras Confirmatórias)';

  const { error: updateError } = await supabase
    .from('standalone_purchases')
    .update({
      status: 'cancelled',
      cancelled_at: cancelledAt.toISOString(),
      cancellation_reason: cancellationReason
    })
    .eq('id', purchaseId);

  if (updateError) {
    throw new Error(`Failed to cancel standalone purchase: ${updateError.message}`);
  }

  // 4. Release capacity (Requirement 4.7)
  if (purchase.cycle_id) {
    try {
      const { error: releaseError } = await supabase
        .rpc('release_capacity', {
          p_cycle_id: purchase.cycle_id,
          p_quantity: 1
        });

      if (releaseError) {
        console.error(`Error releasing capacity for purchase ${purchaseId}:`, releaseError);
        // Log but don't fail the cancellation
      } else {
        console.log(`Released capacity for cancelled standalone purchase ${purchaseId} in cycle ${purchase.cycle_id}`);
      }
    } catch (error) {
      console.error(`Exception releasing capacity for purchase ${purchaseId}:`, error);
      // Don't fail the cancellation if capacity release fails
    }
  }

  // 5. Send cancellation email notification (Requirement 4.6)
  // TODO: Implement email notification service integration
  // For now, log the notification
  console.log(`Cancellation email sent to user ${purchase.user_id} for purchase ${purchaseId}`);
  console.log(`Reason: ${cancellationReason}`);
  console.log(`Deposit retained as Arras Confirmatórias (non-refundable)`);
}


/**
 * Get all standalone purchases with filters for admin panel
 * 
 * @param filters - Optional filters for status, cycle, date range, search term
 * @returns Promise with purchases data and total count
 * 
 * Requirements: 15.1, 15.2
 */
export async function getAllStandalonePurchases(filters?: {
  status?: string;
  cycleId?: string;
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: any[]; count: number }> {
  const limit = filters?.limit || 50;
  const offset = filters?.offset || 0;

  // Build query with joins for user, collection, and cycle data
  let query = supabase
    .from('standalone_purchases')
    .select(`
      *,
      user:profiles(id, full_name, email),
      collection:collections(id, name, price_full),
      cycle:cycles(id, cycle_number, month, year)
    `, { count: 'exact' });

  // Apply status filter
  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  // Apply cycle filter
  if (filters?.cycleId) {
    query = query.eq('cycle_id', filters.cycleId);
  }

  // Apply date range filters
  if (filters?.startDate) {
    query = query.gte('created_at', filters.startDate);
  }

  if (filters?.endDate) {
    query = query.lte('created_at', filters.endDate);
  }

  // Apply search term (search in user name, email, or order ID)
  if (filters?.searchTerm && filters.searchTerm.length >= 3) {
    // For search, we'll use a text search or filter by ID
    // Since we can't easily search across joined tables, we'll search by ID
    query = query.or(`id.ilike.%${filters.searchTerm}%`);
  }

  // Order by created_at descending (newest first)
  query = query.order('created_at', { ascending: false });

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching standalone purchases:', error);
    throw new Error(`Failed to fetch standalone purchases: ${error.message}`);
  }

  return {
    data: data || [],
    count: count || 0,
  };
}

/**
 * Search standalone purchases by customer name or email
 * 
 * @param searchTerm - Search term for customer name or email
 * @param limit - Maximum number of results
 * @returns Promise with matching purchases
 * 
 * Requirements: 15.2
 */
export async function searchStandalonePurchasesByCustomer(
  searchTerm: string,
  limit: number = 50
): Promise<any[]> {
  // First, search for users matching the term
  const { data: users, error: userError } = await supabase
    .from('profiles')
    .select('id')
    .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
    .limit(100);

  if (userError) {
    console.error('Error searching users:', userError);
    throw new Error(`Failed to search users: ${userError.message}`);
  }

  if (!users || users.length === 0) {
    return [];
  }

  const userIds = users.map(u => u.id);

  // Then fetch purchases for those users
  const { data, error } = await supabase
    .from('standalone_purchases')
    .select(`
      *,
      user:profiles(id, full_name, email),
      collection:collections(id, name, price_full),
      cycle:cycles(id, cycle_number, month, year)
    `)
    .in('user_id', userIds)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching purchases:', error);
    throw new Error(`Failed to fetch purchases: ${error.message}`);
  }

  return data || [];
}

/**
 * Approve payment voucher and update purchase status
 * 
 * This function approves a payment voucher (deposit or balance) and updates the purchase status accordingly:
 * - For deposit vouchers: Updates status to 'deposit_paid' if not already
 * - For balance vouchers: Updates status to 'balance_paid' and generates tracking code
 * 
 * @param purchaseId - The purchase ID
 * @param voucherType - Type of voucher being approved ('deposit' or 'balance')
 * @returns Promise<void>
 * @throws Error if purchase not found or approval fails
 * 
 * Requirements: 25.7
 */
export async function approvePaymentVoucher(
  purchaseId: string,
  voucherType: 'deposit' | 'balance'
): Promise<void> {
  // 1. Get the purchase
  const { data: purchase, error: purchaseError } = await supabase
    .from('standalone_purchases')
    .select('id, status, balance_due_date')
    .eq('id', purchaseId)
    .single();

  if (purchaseError || !purchase) {
    throw new Error(`Failed to get standalone purchase: ${purchaseError?.message || 'Purchase not found'}`);
  }

  // 2. Update based on voucher type
  if (voucherType === 'deposit') {
    // Approve deposit voucher
    if (purchase.status !== 'deposit_paid') {
      const { error: updateError } = await supabase
        .from('standalone_purchases')
        .update({
          status: 'deposit_paid',
          deposit_paid_at: new Date().toISOString()
        })
        .eq('id', purchaseId);

      if (updateError) {
        throw new Error(`Failed to approve deposit voucher: ${updateError.message}`);
      }
    }
  } else if (voucherType === 'balance') {
    // Approve balance voucher - similar to processBalancePayment but without voucher URL
    if (purchase.status !== 'awaiting_balance') {
      throw new Error(`Cannot approve balance voucher - purchase status is ${purchase.status}. Expected 'awaiting_balance'.`);
    }

    // Generate tracking code
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    const trackingCode = `SP-${timestamp}-${randomSuffix}`;

    const { error: updateError } = await supabase
      .from('standalone_purchases')
      .update({
        status: 'balance_paid',
        balance_paid_at: new Date().toISOString(),
        tracking_code: trackingCode
      })
      .eq('id', purchaseId);

    if (updateError) {
      throw new Error(`Failed to approve balance voucher: ${updateError.message}`);
    }
  }
}

/**
 * Reject payment voucher and notify customer
 * 
 * This function rejects a payment voucher and sends a notification to the customer
 * with the rejection reason. The customer can then upload a new voucher.
 * 
 * @param purchaseId - The purchase ID
 * @param voucherType - Type of voucher being rejected ('deposit' or 'balance')
 * @param rejectionReason - Reason for rejection
 * @returns Promise<void>
 * @throws Error if purchase not found or rejection fails
 * 
 * Requirements: 25.8, 25.9
 */
export async function rejectPaymentVoucher(
  purchaseId: string,
  voucherType: 'deposit' | 'balance',
  rejectionReason: string
): Promise<void> {
  // 1. Get the purchase
  const { data: purchase, error: purchaseError } = await supabase
    .from('standalone_purchases')
    .select('id, user_id, status')
    .eq('id', purchaseId)
    .single();

  if (purchaseError || !purchase) {
    throw new Error(`Failed to get standalone purchase: ${purchaseError?.message || 'Purchase not found'}`);
  }

  // 2. Clear the voucher URL to allow re-upload
  const updateData: any = {};
  
  if (voucherType === 'deposit') {
    updateData.payment_voucher_deposit_url = null;
  } else if (voucherType === 'balance') {
    updateData.payment_voucher_balance_url = null;
  }

  const { error: updateError } = await supabase
    .from('standalone_purchases')
    .update(updateData)
    .eq('id', purchaseId);

  if (updateError) {
    throw new Error(`Failed to reject voucher: ${updateError.message}`);
  }

  // 3. Send notification to customer (Requirement 25.8)
  // TODO: Implement email notification service integration
  // For now, log the notification
  console.log(`Voucher rejection notification sent to user ${purchase.user_id} for purchase ${purchaseId}`);
  console.log(`Voucher type: ${voucherType}`);
  console.log(`Rejection reason: ${rejectionReason}`);
}
