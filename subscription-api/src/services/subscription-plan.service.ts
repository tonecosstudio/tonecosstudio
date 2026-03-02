/**
 * Subscription Plan Management Service
 * 
 * Serviço responsável por gerenciar planos de assinatura.
 * Fornece funções para:
 * - Consultar planos disponíveis
 * - Calcular créditos totais por plano (base + bônus)
 * 
 * Planos suportados:
 * - Trimestral: 600 créditos (base: 600, bônus: 0)
 * - Semestral: 1400 créditos (base: 1200, bônus: 200)
 */

import { getPrismaClient } from '../config/database';
import { PlanType, SubscriptionPlan } from '../models/types';

const prisma = getPrismaClient();

/**
 * Resultado do cálculo de créditos
 */
export interface CalculateCreditsResult {
  planType: PlanType;
  baseCredits: number;
  bonusCredits: number;
  totalCredits: number;
}

/**
 * Retorna lista de planos de assinatura disponíveis
 * 
 * Retorna apenas planos ativos (isActive = true).
 * Os planos incluem informações de preço, duração e créditos.
 * 
 * @returns Array de planos de assinatura ativos
 */
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const plans = await prisma.subscriptionPlan.findMany({
    where: {
      isActive: true
    },
    orderBy: {
      durationMonths: 'asc'
    }
  });

  return plans.map(plan => ({
    id: Number(plan.id),
    planType: plan.planType as PlanType,
    name: plan.name,
    durationMonths: plan.durationMonths,
    price: Number(plan.price),
    baseCredits: plan.baseCredits,
    bonusCredits: plan.bonusCredits,
    isActive: plan.isActive
  }));
}

/**
 * Calcula créditos totais para um tipo de plano
 * 
 * Esta função:
 * - Busca o plano no banco de dados
 * - Retorna créditos base + créditos bônus
 * - Trimestral: 600 créditos (base: 600, bônus: 0)
 * - Semestral: 1400 créditos (base: 1200, bônus: 200)
 * 
 * @param planType - Tipo de plano (trimestral ou semestral)
 * @returns Detalhes do cálculo de créditos
 * @throws Error se plano não for encontrado ou não estiver ativo
 */
export async function calculateCreditsForPlan(
  planType: PlanType
): Promise<CalculateCreditsResult> {
  const plan = await prisma.subscriptionPlan.findUnique({
    where: {
      planType: planType
    }
  });

  if (!plan) {
    throw new Error(`Plan type '${planType}' not found`);
  }

  if (!plan.isActive) {
    throw new Error(`Plan type '${planType}' is not active`);
  }

  const totalCredits = plan.baseCredits + plan.bonusCredits;

  return {
    planType: plan.planType as PlanType,
    baseCredits: plan.baseCredits,
    bonusCredits: plan.bonusCredits,
    totalCredits
  };
}
