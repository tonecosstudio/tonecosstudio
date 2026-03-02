/**
 * Production Cycle Management Service
 * 
 * Serviço que gerencia ciclos de produção com capacidade limitada.
 * Garante:
 * - Criação de ciclos com validação de dados
 * - Busca de ciclo aberto atual
 * - Consulta de ciclos por ID
 * - Controle de capacidade e status
 * 
 * Regras de Negócio:
 * - Cada ciclo tem capacidade limitada de personagens
 * - Ciclos podem estar abertos, cheios ou fechados
 * - Apenas um ciclo aberto por vez (ordenado por data de fechamento)
 * - Datas de fechamento devem ser no futuro
 */

import { getPrismaClient } from '../config/database';

const prisma = getPrismaClient();

/**
 * Status do ciclo de produção
 */
export type CycleStatus = 'open' | 'full' | 'closed';

/**
 * Resultado de ciclo de produção
 */
export interface ProductionCycleResult {
  id: number;
  name: string;
  capacityLimit: number;
  currentCount: number;
  status: CycleStatus;
  closeDate: Date;
  createdAt: Date;
  updatedAt: Date;
  closedAt: Date | null;
}

/**
 * Cria um novo ciclo de produção
 * 
 * Validações:
 * - Nome não pode ser vazio
 * - Capacidade deve ser positiva
 * - Data de fechamento deve ser no futuro
 * 
 * O ciclo é criado com:
 * - status = 'open'
 * - currentCount = 0
 * 
 * @param name - Nome do ciclo (ex: "Ciclo Janeiro 2024")
 * @param capacityLimit - Limite máximo de personagens no ciclo
 * @param closeDate - Data programada de fechamento
 * @returns Ciclo criado
 * @throws Error se validação falhar
 * 
 * **Valida: Requisito 7.1**
 */
export async function createProductionCycle(
  name: string,
  capacityLimit: number,
  closeDate: Date
): Promise<ProductionCycleResult> {
  // Validação de nome
  if (!name || name.trim().length === 0) {
    throw new Error('Nome do ciclo é obrigatório');
  }

  // Validação de capacidade
  if (capacityLimit <= 0) {
    throw new Error('Capacidade deve ser positiva');
  }

  // Validação de data de fechamento
  const now = new Date();
  if (closeDate <= now) {
    throw new Error('Data de fechamento deve ser no futuro');
  }

  // Cria ciclo no banco de dados
  const cycle = await prisma.productionCycle.create({
    data: {
      name: name.trim(),
      capacityLimit,
      currentCount: 0,
      status: 'open',
      closeDate
    }
  });

  return mapCycleToResult(cycle);
}

/**
 * Obtém o ciclo aberto atual
 * 
 * Retorna o primeiro ciclo com:
 * - status = 'open'
 * - currentCount < capacityLimit
 * 
 * Ordenado por closeDate ASC (ciclo que fecha primeiro tem prioridade).
 * 
 * @returns Ciclo aberto atual ou null se não houver
 * 
 * **Valida: Requisito 7.2**
 */
export async function getCurrentOpenCycle(): Promise<ProductionCycleResult | null> {
  const cycle = await prisma.productionCycle.findFirst({
    where: {
      status: 'open',
      currentCount: {
        lt: prisma.productionCycle.fields.capacityLimit
      }
    },
    orderBy: {
      closeDate: 'asc'
    }
  });

  if (!cycle) {
    return null;
  }

  return mapCycleToResult(cycle);
}

/**
 * Obtém um ciclo específico por ID
 * 
 * @param id - ID do ciclo
 * @returns Ciclo ou null se não encontrado
 * 
 * **Valida: Requisito 7.2**
 */
export async function getCycleById(id: number): Promise<ProductionCycleResult | null> {
  const cycle = await prisma.productionCycle.findUnique({
    where: { id: BigInt(id) }
  });

  if (!cycle) {
    return null;
  }

  return mapCycleToResult(cycle);
}

/**
 * Resultado do fechamento de ciclo
 */
export interface CloseCycleResult {
  cycleId: number;
  totalOrders: number;
  confirmedOrders: number;
  pendingOrders: number;
}

