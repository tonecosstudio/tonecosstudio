/**
 * Standalone Purchase Service
 *
 * Handles creation and management of standalone purchases (single piece purchases
 * without subscription) using the deposit model.
 *
 * Requirements: 4.1, 4.2, 4.3, 7.6
 */

import { supabase } from "@/integrations/supabase/client";
import { logInfo, logError } from "@/lib/logger";
import { callAdminRpc } from "@/services/admin/rpc/admin-rpc-gateway";
import { emailService } from "@/services/notifications/email-service";
import { StandalonePurchase } from "@/types/database";
import { validateBeforeCutoff, CutoffPassedError } from "@/lib/cutoff-middleware";
import { assertCurrentUserId, requireAuthenticatedUserId } from "@/services/auth/current-user";
import { callAuthenticatedEdgeFunction } from "@/services/supabase/edge-function-client";
import { sanitizePostgrestSearchTerm } from "@/lib/postgrest-search";

/**
 * Parameters for creating a standalone purchase
 */
export interface CreateStandalonePurchaseParams {
  userId: string;
  collectionId: string;
  cycleId: string;
  characterId?: string;
  depositVoucherUrl?: string;
}

type RpcError = { message: string } | null;
type RpcResponse<TData = unknown> = PromiseLike<{ data: TData; error: RpcError }>;

interface StandalonePurchaseRpcClient {
  rpc(functionName: 'check_capacity_available', args: {
    p_cycle_id: string;
    p_quantity: number;
  }): RpcResponse<boolean | null>;
  rpc(functionName: 'submit_standalone_balance_voucher', args: {
    p_purchase_id: string;
    p_balance_voucher_url: string;
  }): RpcResponse;
}

const standalonePurchaseRpc = supabase as unknown as StandalonePurchaseRpcClient;

type StandalonePurchaseRow = {
  id: string;
  status: string;
  user_id: string;
  collection_id: string | null;
  cycle_id?: string | null;
  character_id: string | null;
  deposit_amount?: number | null;
  balance_amount?: number | null;
  total_amount?: number | null;
  deposit_paid_at?: string | null;
  balance_paid_at?: string | null;
  balance_due_date?: string | null;
  production_complete_at?: string | null;
  payment_voucher_deposit_url?: string | null;
  payment_voucher_balance_url?: string | null;
  tracking_code: string | null;
  expected_delivery_date?: string | null;
  actual_delivery_date?: string | null;
  created_at: string;
  updated_at: string;
} & Record<string, unknown>;

export type StandalonePurchaseListItem = StandalonePurchaseRow & {
  profiles?: { id: string; full_name: string | null; email: string | null } | null;
  collections?: { id: string; name: string; slug: string | null } | null;
  cycles?: { id: string; month: number; year: number } | null;
  collection_characters?: { id: string; name: string; image_url: string | null } | null;
};

interface CreateStandalonePurchaseEdgeResponse {
  success?: boolean;
  error?: string;
  purchase?: StandalonePurchase;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char] || char);
}

function assertHttpsUrl(value: string, fieldName: string): void {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:') {
      throw new Error('HTTPS required');
    }
  } catch {
    throw new Error(`${fieldName} must be a valid HTTPS URL`);
  }
}

export type StandaloneFulfillmentStatus = 'in_production' | 'shipped' | 'delivered' | 'completed';

export type StandaloneAdminTransitionStatus =
  | 'deposit_paid'
  | 'awaiting_balance'
  | 'balance_paid'
  | 'in_production'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'cancelled';

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 32 || code === 127) return true;
  }

  return false;
}

