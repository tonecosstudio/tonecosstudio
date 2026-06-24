import type { PaymentFile, PaymentMethod } from "@/types/manual-payment";

/**
 * Tipos TypeScript para o Sistema de Pedidos Unificados
 * 
 * Este arquivo define os tipos para a consolidação das páginas de
 * assinaturas, entregas e compras avulsas em uma única interface.
 * 
 * IMPORTANTE: Este arquivo não usa @ts-nocheck para garantir segurança de tipos.
 * Todos os tipos são explicitamente definidos e validados pelo TypeScript.
 */

// ============================================================================
// Status de Pedidos
// ============================================================================

/**
 * Status de pagamento (separado de produção)
 */
export type PaymentStatus =
  | 'pending'           // Aguardando pagamento inicial
  | 'deposit_paid'      // Depósito pago, aguardando saldo
  | 'balance_pending'   // Produto pronto, aguardando saldo
  | 'paid'              // Pagamento completo
  | 'overdue'           // Pagamento atrasado
  | 'cancelled';        // Cancelado

/**
 * Status de produção (separado de pagamento)
 */
export type ProductionStatus =
  | 'not_started'       // Não iniciado (aguardando pagamento)
  | 'ready_to_start'    // Pronto para iniciar (pagamento OK)
  | 'in_production'     // Em produção
  | 'quality_check'     // Em controle de qualidade
  | 'ready_to_ship'     // Pronto para envio
  | 'shipped'           // Enviado
  | 'delivered'         // Entregue
  | 'on_hold'           // Pausado/Bloqueado
  | 'cancelled';        // Cancelado

/**
 * Status possíveis para entregas de assinatura
 */
export type SubscriptionDeliveryStatus =
  | 'scheduled'        // Entrega agendada
  | 'pending_choice'   // Aguardando escolha do personagem
  | 'confirmed'        // Confirmada
  | 'in_production'    // Em produção
  | 'shipped'          // Enviada
  | 'delivered'        // Entregue
  | 'revealed'         // Revelada
  | 'cancelled';       // Cancelada

/**
 * Status possíveis para compras avulsas
 */
export type StandalonePurchaseStatus =
  | 'awaiting_deposit'  // Aguardando depósito
  | 'deposit_paid'      // Depósito pago
  | 'awaiting_balance'  // Aguardando saldo
  | 'balance_paid'      // Saldo pago
  | 'in_production'     // Em produção
  | 'shipped'           // Enviada
  | 'delivered'         // Entregue
  | 'completed'         // Completa
  | 'cancelled';        // Cancelada

/**
 * Status possíveis para pagamentos manuais
 */
export type ManualPaymentStatus =
  | 'pending'           // Aguardando revisão
  | 'under_review'      // Em análise
  | 'requires_info'     // Requer mais informações
  | 'approved'          // Aprovado
  | 'rejected';         // Rejeitado

/**
 * Status possíveis para orçamentos
 */
export type QuoteStatus =
  | 'pending'           // Aguardando análise
  | 'reviewing'         // Em análise
  | 'answered'          // Respondido/Aprovado
  | 'archived';         // Arquivado

/**
 * União de todos os status possíveis de pedidos
 */
export type OrderStatus = SubscriptionDeliveryStatus | StandalonePurchaseStatus | ManualPaymentStatus | QuoteStatus;

// ============================================================================
// Dados Específicos por Tipo de Pedido
// ============================================================================

/**
 * Dados específicos de uma entrega de assinatura
 */
export interface SubscriptionDeliveryData {
  subscriptionId: string;
  deliveryNumber: number;
  cycleId: string | null;
  characterId: string | null;
  revealDate: string | null;
  
  // Dados relacionados (carregados via joins)
  subscription?: {
    id: string;
    planType: string;
    deliveriesCompleted: number;
    deliveriesTotal: number;
    status: string;
  };
  
  cycle?: {
    id: string;
    cycleNumber: number;
    month: number;
    year: number;
  };
  
  character?: {
    id: string;
    name: string;
    imageUrl: string | null;
  };

  // Lista de todas as entregas da assinatura
  allDeliveries?: Array<{
    id: string;
    deliveryNumber: number;
    status: string;
    characterId: string | null;
    characterName: string | null;
    actualDeliveryDate: string | null;
    shippingDate: string | null;
    trackingCode: string | null;
    revealDate: string | null;
  }>;
}

