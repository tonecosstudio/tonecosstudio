// =====================================================
// Types for Advanced Chat Support System
// =====================================================

// Enums
export type ConversationStatus =
  | "new"
  | "waiting_admin"
  | "waiting_customer"
  | "resolved"
  | "closed";
export type ConversationPriority = "low" | "normal" | "high" | "urgent";
export type ConversationTag =
  | "pedido"
  | "orcamento"
  | "duvida"
  | "reclamacao"
  | "assinatura"
  | "urgente";
export type RiskFlag = "cliente_conflito" | "atraso_critico" | "pagamento_problema";
export type SenderType = "admin" | "customer" | "system";

// REMOVED: OrderStatus - use UnifiedOrderStatus from @/types/admin/orders instead
// This type has been consolidated into the unified order system

export type ProductionStage =
  | "molde_pronto"
  | "impressao_iniciada"
  | "pintura_iniciada"
  | "finalizacao";
export type ReminderType = "quote_followup" | "payment_pending" | "promised_date";

// Main Entities
export interface Conversation {
  id: string;
  user_id: string;
  subject: string;
  status: ConversationStatus;
  priority: ConversationPriority;
  tags: ConversationTag[];
  risk_flags: RiskFlag[];
  assigned_to?: string;
  promised_date?: string;
  first_response_at?: string;
  resolved_at?: string;
  last_message_at: string;
  created_at: string;
  updated_at: string;

  // Relacionamentos
  order_id?: string;
  quote_id?: string;
  subscription_id?: string;
  payment_id?: string;

  // Dados computados (não vêm do banco)
  user_email?: string;
  user_name?: string;
  unread_count?: number;
  hours_since_last_message?: number;
  is_overdue?: boolean;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: SenderType;
  message: string;
  is_internal: boolean;
  read_by_admin: boolean;
  read_by_customer: boolean;
  created_at: string;
  updated_at: string;
  edited_at?: string;
  deleted_at?: string;
  deleted_by?: string;

  // Relacionamentos
  attachments?: Attachment[];
  sender_name?: string;
}

export interface Attachment {
  id: string;
  message_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  thumbnail_path?: string;
  uploaded_by: string;
  created_at: string;
}

export interface QuickReply {
  id: string;
  category: string;
  title: string;
  message: string;
  display_order: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface OrderProductionStage {
  id: string;
  order_id: string;
  stage: ProductionStage;
  notes?: string;
  created_by: string;
  created_at: string;
}

export interface ConversationReminder {
  id: string;
  conversation_id: string;
  reminder_type: ReminderType;
  scheduled_for: string;
  sent_at?: string;
  is_active: boolean;
  created_at: string;
}

export interface OrderStatusTemplate {
  id: string;
  status: string; // Generic status string for templates
  message_template: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Integration Types
// NOTE: This interface is for the support system context only
// For unified order management, use UnifiedOrder from @/types/admin/orders
// Renamed to SupportOrder to avoid confusion with UnifiedOrder
export interface SupportOrder {
  id: string;
  reference_number: string;
  user_id: string;
  amount: number;
  status: string; // Generic status string
  payment_type: string;
  created_at: string;
  tracking_code?: string;
  production_stages?: OrderProductionStage[];
}

// Legacy export for backward compatibility - will be removed
export type Order = SupportOrder;

export interface Quote {
  id: string;
  user_id: string;
  status: string;
  payment_status: string;
  total_amount: number;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  next_billing_date: string;
  created_at: string;
}

export interface ManualPayment {
  id: string;
  user_id: string;
  reference_number: string;
  amount: number;
  status: string;
  payment_method: string;
  created_at: string;
}

// Dashboard Metrics
export interface DashboardMetrics {
  open_count: number;
  waiting_customer_count: number;
  resolved_today_count: number;
  total_count: number;
  overdue_24h_count: number;
  avg_first_response_minutes: number;
  conversations_with_risk: number;
  conversations_overdue_promise: number;
}

// Filter and Pagination Types
export interface ConversationFilters {
  status?: ConversationStatus;
  tags?: ConversationTag[];
  risk_flags?: RiskFlag[];
  search?: string;
  assigned_to?: string;
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
  order_by?: string;
  order_direction?: "asc" | "desc";
}

// Form Data Types
export interface CreateConversationData {
  user_id: string;
  subject: string;
  status?: ConversationStatus;
  priority?: ConversationPriority;
  tags?: ConversationTag[];
  order_id?: string;
  quote_id?: string;
  subscription_id?: string;
  payment_id?: string;
}

export interface SendMessageData {
  conversation_id: string;
  sender_id: string;
  sender_type: SenderType;
  message: string;
  is_internal?: boolean;
  attachments?: File[];
}

export interface FileMetadata {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  thumbnail_path?: string;
  public_url: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// Constants
export const CONVERSATION_STATUSES: ConversationStatus[] = [
  "new",
  "waiting_admin",
  "waiting_customer",
  "resolved",
  "closed",
];

export const CONVERSATION_TAGS: ConversationTag[] = [
  "pedido",
  "orcamento",
  "duvida",
  "reclamacao",
  "assinatura",
  "urgente",
];

export const RISK_FLAGS: RiskFlag[] = ["cliente_conflito", "atraso_critico", "pagamento_problema"];

export const PRODUCTION_STAGES: ProductionStage[] = [
  "molde_pronto",
  "impressao_iniciada",
  "pintura_iniciada",
  "finalizacao",
];

// REMOVED: ORDER_STATUSES - use status arrays from @/types/admin/orders instead
// REMOVED: getOrderStatusLabel - use getStatusLabel from @/services/admin/orders-validator instead

// Helper functions
export function getStatusLabel(status: ConversationStatus): string {
  const labels: Record<ConversationStatus, string> = {
    new: "Nova",
    waiting_admin: "Aguardando Admin",
    waiting_customer: "Aguardando Cliente",
    resolved: "Resolvida",
    closed: "Fechada",
  };
  return labels[status];
}

export function getTagLabel(tag: ConversationTag): string {
  const labels: Record<ConversationTag, string> = {
    pedido: "Pedido",
    orcamento: "Orçamento",
    duvida: "Dúvida",
    reclamacao: "Reclamação",
    assinatura: "Assinatura",
    urgente: "Urgente",
  };
  return labels[tag];
}

export function getRiskFlagLabel(flag: RiskFlag): string {
  const labels: Record<RiskFlag, string> = {
    cliente_conflito: "Cliente em Conflito",
    atraso_critico: "Atraso Crítico",
    pagamento_problema: "Problema de Pagamento",
  };
  return labels[flag];
}

export function getProductionStageLabel(stage: ProductionStage): string {
  const labels: Record<ProductionStage, string> = {
    molde_pronto: "Molde Pronto",
    impressao_iniciada: "Impressão Iniciada",
    pintura_iniciada: "Pintura Iniciada",
    finalizacao: "Finalização",
  };
  return labels[stage];
}
