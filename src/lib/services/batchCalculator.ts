/**
 * 📦 CALCULADORA AUTOMÁTICA DE LOTES - MODELO MENSAL
 *
 * REGRA FIXA: 1 CICLO POR MÊS (90 DIAS TOTAIS)
 *
 * 🔹 MODELO MENSAL
 * - Vendas: Todo o mês (dias 1-31) - 30 dias
 * - Produção: Mês seguinte completo (dias 1-31) - 30 dias
 * - Envio: Segunda quinzena do terceiro mês (dias 15-31) - 30 dias
 * - PRAZO TOTAL: ~90 dias (3 meses)
 *
 * 📅 EXEMPLO REAL – MARÇO 2026
 *
 * Ciclo Março 2026:
 * - Vendas: 01/03/2026 a 31/03/2026 (30 dias)
 * - Produção: 01/04/2026 a 30/04/2026 (30 dias)
 * - Envio: 15/05/2026 a 31/05/2026 (segunda quinzena de maio)
 * - Prazo Total: ~90 dias (3 meses)
 */

import { format, endOfMonth, addMonths, differenceInDays, addDays, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BATCH } from "@/config/constants";

/**
 * Tipo de ciclo
 */
export type CycleType = "cycle1" | "cycle2";

/**
 * Status operacional do ciclo
 */
export type CycleStatus =
  | "open_for_sales" // Aberto para vendas
  | "closed" // Fechado
  | "in_production" // Em produção
  | "production_finished" // Produção finalizada
  | "shipped"; // Enviado

/**
 * Regras fixas do sistema
 */
export interface BatchRules {
  shippingBusinessDays: number; // Prazo de envio em dias úteis (padrão: 5)
}

/**
 * Informações completas de um ciclo calculado
 */
export interface CalculatedBatch {
  // Identificação
  name: string; // Ex: "Ciclo 1 – Março/2026"
  cycleType: CycleType; // "cycle1" ou "cycle2"
  month: number; // Mês (0-11)
  year: number; // Ano

  // Datas de Vendas
  salesStart: Date; // Abertura das vendas
  salesEnd: Date; // Fechamento das vendas
  salesDuration: number; // Duração em dias

  // Datas de Produção
  productionStart: Date; // Início da produção
  productionEnd: Date; // Fim da produção
  productionDuration: number; // Duração em dias

  // Envio
  shippingMonth: string; // Ex: "Abril"
  shippingYear: number; // Ano do envio
  shippingDeadline: number; // Dia do mês (5º dia útil)
  shippingDeadlineDate: Date; // Data exata do 5º dia útil

  // Prazos para o cliente
  minDeliveryDays: number; // Prazo mínimo (compra no dia 1/16)
  maxDeliveryDays: number; // Prazo máximo (compra no dia 15/último)
  avgDeliveryDays: number; // Prazo médio

  // Status
  status: CycleStatus;
}

/**
 * Calcula o 5º dia útil de um mês (considerando sábados e domingos)
 * Futuramente pode incluir feriados nacionais
 */
function calculateBusinessDay(year: number, month: number, businessDayNumber: number): Date {
  let date = new Date(year, month, 1);
  let businessDaysCount = 0;

  while (businessDaysCount < businessDayNumber) {
    const dayOfWeek = getDay(date);
    // 0 = Domingo, 6 = Sábado
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDaysCount++;
    }
    if (businessDaysCount < businessDayNumber) {
      date = addDays(date, 1);
    }
  }

  return date;
}

/**
 * Determina qual ciclo está ativo baseado na data atual
 */
export function getCurrentCycleType(referenceDate: Date = new Date()): CycleType {
  const day = referenceDate.getDate();
  return day >= 1 && day <= 15 ? "cycle1" : "cycle2";
}

/**
 * Calcula um ciclo específico
 */
