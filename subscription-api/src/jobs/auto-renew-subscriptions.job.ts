/**
 * Auto-Renewal Job
 * 
 * Job agendado que executa diariamente para renovar assinaturas que:
 * - Atingiram a data de renovação (next_billing_date <= NOW())
 * - Têm renovação automática ativa (auto_renew = TRUE)
 * - Estão com status 'active'
 * 
 * Para cada assinatura encontrada:
 * 1. Verifica se há pending_plan_change
 * 2. Chama renewSubscription() que:
 *    - Processa mudança de plano (se pending_plan_change existe)
 *    - Ou renova plano atual (se não há mudança)
 *    - Processa pagamento
 *    - Aloca créditos do plano (atual ou novo)
 *    - Cria pedido automático
 *    - Limpa pending_plan_change após processar
 * 
 * Validações: Requisitos 2.4, 2.5, 8.3, 8.4, 8.5
 */

import cron from 'node-cron';
import { getPrismaClient } from '../config/database';
import { renewSubscription } from '../services/subscription.service';

const prisma = getPrismaClient();

/**
 * Resultado do processamento de renovação
 */
interface RenewalResult {
  subscriptionId: number;
  userId: number;
  planType: string;
  creditsAllocated: number;
  planChanged: boolean;
  previousPlanType?: string;
  success: boolean;
  error?: string;
}

/**
 * Processa a renovação de uma assinatura individual
 * 
 * @param subscriptionId - ID da assinatura a renovar
 * @param userId - ID do usuário
 * @param hasPendingChange - Se há mudança de plano agendada
 * @param pendingPlanType - Tipo de plano agendado (se houver)
 * @returns Resultado do processamento
 */
async function processSubscriptionRenewal(
  subscriptionId: bigint,
  userId: bigint,
  hasPendingChange: boolean,
  pendingPlanType?: string
): Promise<RenewalResult> {
  const userIdNum = Number(userId);
  const subscriptionIdNum = Number(subscriptionId);

  try {
    // Chama renewSubscription() que já implementa toda a lógica:
    // - Verifica pending_plan_change
    // - Processa mudança de plano (encerra anterior, cria novo) OU renova atual
    // - Processa pagamento
    // - Aloca créditos
    // - Cria pedido automático
    // - Limpa pending_plan_change
    const result = await renewSubscription(subscriptionIdNum);

    return {
      subscriptionId: result.subscriptionId,
      userId: result.userId,
      planType: result.planType,
      creditsAllocated: result.creditsAllocated,
      planChanged: result.planChanged,
      previousPlanType: result.previousPlanType,
      success: true
    };
  } catch (error) {
    console.error(
      `Error renewing subscription ${subscriptionIdNum} for user ${userIdNum}:`,
      error
    );
    
    return {
      subscriptionId: subscriptionIdNum,
      userId: userIdNum,
      planType: 'unknown',
      creditsAllocated: 0,
      planChanged: hasPendingChange,
      previousPlanType: pendingPlanType,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Executa o job de renovação automática de assinaturas
 * 
 * Busca todas as assinaturas que:
 * - next_billing_date <= NOW()
 * - auto_renew = TRUE
 * - status = 'active'
 * 
 * E processa a renovação de cada uma.
 */
export async function runAutoRenewalJob(): Promise<void> {
  console.log('[Auto-Renewal Job] Starting subscription auto-renewal job...');
  
  try {
    // Busca assinaturas elegíveis para renovação
    const subscriptionsToRenew = await prisma.subscription.findMany({
      where: {
        status: 'active',
        autoRenew: true,
        nextBillingDate: {
          lte: new Date()
        }
      },
      select: {
        id: true,
        userId: true,
        planType: true,
        pendingPlanChange: true,
        nextBillingDate: true
      }
    });

    console.log(
      `[Auto-Renewal Job] Found ${subscriptionsToRenew.length} subscriptions to renew`
    );

    if (subscriptionsToRenew.length === 0) {
      console.log('[Auto-Renewal Job] No subscriptions to renew');
      return;
    }

    // Processa cada assinatura
    const results: RenewalResult[] = [];
    
    for (const subscription of subscriptionsToRenew) {
      const hasPendingChange = subscription.pendingPlanChange !== null;
      const pendingPlanType = subscription.pendingPlanChange || undefined;

      console.log(
        `[Auto-Renewal Job] Processing subscription ${Number(subscription.id)} ` +
        `(User ${Number(subscription.userId)}, Plan: ${subscription.planType}` +
        `${hasPendingChange ? `, Pending: ${pendingPlanType}` : ''})`
      );

      const result = await processSubscriptionRenewal(
        subscription.id,
        subscription.userId,
        hasPendingChange,
        pendingPlanType
      );
      
      results.push(result);
    }

    // Resumo dos resultados
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const planChanges = results.filter(r => r.success && r.planChanged).length;
    const totalCreditsAllocated = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.creditsAllocated, 0);

    console.log('[Auto-Renewal Job] Job completed:');
    console.log(`  - Successful: ${successful}`);
    console.log(`  - Failed: ${failed}`);
    console.log(`  - Plan changes processed: ${planChanges}`);
    console.log(`  - Total credits allocated: ${totalCreditsAllocated}`);

    // Log de mudanças de plano
    if (planChanges > 0) {
      console.log('[Auto-Renewal Job] Plan changes:');
      results
        .filter(r => r.success && r.planChanged)
        .forEach(r => {
          console.log(
            `  - Subscription ${r.subscriptionId} (User ${r.userId}): ` +
            `${r.previousPlanType} → ${r.planType}`
          );
        });
    }

    // Log de erros
    if (failed > 0) {
      console.error('[Auto-Renewal Job] Failed renewals:');
      results
        .filter(r => !r.success)
        .forEach(r => {
          console.error(
            `  - Subscription ${r.subscriptionId} (User ${r.userId}): ${r.error}`
          );
        });
    }
  } catch (error) {
    console.error('[Auto-Renewal Job] Fatal error running auto-renewal job:', error);
    throw error;
  }
}

/**
 * Configura o cron job para executar diariamente às 01:00
 * 
 * Formato do cron: "0 1 * * *"
 * - Minuto: 0
 * - Hora: 1 (01:00)
 * - Dia do mês: * (todos)
 * - Mês: * (todos)
 * - Dia da semana: * (todos)
 * 
 * Executa às 01:00 para evitar sobreposição com o job de expiração (00:00)
 * 
 * @returns Instância do cron job configurado
 */
export function scheduleAutoRenewalJob() {
  console.log('[Auto-Renewal Job] Scheduling daily auto-renewal job at 01:00');
  
  const job = cron.schedule(
    '0 1 * * *',
    async () => {
      try {
        await runAutoRenewalJob();
      } catch (error) {
        console.error('[Auto-Renewal Job] Error in scheduled job:', error);
      }
    },
    {
      timezone: 'America/Sao_Paulo' // Ajuste conforme necessário
    }
  );

  console.log('[Auto-Renewal Job] Job scheduled successfully');
  
  return job;
}
