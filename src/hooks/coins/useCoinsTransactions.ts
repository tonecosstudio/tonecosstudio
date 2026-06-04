/**
 * Hook para gerenciar transações de coins
 * 
 * Fornece acesso ao histórico de transações de coins,
 * com suporte a paginação, filtros e ordenação.
 * 
 * @module hooks/coins/useCoinsTransactions
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { assertCurrentUserId, requireAuthenticatedUserId } from '@/services/auth/current-user';
import { summarizeCoinLedger } from '@/lib/coins-ledger';
import { CoinsTransactionType } from '@/types/coins';
import type {
  CoinsTransaction,
  UserId,
  TransactionId,
  CoinsTransactionsResponse,
} from '@/types/coins';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const coinsTransactionsKeys = {
  all: ['coins', 'transactions'] as const,
  lists: () => [...coinsTransactionsKeys.all, 'list'] as const,
  list: (filters: TransactionFilters) => 
    [...coinsTransactionsKeys.lists(), filters] as const,
  detail: (id: TransactionId) => 
    [...coinsTransactionsKeys.all, 'detail', id] as const,
  user: (userId: UserId) => 
    [...coinsTransactionsKeys.all, 'user', userId] as const,
  userByType: (userId: UserId, type: CoinsTransactionType) => 
    [...coinsTransactionsKeys.user(userId), 'type', type] as const,
};

// ============================================================================
// TIPOS
// ============================================================================

/**
 * Filtros para busca de transações
 */
export interface TransactionFilters {
  /** ID do usuário */
  userId?: UserId | null;
  /** Tipo de transação */
  type?: CoinsTransactionType | null;
  /** Data inicial (ISO string) */
  startDate?: string | null;
  /** Data final (ISO string) */
  endDate?: string | null;
  /** Página atual (1-indexed) */
  page?: number;
  /** Registros por página */
  perPage?: number;
  /** Ordenação (padrão: created_at DESC) */
  orderBy?: 'created_at' | 'amount';
  /** Direção da ordenação */
  orderDirection?: 'asc' | 'desc';
}

/**
 * Opções do hook de transações
 */
export interface UseTransactionsOptions extends TransactionFilters {
  /** Habilitar query? */
  enabled?: boolean;
}

// ============================================================================
// CONFIGURAÇÃO DE CACHE
// ============================================================================

const CACHE_CONFIG = {
  /** Tempo que dados são considerados "frescos" (1 minuto) */
  STALE_TIME: 60 * 1000,
  /** Tempo que dados ficam em cache (5 minutos) */
  CACHE_TIME: 5 * 60 * 1000,
};

type CoinTransactionRow = {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: string;
  description: string | null;
  reference_id: string | null;
  reference_type: string | null;
  created_at: string;
};

const COINS_TRANSACTION_TYPES = new Set<string>(Object.values(CoinsTransactionType));

function toCoinsTransaction(row: CoinTransactionRow): CoinsTransaction {
  if (!COINS_TRANSACTION_TYPES.has(row.transaction_type)) {
    throw new Error(`Tipo de transação de coins inválido: ${row.transaction_type}`);
  }

  return {
    id: row.id,
    user_id: row.user_id,
    amount: row.amount,
    type: row.transaction_type as CoinsTransactionType,
    description: row.description ?? "",
    reference_id: row.reference_id,
    reference_type: row.reference_type,
    created_at: row.created_at,
  };
}

async function resolveCurrentUserId(userId?: UserId | null): Promise<UserId> {
  if (!userId) {
    return requireAuthenticatedUserId();
  }

  await assertCurrentUserId(userId);
  return userId;
}

// ============================================================================
// HOOK PRINCIPAL
// ============================================================================

