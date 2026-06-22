/**
 * Character Choice Service
 *
 * Service for managing character choices in the admin interface.
 * Provides functions to fetch, approve, reject, and manage character choices.
 */

import { supabase } from "@/integrations/supabase/client";
import { callAdminRpc } from "@/services/admin/admin-rpc-gateway";
import type { ChoiceStatus } from "@/services/admin/production/production-service";

// ============================================================================
// Types
// ============================================================================

export interface CharacterChoice {
  id: string;
  orderId: string;
  orderType: "subscription_delivery" | "standalone_purchase";
  userId: string;
  customerName: string;
  customerEmail: string;
  collectionId: string | null;
  collectionName: string;
  characterId: string | null;
  characterName: string | null;
  characterImageUrl: string | null;
  status: ChoiceStatus;
  submittedAt: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  approvedByName: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  deadline: string;
  remindersSent: number;
  lastReminderAt: string | null;
  previousChoiceId: string | null;
  changeReason: string | null;
  changeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChoiceFilters {
  statuses?: ChoiceStatus[];
  collections?: string[];
  dateFrom?: string;
  dateTo?: string;
  searchQuery?: string;
}

export interface ChoiceCollectionFilterOption {
  id: string;
  name: string;
}

interface RawCharacterChoiceRow {
  id: string;
  order_id: string | null;
  order_type: string | null;
  user_id: string;
  customer_name: string | null;
  customer_email: string | null;
  collection_id: string | null;
  collection_name: string | null;
  character_id: string | null;
  character_name: string | null;
  character_image_url: string | null;
  status: string;
  submitted_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  approved_by_name: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  deadline: string | null;
  reminders_sent: number | null;
  last_reminder_at: string | null;
  previous_choice_id: string | null;
  change_reason: string | null;
  change_count: number | null;
  created_at: string;
  updated_at: string;
}

interface CharacterChoicesQuery extends PromiseLike<{
  data: RawCharacterChoiceRow[] | null;
  error: { message: string } | null;
}> {
  eq(column: "order_id", value: string): CharacterChoicesQuery;
  gte(column: "deadline", value: string): CharacterChoicesQuery;
  in(column: "status" | "collection_id", values: readonly string[]): CharacterChoicesQuery;
  lte(column: "deadline", value: string): CharacterChoicesQuery;
  order(column: "deadline" | "created_at", options?: { ascending?: boolean }): CharacterChoicesQuery;
}

interface CharacterChoicesGateway {
  from(table: "character_choices"): {
    select(columns: "*"): CharacterChoicesQuery;
  };
}

const characterChoicesGateway = supabase as unknown as CharacterChoicesGateway;

function isChoiceOrderType(value: string | null): value is CharacterChoice["orderType"] {
  return value === "subscription_delivery" || value === "standalone_purchase";
}

function requireChoiceOrderId(value: string | null, choiceId: string): string {
  if (!value) {
    throw new Error(`Character choice ${choiceId} is missing order_id`);
  }

  return value;
}

function requireChoiceOrderType(value: string | null, choiceId: string): CharacterChoice["orderType"] {
  if (!isChoiceOrderType(value)) {
    throw new Error(`Character choice ${choiceId} has an invalid order_type`);
  }

  return value;
}

function isChoiceStatus(value: string): value is ChoiceStatus {
  return (
    value === "pending" ||
    value === "submitted" ||
    value === "approved" ||
    value === "rejected" ||
    value === "locked" ||
    value === "expired"
  );
}

function requireChoiceStatus(value: string, choiceId: string): ChoiceStatus {
  if (!isChoiceStatus(value)) {
    throw new Error(`Character choice ${choiceId} has an invalid status`);
  }

  return value;
}

function requireChoiceDeadline(value: string | null, choiceId: string): string {
  if (!value) {
    throw new Error(`Character choice ${choiceId} is missing deadline`);
  }

  return value;
}

function mapCharacterChoice(item: RawCharacterChoiceRow): CharacterChoice {
  return {
    id: item.id,
    orderId: requireChoiceOrderId(item.order_id, item.id),
    orderType: requireChoiceOrderType(item.order_type, item.id),
    userId: item.user_id,
    customerName: item.customer_name || "Unknown",
    customerEmail: item.customer_email || "",
    collectionId: item.collection_id,
    collectionName: item.collection_name || "Unknown Collection",
    characterId: item.character_id,
    characterName: item.character_name,
    characterImageUrl: item.character_image_url,
    status: requireChoiceStatus(item.status, item.id),
    submittedAt: item.submitted_at,
    approvedAt: item.approved_at,
    approvedBy: item.approved_by,
    approvedByName: item.approved_by_name,
    rejectedAt: item.rejected_at,
    rejectionReason: item.rejection_reason,
    deadline: requireChoiceDeadline(item.deadline, item.id),
    remindersSent: item.reminders_sent || 0,
    lastReminderAt: item.last_reminder_at,
    previousChoiceId: item.previous_choice_id,
    changeReason: item.change_reason,
    changeCount: item.change_count || 0,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Fetch pending character choices with filters
 *
 * @param filters - Filters to apply
 * @returns Array of character choices
 */
export async function fetchPendingChoices(
  filters: ChoiceFilters = {}
): Promise<CharacterChoice[]> {
  let query = characterChoicesGateway
    .from("character_choices")
    .select("*")
    .order("deadline", { ascending: true });

  // Apply status filter
  if (filters.statuses && filters.statuses.length > 0) {
    query = query.in("status", filters.statuses);
  }

  // Apply collection filter
  if (filters.collections && filters.collections.length > 0) {
    query = query.in("collection_id", filters.collections);
  }

  // Apply date range filter (deadline)
  if (filters.dateFrom) {
    query = query.gte("deadline", filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte("deadline", filters.dateTo);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Error fetching character choices: ${error.message}`);
  }

  const choices = (data || []).map(mapCharacterChoice);

  // Apply search filter (client-side for now)
  if (filters.searchQuery && filters.searchQuery.trim()) {
    const searchTerm = filters.searchQuery.trim().toLowerCase();
    return choices.filter(
      (choice) =>
        choice.customerName.toLowerCase().includes(searchTerm) ||
        choice.customerEmail.toLowerCase().includes(searchTerm)
    );
  }

  return choices;
}

export async function fetchActiveChoiceCollections(): Promise<ChoiceCollectionFilterOption[]> {
  const { data, error } = await supabase
    .from("collections")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  if (error) {
    throw new Error(`Error fetching choice collections: ${error.message}`);
  }

  return (data || []) as ChoiceCollectionFilterOption[];
}

/**
 * Approve a character choice
 *
 * @param choiceId - ID of the choice to approve
 * @returns Updated character choice
 */
export async function approveChoice(choiceId: string): Promise<CharacterChoice> {
  await callAdminRpc("admin_approve_character_choice", {
    p_choice_id: choiceId,
  });

  // Fetch full choice data
  const choices = await fetchPendingChoices({});
  const updatedChoice = choices.find((c) => c.id === choiceId);

  if (!updatedChoice) {
    throw new Error("Failed to fetch updated choice");
  }

  return updatedChoice;
}

/**
 * Reject a character choice
 *
 * @param choiceId - ID of the choice to reject
 * @param reason - Reason for rejection
 * @returns Updated character choice
 */
export async function rejectChoice(
  choiceId: string,
  reason: string
): Promise<CharacterChoice> {
  await callAdminRpc("admin_reject_character_choice", {
    p_choice_id: choiceId,
    p_reason: reason,
  });

  // Fetch full choice data
  const choices = await fetchPendingChoices({});
  const updatedChoice = choices.find((c) => c.id === choiceId);

  if (!updatedChoice) {
    throw new Error("Failed to fetch updated choice");
  }

  return updatedChoice;
}

/**
 * Extend the deadline for a character choice
 *
 * @param choiceId - ID of the choice
 * @param newDeadline - New deadline date (ISO string)
 * @returns Updated character choice
 */
export async function extendDeadline(
  choiceId: string,
  newDeadline: string
): Promise<CharacterChoice> {
  await callAdminRpc("admin_extend_character_choice_deadline", {
    p_choice_id: choiceId,
    p_new_deadline: newDeadline,
  });

  // Fetch full choice data
  const choices = await fetchPendingChoices({});
  const updatedChoice = choices.find((c) => c.id === choiceId);

  if (!updatedChoice) {
    throw new Error("Failed to fetch updated choice");
  }

  return updatedChoice;
}

/**
 * Get choice history for an order
 *
 * @param orderId - ID of the order
 * @returns Array of character choices (history)
 */
export async function getChoiceHistory(orderId: string): Promise<CharacterChoice[]> {
  const { data, error } = await characterChoicesGateway
    .from("character_choices")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Error fetching choice history: ${error.message}`);
  }

  return (data || []).map(mapCharacterChoice);
}
