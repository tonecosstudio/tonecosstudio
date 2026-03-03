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
  // Start query
  let query = supabase
    .from("character_choices")
    .select(`
      *,
      profiles!character_choices_user_id_fkey(full_name, email),
      collections(name),
      collection_characters(name, image_url)
    `)
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

  // Transform data
  const choices: CharacterChoice[] = (data || []).map((item: any) => ({
    id: item.id,
    orderId: item.order_id,
    orderType: item.order_type,
    userId: item.user_id,
    customerName: item.profiles?.full_name || item.profiles?.email || "Unknown",
    customerEmail: item.profiles?.email || "",
    collectionId: item.collection_id,
    collectionName: item.collections?.name || "Unknown Collection",
    characterId: item.character_id,
    characterName: item.collection_characters?.name || null,
    characterImageUrl: item.collection_characters?.image_url || null,
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
  }));

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
  const { data, error } = await supabase
    .from("character_choices")
    .select(`
      *,
      profiles!character_choices_user_id_fkey(full_name, email),
      collections(name),
      collection_characters(name, image_url)
    `)
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Error fetching choice history: ${error.message}`);
  }

  // Transform data
  return (data || []).map((item: any) => ({
    id: item.id,
    orderId: item.order_id,
    orderType: item.order_type,
    userId: item.user_id,
    customerName: item.profiles?.full_name || item.profiles?.email || "Unknown",
    customerEmail: item.profiles?.email || "",
    collectionId: item.collection_id,
    collectionName: item.collections?.name || "Unknown Collection",
    characterId: item.character_id,
    characterName: item.collection_characters?.name || null,
    characterImageUrl: item.collection_characters?.image_url || null,
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
  }));
}
