/**
 * PaymentMethodService - Service for managing admin payment methods
 *
 * Requirements: 1.1-1.10, 2.1-2.4
 * Design: .kiro/specs/manual-payment-system/design.md
 *
 * This service handles CRUD operations for payment methods configured by admins.
 * Payment methods include PIX, PagSeguro, PicPay, PayPal, bank transfers, etc.
 */

import { supabase } from "@/integrations/supabase/client";
import { callAuthenticatedEdgeFunction } from "@/services/supabase/edge-function-client";
import type { PaymentMethod, PaymentMethodInput } from "@/types/manual-payment";

/**
 * Cache for active payment methods
 * Cached for 5 minutes to reduce database queries
 */
let activeMethodsCache: {
  data: PaymentMethod[] | null;
  timestamp: number;
} = {
  data: null,
  timestamp: 0,
};

const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

type PaymentMethodUpdateData = Partial<
  Pick<
    PaymentMethod,
    | "name"
    | "type"
    | "instructions"
    | "payment_link"
    | "pix_key"
    | "account_details"
    | "is_active"
    | "is_default"
    | "display_order"
  >
>;

type PaymentMethodPayload = Record<string, unknown>;

interface AdminPaymentMethodsResponse<TData> {
  ok?: boolean;
  data?: TData | null;
  error?: string;
}

function mapPaymentMethodError(
  message: string | undefined,
  fallback: string,
): string {
  const value = message ?? "";
  if (value.includes("PAYMENT_METHOD_NOT_FOUND"))
    return "Payment method not found";
  if (value.includes("INVALID_PAYMENT_METHOD_NAME"))
    return "Payment method name is invalid";
  if (value.includes("INVALID_PAYMENT_METHOD_TYPE"))
    return "Payment method type is invalid";
  if (value.includes("INVALID_PAYMENT_METHOD_INSTRUCTIONS")) {
    return "Payment instructions are invalid";
  }
  if (value.includes("INVALID_PAYMENT_METHOD_LINK"))
    return "Payment link must be HTTPS";
  if (value.includes("INVALID_PAYMENT_METHOD_PIX_KEY"))
    return "PIX key is invalid";
  if (value.includes("INVALID_PAYMENT_METHOD_ORDER"))
    return "Display order is invalid";
  return `${fallback}: ${value || "Unknown error"}`;
}

async function callAdminPaymentMethods<TData>(
  body: PaymentMethodPayload,
  fallback: string,
): Promise<TData> {
  const response = await callAuthenticatedEdgeFunction<
    AdminPaymentMethodsResponse<TData>,
    PaymentMethodPayload
  >("admin-payment-methods", body, fallback);

  if (!response?.ok) {
    throw new Error(mapPaymentMethodError(response?.error, fallback));
  }

  if (response.data === null || response.data === undefined) {
    throw new Error(fallback);
  }

  return response.data;
}

/**
 * List all active payment methods
 * Results are cached for 5 minutes
 *
 * @returns Array of active payment methods sorted by display_order
 * @throws Error if database query fails
 */
export async function listActivePaymentMethods(): Promise<PaymentMethod[]> {
  const now = Date.now();

  // Return cached data if still valid
  if (
    activeMethodsCache.data &&
    now - activeMethodsCache.timestamp < CACHE_DURATION_MS
  ) {
    return activeMethodsCache.data;
  }

  const { data, error } = await supabase
    .from("admin_payment_methods")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to list active payment methods: ${error.message}`);
  }

  // Update cache
  activeMethodsCache = {
    data: data as PaymentMethod[],
    timestamp: now,
  };

  return data as PaymentMethod[];
}

/**
 * Get a payment method by ID
 * Results are cached for 5 minutes
 *
 * @param id - Payment method UUID
 * @returns Payment method or null if not found
 * @throws Error if database query fails
 */
export async function getPaymentMethodById(
  id: string,
): Promise<PaymentMethod | null> {
  const { data, error } = await supabase
    .from("admin_payment_methods")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to get payment method: ${error.message}`);
  }

  return data as PaymentMethod | null;
}

/**
 * Create a new payment method
 * Validates required fields and clears cache
 *
 * @param input - Payment method data
 * @returns Created payment method
 * @throws Error if validation fails or database insert fails
 */