/**
 * Hook para buscar transações de coins
 * 
 * @param options - Opções de filtro e paginação
 * @returns Query com lista de transações
 * 
 * @example
 * ```tsx
 * function TransactionHistory() {
 *   const { data, isLoading } = useCoinsTransactions({
 *     userId: user.id,
 *     page: 1,
 *     perPage: 20
 *   });
 *   
 *   if (isLoading) return <Loading />;
 *   
 *   return (
 *     <div>
 *       {data?.transactions.map(tx => (
 *         <TransactionItem key={tx.id} transaction={tx} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useCoinsTransactions(options: UseTransactionsOptions = {}) {
  const {
    userId,
    type,
    startDate,
    endDate,
    page = 1,
    perPage = 20,
    orderBy = 'created_at',
    orderDirection = 'desc',
    enabled = true,
  } = options;

  return useQuery({
    queryKey: coinsTransactionsKeys.list({
      userId,
      type,
      startDate,
      endDate,
      page,
      perPage,
      orderBy,
      orderDirection,
    }),
    queryFn: async (): Promise<CoinsTransactionsResponse> => {
      const targetUserId = await resolveCurrentUserId(userId);

      // Construir query
      let query = supabase
        .from('coin_transactions')
        .select('*', { count: 'exact' })
        .eq('user_id', targetUserId);

      // Aplicar filtros
      if (type) {
        query = query.eq('transaction_type', type as string);
      }

      if (startDate) {
        query = query.gte('created_at', startDate);
      }

      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      // Aplicar ordenação
      query = query.order(orderBy, { ascending: orderDirection === 'asc' });

      // Aplicar paginação
      const from = (page - 1) * perPage;
      const to = from + perPage - 1;
      query = query.range(from, to);

      // Executar query
      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Erro ao buscar transações: ${error.message}`);
      }

      const total = count || 0;
      const totalPages = Math.ceil(total / perPage);
      const hasNext = page < totalPages;

      return {
        transactions: ((data || []) as CoinTransactionRow[]).map(toCoinsTransaction),
        total,
        page,
        per_page: perPage,
        has_next: hasNext,
      };
    },
    enabled,
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.CACHE_TIME,
  });
}

// ============================================================================
// HOOK DE TRANSAÇÕES POR TIPO
// ============================================================================

/**
 * Hook para buscar transações de um tipo específico
 * 
 * @param userId - ID do usuário
 * @param type - Tipo de transação
 * @param options - Opções adicionais
 * @returns Query com transações filtradas
 * 
 * @example
 * ```tsx
 * function PurchaseHistory() {
 *   const { data } = useTransactionsByType(user.id, CoinsTransactionType.SPEND);
 *   
 *   return (
 *     <div>
 *       <h2>Suas Compras</h2>
 *       {data?.transactions.map(tx => (
 *         <div key={tx.id}>{tx.description} - {tx.amount} coins</div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useTransactionsByType(
  userId: UserId | null,
  type: CoinsTransactionType,
  options: Omit<UseTransactionsOptions, 'userId' | 'type'> = {}
) {
  return useCoinsTransactions({
    ...options,
    userId,
    type,
  });
}

// ============================================================================
// HOOK DE TRANSAÇÃO ÚNICA
// ============================================================================

/**
 * Hook para buscar detalhes de uma transação específica
 * 
 * @param transactionId - ID da transação
 * @returns Query com detalhes da transação
 * 
 * @example
 * ```tsx
 * function TransactionDetail({ id }: { id: string }) {
 *   const { data: transaction, isLoading } = useTransaction(id);
 *   
 *   if (isLoading) return <Loading />;
 *   if (!transaction) return <NotFound />;
 *   
 *   return (
 *     <div>
 *       <h2>{transaction.description}</h2>
 *       <p>Valor: {transaction.amount} coins</p>
 *       <p>Data: {new Date(transaction.created_at).toLocaleString()}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useTransaction(transactionId: TransactionId) {
  return useQuery({
    queryKey: coinsTransactionsKeys.detail(transactionId),
    queryFn: async (): Promise<CoinsTransaction> => {
      const userId = await requireAuthenticatedUserId();

      const { data, error } = await supabase
        .from('coin_transactions')
        .select('*')
        .eq('id', transactionId)
        .eq('user_id', userId)
        .single();

      if (error) {
        throw new Error(`Erro ao buscar transação: ${error.message}`);
      }

      if (!data) {
        throw new Error('Transação não encontrada');
      }

      return toCoinsTransaction(data as CoinTransactionRow);
    },
    enabled: !!transactionId,
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.CACHE_TIME,
  });
}

// ============================================================================
// HOOK DE ESTATÍSTICAS
// ============================================================================

/**
 * Estatísticas de transações
 */
export interface TransactionStats {
  /** Total de coins recebidos */
  total_received: number;
  /** Total de coins gastos */
  total_spent: number;
  /** Saldo líquido (recebido - gasto) */
  net_balance: number;
  /** Número de transações */
  transaction_count: number;
  /** Transação mais recente */
  last_transaction?: CoinsTransaction;
}

