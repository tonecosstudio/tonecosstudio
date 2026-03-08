// =====================================================
// Types for Chat Groups System
// =====================================================

// Enums
export type GroupType = "manual" | "assinantes" | "colecao" | "lancamentos" | "pedidos";

// Membership Criteria Types
export type MembershipCriteria =
  | { type: "assinantes"; subscriptionStatus: "active"; collectionId?: string; plan?: string }
  | { type: "colecao"; collectionId: string }
  | { type: "lancamentos"; criteria: "all_users" | "previous_buyers" }
  | { type: "pedidos"; status?: string[]; dateFrom?: string; dateTo?: string }
  | null;

// Main Entities
export interface Group {
  id: string;
  name: string;
  type: GroupType;
  membership_criteria: MembershipCriteria;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  last_viewed_at: string | null;
  joined_at: string;
}

export interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  message: string;
  action_button_text?: string | null;
  action_button_url?: string | null;
  link_text?: string | null;
  link_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EnrichedGroupMessage extends GroupMessage {
  sender_name: string;
  sender_avatar: string | null;
  attachments: GroupAttachment[];
}

export interface GroupAttachment {
  id: string;
  message_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  thumbnail_path: string | null;
  uploaded_by: string;
  created_at: string;
}

// Extended Types with Computed Data
export interface GroupDetails extends Group {
  member_count: number;
  message_count: number;
  last_message_at: string | null;
  estimated_view_rate: number;
}

export interface GroupWithMetrics extends Group {
  member_count: number;
  message_count: number;
  last_message_at: string | null;
}

export interface MemberGroupView {
  id: string;
  name: string;
  type: GroupType;
  unread_count: number;
  last_message: {
    message: string;
    sender_name: string;
    created_at: string;
  } | null;
  last_viewed_at: string | null;
}

export interface GroupMetrics {
  total_members: number;
  total_messages: number;
  estimated_view_rate: number;
}

// Form Data Types
export interface CreateGroupInput {
  name: string;
  type: GroupType;
  membership_criteria?: MembershipCriteria;
  created_by: string;
}

export interface PaginatedMembers {
  members: Array<{
    user_id: string;
    user_name: string;
    user_email: string;
    joined_at: string;
    last_viewed_at: string | null;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface Pagination {
  page: number;
  limit: number;
}

// Validation Result
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// Constants
export const GROUP_TYPES: GroupType[] = [
  "manual",
  "assinantes",
  "colecao",
  "lancamentos",
  "pedidos",
];

// Helper functions
export function getGroupTypeLabel(type: GroupType): string {
  const labels: Record<GroupType, string> = {
    manual: "Manual",
    assinantes: "Assinantes",
    colecao: "Coleção",
    lancamentos: "Lançamentos",
    pedidos: "Pedidos",
  };
  return labels[type];
}

// Validation functions
export function validateGroupName(name: string): ValidationResult {
  if (!name || name.trim().length < 3) {
    return { valid: false, error: "Nome do grupo deve ter pelo menos 3 caracteres" };
  }
  if (name.length > 100) {
    return { valid: false, error: "Nome do grupo deve ter no máximo 100 caracteres" };
  }
  return { valid: true };
}

export function validateGroupType(type: string): ValidationResult {
  if (!GROUP_TYPES.includes(type as GroupType)) {
    return { valid: false, error: "Tipo de grupo inválido" };
  }
  return { valid: true };
}

export function validateMembershipCriteria(
  type: GroupType,
  criteria: MembershipCriteria
): ValidationResult {
  // Manual groups should not have criteria
  if (type === "manual" && criteria !== null) {
    return { valid: false, error: "Grupos manuais não devem ter critérios de associação" };
  }

  // Non-manual groups should have criteria
  if (type !== "manual" && !criteria) {
    return { valid: false, error: "Grupos automáticos devem ter critérios de associação" };
  }

  // Validate collection groups have collectionId
  if (type === "colecao" && criteria?.type === "colecao" && !criteria.collectionId) {
    return { valid: false, error: "Grupos de coleção devem especificar um ID de coleção" };
  }

  return { valid: true };
}
