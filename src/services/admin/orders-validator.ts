/**
 * Validador de Transições de Status de Pedidos
 * 
 * Este módulo implementa a lógica de validação de transições de status
 * para entregas de assinatura e compras avulsas, garantindo que apenas
 * transições válidas sejam permitidas de acordo com as regras de negócio.
 * 
 * Requisitos: 6.2, 6.3
 */

import {
  OrderStatus,
  StatusTransitionError,
  StatusTransitionMatrix
} from '@/types/admin/orders';
import { getOrderStatusLabel } from '@/config/admin-order-status';

type OrderType = 'subscription_delivery' | 'standalone_purchase' | 'manual_payment' | 'quote';
type StatusTransitionMap = Partial<Record<OrderStatus, OrderStatus[]>>;

// ============================================================================
// Matrizes de Transições Válidas
// ============================================================================

/**
 * Matriz de transições válidas para entregas de assinatura
 * 
 * Define quais status podem ser alcançados a partir de cada status atual.
 * Baseado no fluxo de negócio de entregas de assinatura.
 */
const SUBSCRIPTION_DELIVERY_TRANSITIONS: StatusTransitionMap = {
  // Entrega agendada pode ir para escolha pendente, confirmada ou cancelada
  'scheduled': ['pending_choice', 'confirmed', 'cancelled'],
  
  // Escolha pendente pode ser confirmada ou cancelada
  'pending_choice': ['confirmed', 'cancelled'],
  
  // Confirmada pode ir para produção ou ser cancelada
  'confirmed': ['in_production', 'cancelled'],
  
  // Em produção pode ser enviada ou cancelada
  'in_production': ['shipped', 'cancelled'],
  
  // Enviada pode ser entregue (não pode mais ser cancelada após envio)
  'shipped': ['delivered'],
  
  // Entregue pode ser revelada
  'delivered': ['revealed'],
  
  // Revelada é um estado final (sem transições)
  'revealed': [],
  
  // Cancelada é um estado final (sem transições)
  'cancelled': []
};

/**
 * Matriz de transições válidas para compras avulsas
 * 
 * Define quais status podem ser alcançados a partir de cada status atual.
 * Baseado no fluxo de pagamento em duas etapas (depósito + saldo).
 */
const STANDALONE_PURCHASE_TRANSITIONS: StatusTransitionMap = {
  // Status legados do enum original de compras avulsas
  'pending': ['deposit_paid', 'cancelled'],

  // Status legado ainda existente no banco em compras antigas
  'confirmed': ['deposit_paid', 'cancelled'],

  // Aguardando depósito pode ter depósito pago ou ser cancelada
  'awaiting_deposit': ['deposit_paid', 'cancelled'],
  
  // Depósito pago pode aguardar saldo ou ser cancelada
  'deposit_paid': ['awaiting_balance', 'cancelled'],
  
  // Aguardando saldo pode ter saldo pago ou ser cancelada
  'awaiting_balance': ['balance_paid', 'cancelled'],
  
  // Saldo pago pode ir para produção ou ser cancelada
  'balance_paid': ['in_production', 'shipped', 'cancelled'],
  
  // Em produção pode ser enviada ou cancelada
  'in_production': ['shipped', 'cancelled'],
  
  // Enviada pode ser entregue (não pode mais ser cancelada após envio)
  'shipped': ['delivered'],
  
  // Entregue pode ser completada
  'delivered': ['completed'],
  
  // Completada é um estado final (sem transições)
  'completed': [],
  
  // Cancelada é um estado final (sem transições)
  'cancelled': []
};

/**
 * Matriz de transições válidas para pagamentos manuais
 * 
 * Define quais status podem ser alcançados a partir de cada status atual.
 * Baseado no fluxo de verificação de comprovantes de pagamento manual.
 */
const MANUAL_PAYMENT_TRANSITIONS: StatusTransitionMap = {
  // Pendente pode ir para análise ou ser rejeitado
  'pending': ['under_review', 'rejected'],
  
  // Em análise pode requerer informações, ser aprovado ou rejeitado
  'under_review': ['requires_info', 'approved', 'rejected'],
  
  // Requer informações pode voltar para análise ou ser rejeitado
  'requires_info': ['under_review', 'rejected'],
  
  // Aprovado é um estado final (sem transições)
  'approved': [],
  
  // Rejeitado é um estado final (sem transições)
  'rejected': []
};

/**
 * Matriz de transições válidas para orçamentos
 * 
 * Define quais status podem ser alcançados a partir de cada status atual.
 * Baseado no fluxo de análise e resposta de orçamentos.
 */
const QUOTE_TRANSITIONS: StatusTransitionMap = {
  // Pendente pode ir para análise ou ser arquivado
  'pending': ['reviewing', 'archived'],
  
  // Em análise pode ser respondido ou arquivado
  'reviewing': ['answered', 'archived'],
  
  // Respondido pode ser arquivado
  'answered': ['archived'],
  
  // Arquivado é um estado final (sem transições)
  'archived': []
};