export async function createPaymentMethod(
  input: PaymentMethodInput,
): Promise<PaymentMethod> {
  // Validate required fields
  if (!input.name || input.name.trim().length === 0) {
    throw new Error("Payment method name is required");
  }

  if (!input.type) {
    throw new Error("Payment method type is required");
  }

  if (!input.instructions || input.instructions.trim().length === 0) {
    throw new Error("Payment instructions are required");
  }

  // Prepare data for insertion
  const insertData = {
    name: input.name.trim(),
    type: input.type,
    instructions: input.instructions.trim(),
    payment_link: input.payment_link || null,
    pix_key: input.pix_key || null,
    account_details: input.account_details || null,
    is_active: input.is_active,
    is_default: input.is_default || false,
    display_order: input.display_order || 0,
  };

  const data = await callAdminPaymentMethods<PaymentMethod>(
    { action: "create", data: insertData },
    "Failed to create payment method",
  );

  // Clear cache
  clearPaymentMethodCache();

  return data;
}

/**
 * Update an existing payment method
 * Clears cache after successful update
 *
 * @param id - Payment method UUID
 * @param input - Partial payment method data to update
 * @returns Updated payment method
 * @throws Error if database update fails
 */
export async function updatePaymentMethod(
  id: string,
  input: Partial<PaymentMethodInput>,
): Promise<PaymentMethod> {
  // Prepare update data (only include provided fields)
  const updateData: PaymentMethodUpdateData = {};

  if (input.name !== undefined) {
    if (input.name.trim().length === 0) {
      throw new Error("Payment method name cannot be empty");
    }
    updateData.name = input.name.trim();
  }

  if (input.type !== undefined) {
    updateData.type = input.type;
  }

  if (input.instructions !== undefined) {
    if (input.instructions.trim().length === 0) {
      throw new Error("Payment instructions cannot be empty");
    }
    updateData.instructions = input.instructions.trim();
  }

  if (input.payment_link !== undefined) {
    updateData.payment_link = input.payment_link || null;
  }

  if (input.pix_key !== undefined) {
    updateData.pix_key = input.pix_key || null;
  }

  if (input.account_details !== undefined) {
    updateData.account_details = input.account_details || null;
  }

  if (input.is_active !== undefined) {
    updateData.is_active = input.is_active;
  }

  if (input.is_default !== undefined) {
    updateData.is_default = input.is_default;
  }

  if (input.display_order !== undefined) {
    updateData.display_order = input.display_order;
  }

  const data = await callAdminPaymentMethods<PaymentMethod>(
    {
      action: "update",
      methodId: id,
      data: updateData as PaymentMethodPayload,
    },
    "Failed to update payment method",
  );

  // Clear cache
  clearPaymentMethodCache();

  return data;
}

/**
 * Set a payment method as default
 * Automatically unsets any previously default payment method (handled by database trigger)
 *
 * @param id - Payment method UUID to set as default
 * @throws Error if database update fails
 */
export async function setDefaultPaymentMethod(id: string): Promise<void> {
  await callAdminPaymentMethods<boolean>(
    { action: "setDefault", methodId: id },
    "Failed to set default payment method",
  );

  // Clear cache
  clearPaymentMethodCache();
}

/**
 * Toggle the active status of a payment method
 *
 * @param id - Payment method UUID
 * @param isActive - New active status
 * @throws Error if database update fails
 */
export async function togglePaymentMethodActive(
  id: string,
  isActive: boolean,
): Promise<void> {
  await callAdminPaymentMethods<boolean>(
    { action: "toggleActive", methodId: id, isActive },
    "Failed to toggle payment method active status",
  );

  // Clear cache
  clearPaymentMethodCache();
}

/**
 * Delete a payment method.
 *
 * @param id - Payment method UUID
 * @throws Error if database delete fails
 */
export async function deletePaymentMethod(id: string): Promise<void> {
  await callAdminPaymentMethods<boolean>(
    { action: "delete", methodId: id },
    "Failed to delete payment method",
  );

  clearPaymentMethodCache();
}

/**
 * Clear the payment methods cache
 * Should be called after any mutation operation
 */
export function clearPaymentMethodCache(): void {
  activeMethodsCache = {
    data: null,
    timestamp: 0,
  };
}

/**
 * List all payment methods (admin only)
 * Returns both active and inactive methods
 *
 * @returns Array of all payment methods sorted by display_order
 * @throws Error if database query fails
 */
export async function listAllPaymentMethods(): Promise<PaymentMethod[]> {
  return callAdminPaymentMethods<PaymentMethod[]>(
    { action: "list" },
    "Failed to list all payment methods",
  );
}