/**
 * Hook para calcular estatísticas de transações
 * 
 * @param userId - ID do usuário
 * @param startDate - Data inicial (opcional)
 * @param endDate - Data final (opcional)
 * @returns Query com estatísticas
 * 
 * @example
 * ```tsx
 * function TransactionStats() {
 *   const { data: stats } = useTransactionStats(user.id);
 *   
 *   return (
 *     <div>
 *       <p>Recebido: {stats?.total_received} coins</p>
 *       <p>Gasto: {stats?.total_spent} coins</p>
 *       <p>Saldo: {stats?.net_balance} coins</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useTransactionStats(
  userId: UserId | null,
  startDate?: string,
  endDate?: string
) {
  return useQuery({
    queryKey: ['coins', 'transactions', 'stats', userId, startDate, endDate],
    queryFn: async (): Promise<TransactionStats> => {
      const targetUserId = await resolveCurrentUserId(userId);

      // Buscar todas transações do período
      let query = supabase
        .from('coin_transactions')
        .select('*')
        .eq('user_id', targetUserId);

      if (startDate) {
        query = query.gte('created_at', startDate);
      }

      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        throw new Error(`Erro ao calcular estatísticas: ${error.message}`);
      }

      const transactions = ((data || []) as CoinTransactionRow[]).map(toCoinsTransaction);

      // Calcular estatísticas
      const summary = summarizeCoinLedger(transactions);

      return {
        total_received: summary.totalEarned,
        total_spent: summary.totalSpent,
        net_balance: summary.netBalance,
        transaction_count: transactions.length,
        last_transaction: transactions[0] || undefined,
      };
    },
    enabled: true,
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.CACHE_TIME,
  });
}

// ============================================================================
// HOOK DE TRANSAÇÕES RECENTES
// ============================================================================

/**
 * Hook para buscar transações recentes
 * 
 * Útil para exibir histórico resumido
 * 
 * @param userId - ID do usuário
 * @param limit - Número de transações (padrão: 10)
 * @returns Query com transações recentes
 * 
 * @example
 * ```tsx
 * function RecentTransactions() {
 *   const { data } = useRecentTransactions(user.id, 5);
 *   
 *   return (
 *     <div>
 *       <h3>Últimas Transações</h3>
 *       {data?.map(tx => (
 *         <div key={tx.id}>{tx.description}</div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useRecentTransactions(
  userId: UserId | null,
  limit: number = 10
) {
  return useQuery({
    queryKey: ['coins', 'transactions', 'recent', userId, limit],
    queryFn: async (): Promise<CoinsTransaction[]> => {
      const targetUserId = await resolveCurrentUserId(userId);

      const { data, error } = await supabase
        .from('coin_transactions')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Erro ao buscar transações recentes: ${error.message}`);
      }

      return ((data || []) as CoinTransactionRow[]).map(toCoinsTransaction);
    },
    enabled: true,
    staleTime: CACHE_CONFIG.STALE_TIME,
    gcTime: CACHE_CONFIG.CACHE_TIME,
  });
}

// ============================================================================
// UTILITÁRIOS
// ============================================================================

/**
 * Agrupa transações por data
 * 
 * @param transactions - Lista de transações
 * @returns Transações agrupadas por data (YYYY-MM-DD)
 */
export function groupTransactionsByDate(
  transactions: CoinsTransaction[]
): Record<string, CoinsTransaction[]> {
  return transactions.reduce((acc, tx) => {
    const date = tx.created_at.split('T')[0]; // YYYY-MM-DD
    
    if (!acc[date]) {
      acc[date] = [];
    }
    
    acc[date].push(tx);
    
    return acc;
  }, {} as Record<string, CoinsTransaction[]>);
}

/**
 * Agrupa transações por tipo
 * 
 * @param transactions - Lista de transações
 * @returns Transações agrupadas por tipo
 */
export function groupTransactionsByType(
  transactions: CoinsTransaction[]
): Record<CoinsTransactionType, CoinsTransaction[]> {
  return transactions.reduce((acc, tx) => {
    if (!acc[tx.type]) {
      acc[tx.type] = [];
    }
    
    acc[tx.type].push(tx);
    
    return acc;
  }, {} as Record<CoinsTransactionType, CoinsTransaction[]>);
}

/**
 * Calcula total de coins por tipo de transação
 * 
 * @param transactions - Lista de transações
 * @returns Total por tipo
 */
export function calculateTotalByType(
  transactions: CoinsTransaction[]
): Record<CoinsTransactionType, number> {
  return transactions.reduce((acc, tx) => {
    if (!acc[tx.type]) {
      acc[tx.type] = 0;
    }
    
    acc[tx.type] += tx.amount;
    
    return acc;
  }, {} as Record<CoinsTransactionType, number>);
}

/**
 * Filtra transações por período
 * 
 * @param transactions - Lista de transações
 * @param startDate - Data inicial
 * @param endDate - Data final
 * @returns Transações filtradas
 */
export function filterTransactionsByPeriod(
  transactions: CoinsTransaction[],
  startDate: Date,
  endDate: Date
): CoinsTransaction[] {
  return transactions.filter((tx) => {
    const txDate = new Date(tx.created_at);
    return txDate >= startDate && txDate <= endDate;
  });
}