/**
 * Fecha um ciclo de produção e processa débito de pedidos automáticos
 * 
 * Esta função implementa o fluxo crítico de fechamento de ciclo:
 * 1. Valida que o ciclo existe e está aberto
 * 2. Fecha o ciclo (status = 'closed', closedAt = now)
 * 3. Busca todos os pedidos automáticos não debitados do ciclo
 * 4. Para cada pedido automático:
 *    - Bloqueia o pedido (isLocked = true, lockedAt = now)
 *    - Calcula total de créditos necessários
 *    - Valida saldo do usuário
 *    - Se saldo suficiente:
 *      * Debita créditos usando debitCredits()
 *      * Atualiza pedido: status='confirmed', creditsDebited=true
 *      * Registra transação de crédito tipo 'debit_cycle_close'
 *    - Se saldo insuficiente:
 *      * Mantém pedido: status='pending', creditsDebited=false
 * 5. Toda operação é atômica (transação de banco de dados)
 * 
 * @param cycleId - ID do ciclo a ser fechado
 * @returns Resumo do fechamento com contadores
 * @throws Error se ciclo não encontrado ou não está aberto
 * 
 * **Valida: Requisitos 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 7.6, 7.7**
 */
export async function closeProductionCycle(
  cycleId: number
): Promise<CloseCycleResult> {
  // Importa serviços necessários
  const { debitCredits, getUserCredits } = await import('./credit.service');
  const { recordTransaction } = await import('./transaction.service');

  return await prisma.$transaction(async (tx) => {
    // 1. Valida que o ciclo existe
    const cycle = await tx.productionCycle.findUnique({
      where: { id: BigInt(cycleId) }
    });

    if (!cycle) {
      throw new Error(`Production cycle ${cycleId} not found`);
    }

    // 2. Valida que o ciclo está aberto
    if (cycle.status !== 'open') {
      throw new Error(`Production cycle ${cycleId} is not open (status: ${cycle.status})`);
    }

    // 3. Fecha o ciclo
    await tx.productionCycle.update({
      where: { id: BigInt(cycleId) },
      data: {
        status: 'closed',
        closedAt: new Date()
      }
    });

    // 4. Busca todos os pedidos automáticos não debitados do ciclo
    const automaticOrders = await tx.order.findMany({
      where: {
        productionCycleId: BigInt(cycleId),
        orderType: 'automatic',
        creditsDebited: false
      },
      include: {
        orderItems: true
      }
    });

    let confirmedCount = 0;
    let pendingCount = 0;

    // 5. Processa cada pedido automático
    for (const order of automaticOrders) {
      const userId = Number(order.userId);
      const orderId = Number(order.id);

      // 5a. Bloqueia o pedido
      await tx.order.update({
        where: { id: order.id },
        data: {
          isLocked: true,
          lockedAt: new Date()
        }
      });

      // 5b. Calcula total de créditos necessários
      const totalCredits = order.orderItems.reduce(
        (sum, item) => sum + item.creditsCost,
        0
      );

      // 5c. Valida saldo do usuário
      const userCredits = await getUserCredits(userId);

      if (!userCredits) {
        // Usuário não tem créditos - mantém pedido pendente
        await tx.order.update({
          where: { id: order.id },
          data: { status: 'pending' }
        });
        pendingCount++;
        continue;
      }

      // 5d. Verifica se tem saldo suficiente
      if (userCredits.availableCredits >= totalCredits) {
        try {
          // Debita créditos
          await debitCredits(userId, totalCredits);

          // Atualiza pedido para confirmado
          await tx.order.update({
            where: { id: order.id },
            data: {
              status: 'confirmed',
              creditsDebited: true
            }
          });

          // Registra transação de crédito para cada item do pedido
          for (const item of order.orderItems) {
            await recordTransaction(
              userId,
              'debit_cycle_close',
              -item.creditsCost,
              {
                characterId: Number(item.characterId),
                orderId: orderId,
                productionCycleId: cycleId,
                description: `Débito automático - fechamento do ciclo ${cycle.name}`
              }
            );
          }

          confirmedCount++;
        } catch (error) {
          // Se falhar o débito, mantém pedido pendente
          await tx.order.update({
            where: { id: order.id },
            data: { status: 'pending' }
          });
          pendingCount++;
        }
      } else {
        // Saldo insuficiente - mantém pedido pendente
        await tx.order.update({
          where: { id: order.id },
          data: { status: 'pending' }
        });
        pendingCount++;
      }
    }

    return {
      cycleId,
      totalOrders: automaticOrders.length,
      confirmedOrders: confirmedCount,
      pendingOrders: pendingCount
    };
  });
}

/**
 * Mapeia um ciclo do Prisma para o formato de resultado
 */
function mapCycleToResult(cycle: any): ProductionCycleResult {
  return {
    id: Number(cycle.id),
    name: cycle.name,
    capacityLimit: cycle.capacityLimit,
    currentCount: cycle.currentCount,
    status: cycle.status as CycleStatus,
    closeDate: cycle.closeDate,
    createdAt: cycle.createdAt,
    updatedAt: cycle.updatedAt,
    closedAt: cycle.closedAt
  };
}
