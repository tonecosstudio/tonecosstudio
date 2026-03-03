/**
 * CSV Export Utility
 * 
 * Provides functions to export data to CSV format.
 */

import type { ProductionQueueItem } from '@/services/admin/production-service';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Converts production queue items to CSV format and triggers download
 */
export function exportProductionItemsToCSV(items: ProductionQueueItem[], filename?: string) {
  if (items.length === 0) {
    throw new Error('Nenhum item para exportar');
  }

  // Define CSV headers
  const headers = [
    'ID',
    'Cliente',
    'Email',
    'Coleção',
    'Personagem',
    'Estágio Atual',
    'Status de Produção',
    'Prioridade',
    'Score de Prioridade',
    'Prazo de Escolha',
    'Status de Escolha',
    'Responsável',
    'Data de Atribuição',
    'Data de Início',
    'Data de Conclusão',
    'Data Estimada de Conclusão',
    'Notas de Produção',
    'Notas do Cliente',
    'Criado em',
    'Atualizado em',
  ];

  // Map items to CSV rows
  const rows = items.map((item) => [
    item.id,
    escapeCSVField(item.customerName),
    escapeCSVField(item.customerEmail),
    escapeCSVField(item.collectionName),
    escapeCSVField(item.characterName || '-'),
    translateStage(item.currentStage),
    translateStatus(item.productionStatus),
    translatePriority(item.priority),
    item.priorityScore.toString(),
    formatDate(item.choiceDeadline),
    translateChoiceStatus(item.choiceStatus),
    escapeCSVField(item.assignedToName || '-'),
    formatDate(item.assignedAt),
    formatDate(item.productionStartedAt),
    formatDate(item.productionCompletedAt),
    formatDate(item.estimatedCompletionDate),
    escapeCSVField(item.productionNotes || '-'),
    escapeCSVField(item.customerNotes || '-'),
    formatDate(item.createdAt),
    formatDate(item.updatedAt),
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n');

  // Add BOM for proper UTF-8 encoding in Excel
  const BOM = '\uFEFF';
  const csvWithBOM = BOM + csvContent;

  // Create blob and download
  const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename || `producao_${Date.now()}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Escapes special characters in CSV fields
 */
function escapeCSVField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * Formats date for CSV export
 */
function formatDate(date: string | null): string {
  if (!date) return '-';
  try {
    return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  } catch {
    return '-';
  }
}

/**
 * Translates stage to Portuguese
 */
function translateStage(stage: string): string {
  const translations: Record<string, string> = {
    awaiting_choice: 'Aguardando Escolha',
    design: 'Design',
    production: 'Produção',
    quality_check: 'Controle de Qualidade',
    packaging: 'Embalagem',
    shipped: 'Enviado',
  };
  return translations[stage] || stage;
}

/**
 * Translates production status to Portuguese
 */
function translateStatus(status: string): string {
  const translations: Record<string, string> = {
    awaiting_choice: 'Aguardando Escolha',
    ready_for_production: 'Pronto para Produção',
    in_production: 'Em Produção',
    completed: 'Concluído',
    on_hold: 'Em Espera',
    cancelled: 'Cancelado',
  };
  return translations[status] || status;
}

/**
 * Translates priority to Portuguese
 */
function translatePriority(priority: string): string {
  const translations: Record<string, string> = {
    critical: 'Crítico',
    high: 'Alto',
    normal: 'Normal',
    low: 'Baixo',
  };
  return translations[priority] || priority;
}

/**
 * Translates choice status to Portuguese
 */
function translateChoiceStatus(status: string): string {
  const translations: Record<string, string> = {
    pending: 'Pendente',
    submitted: 'Enviado',
    approved: 'Aprovado',
    rejected: 'Rejeitado',
    locked: 'Bloqueado',
  };
  return translations[status] || status;
}
