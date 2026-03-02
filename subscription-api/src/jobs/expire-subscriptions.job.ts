/**
 * Subscription Expiration Job
 * 
 * Job agendado que executa diariamente para expirar assinaturas que:
 * - Atingiram a data de expiração (end_date <= NOW())
 * - Não têm renovação automática ativa (auto_renew = FALSE)
 * - Estão com status 'active'
 * 
 * Para cada assinatura encontrada:
 * 1. Atualiza status para 'expired'
 * 2. Expira todos os créditos disponíveis
 * 3. Registra transação de expiração
 * 
 * Validações: Requisitos 2.2.4, 2.2.5
 */

import cron from 'node-cron';
import { getPrismaClient } from '../config/database';
import { expireCredits } from '../services/credit.service';
import { recordTransaction } from '../services/transaction.service';

const prisma = getPrismaClient();

/**
 * Resultado do processamento de expiração
 */
interface ExpirationResult {
  subscriptionId: number;
  userId: number;
  creditsExpired: number;
  success: boolean;
  error?: string;
}

/**
 * Processa a expiração de uma assinatura individual
 * 
 * @param subscriptionId - ID da assinatura a expirar
 * @param userId - ID do usuário
 * @returns Resultado do processamento
 */
async function processSubscriptionExpiration(
  subscriptionId: bigint,
  userId: bigint
): Promise<ExpirationResult> {
  const userIdNum = Number(userId);
  const subscriptionIdNum = Number(subscriptionId);

  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Atualiza status da assinatura para 'expired'
      await tx.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: 'expired'
        }
      });

      // 2. Expira todos os créditos disponíveis do usuário
      const expirationResult = await expireCredits(userIdNum);

      // 3. Registra transação de expiração (se houve créditos expirados)
      if (expirationResult.creditsExpired > 0) {
        await recordTransaction(
          userIdNum,
          'expiration',
          -expirationResult.creditsExpired,
          {
            description: 'Expiração natural - não-renovação'
          }
        );
      }

      return {
        subscriptionId: subscriptionIdNum,
        userId: userIdNum,
        creditsExpired: expirationResult.creditsExpired,
        success: true
      };
    });
  } catch (error) {
    console.error(
      `Error expiring subscription ${subscriptionIdNum} for user ${userIdNum}:`,
      error
    );
    
    return {
      subscriptionId: subscriptionIdNum,
      userId: userIdNum,
      creditsExpired: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Executa o job de expiração de assinaturas
 * 
 * Busca todas as assinaturas que:
 * - end_date <= NOW()
 * - auto_renew = FALSE
 * - status = 'active'
 * 
 * E processa a expiração de cada uma.
 */
export async function runExpirationJob(): Promise<void> {
  console.log('[Expiration Job] Starting subscription expiration job...');
  
  try {
    // Busca assinaturas elegíveis para expiração
    const expiredSubscriptions = await prisma.subscription.findMany({
      where: {
        status: 'active',
        autoRenew: false,
        endDate: {
          lte: new Date()
        }
      },
      select: {
        id: true,
        userId: true,
        planType: true,
        endDate: true
      }
    });

    console.log(
      `[Expiration Job] Found ${expiredSubscriptions.length} subscriptions to expire`
    );

    if (expiredSubscriptions.length === 0) {
      console.log('[Expiration Job] No subscriptions to expire');
      return;
    }

    // Processa cada assinatura
    const results: ExpirationResult[] = [];
    
    for (const subscription of expiredSubscriptions) {
      const result = await processSubscriptionExpiration(
        subscription.id,
        subscription.userId
      );
      results.push(result);
    }

    // Resumo dos resultados
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalCreditsExpired = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.creditsExpired, 0);

    console.log('[Expiration Job] Job completed:');
    console.log(`  - Successful: ${successful}`);
    console.log(`  - Failed: ${failed}`);
    console.log(`  - Total credits expired: ${totalCreditsExpired}`);

    // Log de erros
    if (failed > 0) {
      console.error('[Expiration Job] Failed subscriptions:');
      results
        .filter(r => !r.success)
        .forEach(r => {
          console.error(
            `  - Subscription ${r.subscriptionId} (User ${r.userId}): ${r.error}`
          );
        });
    }
  } catch (error) {
    console.error('[Expiration Job] Fatal error running expiration job:', error);
    throw error;
  }
}

/**
 * Configura o cron job para executar diariamente às 00:00
 * 
 * Formato do cron: "0 0 * * *"
 * - Minuto: 0
 * - Hora: 0 (meia-noite)
 * - Dia do mês: * (todos)
 * - Mês: * (todos)
 * - Dia da semana: * (todos)
 * 
 * @returns Instância do cron job configurado
 */
export function scheduleExpirationJob() {
  console.log('[Expiration Job] Scheduling daily expiration job at 00:00');
  
  const job = cron.schedule(
    '0 0 * * *',
    async () => {
      try {
        await runExpirationJob();
      } catch (error) {
        console.error('[Expiration Job] Error in scheduled job:', error);
      }
    },
    {
      timezone: 'America/Sao_Paulo' // Ajuste conforme necessário
    }
  );

  console.log('[Expiration Job] Job scheduled successfully');
  
  return job;
}
