/**
 * Character Choice Service
 *
 * Service for managing character choices in the admin interface.
 * Provides functions to fetch, approve, reject, and manage character choices.
 */

import { supabase } from "@/integrations/supabase/client";
import type { ChoiceStatus } from "./production-service";

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
  collectionId: string;
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
  order_id: string;
  order_type: "subscription_delivery" | "standalone_purchase";
  user_id: string;
  customer_name: string | null;
  customer_email: string | null;
  collection_id: string;
  collection_name: string | null;
  character_id: string | null;
  character_name: string | null;
  character_image_url: string | null;
  status: ChoiceStatus;
  submitted_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  approved_by_name: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  deadline: string;
  reminders_sent: number | null;
  last_reminder_at: string | null;
  previous_choice_id: string | null;
  change_reason: string | null;
  change_count: number | null;
  created_at: string;
  updated_at: string;
}

function mapCharacterChoice(item: RawCharacterChoiceRow): CharacterChoice {
  return {
    id: item.id,
    orderId: item.order_id,
    orderType: item.order_type,
    userId: item.user_id,
    customerName: item.customer_name || "Unknown",
    customerEmail: item.customer_email || "",
    collectionId: item.collection_id,
    collectionName: item.collection_name || "Unknown Collection",
    characterId: item.character_id,
    characterName: item.character_name,
    characterImageUrl: item.character_image_url,
    status: item.status,
    submittedAt: item.submitted_at,
    approvedAt: item.approved_at,
    approvedBy: item.approved_by,
    approvedByName: item.approved_by_name,
    rejectedAt: item.rejected_at,
    rejectionReason: item.rejection_reason,
    deadline: item.deadline,
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
  // Query character_choices without joins - use denormalized fields
  let query = supabase
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

  // Transform data using denormalized fields
  const choices: CharacterChoice[] = ((data || []) as RawCharacterChoiceRow[]).map(mapCharacterChoice);

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
  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  // Get user profile for name
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  const approverName = profile?.full_name || profile?.email || "Admin";

  // Update choice
  const { data, error } = await supabase
    .from("character_choices")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: user.id,
      approved_by_name: approverName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", choiceId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Error approving choice: ${error?.message || "Update failed"}`);
  }

  // TODO: Update production_queue.choice_status to 'approved'
  // TODO: Send notification to customer

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
  // Update choice
  const { data, error } = await supabase
    .from("character_choices")
    .update({
      status: "rejected",
      rejected_at: new Date().toISOString(),
      rejection_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", choiceId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Error rejecting choice: ${error?.message || "Update failed"}`);
  }

  // TODO: Update production_queue.choice_status to 'rejected'
  // TODO: Send notification to customer with reason

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
  // Update choice
  const { data, error } = await supabase
    .from("character_choices")
    .update({
      deadline: newDeadline,
      updated_at: new Date().toISOString(),
    })
    .eq("id", choiceId)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Error extending deadline: ${error?.message || "Update failed"}`);
  }

  // TODO: Update production_queue.choice_deadline
  // TODO: Send notification to customer about extension

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
  // Query character_choices without joins - use denormalized fields
  const { data, error } = await supabase
    .from("character_choices")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Error fetching choice history: ${error.message}`);
  }

  // Transform data using denormalized fields
  return ((data || []) as RawCharacterChoiceRow[]).map(mapCharacterChoice);
}
