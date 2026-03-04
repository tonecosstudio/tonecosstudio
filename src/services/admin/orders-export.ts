// @ts-nocheck
/**
 * Serviço de Exportação de Pedidos
 * 
 * Este serviço implementa a funcionalidade de exportação de pedidos para CSV,
 * aplicando os filtros atuais e formatando os dados adequadamente.
 * 
 * Requisitos: 9.1, 9.2
 */

import type { UnifiedOrder, OrderFilters } from '@/types/admin/orders';

// ============================================================================
// Constantes
// ============================================================================

/**
 * Colunas incluídas na exportação CSV
 */
const CSV_COLUMNS = [
  'ID',
  'Tipo',
  'Cliente',
  'Email',
  'Status',
  'Data de Criação',
  'Valor',
  'Código de Rastreamento',
  'Data Prevista de Entrega',
  'Data Real de Entrega',
  'Coleção'
] as const;

/**
 * Mapeamento de tipos de pedido para nomes legíveis
 */
const ORDER_TYPE_LABELS: Record<string, string> = {
  'subscription_delivery': 'Entrega de Assinatura',
  'standalone_purchase': 'Compra Avulsa'
};

/**
 * Mapeamento de status para nomes legíveis em português
 */
const STATUS_LABELS: Record<string, string> = {
  // Status de entregas de assinatura
  'scheduled': 'Agendada',
  'pending_choice': 'Aguardando Escolha',
  'confirmed': 'Confirmada',
  'in_production': 'Em Produção',
  'shipped': 'Enviada',
  'delivered': 'Entregue',
  'revealed': 'Revelada',
  'cancelled': 'Cancelada',
  // Status de compras avulsas
  'awaiting_deposit': 'Aguardando Depósito',
  'deposit_paid': 'Depósito Pago',
  'awaiting_balance': 'Aguardando Saldo',
  'balance_paid': 'Saldo Pago',
  'completed': 'Completa'
};

// ============================================================================
// Função Principal: Exportar Pedidos para CSV
// ============================================================================

/**
 * Exporta pedidos para formato CSV
 * 
 * Esta função:
 * 1. Recebe os pedidos já filtrados
 * 2. Formata os dados para CSV
 * 3. Adiciona UTF-8 BOM para compatibilidade com Excel
 * 4. Gera nome de arquivo com timestamp
 * 5. Cria blob e retorna para download
 * 
 * @param orders - Array de pedidos a serem exportados (já filtrados)
 * @returns Objeto com blob do CSV e nome do arquivo
 * 
 * @example
 * ```typescript
 * const result = await exportOrdersToCSV(filteredOrders);
 * // Trigger download
 * const url = URL.createObjectURL(result.blob);
 * const link = document.createElement('a');
 * link.href = url;
 * link.download = result.filename;
 * link.click();
 * ```
 */
export async function exportOrdersToCSV(
  orders: UnifiedOrder[]
): Promise<{ blob: Blob; filename: string; rowCount: number }> {
  // Gerar linhas do CSV
  const csvLines: string[] = [];
  
  // Header (primeira linha)
  csvLines.push(CSV_COLUMNS.join(','));
  
  // Dados (uma linha por pedido)
  for (const order of orders) {
    const row = formatOrderRow(order);
    csvLines.push(row);
  }
  
  // Juntar todas as linhas
  const csvContent = csvLines.join('\n');
  
  // Adicionar UTF-8 BOM para compatibilidade com Excel
  // O BOM (Byte Order Mark) garante que o Excel reconheça o encoding UTF-8
  const BOM = '\uFEFF';
  const csvWithBOM = BOM + csvContent;
  
  // Criar blob
  const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
  
  // Gerar nome do arquivo com timestamp
  const filename = generateFilename();
  
  return {
    blob,
    filename,
    rowCount: orders.length
  };
}

// ============================================================================
// Funções Auxiliares: Formatação
// ============================================================================

/**
 * Formata uma linha de pedido para CSV
 * 
 * Escapa valores que contêm vírgulas, aspas ou quebras de linha
 * conforme especificação RFC 4180 para CSV.
 */
function formatOrderRow(order: UnifiedOrder): string {
  const values = [
    order.id,
    ORDER_TYPE_LABELS[order.type] || order.type,
    order.customer.name,
    order.customer.email,
    STATUS_LABELS[order.status] || order.status,
    formatDate(order.createdAt),
    formatCurrency(order.amount),
    order.trackingCode || '',
    formatDate(order.expectedDeliveryDate),
    formatDate(order.actualDeliveryDate),
    order.collection.name
  ];
  
  // Escapar valores e juntar com vírgula
  return values.map(escapeCSVValue).join(',');
}

/**
 * Escapa um valor para uso em CSV
 * 
 * Regras RFC 4180:
 * - Se o valor contém vírgula, aspas ou quebra de linha, deve ser envolvido em aspas
 * - Aspas dentro do valor devem ser duplicadas
 */
function escapeCSVValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const stringValue = String(value);
  
  // Se contém vírgula, aspas ou quebra de linha, envolver em aspas
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    // Duplicar aspas internas
    const escaped = stringValue.replace(/"/g, '""');
    return `"${escaped}"`;
  }
  
  return stringValue;
}

/**
 * Formata uma data para exibição no CSV
 * 
 * Formato: DD/MM/YYYY HH:MM
 */
function formatDate(dateString: string | null | undefined): string {
  if (!dateString) {
    return '';
  }
  
  try {
    const date = new Date(dateString);
    
    // Verificar se a data é válida
    if (isNaN(date.getTime())) {
      return '';
    }
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return '';
  }
}

/**
 * Formata um valor monetário para exibição no CSV
 * 
 * Formato: R$ 1.234,56
 */
function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) {
    return 'R$ 0,00';
  }
  
  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  } catch (error) {
    console.error('Erro ao formatar moeda:', error);
    return `R$ ${amount.toFixed(2)}`;
  }
}

/**
 * Gera nome de arquivo com timestamp
 * 
 * Formato: pedidos_YYYYMMDD_HHMMSS.csv
 * 
 * Requisito: 9.5
 */
function generateFilename(): string {
  const now = new Date();
  
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `pedidos_${year}${month}${day}_${hours}${minutes}${seconds}.csv`;
}

// ============================================================================
// Função Auxiliar: Trigger Download
// ============================================================================

/**
 * Cria um link temporário e dispara o download do arquivo CSV
 * 
 * Esta é uma função utilitária que pode ser usada nos componentes
 * para facilitar o download do CSV gerado.
 * 
 * @param blob - Blob do arquivo CSV
 * @param filename - Nome do arquivo
 * 
 * @example
 * ```typescript
 * const { blob, filename } = await exportOrdersToCSV(orders);
 * triggerDownload(blob, filename);
 * ```
 */
export function triggerDownload(blob: Blob, filename: string): void {
  // Criar URL temporária para o blob
  const url = URL.createObjectURL(blob);
  
  // Criar elemento <a> temporário
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  // Adicionar ao DOM, clicar e remover
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Liberar URL temporária após um pequeno delay
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 100);
}