/**
 * Dados específicos de uma compra avulsa
 */
export interface StandalonePurchaseData {
  cycleId: string;
  characterId: string | null;
  priceDeposit: number;
  priceBalance: number;
  priceFull: number;
  depositPaidAt: string | null;
  balancePaidAt: string | null;
  balanceDueDate: string | null;
  depositVoucherUrl: string | null;
  balanceVoucherUrl: string | null;
  
  // Dados relacionados (carregados via joins)
  cycle?: {
    id: string;
    cycleNumber: number;
    month: number;
    year: number;
  };
  
  character?: {
    id: string;
    name: string;
    imageUrl: string | null;
  };
}

/**
 * Dados específicos de um pagamento manual
 */
export interface ManualPaymentData {
  paymentMethod: string | null;
  paymentDate: string | null;
  referenceId: string | null;
  referenceType: string | null;
  notes: string | null;
  confirmedAt: string | null;
  confirmedBy: string | null;
  // Legacy fields (kept for backward compatibility, may be undefined)
  paymentId?: string;
  referenceNumber?: string;
  paymentMethodId?: string;
  paymentMethodName?: string;
  paymentType?: string;
  currency?: string;
  linkedTo?: unknown;
  rejectionReason?: string | null;
  approvedAt?: string | null;
  approvedBy?: string | null;
  approvedByName?: string | null;
  files?: PaymentFile[];
  paymentMethod_detail?: PaymentMethod;
}

/**
 * Dados específicos de um orçamento
 */
export interface QuoteItem {
  id: string;
  name: string;
  description?: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  imageUrl?: string | null;
  characterId?: string | null;
}

export interface QuoteData {
  items: QuoteItem[];
  totalAmount?: number | null;
  notes: string | null;
  paymentStatus?: string | null;
  itemsCount?: number;
  itemsSummary?: string | null;
}

// ============================================================================
// Tipo Unificado de Pedido
// ============================================================================

/**
 * Tipo unificado que representa tanto entregas de assinatura quanto compras avulsas
 * 
 * Este tipo é o núcleo do sistema de pedidos consolidados, permitindo
 * trabalhar com ambos os tipos de pedidos de forma uniforme.
 */
export interface UnifiedOrder {
  // Campos comuns a todos os pedidos
  id: string;
  type: 'subscription_delivery' | 'standalone_purchase' | 'manual_payment' | 'quote';
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  
  // Dados do cliente
  customer: {
    id: string;
    name: string;
    email: string;
  };
  
  // Dados do produto/coleção (opcional para pagamentos manuais e orçamentos)
  collection: {
    id: string;
    name: string;
    slug: string;
  } | null;
  
  // Dados financeiros
  amount: number;
  
  // Status separados (novo)
  paymentStatus?: PaymentStatus;      // Status de pagamento
  productionStatus?: ProductionStatus; // Status de produção
  
  // Dados de entrega (não aplicável para pagamentos manuais)
  trackingCode: string | null;
  expectedDeliveryDate: string | null;
  actualDeliveryDate: string | null;
  
  // Dados específicos por tipo (apenas um será preenchido)
  subscriptionDelivery?: SubscriptionDeliveryData;
  standalonePurchase?: StandalonePurchaseData;
  manualPayment?: ManualPaymentData;
  quote?: QuoteData;
}

// ============================================================================
// Filtros e Paginação
// ============================================================================

/**
 * Filtros disponíveis para busca de pedidos
 */
export interface OrderFilters {
  type: 'all' | 'subscription_delivery' | 'standalone_purchase' | 'manual_payment' | 'quote';
  status: OrderStatus[];
  dateFrom: string | null;
  dateTo: string | null;
  searchQuery: string;
  planType?: 'trimestral' | 'semestral' | 'anual' | null; // Filtro de tipo de plano para assinaturas
}

/**
 * Parâmetros de paginação
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
}

/**
 * Resposta paginada genérica
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================================
// Ações em Massa
// ============================================================================

/**
 * Resultado de uma ação em massa
 */
export interface BulkActionResult {
  successful: string[];
  failed: Array<{
    id: string;
    error: string;
  }>;
}

// ============================================================================
// Histórico de Status
// ============================================================================

/**
 * Entrada no histórico de mudanças de status
 */