const ALL_TRANSITION_MATRICES: StatusTransitionMap[] = [
  SUBSCRIPTION_DELIVERY_TRANSITIONS,
  STANDALONE_PURCHASE_TRANSITIONS,
  MANUAL_PAYMENT_TRANSITIONS,
  QUOTE_TRANSITIONS
];

function getTransitionMatrixForOrderType(orderType: OrderType): StatusTransitionMap {
  if (orderType === 'subscription_delivery') return SUBSCRIPTION_DELIVERY_TRANSITIONS;
  if (orderType === 'standalone_purchase') return STANDALONE_PURCHASE_TRANSITIONS;
  if (orderType === 'manual_payment') return MANUAL_PAYMENT_TRANSITIONS;
  return QUOTE_TRANSITIONS;
}

// ============================================================================
// Funções de Validação
// ============================================================================

/**
 * Valida se uma transição de status é permitida
 * 
 * @param currentStatus - Status atual do pedido
 * @param newStatus - Novo status desejado
 * @param orderType - Tipo do pedido (subscription_delivery ou standalone_purchase)
 * @returns null se a transição é válida, ou um objeto de erro se inválida
 * 
 * @example
 * ```typescript
 * const error = validateStatusTransition('scheduled', 'confirmed', 'subscription_delivery');
 * if (error) {
 *   console.error(error.message);
 * }
 * ```
 */
export function validateStatusTransition(
  currentStatus: OrderStatus,
  newStatus: OrderStatus,
  orderType: OrderType
): StatusTransitionError | null {
  // Não permitir transição para o mesmo status
  if (currentStatus === newStatus) {
    return {
      type: 'validation_error',
      field: 'status',
      message: `O pedido já está no status "${getOrderStatusLabel(currentStatus)}".`,
      currentStatus,
      attemptedStatus: newStatus
    };
  }

  // Selecionar a matriz de transições apropriada
  const transitionMatrix = getTransitionMatrixForOrderType(orderType);

  // Verificar se o status atual existe na matriz
  if (!(currentStatus in transitionMatrix)) {
    const orderTypeLabel = 
      orderType === 'subscription_delivery' ? 'entregas de assinatura' :
      orderType === 'standalone_purchase' ? 'compras avulsas' :
      orderType === 'manual_payment' ? 'pagamentos manuais' :
      'orçamentos';
    
    return {
      type: 'validation_error',
      field: 'status',
      message: `Status atual "${currentStatus}" não é válido para ${orderTypeLabel}.`,
      currentStatus,
      attemptedStatus: newStatus
    };
  }

  // Obter transições válidas para o status atual
  const validTransitions = transitionMatrix[currentStatus] || [];

  // Verificar se a transição é permitida
  if (!validTransitions.includes(newStatus)) {
    return {
      type: 'validation_error',
      field: 'status',
      message: `Transição de "${getOrderStatusLabel(currentStatus)}" para "${getOrderStatusLabel(newStatus)}" não é permitida. ${getTransitionHint(currentStatus, orderType)}`,
      currentStatus,
      attemptedStatus: newStatus
    };
  }

  // Transição válida
  return null;
}

/**
 * Obtém todas as transições válidas para um status específico
 * 
 * @param currentStatus - Status atual do pedido
 * @param orderType - Tipo do pedido
 * @returns Array de status válidos para transição
 * 
 * @example
 * ```typescript
 * const validStatuses = getValidTransitions('scheduled', 'subscription_delivery');
 * // ['pending_choice', 'confirmed', 'cancelled']
 * ```
 */
export function getValidTransitions(
  currentStatus: OrderStatus,
  orderType: OrderType
): OrderStatus[] {
  const transitionMatrix = getTransitionMatrixForOrderType(orderType);
  return transitionMatrix[currentStatus] || [];
}

/**
 * Verifica se uma transição específica é válida (versão booleana)
 * 
 * @param currentStatus - Status atual do pedido
 * @param newStatus - Novo status desejado
 * @param orderType - Tipo do pedido
 * @returns true se a transição é válida, false caso contrário
 * 
 * @example
 * ```typescript
 * if (isValidTransition('scheduled', 'confirmed', 'subscription_delivery')) {
 *   // Permitir transição
 * }
 * ```
 */
export function isValidTransition(
  currentStatus: OrderStatus,
  newStatus: OrderStatus,
  orderType: OrderType
): boolean {
  return validateStatusTransition(currentStatus, newStatus, orderType) === null;
}

// ============================================================================
// Funções Auxiliares
// ============================================================================

