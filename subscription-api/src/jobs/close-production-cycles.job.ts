/**
 * Production Cycle Closing Job
 * 
 * Job agendado que executa a cada hora para fechar ciclos de produção que:
 * - Atingiram a data de fechamento (close_date <= NOW())
 * - Estão com status 'open'
 * 
 * Para cada ciclo encontrado:
 * 1. Chama closeProductionCycle() que:
 *    - Fecha o ciclo (status = 'closed')
 *    - Busca todos os pedidos automáticos não debitados
 *    - Bloqueia todos os pedidos
 *    - Para cada pedido: valida saldo, debita créditos se suficiente, confirma ou mantém pendente
 *    - Registra transações de crédito
 * 
 * Validações: Requisitos 6.5-6.10, 7.5
 */

import cron from 'node-cron';
import { getPrismaClient } from '../config/database';
import { closeProductionCycle } from '../services/production-cycle.service';

const prisma = getPrismaClient();

/**
 * Resultado do processamento de fechamento de ciclo
 */
interface CycleClosingResult {
  cycleId: number;
  cycleName: string;
  totalOrders: number;
  confirmedOrders: number;
  pendingOrders: number;
  success: boolean;
  error?: string;
}

/**
 * Processa o fechamento de um ciclo individual
 * 
 * @param cycleId - ID do ciclo a fechar
 * @param cycleName - Nome do ciclo (para logging)
 * @returns Resultado do processamento
 */
async function processCycleClosing(
  cycleId: bigint,
  cycleName: string
): Promise<CycleClosingResult> {
  const cycleIdNum = Number(cycleId);

  try {
    // Chama closeProductionCycle() que já implementa toda a lógica:
    // - Fecha o ciclo
    // - Busca pedidos automáticos não debitados
    // - Bloqueia todos os pedidos
    // - Valida saldo e debita créditos
    // - Confirma ou mantém pendente
    // - Registra transações
    const result = await closeProductionCycle(cycleIdNum);

    return {
      cycleId: cycleIdNum,
      cycleName,
      totalOrders: result.totalOrders,
      confirmedOrders: result.confirmedOrders,
      pendingOrders: result.pendingOrders,
      success: true
    };
  } catch (error) {
    console.error(
      `Error closing production cycle ${cycleIdNum} (${cycleName}):`,
      error
    );
    
    return {
      cycleId: cycleIdNum,
      cycleName,
      totalOrders: 0,
      confirmedOrders: 0,
      pendingOrders: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Executa o job de fechamento de ciclos de produção
 * 
 * Busca todos os ciclos que:
 * - close_date <= NOW()
 * - status = 'open'
 * 
 * E processa o fechamento de cada um.
 */
export async function runCycleClosingJob(): Promise<void> {
  console.log('[Cycle Closing Job] Starting production cycle closing job...');
  
  try {
    // Busca ciclos elegíveis para fechamento
    const cyclesToClose = await prisma.productionCycle.findMany({
      where: {
        status: 'open',
        closeDate: {
          lte: new Date()
        }
      },
      select: {
        id: true,
        name: true,
        closeDate: true,
        currentCount: true,
        capacityLimit: true
      }
    });

    console.log(
      `[Cycle Closing Job] Found ${cyclesToClose.length} cycles to close`
    );

    if (cyclesToClose.length === 0) {
      console.log('[Cycle Closing Job] No cycles to close');
      return;
    }

    // Processa cada ciclo
    const results: CycleClosingResult[] = [];
    
    for (const cycle of cyclesToClose) {
      console.log(
        `[Cycle Closing Job] Processing cycle ${Number(cycle.id)} ` +
        `(${cycle.name}, ${cycle.currentCount}/${cycle.capacityLimit} items)`
      );

      const result = await processCycleClosing(cycle.id, cycle.name);
      results.push(result);
    }

    // Resumo dos resultados
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalOrders = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.totalOrders, 0);
    const totalConfirmed = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.confirmedOrders, 0);
    const totalPending = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.pendingOrders, 0);

    console.log('[Cycle Closing Job] Job completed:');
    console.log(`  - Successful: ${successful}`);
    console.log(`  - Failed: ${failed}`);
    console.log(`  - Total orders processed: ${totalOrders}`);
    console.log(`  - Orders confirmed: ${totalConfirmed}`);
    console.log(`  - Orders pending: ${totalPending}`);

    // Log detalhado de cada ciclo fechado
    if (successful > 0) {
      console.log('[Cycle Closing Job] Closed cycles:');
      results
        .filter(r => r.success)
        .forEach(r => {
          console.log(
            `  - Cycle ${r.cycleId} (${r.cycleName}): ` +
            `${r.confirmedOrders} confirmed, ${r.pendingOrders} pending`
          );
        });
    }

    // Log de erros
    if (failed > 0) {
      console.error('[Cycle Closing Job] Failed cycles:');
      results
        .filter(r => !r.success)
        .forEach(r => {
          console.error(
            `  - Cycle ${r.cycleId} (${r.cycleName}): ${r.error}`
          );
        });
    }
  } catch (error) {
    console.error('[Cycle Closing Job] Fatal error running cycle closing job:', error);
    throw error;
  }
}

/**
 * Configura o cron job para executar a cada hora (no minuto 0)
 * 
 * Formato do cron: "0 * * * *"
 * - Minuto: 0 (no início de cada hora)
 * - Hora: * (todas as horas)
 * - Dia do mês: * (todos)
 * - Mês: * (todos)
 * - Dia da semana: * (todos)
 * 
 * Executa a cada hora para garantir que ciclos sejam fechados
 * próximo ao horário programado.
 * 
 * @returns Instância do cron job configurado
 */
export function scheduleCycleClosingJob() {
  console.log('[Cycle Closing Job] Scheduling hourly cycle closing job at minute 0');
  
  const job = cron.schedule(
    '0 * * * *',
    async () => {
      try {
        await runCycleClosingJob();
      } catch (error) {
        console.error('[Cycle Closing Job] Error in scheduled job:', error);
      }
    },
    {
      timezone: 'America/Sao_Paulo' // Ajuste conforme necessário
    }
  );

  console.log('[Cycle Closing Job] Job scheduled successfully');
  
  return job;
}
