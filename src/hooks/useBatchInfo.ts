/**
 * Hook para acessar informações do ciclo/lote atual
 * Versão 2.0: Suporte a Modelo Recorrente Mensal (2 ciclos por mês)
 */

import { useContentSettings } from "./useContentSettings";
import type { ContentSettings } from "@/lib/services/contentService";
import {
  calculateCurrentBatch,
  calculateNextBatch,
  calculateFutureBatches,
  type CalculatedBatch,
  type BatchRules,
} from "@/lib/services/batchCalculator";

export interface UseBatchInfoReturn {
  currentBatch: CalculatedBatch | null;
  nextBatch: CalculatedBatch | null;
  futureBatches: CalculatedBatch[];
  rules: BatchRules;
  settings: ContentSettings | undefined;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook para acessar informações do ciclo atual
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { currentBatch, isLoading } = useBatchInfo();
 *
 *   if (isLoading) return <Skeleton />;
 *   if (!currentBatch) return null;
 *
 *   return (
 *     <div>
 *       <h2>{currentBatch.name}</h2>
 *       <p>Vendas: {formatBatchDate(currentBatch.salesStart)} a {formatBatchDate(currentBatch.salesEnd)}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useBatchInfo(futureCount: number = 6): UseBatchInfoReturn {
  const { data: settings, isLoading, error } = useContentSettings();

  // Regras do sistema
  const rules: BatchRules = {
    shippingBusinessDays: settings?.shippingBusinessDays ?? 5,
  };

  // Calcular ciclo atual
  const currentBatch: CalculatedBatch | null = settings ? calculateCurrentBatch(rules) : null;

  // Calcular próximo ciclo
  const nextBatch: CalculatedBatch | null = currentBatch
    ? calculateNextBatch(rules, currentBatch)
    : null;

  // Calcular próximos N ciclos
  const futureBatches: CalculatedBatch[] = settings
    ? calculateFutureBatches(rules, futureCount)
    : [];

  return {
    currentBatch,
    nextBatch,
    futureBatches,
    rules,
    settings,
    isLoading,
    error: error as Error | null,
  };
}

/**
 * Hook simplificado que retorna apenas o ciclo atual
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const currentBatch = useCurrentBatch();
 *
 *   if (!currentBatch) return null;
 *
 *   return <div>{currentBatch.name}</div>;
 * }
 * ```
 */
export function useCurrentBatch(): CalculatedBatch | null {
  const { currentBatch } = useBatchInfo();
  return currentBatch;
}