/**
 * Obtém uma dica sobre transições válidas para o status atual
 * 
 * @param currentStatus - Status atual do pedido
 * @param orderType - Tipo do pedido
 * @returns Mensagem de dica
 */
function getTransitionHint(
  currentStatus: OrderStatus,
  orderType: OrderType
): string {
  const validTransitions = getValidTransitions(currentStatus, orderType);

  if (validTransitions.length === 0) {
    return 'Este pedido está em um estado final e não pode ter seu status alterado.';
  }

  const validLabels = validTransitions.map(s => `"${getOrderStatusLabel(s)}"`).join(', ');
  return `Status válidos a partir de "${getOrderStatusLabel(currentStatus)}": ${validLabels}.`;
}

/**
 * Verifica se um status é um estado final (sem transições possíveis)
 * 
 * @param status - Status do pedido
 * @param orderType - Tipo do pedido
 * @returns true se é um estado final
 */
export function isFinalStatus(
  status: OrderStatus,
  orderType?: OrderType
): boolean {
  if (orderType) {
    const validTransitions = getValidTransitions(status, orderType);
    return validTransitions.length === 0;
  }

  let statusExistsInMatrix = false;

  for (const transitionMatrix of ALL_TRANSITION_MATRICES) {
    if (Object.prototype.hasOwnProperty.call(transitionMatrix, status)) {
      statusExistsInMatrix = true;
      if ((transitionMatrix[status] || []).length > 0) {
        return false;
      }
    }
  }

  return statusExistsInMatrix;
}

/**
 * Obtém a matriz completa de transições para um tipo de pedido
 * 
 * @param orderType - Tipo do pedido
 * @returns Matriz de transições
 */
export function getTransitionMatrix(
  orderType: OrderType
): StatusTransitionMatrix {
  return getTransitionMatrixForOrderType(orderType) as StatusTransitionMatrix;
}


// ============================================================================
// Validação de Endereço de Entrega
// ============================================================================

/**
 * Valida se um endereço de entrega possui todos os campos obrigatórios
 * 
 * Verifica a presença dos campos obrigatórios para geração de etiqueta:
 * - rua (street)
 * - número (number)
 * - cidade (city)
 * - estado (state)
 * - CEP (zipCode)
 * 
 * @param address - Endereço de entrega a ser validado (pode ser parcial ou undefined)
 * @returns null se o endereço é válido, ou um objeto de erro com lista de campos faltantes
 * 
 * @example
 * ```typescript
 * const error = validateDeliveryAddress({
 *   street: 'Rua das Flores',
 *   number: '123',
 *   city: 'São Paulo',
 *   state: 'SP',
 *   zipCode: '01234-567'
 * });
 * // error === null (endereço válido)
 * 
 * const error2 = validateDeliveryAddress({
 *   street: 'Rua das Flores',
 *   city: 'São Paulo'
 * });
 * // error2.missingFields === ['número', 'estado', 'CEP']
 * ```
 * 
 * Requisitos: 8.3, 8.4
 */
export function validateDeliveryAddress(
  address: Partial<import('@/types/admin/orders').DeliveryAddress> | undefined | null
): import('@/types/admin/orders').AddressValidationError | null {
  // Lista de campos obrigatórios com seus nomes em português
  const requiredFields: Array<{ key: keyof import('@/types/admin/orders').DeliveryAddress; label: string }> = [
    { key: 'street', label: 'rua' },
    { key: 'number', label: 'número' },
    { key: 'city', label: 'cidade' },
    { key: 'state', label: 'estado' },
    { key: 'zipCode', label: 'CEP' }
  ];

  // Coletar campos faltantes
  const missingFields: string[] = [];

  // Se o endereço é null ou undefined, todos os campos estão faltando
  if (!address) {
    missingFields.push(...requiredFields.map(f => f.label));
  } else {
    // Verificar cada campo obrigatório
    for (const field of requiredFields) {
      const value = address[field.key];
      
      // Campo é considerado faltante se for undefined, null ou string vazia
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        missingFields.push(field.label);
      }
    }
  }

  // Se há campos faltantes, retornar erro
  if (missingFields.length > 0) {
    return {
      type: 'address_validation_error',
      missingFields,
      message: `Endereço de entrega incompleto. Campos faltantes: ${missingFields.join(', ')}.`
    };
  }

  // Endereço válido
  return null;
}

/**
 * Verifica se um endereço de entrega é válido (versão booleana)
 * 
 * @param address - Endereço de entrega a ser validado
 * @returns true se o endereço é válido, false caso contrário
 * 
 * @example
 * ```typescript
 * if (isValidDeliveryAddress(order.deliveryAddress)) {
 *   // Permitir geração de etiqueta
 * }
 * ```
 */
export function isValidDeliveryAddress(
  address: Partial<import('@/types/admin/orders').DeliveryAddress> | undefined | null
): boolean {
  return validateDeliveryAddress(address) === null;
}