export interface StatusHistoryEntry {
  id: string;
  orderId: string;
  orderType: 'subscription_delivery' | 'standalone_purchase' | 'manual_payment';
  oldStatus: OrderStatus;
  newStatus: OrderStatus;
  changedBy: string;
  changedByName: string;
  changedAt: string;
  notes?: string;
}

// ============================================================================
// Validação de Transições
// ============================================================================

/**
 * Erro de validação de transição de status
 */
export interface StatusTransitionError {
  type: 'validation_error';
  field: 'status';
  message: string;
  currentStatus: OrderStatus;
  attemptedStatus: OrderStatus;
}

/**
 * Matriz de transições válidas por tipo de pedido
 */
export type StatusTransitionMatrix = Record<OrderStatus, OrderStatus[]>;

// ============================================================================
// Exportação CSV
// ============================================================================

/**
 * Configuração de exportação CSV
 */
export interface CSVExportConfig {
  filters: OrderFilters;
  includeColumns: string[];
  filename?: string;
}

/**
 * Resultado de exportação CSV
 */
export interface CSVExportResult {
  filename: string;
  rowCount: number;
  blob: Blob;
}

// ============================================================================
// Geração de Etiquetas
// ============================================================================

/**
 * Dados de endereço para geração de etiqueta
 */
export interface DeliveryAddress {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

/**
 * Erro de validação de endereço
 */
export interface AddressValidationError {
  type: 'address_validation_error';
  missingFields: string[];
  message: string;
}

/**
 * Resultado de geração de etiqueta
 */
export interface LabelGenerationResult {
  orderId: string;
  labelUrl: string;
  trackingCode: string;
  generatedAt: string;
}

/**
 * Resultado de geração de etiquetas em massa
 */
export interface BulkLabelGenerationResult {
  successful: LabelGenerationResult[];
  failed: Array<{
    orderId: string;
    customerName: string;
    error: string;
    errorCode?: string;
  }>;
  total: number;
  successCount: number;
  failureCount: number;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Verifica se um pedido é uma entrega de assinatura
 */
export function isSubscriptionDelivery(order: UnifiedOrder): order is UnifiedOrder & {
  type: 'subscription_delivery';
  subscriptionDelivery: SubscriptionDeliveryData;
} {
  return order.type === 'subscription_delivery' && !!order.subscriptionDelivery;
}

/**
 * Verifica se um pedido é uma compra avulsa
 */
export function isStandalonePurchase(order: UnifiedOrder): order is UnifiedOrder & {
  type: 'standalone_purchase';
  standalonePurchase: StandalonePurchaseData;
} {
  return order.type === 'standalone_purchase' && !!order.standalonePurchase;
}

/**
 * Verifica se um pedido é um pagamento manual
 */
export function isManualPayment(order: UnifiedOrder): order is UnifiedOrder & {
  type: 'manual_payment';
  manualPayment: ManualPaymentData;
} {
  return order.type === 'manual_payment' && !!order.manualPayment;
}

/**
 * Verifica se um status é de entrega de assinatura
 */
export function isSubscriptionDeliveryStatus(status: OrderStatus): status is SubscriptionDeliveryStatus {
  return [
    'scheduled',
    'pending_choice',
    'confirmed',
    'in_production',
    'shipped',
    'delivered',
    'revealed',
    'cancelled'
  ].includes(status);
}

/**
 * Verifica se um status é de compra avulsa
 */
export function isStandalonePurchaseStatus(status: OrderStatus): status is StandalonePurchaseStatus {
  return [
    'awaiting_deposit',
    'deposit_paid',
    'awaiting_balance',
    'balance_paid',
    'in_production',
    'shipped',
    'delivered',
    'completed',
    'cancelled'
  ].includes(status);
}

/**
 * Verifica se um status é de pagamento manual
 */
export function isManualPaymentStatus(status: OrderStatus): status is ManualPaymentStatus {
  return [
    'pending',
    'under_review',
    'requires_info',
    'approved',
    'rejected'
  ].includes(status);
}


/**
 * Verifica se um pedido é um orçamento
 */
export function isQuote(order: UnifiedOrder): order is UnifiedOrder & {
  type: 'quote';
  quote: QuoteData;
} {
  return order.type === 'quote' && !!order.quote;
}

/**
 * Verifica se um status é de orçamento
 */
export function isQuoteStatus(status: OrderStatus): status is QuoteStatus {
  return [
    'pending',
    'reviewing',
    'answered',
    'archived'
  ].includes(status);
}
