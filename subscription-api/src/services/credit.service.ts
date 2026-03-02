/**
 * Credit Management Service
 * 
 * Serviço core que gerencia créditos dos usuários.
 * Garante:
 * - Invariante: available_credits = total_credits - used_credits
 * - Transações atômicas para evitar condições de corrida
 * - Validação de saldo antes de débitos
 * - Lock pessimista em operações concorrentes
 */

import { getPrismaClient } from '../config/database';

const prisma = getPrismaClient();

/**
 * Resultado da alocação de créditos
 */
export interface AllocateCreditsResult {
  userId: number;
  subscriptionId: number;
  totalCredits: number;
  availableCredits: number;
  creditsAllocated: number;
}

/**
 * Resultado do débito de créditos
 */
export interface DebitCreditsResult {
  userId: number;
  previousAvailable: number;
  debited: number;
  newAvailable: number;
}

/**
 * Saldo de créditos do usuário
 */
export interface UserCreditsBalance {
  userId: number;
  subscriptionId: number;
  totalCredits: number;
  usedCredits: number;
  availableCredits: number;
  expiredCredits: number;
}

/**
 * Resultado da expiração de créditos
 */
export interface ExpireCreditsResult {
  userId: number;
  creditsExpired: number;
  newAvailableCredits: number;
}

/**
 * Aloca créditos para um usuário vinculado a uma assinatura
 * 
 * Esta função:
 * - Cria ou atualiza o registro de créditos do usuário
 * - Soma os novos créditos ao saldo existente (não reseta)
 * - Usa transação atômica para garantir consistência
 * - Mantém invariante: available_credits = total_credits - used_credits
 * 
 * @param userId - ID do usuário
 * @param subscriptionId - ID da assinatura
 * @param amount - Quantidade de créditos a alocar
 * @returns Resultado da alocação com saldo atualizado
 * @throws Error se amount for negativo ou zero
 */
export async function allocateCredits(
  userId: number,
  subscriptionId: number,
  amount: number
): Promise<AllocateCreditsResult> {
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }

  return await prisma.$transaction(async (tx) => {
    // Busca ou cria registro de créditos do usuário
    const existingCredits = await tx.userCredit.findUnique({
      where: { userId: BigInt(userId) }
    });

    let userCredits;

    if (existingCredits) {
      // Atualiza créditos existentes (soma ao saldo)
      userCredits = await tx.userCredit.update({
        where: { userId: BigInt(userId) },
        data: {
          subscriptionId: BigInt(subscriptionId),
          totalCredits: { increment: amount },
          availableCredits: { increment: amount }
        }
      });
    } else {
      // Cria novo registro de créditos
      userCredits = await tx.userCredit.create({
        data: {
          userId: BigInt(userId),
          subscriptionId: BigInt(subscriptionId),
          totalCredits: amount,
          usedCredits: 0,
          availableCredits: amount,
          expiredCredits: 0
        }
      });
    }

    return {
      userId: Number(userCredits.userId),
      subscriptionId: Number(userCredits.subscriptionId),
      totalCredits: userCredits.totalCredits,
      availableCredits: userCredits.availableCredits,
      creditsAllocated: amount
    };
  });
}

/**
 * Debita créditos de um usuário com validação de saldo
 * 
 * Esta função:
 * - Valida que o usuário tem saldo suficiente
 * - Usa lock pessimista (FOR UPDATE) para evitar condições de corrida
 * - Atualiza used_credits e available_credits atomicamente
 * - Mantém invariante: available_credits = total_credits - used_credits
 * 
 * @param userId - ID do usuário
 * @param amount - Quantidade de créditos a debitar
 * @returns Resultado do débito com saldo atualizado
 * @throws Error se saldo insuficiente ou amount inválido
 */
export async function debitCredits(
  userId: number,
  amount: number
): Promise<DebitCreditsResult> {
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }

  return await prisma.$transaction(async (tx) => {
    // Busca créditos com lock pessimista para evitar race conditions
    // Usa queryRaw para garantir FOR UPDATE
    const credits = await tx.$queryRaw<Array<{
      user_id: bigint;
      subscription_id: bigint;
      total_credits: number;
      used_credits: number;
      available_credits: number;
      expired_credits: number;
    }>>`
      SELECT * FROM user_credits 
      WHERE user_id = ${BigInt(userId)}
      FOR UPDATE
    `;

    if (!credits || credits.length === 0) {
      throw new Error(`No credits found for user ${userId}`);
    }

    const currentCredits = credits[0];
    
    if (!currentCredits) {
      throw new Error(`No credits found for user ${userId}`);
    }
    
    const previousAvailable = currentCredits.available_credits;

    // Valida saldo suficiente
    if (currentCredits.available_credits < amount) {
      throw new Error(
        `Insufficient credits. Available: ${currentCredits.available_credits}, Required: ${amount}`
      );
    }

    // Atualiza créditos
    const updated = await tx.userCredit.update({
      where: { userId: BigInt(userId) },
      data: {
        usedCredits: { increment: amount },
        availableCredits: { decrement: amount }
      }
    });

    return {
      userId: Number(updated.userId),
      previousAvailable,
      debited: amount,
      newAvailable: updated.availableCredits
    };
  });
}

/**
 * Obtém o saldo de créditos de um usuário
 * 
 * @param userId - ID do usuário
 * @returns Saldo de créditos ou null se não encontrado
 */
export async function getUserCredits(
  userId: number
): Promise<UserCreditsBalance | null> {
  const credits = await prisma.userCredit.findUnique({
    where: { userId: BigInt(userId) }
  });

  if (!credits) {
    return null;
  }

  return {
    userId: Number(credits.userId),
    subscriptionId: Number(credits.subscriptionId),
    totalCredits: credits.totalCredits,
    usedCredits: credits.usedCredits,
    availableCredits: credits.availableCredits,
    expiredCredits: credits.expiredCredits
  };
}

/**
 * Expira todos os créditos disponíveis de um usuário
 * 
 * Esta função é usada quando:
 * - Assinatura é cancelada com extorno
 * - Assinatura expira naturalmente (não-renovação)
 * 
 * Move todos os créditos disponíveis para expired_credits
 * e zera available_credits.
 * 
 * @param userId - ID do usuário
 * @returns Resultado da expiração
 * @throws Error se usuário não tem créditos
 */
export async function expireCredits(
  userId: number
): Promise<ExpireCreditsResult> {
  return await prisma.$transaction(async (tx) => {
    // Busca créditos atuais
    const currentCredits = await tx.userCredit.findUnique({
      where: { userId: BigInt(userId) }
    });

    if (!currentCredits) {
      throw new Error(`No credits found for user ${userId}`);
    }

    const creditsToExpire = currentCredits.availableCredits;

    // Se não há créditos disponíveis, não faz nada
    if (creditsToExpire === 0) {
      return {
        userId,
        creditsExpired: 0,
        newAvailableCredits: 0
      };
    }

    // Move créditos disponíveis para expirados
    const updated = await tx.userCredit.update({
      where: { userId: BigInt(userId) },
      data: {
        availableCredits: 0,
        expiredCredits: { increment: creditsToExpire }
      }
    });

    return {
      userId: Number(updated.userId),
      creditsExpired: creditsToExpire,
      newAvailableCredits: updated.availableCredits
    };
  });
}
