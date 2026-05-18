/**
 * Label Generation Service
 * 
 * Serviço para geração de etiquetas de envio para pedidos individuais e em massa.
 * Integra com o ShippingService para gerar etiquetas e validar endereços.
 * 
 * Requisitos: 8.1, 8.5
 */

import { supabase } from '@/integrations/supabase/client';
import { shippingService, type Address } from '@/services/shipping-service';
import { validateDeliveryAddress } from './orders-validator';
import log from '@/lib/logger';
import type { 
  UnifiedOrder, 
  LabelGenerationResult,
  BulkLabelGenerationResult,
  DeliveryAddress 
} from '@/types/admin/orders';

/**
 * Erro de geração de etiqueta
 */
export class LabelGenerationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly orderId?: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'LabelGenerationError';
  }
}

/**
 * Códigos de erro específicos para geração de etiquetas
 * Requisitos: 8.4, 15.1, 15.2
 */
export enum LabelErrorCode {
  ADDRESS_NOT_FOUND = 'ADDRESS_NOT_FOUND',
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  API_ERROR = 'API_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  GENERATION_FAILED = 'GENERATION_FAILED',
  INVALID_ORDER_STATUS = 'INVALID_ORDER_STATUS',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Converte DeliveryAddress para o formato Address do ShippingService
 */
function convertToShippingAddress(
  deliveryAddress: DeliveryAddress,
  customerName: string,
  customerPhone?: string
): Address {
  return {
    name: customerName,
    street: deliveryAddress.street,
    number: deliveryAddress.number,
    complement: deliveryAddress.complement,
    neighborhood: deliveryAddress.neighborhood || 'Centro', // Default se não fornecido
    city: deliveryAddress.city,
    state: deliveryAddress.state,
    zipCode: deliveryAddress.zipCode,
    phone: customerPhone
  };
}

/**
 * Busca o endereço de entrega de um pedido
 */
async function getOrderDeliveryAddress(order: UnifiedOrder): Promise<DeliveryAddress | null> {
  try {
    // Buscar o perfil do usuário para obter o endereço
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('address, full_name, phone')
      .eq('id', order.customer.id)
      .single();

    if (error || !profile) {
      log.error('Erro ao buscar perfil do usuário', { error, userId: order.customer.id });
      return null;
    }

    // O endereço está armazenado como texto no perfil
    // Precisamos parsear ou assumir que está em formato JSON
    if (!profile.address) {
      return null;
    }

    // Tentar parsear o endereço se estiver em formato JSON
    try {
      const addressData = typeof profile.address === 'string' 
        ? JSON.parse(profile.address) 
        : profile.address;

      return {
        street: addressData.street || addressData.rua || '',
        number: addressData.number || addressData.numero || '',
        complement: addressData.complement || addressData.complemento,
        neighborhood: addressData.neighborhood || addressData.bairro || 'Centro',
        city: addressData.city || addressData.cidade || '',
        state: addressData.state || addressData.estado || '',
        zipCode: addressData.zipCode || addressData.cep || '',
        country: addressData.country || addressData.pais || 'Brasil'
      };
    } catch (parseError) {
      log.error('Erro ao parsear endereço', { parseError, address: profile.address });
      return null;
    }
  } catch (error) {
    log.error('Erro ao buscar endereço de entrega', { error, orderId: order.id });
    return null;
  }
}

/**
 * Gera etiqueta de envio para um pedido individual
 * 
 * @param order - Pedido para o qual gerar a etiqueta
 * @returns Resultado da geração com URL da etiqueta e código de rastreamento
 * @throws {LabelGenerationError} Se a geração falhar
 * 
 * @example
 * ```typescript
 * try {
 *   const result = await generateLabelForOrder(order);
 *   console.log('Etiqueta gerada:', result.labelUrl);
 *   console.log('Código de rastreamento:', result.trackingCode);
 * } catch (error) {
 *   if (error instanceof LabelGenerationError) {
 *     console.error('Erro:', error.message);
 *   }
 * }
 * ```
 */
export async function generateLabelForOrder(
  order: UnifiedOrder
): Promise<LabelGenerationResult> {
  try {
    // 1. Buscar endereço de entrega
    const deliveryAddress = await getOrderDeliveryAddress(order);

    if (!deliveryAddress) {
      throw new LabelGenerationError(
        'Endereço de entrega não encontrado para este pedido.',
        LabelErrorCode.ADDRESS_NOT_FOUND,
        order.id,
        { customerId: order.customer.id }
      );
    }

    // 2. Validar endereço antes de gerar etiqueta
    const validationError = validateDeliveryAddress(deliveryAddress);
    
    if (validationError) {
      throw new LabelGenerationError(
        validationError.message,
        LabelErrorCode.INVALID_ADDRESS,
        order.id,
        { 
          missingFields: validationError.missingFields,
          address: deliveryAddress 
        }
      );
    }

    // 3. Buscar informações adicionais do cliente
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', order.customer.id)
      .single();

    const customerName = profile?.full_name || order.customer.name;
    const customerPhone = profile?.phone || undefined;

    // 4. Converter para formato do ShippingService
    const shippingAddress = convertToShippingAddress(
      deliveryAddress,
      customerName,
      customerPhone
    );

    // 5. Gerar etiqueta usando o ShippingService
    let labelResult;
    try {
      labelResult = await shippingService.generateLabel(
        order.id,
        shippingAddress
      );
    } catch (apiError) {
      // Tratamento específico de erros da API de etiquetas
      // Requisitos: 8.4, 15.1, 15.2
      if (apiError instanceof Error) {
        // Verificar se é erro de timeout
        if (apiError.message.includes('timeout') || apiError.message.includes('ETIMEDOUT')) {
          throw new LabelGenerationError(
            'A API de etiquetas demorou muito para responder. Tente novamente.',
            LabelErrorCode.TIMEOUT_ERROR,
            order.id,
            { originalError: apiError.message }
          );
        }
        
        // Verificar se é erro de rede
        if (apiError.message.includes('network') || apiError.message.includes('ECONNREFUSED')) {
          throw new LabelGenerationError(
            'Erro de conexão com a API de etiquetas. Verifique sua conexão e tente novamente.',
            LabelErrorCode.NETWORK_ERROR,
            order.id,
            { originalError: apiError.message }
          );
        }
        
        // Erro genérico da API
        throw new LabelGenerationError(
          `Erro na API de etiquetas: ${apiError.message}`,
          LabelErrorCode.API_ERROR,
          order.id,
          { originalError: apiError.message }
        );
      }
      
      throw new LabelGenerationError(
        'Erro desconhecido ao comunicar com a API de etiquetas.',
        LabelErrorCode.API_ERROR,
        order.id
      );
    }

    // 6. Atualizar o pedido com o código de rastreamento
    await updateOrderTrackingCode(order, labelResult.trackingCode);

    // 7. Retornar resultado
    return {
      orderId: order.id,
      labelUrl: labelResult.labelUrl,
      trackingCode: labelResult.trackingCode,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    // Se já é um LabelGenerationError, re-lançar
    if (error instanceof LabelGenerationError) {
      throw error;
    }

    // Caso contrário, encapsular em LabelGenerationError
    throw new LabelGenerationError(
      `Erro ao gerar etiqueta: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      LabelErrorCode.GENERATION_FAILED,
      order.id,
      { originalError: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * Atualiza o código de rastreamento no pedido
 */
async function updateOrderTrackingCode(
  order: UnifiedOrder,
  trackingCode: string
): Promise<void> {
  try {
    if (order.type === 'subscription_delivery') {
      // Atualizar entrega de assinatura
      const { error } = await supabase
        .from('subscription_deliveries')
        .update({
          tracking_code: trackingCode,
          status: 'shipped', // Atualizar status para enviado
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (error) {
        throw new Error(`Erro ao atualizar entrega: ${error.message}`);
      }
    } else if (order.type === 'standalone_purchase') {
      // Atualizar compra avulsa
      const { error } = await supabase
        .from('standalone_purchases' as unknown as 'subscription_deliveries')
        .update({
          tracking_code: trackingCode,
          status: 'shipped', // Atualizar status para enviado
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (error) {
        throw new Error(`Erro ao atualizar compra: ${error.message}`);
      }
    }
  } catch (error) {
    log.error('Erro ao atualizar código de rastreamento', { error, orderId: order.id, trackingCode });
    // Não lançar erro aqui - a etiqueta foi gerada com sucesso
    // O código de rastreamento pode ser atualizado manualmente se necessário
  }
}

/**
 * Verifica se um pedido pode ter etiqueta gerada
 * 
 * @param order - Pedido a verificar
 * @returns true se o pedido pode ter etiqueta gerada
 */
export function canGenerateLabel(order: UnifiedOrder): boolean {
  // Pagamentos manuais e orçamentos não têm geração de etiquetas
  if (order.type === 'manual_payment' || order.type === 'quote') {
    return false;
  }
  
  // Não gerar etiqueta para pedidos cancelados ou já entregues
  const invalidStatuses = ['cancelled', 'delivered', 'completed', 'revealed'];
  
  if (invalidStatuses.includes(order.status)) {
    return false;
  }

  // Não gerar etiqueta se já possui código de rastreamento
  if (order.trackingCode) {
    return false;
  }

  return true;
}

/**
 * Obtém mensagem de erro amigável para o usuário
 * Requisitos: 8.4, 15.1, 15.2
 */
export function getLabelErrorMessage(error: unknown): string {
  if (error instanceof LabelGenerationError) {
    switch (error.code) {
      case LabelErrorCode.ADDRESS_NOT_FOUND:
        return 'Endereço de entrega não encontrado. Verifique o cadastro do cliente.';
      case LabelErrorCode.INVALID_ADDRESS:
        return error.message; // Já contém a lista de campos faltantes
      case LabelErrorCode.API_ERROR:
        return 'Erro ao comunicar com a API de etiquetas. Tente novamente.';
      case LabelErrorCode.NETWORK_ERROR:
        return 'Erro de conexão. Verifique sua internet e tente novamente.';
      case LabelErrorCode.TIMEOUT_ERROR:
        return 'A operação demorou muito. Tente novamente em alguns instantes.';
      case LabelErrorCode.GENERATION_FAILED:
        return 'Erro ao gerar etiqueta. Tente novamente.';
      case LabelErrorCode.INVALID_ORDER_STATUS:
        return 'Este pedido não pode ter etiqueta gerada no status atual.';
      default:
        return error.message;
    }
  }

  return 'Erro desconhecido ao gerar etiqueta.';
}

/**
 * Verifica se um erro é recuperável (pode tentar novamente)
 * Requisitos: 15.2
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof LabelGenerationError) {
    return [
      LabelErrorCode.API_ERROR,
      LabelErrorCode.NETWORK_ERROR,
      LabelErrorCode.TIMEOUT_ERROR,
      LabelErrorCode.GENERATION_FAILED
    ].includes(error.code as LabelErrorCode);
  }
  return false;
}

/**
 * Verifica se um erro é de endereço inválido (pode corrigir)
 * Requisitos: 8.4
 */
export function isAddressError(error: unknown): boolean {
  if (error instanceof LabelGenerationError) {
    return [
      LabelErrorCode.ADDRESS_NOT_FOUND,
      LabelErrorCode.INVALID_ADDRESS
    ].includes(error.code as LabelErrorCode);
  }
  return false;
}

/**
 * Obtém os campos faltantes de um erro de endereço
 * Requisitos: 8.4
 */
export function getMissingAddressFields(error: unknown): string[] {
  if (error instanceof LabelGenerationError && error.details?.missingFields) {
    return error.details.missingFields;
  }
  return [];
}

/**
 * Gera etiquetas de envio para múltiplos pedidos em massa
 * 
 * Valida todos os endereços antes de gerar as etiquetas e processa
 * os pedidos em lote, coletando sucessos e falhas.
 * 
 * @param orders - Array de pedidos para gerar etiquetas
 * @returns Resultado com sucessos e falhas detalhados
 * 
 * @example
 * ```typescript
 * const result = await generateBulkLabels(selectedOrders);
 * 
 * console.log(`${result.successCount} etiquetas geradas com sucesso`);
 * console.log(`${result.failureCount} falhas`);
 * 
 * // Abrir todas as etiquetas geradas
 * result.successful.forEach(label => {
 *   window.open(label.labelUrl, '_blank');
 * });
 * 
 * // Exibir pedidos com falha
 * result.failed.forEach(failure => {
 *   console.error(`Pedido ${failure.orderId}: ${failure.error}`);
 * });
 * ```
 */
export async function generateBulkLabels(
  orders: UnifiedOrder[]
): Promise<BulkLabelGenerationResult> {
  const result: BulkLabelGenerationResult = {
    successful: [],
    failed: [],
    total: orders.length,
    successCount: 0,
    failureCount: 0
  };

  // Validar que há pedidos para processar
  if (orders.length === 0) {
    return result;
  }

  // Filtrar pedidos que podem ter etiqueta gerada
  const validOrders = orders.filter(order => canGenerateLabel(order));
  
  // Adicionar pedidos inválidos à lista de falhas
  const invalidOrders = orders.filter(order => !canGenerateLabel(order));
  invalidOrders.forEach(order => {
    let errorMessage = 'Pedido não pode ter etiqueta gerada.';
    const errorCode = LabelErrorCode.INVALID_ORDER_STATUS;
    
    if (order.trackingCode) {
      errorMessage = 'Pedido já possui código de rastreamento.';
    } else if (['cancelled', 'delivered', 'completed', 'revealed'].includes(order.status)) {
      errorMessage = `Pedido está em status final: ${order.status}.`;
    }
    
    result.failed.push({
      orderId: order.id,
      customerName: order.customer.name,
      error: errorMessage,
      errorCode
    });
  });

  // Processar pedidos válidos em lote
  for (const order of validOrders) {
    try {
      // Gerar etiqueta para o pedido
      const labelResult = await generateLabelForOrder(order);
      
      result.successful.push(labelResult);
      result.successCount++;
    } catch (error) {
      // Capturar erro e adicionar à lista de falhas
      const errorMessage = error instanceof LabelGenerationError 
        ? getLabelErrorMessage(error)
        : 'Erro desconhecido ao gerar etiqueta.';
      
      const errorCode = error instanceof LabelGenerationError 
        ? error.code 
        : 'UNKNOWN_ERROR';
      
      result.failed.push({
        orderId: order.id,
        customerName: order.customer.name,
        error: errorMessage,
        errorCode
      });
      result.failureCount++;
    }
  }

  // Atualizar contadores finais
  result.failureCount = result.failed.length;

  return result;
}

/**
 * Abre múltiplas etiquetas em abas do navegador
 * 
 * @param labelResults - Array de resultados de geração de etiquetas
 * @param maxTabs - Número máximo de abas a abrir (padrão: 10)
 */
export function openLabelsInTabs(
  labelResults: LabelGenerationResult[],
  maxTabs: number = 10
): void {
  const labelsToOpen = labelResults.slice(0, maxTabs);
  
  labelsToOpen.forEach((label, index) => {
    // Adicionar pequeno delay entre aberturas para evitar bloqueio do navegador
    setTimeout(() => {
      window.open(label.labelUrl, '_blank');
    }, index * 100);
  });

  // Avisar se há mais etiquetas do que o limite
  if (labelResults.length > maxTabs) {
    console.warn(
      `Apenas ${maxTabs} etiquetas foram abertas. ` +
      `${labelResults.length - maxTabs} etiquetas restantes não foram abertas automaticamente.`
    );
  }
}