function assertValidTrackingCode(value: string): string {
  const trackingCode = value.trim();

  if (!trackingCode) {
    throw new Error('Tracking code is required');
  }

  if (trackingCode.length > 100) {
    throw new Error('Tracking code must be at most 100 characters');
  }

  if (trackingCode.includes('<') || trackingCode.includes('>') || hasControlCharacter(trackingCode)) {
    throw new Error('Tracking code contains invalid characters');
  }

  return trackingCode;
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
 * The deposit amount comes from the centralized pricing fallback, and the balance is calculated as
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
  const { userId, collectionId, cycleId, characterId, depositVoucherUrl } = params;
  await assertCurrentUserId(userId);
  if (depositVoucherUrl) {
    assertHttpsUrl(depositVoucherUrl, 'depositVoucherUrl');
  }

  const data = await callAuthenticatedEdgeFunction<CreateStandalonePurchaseEdgeResponse>(
    'create-standalone-purchase',
    {
      collectionId,
      cycleId,
      characterId,
      depositVoucherUrl,
    },
    'Failed to create standalone purchase',
  );

  if (!data?.success || !data.purchase) {
    throw new Error(data?.error || 'Failed to create standalone purchase');
  }

  return data.purchase;
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

  if (!['open', 'active', 'sales'].includes(cycle.status)) {
    return {
      canCreate: false,
      reason: `Cycle is ${cycle.status} - only open cycles accept purchases`
    };
  }

  // 3. Check capacity
  const { data: capacityAvailable, error: capacityError } = await standalonePurchaseRpc
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
  await assertCurrentUserId(userId);

  const { data, error } = await supabase
    .from('standalone_purchases')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get standalone purchases: ${error.message}`);
  }

  return (data || []) as unknown as StandalonePurchase[];
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

  return data as unknown as StandalonePurchase;
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
  _adminUserId?: string
): Promise<void> {
  const cancellationReason = reason || 'Cancelled by admin';
  const result = await callAdminRpc<Record<string, unknown> | null>(
    'admin_cancel_standalone_purchase',
    {
      p_purchase_id: purchaseId,
      p_reason: cancellationReason,
    },
  );

  const capacityReleased = typeof result === 'object' && result && 'capacityReleased' in result
    ? Boolean(result.capacityReleased)
    : false;

  logInfo(`Cancelled standalone purchase ${purchaseId}`, { capacityReleased }, 'standalone-purchase');
}

/**
 * Process balance payment for a standalone purchase
 *
 * This function processes the balance payment for a standalone purchase with the following validations:
 * 1. Verifies the purchase exists and status is 'awaiting_balance'
 * 2. Checks that the balance_due_date has not passed
 * 3. Stores the voucher for admin review without changing paid status
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
  await requireAuthenticatedUserId();
  assertHttpsUrl(balanceVoucherUrl, 'balanceVoucherUrl');

  const { error } = await standalonePurchaseRpc.rpc('submit_standalone_balance_voucher', {
    p_purchase_id: purchaseId,
    p_balance_voucher_url: balanceVoucherUrl
  });

  if (error) {
    const message = error.message || 'Unknown error';
    if (message.includes('PURCHASE_NOT_FOUND')) {
      throw new Error('Failed to get standalone purchase: Purchase not found');
    }
    if (message.includes('FORBIDDEN')) {
      throw new Error('Failed to get standalone purchase: Purchase not found');
    }
    if (message.includes('INVALID_STATUS')) {
      const currentStatus = message.split('INVALID_STATUS:')[1]?.trim() || 'unknown';
      throw new Error(`Cannot process balance payment - purchase status is ${currentStatus}. Expected 'awaiting_balance'.`);
    }
    if (message.includes('BALANCE_DEADLINE_PASSED')) {
      throw new Error('Cannot process balance payment - payment deadline has passed.');
    }
    if (message.includes('INVALID_BALANCE_VOUCHER_URL')) {
      throw new Error('balanceVoucherUrl must be a valid HTTPS URL');
    }
    throw new Error(`Failed to submit balance payment voucher: ${message}`);
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
  _adminUserId?: string
): Promise<void> {
  const result = await callAdminRpc<Record<string, unknown> | null>(
    'admin_mark_standalone_production_complete',
    { p_purchase_id: purchaseId }
  );

  const resultRecord = asRecord(result);
  const balanceDueDate = typeof resultRecord.balanceDueDate === 'string'
    ? resultRecord.balanceDueDate
    : undefined;

  // Send email notification to customer (Requirement 4.4)
  try {
    await emailService.sendProductionStarted(purchaseId);
    logInfo('Production complete email sent',
      { purchaseId, balanceDueDate },
      'standalone-purchase');
  } catch (emailError) {
    logError('Failed to send production complete email', emailError, 'standalone-purchase');
    // Don't fail the operation if email fails
  }
}

/**
 * Update standalone tracking code through the audited admin RPC.
 */
export async function updateStandaloneTrackingCode(
  purchaseId: string,
  trackingCode: string,
  options?: { markShipped?: boolean }
): Promise<void> {
  const safeTrackingCode = assertValidTrackingCode(trackingCode);

  await callAdminRpc(
    'admin_update_standalone_tracking_code',
    {
      p_purchase_id: purchaseId,
      p_tracking_code: safeTrackingCode,
      p_mark_shipped: Boolean(options?.markShipped),
    }
  );
}

/**
 * Move a standalone purchase through post-payment fulfillment states.
 */
export async function updateStandaloneFulfillmentStatus(
  purchaseId: string,
  status: StandaloneFulfillmentStatus,
  notes?: string
): Promise<void> {
  await callAdminRpc(
    'admin_update_standalone_fulfillment_status',
    {
      p_purchase_id: purchaseId,
      p_new_status: status,
      p_notes: notes || null,
    }
  );
}

/**
 * Frontend SSOT for admin standalone status changes.
 * Payment and production transitions are delegated to their dedicated RPCs.
 */
export async function transitionStandalonePurchaseStatus(
  purchaseId: string,
  newStatus: StandaloneAdminTransitionStatus | string,
  options?: { reason?: string; notes?: string }
): Promise<void> {
  switch (newStatus) {
    case 'deposit_paid':
      await approvePaymentVoucher(purchaseId, 'deposit');
      return;
    case 'awaiting_balance':
      await markProductionComplete(purchaseId);
      return;
    case 'balance_paid':
      await approvePaymentVoucher(purchaseId, 'balance');
      return;
    case 'cancelled':
      await cancelStandalonePurchase(purchaseId, options?.reason || 'Cancelled by admin');
      return;
    case 'in_production':
    case 'shipped':
    case 'delivered':
    case 'completed':
      await updateStandaloneFulfillmentStatus(purchaseId, newStatus, options?.notes);
      return;
    default:
      throw new Error(`Unsupported standalone purchase status transition: ${newStatus}`);
  }
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
  void purchaseId;
  throw new Error('cancelForNonPayment is server-side only. Use the cancel-standalone-for-non-payment Edge Function.');
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
}): Promise<{ data: StandalonePurchaseListItem[]; count: number }> {
  const limit = filters?.limit || 50;
  const offset = filters?.offset || 0;

  // Build query with joins for user, collection, and cycle data
  let query = supabase
    .from('standalone_purchases')
    .select(`
      id,
      status,
      user_id,
      collection_id,
      cycle_id,
      character_id,
      deposit_amount,
      balance_amount,
      total_amount,
      deposit_paid_at,
      balance_paid_at,
      balance_due_date,
      payment_voucher_deposit_url,
      payment_voucher_balance_url,
      tracking_code,
      expected_delivery_date,
      actual_delivery_date,
      created_at,
      updated_at,
      profiles(id, full_name, email),
      collections(id, name, slug),
      cycles(id, month, year),
      collection_characters(id, name, image_url)
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
    const searchTerm = sanitizePostgrestSearchTerm(filters.searchTerm);
    // For search, we'll use a text search or filter by ID
    // Since we can't easily search across joined tables, we'll search by ID
    if (searchTerm.length >= 3) {
      query = query.or(`id.ilike.%${searchTerm}%`);
    }
  }

  // Order by created_at descending (newest first)
  query = query.order('created_at', { ascending: false });

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    logError('Error fetching standalone purchases', {
      error,
      code: error.code,
      message: error.message,
      hint: error.hint,
      details: error.details
    }, 'standalone-purchase');
    throw new Error(`Failed to fetch standalone purchases: ${error.message} (code: ${error.code})`);
  }

  return {
    data: (data || []) as unknown as StandalonePurchaseListItem[],
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
): Promise<StandalonePurchaseListItem[]> {
  const safeSearchTerm = sanitizePostgrestSearchTerm(searchTerm);
  if (!safeSearchTerm) return [];

  // First, search for users matching the term
  const { data: users, error: userError } = await supabase
    .from('profiles')
    .select('id')
    .or(`full_name.ilike.%${safeSearchTerm}%,email.ilike.%${safeSearchTerm}%`)
    .limit(100);

  if (userError) {
    logError('Error searching users', userError, 'standalone-purchase');
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
      profiles(id, full_name, email),
      collections(id, name, slug),
      cycles(id, month, year)
    `)
    .in('user_id', userIds)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    logError('Error fetching purchases', error, 'standalone-purchase');
    throw new Error(`Failed to fetch purchases: ${error.message}`);
  }

  return (data || []) as unknown as StandalonePurchaseListItem[];
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
  await callAdminRpc(
    'admin_approve_standalone_payment_voucher',
    {
      p_purchase_id: purchaseId,
      p_voucher_type: voucherType,
    }
  );
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
  const result = await callAdminRpc<Record<string, unknown> | null>(
    'admin_reject_standalone_payment_voucher',
    {
      p_purchase_id: purchaseId,
      p_voucher_type: voucherType,
      p_reason: rejectionReason,
    },
  );

  const resultRecord = asRecord(result);
  const userId = typeof resultRecord.userId === 'string' ? resultRecord.userId : null;

  // Send notification to customer (Requirement 25.8)
  try {
    if (!userId) return;

    // Get user email
    const { data: userData } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    if (userData?.email) {
      const userName = escapeHtml(userData.full_name || userData.email.split('@')[0]);
      const safeRejectionReason = escapeHtml(rejectionReason);
      const voucherTypeName = voucherType === 'deposit' ? 'Depósito' : 'Saldo';

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f59e0b; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9fafb; }
    .reason { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Comprovante Rejeitado</h1>
    </div>
    <div class="content">
      <p>Olá, ${userName}!</p>
      <p>Infelizmente, o comprovante de pagamento do <strong>${voucherTypeName}</strong> foi rejeitado.</p>
      <div class="reason">
        <strong>Motivo:</strong><br>
        ${safeRejectionReason}
      </div>
      <p>Por favor, envie um novo comprovante válido para prosseguir com seu pedido.</p>
      <p>Se tiver dúvidas, entre em contato conosco.</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ORDAX. Todos os direitos reservados.</p>
    </div>
  </div>
</body>
</html>`;

      await emailService.sendEmail(
        userData.email,
        `Comprovante de ${voucherTypeName} Rejeitado - ORDAX`,
        html,
        'voucher_rejection',
        userId,
        { purchase_id: purchaseId, voucher_type: voucherType, reason: rejectionReason }
      );

      logInfo(`Voucher rejection notification sent to user ${userId}`,
        { purchaseId, voucherType, reason: rejectionReason },
        'standalone-purchase');
    }
  } catch (emailError) {
    logError('Failed to send voucher rejection email', emailError, 'standalone-purchase');
    // Don't fail the operation if email fails
  }
}