export function calculateCycle(
  cycleType: CycleType,
  month: number,
  year: number,
  rules: BatchRules,
  referenceDate: Date = new Date()
): CalculatedBatch {
  // Datas de vendas
  const salesStart =
    cycleType === "cycle1" ? new Date(year, month, 1, 0, 0, 0) : new Date(year, month, 16, 0, 0, 0);

  const salesEnd =
    cycleType === "cycle1"
      ? new Date(year, month, 15, 23, 59, 59)
      : endOfMonth(new Date(year, month, 1));

  const salesDuration = differenceInDays(salesEnd, salesStart) + 1;

  // Datas de produção
  let productionStart: Date;
  let productionEnd: Date;

  if (cycleType === "cycle1") {
    // Ciclo 1: Produção do dia 16 até último dia do mesmo mês
    productionStart = new Date(year, month, 16, 0, 0, 0);
    productionEnd = endOfMonth(new Date(year, month, 1));
  } else {
    // Ciclo 2: Produção do dia 01 até último dia do mês seguinte
    const nextMonth = month + 1;
    const nextYear = nextMonth > 11 ? year + 1 : year;
    const adjustedMonth = nextMonth > 11 ? 0 : nextMonth;

    productionStart = new Date(nextYear, adjustedMonth, 1, 0, 0, 0);
    productionEnd = endOfMonth(new Date(nextYear, adjustedMonth, 1));
  }

  const productionDuration = differenceInDays(productionEnd, productionStart) + 1;

  // Mês de envio (mês seguinte ao fim da produção)
  const shippingMonthDate = addMonths(productionEnd, 1);
  const shippingMonth = capitalize(format(shippingMonthDate, "MMMM", { locale: ptBR }));
  const shippingYear = shippingMonthDate.getFullYear();

  // Calcular 5º dia útil do mês de envio
  const shippingDeadlineDate = calculateBusinessDay(
    shippingMonthDate.getFullYear(),
    shippingMonthDate.getMonth(),
    rules.shippingBusinessDays
  );

  // Prazos para o cliente
  const minDeliveryDays = differenceInDays(shippingDeadlineDate, salesEnd);
  const maxDeliveryDays = differenceInDays(shippingDeadlineDate, salesStart);
  const avgDeliveryDays = Math.round((minDeliveryDays + maxDeliveryDays) / 2);

  // Nome do ciclo
  const monthName = capitalize(format(salesStart, "MMMM", { locale: ptBR }));
  const cycleName = cycleType === "cycle1" ? "Ciclo 1" : "Ciclo 2";
  const name = `${cycleName} – ${monthName}/${year}`;

  // Determinar status
  const status = getCycleStatus(
    salesStart,
    salesEnd,
    productionStart,
    productionEnd,
    shippingDeadlineDate,
    referenceDate
  );

  return {
    name,
    cycleType,
    month,
    year,
    salesStart,
    salesEnd,
    salesDuration,
    productionStart,
    productionEnd,
    productionDuration,
    shippingMonth,
    shippingYear,
    shippingDeadline: rules.shippingBusinessDays,
    shippingDeadlineDate,
    minDeliveryDays,
    maxDeliveryDays,
    avgDeliveryDays,
    status,
  };
}

/**
 * Determina o status do ciclo baseado na data de referência
 */
function getCycleStatus(
  salesStart: Date,
  salesEnd: Date,
  productionStart: Date,
  productionEnd: Date,
  shippingDeadline: Date,
  referenceDate: Date
): CycleStatus {
  if (referenceDate < salesStart) return "open_for_sales";
  if (referenceDate >= salesStart && referenceDate <= salesEnd) return "open_for_sales";
  if (referenceDate > salesEnd && referenceDate < productionStart) return "closed";
  if (referenceDate >= productionStart && referenceDate <= productionEnd) return "in_production";
  if (referenceDate > productionEnd && referenceDate < shippingDeadline)
    return "production_finished";
  return "shipped";
}

/**
 * Calcula o ciclo atual baseado na data de hoje
 */
export function calculateCurrentBatch(
  rules: BatchRules = { shippingBusinessDays: BATCH.SHIPPING_BUSINESS_DAYS },
  referenceDate: Date = new Date()
): CalculatedBatch {
  const cycleType = getCurrentCycleType(referenceDate);
  const month = referenceDate.getMonth();
  const year = referenceDate.getFullYear();

  return calculateCycle(cycleType, month, year, rules, referenceDate);
}

/**
 * Calcula o próximo ciclo
 */
