/**
 * Credit Transaction Service
 * 
 * Serviço responsável por registrar e consultar o histórico de transações de crédito.
 * Cada operação de crédito (alocação, débito, expiração) deve gerar um registro
 * de transação para auditoria e rastreabilidade.
 * 
 * Tipos de transação:
 * - allocation: Alocação inicial de créditos (ativação/renovação)
 * - debit_immediate: Débito imediato (compra individual)
 * - debit_cycle_close: Débito no fechamento de ciclo (pedido automático)
 * - expiration: Expiração de créditos (cancelamento)
 * - adjustment: Ajuste manual (admin)
 */

import { getPrismaClient } from '../config/database';
import { TransactionType } from '../models/types';

const prisma = getPrismaClient();

/**
 * Metadados opcionais para uma transação
 */
export interface TransactionMetadata {
  characterId?: number;
  orderId?: number;
  productionCycleId?: number;
  description?: string;
}

/**
 * Resultado do registro de transação
 */
export interface RecordTransactionResult {
  id: number;
  userId: number;
  subscriptionId: number;
  transactionType: TransactionType;
  creditsAmount: number;
  characterId: number | null;
  orderId: number | null;
  productionCycleId: number | null;
  description: string | null;
  createdAt: Date;
}

/**
 * Opções de paginação para histórico de transações
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
}

/**
 * Resultado paginado de transações
 */
export interface PaginatedTransactions {
  transactions: RecordTransactionResult[];
  pagination: {
    currentPage: number;
    perPage: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Registra uma transação de crédito no histórico
 * 
 * Esta função cria um registro imutável de auditoria para cada operação
 * de crédito realizada no sistema. Deve ser chamada sempre que:
 * - Créditos são alocados (ativação/renovação)
 * - Créditos são debitados (compra individual ou fechamento de ciclo)
 * - Créditos expiram (cancelamento)
 * - Créditos são ajustados manualmente (admin)
 * 
 * @param userId - ID do usuário
 * @param type - Tipo de transação
 * @param amount - Quantidade de créditos (positivo para alocação, negativo para débito/expiração)
 * @param metadata - Metadados opcionais (characterId, orderId, productionCycleId, description)
 * @returns Registro da transação criada
 * @throws Error se userId ou subscriptionId não existirem
 */
export async function recordTransaction(
  userId: number,
  type: TransactionType,
  amount: number,
  metadata: TransactionMetadata = {}
): Promise<RecordTransactionResult> {
  // Busca a assinatura ativa do usuário para vincular a transação
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId: BigInt(userId),
      status: 'active'
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  if (!subscription) {
    throw new Error(`No active subscription found for user ${userId}`);
  }

  // Cria o registro de transação
  const transaction = await prisma.creditTransaction.create({
    data: {
      userId: BigInt(userId),
      subscriptionId: subscription.id,
      transactionType: type,
      creditsAmount: amount,
      characterId: metadata.characterId ? BigInt(metadata.characterId) : null,
      orderId: metadata.orderId ? BigInt(metadata.orderId) : null,
      productionCycleId: metadata.productionCycleId ? BigInt(metadata.productionCycleId) : null,
      description: metadata.description || null
    }
  });

  return {
    id: Number(transaction.id),
    userId: Number(transaction.userId),
    subscriptionId: Number(transaction.subscriptionId),
    transactionType: transaction.transactionType as TransactionType,
    creditsAmount: transaction.creditsAmount,
    characterId: transaction.characterId ? Number(transaction.characterId) : null,
    orderId: transaction.orderId ? Number(transaction.orderId) : null,
    productionCycleId: transaction.productionCycleId ? Number(transaction.productionCycleId) : null,
    description: transaction.description,
    createdAt: transaction.createdAt
  };
}

/**
 * Obtém o histórico de transações de um usuário com paginação
 * 
 * Retorna as transações ordenadas da mais recente para a mais antiga.
 * Suporta paginação básica para lidar com históricos grandes.
 * 
 * @param userId - ID do usuário
 * @param options - Opções de paginação (page, limit)
 * @returns Histórico paginado de transações
 */
export async function getTransactionHistory(
  userId: number,
  options: PaginationOptions = {}
): Promise<PaginatedTransactions> {
  const page = options.page || 1;
  const limit = Math.min(options.limit || 20, 100); // Máximo 100 por página
  const skip = (page - 1) * limit;

  // Busca transações com paginação
  const [transactions, total] = await Promise.all([
    prisma.creditTransaction.findMany({
      where: {
        userId: BigInt(userId)
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    }),
    prisma.creditTransaction.count({
      where: {
        userId: BigInt(userId)
      }
    })
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    transactions: transactions.map(t => ({
      id: Number(t.id),
      userId: Number(t.userId),
      subscriptionId: Number(t.subscriptionId),
      transactionType: t.transactionType as TransactionType,
      creditsAmount: t.creditsAmount,
      characterId: t.characterId ? Number(t.characterId) : null,
      orderId: t.orderId ? Number(t.orderId) : null,
      productionCycleId: t.productionCycleId ? Number(t.productionCycleId) : null,
      description: t.description,
      createdAt: t.createdAt
    })),
    pagination: {
      currentPage: page,
      perPage: limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  };
}