export function calculateNextBatch(
  rules: BatchRules,
  currentBatch: CalculatedBatch
): CalculatedBatch {
  if (currentBatch.cycleType === "cycle1") {
    // Próximo é Ciclo 2 do mesmo mês
    return calculateCycle("cycle2", currentBatch.month, currentBatch.year, rules);
  } else {
    // Próximo é Ciclo 1 do mês seguinte
    const nextMonth = currentBatch.month + 1;
    const nextYear = nextMonth > 11 ? currentBatch.year + 1 : currentBatch.year;
    const adjustedMonth = nextMonth > 11 ? 0 : nextMonth;

    return calculateCycle("cycle1", adjustedMonth, nextYear, rules);
  }
}

/**
 * Calcula múltiplos ciclos futuros
 */
export function calculateFutureBatches(
  rules: BatchRules = { shippingBusinessDays: BATCH.SHIPPING_BUSINESS_DAYS },
  count: number = BATCH.FUTURE_BATCHES_COUNT
): CalculatedBatch[] {
  const batches: CalculatedBatch[] = [];
  let currentBatch = calculateCurrentBatch(rules);

  batches.push(currentBatch);

  for (let i = 1; i < count; i++) {
    currentBatch = calculateNextBatch(rules, currentBatch);
    batches.push(currentBatch);
  }

  return batches;
}

/**
 * Verifica se estamos no período de vendas
 */
export function isInSalesPeriod(batch: CalculatedBatch, date: Date = new Date()): boolean {
  return date >= batch.salesStart && date <= batch.salesEnd;
}

/**
 * Verifica se estamos no período de produção
 */
export function isInProductionPeriod(batch: CalculatedBatch, date: Date = new Date()): boolean {
  return date >= batch.productionStart && date <= batch.productionEnd;
}

/**
 * Verifica se estamos no período de envio
 */
export function isInShippingPeriod(batch: CalculatedBatch, date: Date = new Date()): boolean {
  return date > batch.productionEnd && date <= batch.shippingDeadlineDate;
}

/**
 * Formata data para exibição (dd/MM)
 */
export function formatBatchDate(date: Date): string {
  return format(date, "dd/MM", { locale: ptBR });
}

/**
 * Formata data completa para exibição (dd/MM/yyyy)
 */
export function formatBatchDateFull(date: Date): string {
  return format(date, "dd/MM/yyyy", { locale: ptBR });
}

/**
 * Capitaliza primeira letra
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Calcula dias restantes até o fim das vendas
 */
export function getDaysUntilSalesEnd(batch: CalculatedBatch, date: Date = new Date()): number {
  const diff = batch.salesEnd.getTime() - date.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Gera resumo textual do ciclo
 */
export function getBatchSummary(batch: CalculatedBatch): string {
  return `${batch.name} • Vendas: ${formatBatchDate(batch.salesStart)} a ${formatBatchDate(batch.salesEnd)} (${batch.salesDuration} dias) • Produção: ${formatBatchDate(batch.productionStart)} a ${formatBatchDate(batch.productionEnd)} (${batch.productionDuration} dias) • Envio: Até ${batch.shippingDeadline}º dia útil de ${batch.shippingMonth}/${batch.shippingYear}`;
}

/**
 * Gera texto de prazo para o cliente
 */
export function getCustomerDeadlineText(batch: CalculatedBatch): string {
  return `Quem compra no dia ${formatBatchDate(batch.salesStart)} recebe até ${formatBatchDateFull(batch.shippingDeadlineDate)} (prazo: ~${batch.minDeliveryDays} dias). Quem compra no dia ${formatBatchDate(batch.salesEnd)} recebe até ${formatBatchDateFull(batch.shippingDeadlineDate)} (prazo: ~${batch.maxDeliveryDays} dias). Prazo médio: ~${batch.avgDeliveryDays} dias.`;
}

/**
 * Retorna texto do status em português
 */
export function getStatusText(status: CycleStatus): string {
  const statusMap: Record<CycleStatus, string> = {
    open_for_sales: "Aberto para vendas",
    closed: "Fechado",
    in_production: "Em produção",
    production_finished: "Produção finalizada",
    shipped: "Enviado",
  };
  return statusMap[status];
}

/**
 * Exemplo de uso:
 *
 * const rules: BatchRules = { shippingBusinessDays: BATCH.SHIPPING_BUSINESS_DAYS };
 *
 * // Ciclo atual
 * const current = calculateCurrentBatch(rules);
 *
 * // Próximos 6 ciclos (3 meses)
 * const future = calculateFutureBatches(rules, 6);
 */
