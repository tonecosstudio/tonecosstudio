/**
 * Order Management Service
 * 
 * Serviço que gerencia pedidos (individuais e automáticos).
 * Garante:
 * - Débito imediato de créditos em pedidos individuais
 * - Validação de acesso a personagens exclusivos
 * - Validação de saldo antes de criar pedido
 * - Transações atômicas para consistência
 * 
 * Regras de Negócio:
 * - Pedidos individuais: débito imediato, status='confirmed', isLocked=true
 * - Pedidos automáticos: débito no fechamento do ciclo, status='pending', isLocked=false
 * - Usuários trimestral não podem comprar personagens exclusivos
 */

import { getPrismaClient } from '../config/database';
import { getUserCredits, debitCredits } from './credit.service';
import { recordTransaction } from './transaction.service';
import { getCharacterById } from './character.service';
import { getCurrentOpenCycle } from './production-cycle.service';

const prisma = getPrismaClient();

/**
 * Item de pedido
 */
export interface OrderItemResult {
  id: number;
  characterId: number;
  characterName: string;
  creditsCost: number;
}

/**
 * Resultado de pedido
 */
export interface OrderResult {
  id: number;
  userId: number;
  subscriptionId: number;
  productionCycleId: number;
  orderType: 'individual' | 'automatic';
  status: 'pending' | 'confirmed' | 'in_production' | 'shipped' | 'cancelled';
  isPriority: boolean;
  isLocked: boolean;
  totalCredits: number;
  creditsDebited: boolean;
  createdAt: Date;
  updatedAt: Date;
  lockedAt: Date | null;
  items: OrderItemResult[];
}

/**
 * Cria um pedido individual com débito imediato de créditos
 * 
 * Esta função implementa o fluxo de compra individual:
 * 1. Valida que usuário tem assinatura ativa
 * 2. Valida que personagem existe e usuário tem acesso (exclusividade)
 * 3. Valida que usuário tem créditos suficientes
 * 4. Identifica ciclo de produção aberto
 * 5. Debita créditos IMEDIATAMENTE
 * 6. Cria pedido confirmado e bloqueado
 * 7. Registra transação de crédito
 * 
 * Toda operação é atômica (transação de banco de dados).
 * 
 * @param userId - ID do usuário
 * @param characterId - ID do personagem a comprar
 * @param useCredits - Se deve usar créditos (sempre true para MVP)
 * @returns Pedido criado com itens
 * @throws Error se validação falhar
 * 
 * **Valida: Requisitos 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8**
 */
export async function createIndividualOrder(
  userId: number,
  characterId: number,
  useCredits: boolean = true
): Promise<OrderResult> {
  return await prisma.$transaction(async (tx) => {
    // 1. Busca assinatura ativa do usuário
    const subscription = await tx.subscription.findFirst({
      where: {
        userId: BigInt(userId),
        status: 'active'
      }
    });

    if (!subscription) {
      throw new Error(`User ${userId} has no active subscription`);
    }

    const subscriptionId = Number(subscription.id);
    const planType = subscription.planType;

    // 2. Valida personagem e acesso
    const character = await getCharacterById(characterId, planType);

    if (!character) {
      throw new Error(
        `Character ${characterId} not found or user does not have access`
      );
    }

    // 3. Valida saldo de créditos
    const userCredits = await getUserCredits(userId);

    if (!userCredits) {
      throw new Error(`User ${userId} has no credits`);
    }

    if (userCredits.availableCredits < character.priceCredits) {
      throw new Error(
        `Insufficient credits. Available: ${userCredits.availableCredits}, Required: ${character.priceCredits}`
      );
    }

    // 4. Identifica ciclo aberto
    const cycle = await getCurrentOpenCycle();

    if (!cycle) {
      throw new Error('No open production cycle available');
    }

    // 5. Debita créditos IMEDIATAMENTE
    await debitCredits(userId, character.priceCredits);

    // 6. Cria pedido confirmado e bloqueado
    const order = await tx.order.create({
      data: {
        userId: BigInt(userId),
        subscriptionId: BigInt(subscriptionId),
        productionCycleId: BigInt(cycle.id),
        orderType: 'individual',
        status: 'confirmed',
        isPriority: false,
        isLocked: true,
        totalCredits: character.priceCredits,
        creditsDebited: true,
        lockedAt: new Date()
      }
    });

    // Cria item do pedido
    const orderItem = await tx.orderItem.create({
      data: {
        orderId: order.id,
        characterId: BigInt(characterId),
        creditsCost: character.priceCredits
      }
    });

    // 7. Registra transação de crédito
    await recordTransaction(
      userId,
      'debit_immediate',
      -character.priceCredits,
      {
        characterId: characterId,
        orderId: Number(order.id),
        productionCycleId: cycle.id,
        description: `Compra individual - ${character.name}`
      }
    );

    // Retorna pedido com itens
    return {
      id: Number(order.id),
      userId: Number(order.userId),
      subscriptionId: Number(order.subscriptionId),
      productionCycleId: Number(order.productionCycleId),
      orderType: order.orderType as 'individual' | 'automatic',
      status: order.status as any,
      isPriority: order.isPriority,
      isLocked: order.isLocked,
      totalCredits: order.totalCredits,
      creditsDebited: order.creditsDebited,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      lockedAt: order.lockedAt,
      items: [
        {
          id: Number(orderItem.id),
          characterId: Number(orderItem.characterId),
          characterName: character.name,
          creditsCost: orderItem.creditsCost
        }
      ]
    };
  });
}

/**
 * Cria um pedido automático para a coleção padrão
 * 
 * Esta função implementa o fluxo de criação de pedido automático:
 * 1. Busca personagens da coleção padrão
 * 2. Cria pedido com orderType='automatic', status='pending'
 * 3. Cria order_items para cada personagem da coleção
 * 4. Calcula total de créditos necessários
 * 5. NÃO debita créditos (creditsDebited=false)
 * 
 * O débito de créditos ocorre apenas no fechamento do ciclo.
 * 
 * @param userId - ID do usuário
 * @param subscriptionId - ID da assinatura
 * @param cycleId - ID do ciclo de produção
 * @returns Pedido criado com itens
 * @throws Error se validação falhar
 * 
 * **Valida: Requisitos 6.1, 6.2, 6.3**
 */
export async function createAutomaticOrder(
  userId: number,
  subscriptionId: number,
  cycleId: number
): Promise<OrderResult> {
  return await prisma.$transaction(async (tx) => {
    // 1. Busca personagens da coleção padrão
    const { getStandardCollection } = await import('./character.service');
    const characters = await getStandardCollection();

    if (characters.length === 0) {
      throw new Error('No characters in standard collection');
    }

    // 2. Calcula total de créditos
    const totalCredits = characters.reduce(
      (sum, char) => sum + char.priceCredits,
      0
    );

    // 3. Cria pedido automático (não debitado)
    const order = await tx.order.create({
      data: {
        userId: BigInt(userId),
        subscriptionId: BigInt(subscriptionId),
        productionCycleId: BigInt(cycleId),
        orderType: 'automatic',
        status: 'pending',
        isPriority: false,
        isLocked: false,
        totalCredits: totalCredits,
        creditsDebited: false
      }
    });

    // 4. Cria order_items para cada personagem
    const orderItems = await Promise.all(
      characters.map(async (character) => {
        const item = await tx.orderItem.create({
          data: {
            orderId: order.id,
            characterId: BigInt(character.id),
            creditsCost: character.priceCredits
          }
        });

        return {
          id: Number(item.id),
          characterId: Number(item.characterId),
          characterName: character.name,
          creditsCost: item.creditsCost
        };
      })
    );

    // Retorna pedido com itens
    return {
      id: Number(order.id),
      userId: Number(order.userId),
      subscriptionId: Number(order.subscriptionId),
      productionCycleId: Number(order.productionCycleId),
      orderType: order.orderType as 'individual' | 'automatic',
      status: order.status as any,
      isPriority: order.isPriority,
      isLocked: order.isLocked,
      totalCredits: order.totalCredits,
      creditsDebited: order.creditsDebited,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      lockedAt: order.lockedAt,
      items: orderItems
    };
  });
}

/**
 * Atualiza um pedido automático modificando os personagens
 * 
 * Esta função permite que o usuário customize seu pedido automático
 * antes do fechamento do ciclo:
 * 1. Valida que pedido existe e não está bloqueado
 * 2. Valida que pedido é do tipo 'automatic'
 * 3. Remove order_items existentes
 * 4. Cria novos order_items com os personagens fornecidos
 * 5. Recalcula total de créditos
 * 
 * @param orderId - ID do pedido a atualizar
 * @param characterIds - IDs dos personagens desejados
 * @returns Pedido atualizado com novos itens
 * @throws Error se validação falhar
 * 
 * **Valida: Requisitos 6.4, 6.5**
 */
export async function updateAutomaticOrder(
  orderId: number,
  characterIds: number[]
): Promise<OrderResult> {
  return await prisma.$transaction(async (tx) => {
    // 1. Busca pedido
    const order = await tx.order.findUnique({
      where: { id: BigInt(orderId) },
      include: { orderItems: true }
    });

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    // 2. Valida que pedido não está bloqueado
    if (order.isLocked) {
      throw new Error(`Order ${orderId} is locked and cannot be modified`);
    }

    // 3. Valida que pedido é automático
    if (order.orderType !== 'automatic') {
      throw new Error(`Order ${orderId} is not an automatic order`);
    }

    // 4. Valida que há personagens fornecidos
    if (characterIds.length === 0) {
      throw new Error('At least one character must be provided');
    }

    // 5. Busca personagens e valida acesso
    const characters = await Promise.all(
      characterIds.map(async (charId) => {
        const character = await tx.character.findUnique({
          where: { id: BigInt(charId) }
        });

        if (!character) {
          throw new Error(`Character ${charId} not found`);
        }

        if (!character.isActive) {
          throw new Error(`Character ${charId} is not active`);
        }

        return {
          id: Number(character.id),
          name: character.name,
          priceCredits: character.priceCredits
        };
      })
    );

    // 6. Calcula novo total de créditos
    const totalCredits = characters.reduce(
      (sum, char) => sum + char.priceCredits,
      0
    );

    // 7. Remove order_items existentes
    await tx.orderItem.deleteMany({
      where: { orderId: BigInt(orderId) }
    });

    // 8. Cria novos order_items
    const orderItems = await Promise.all(
      characters.map(async (character) => {
        const item = await tx.orderItem.create({
          data: {
            orderId: BigInt(orderId),
            characterId: BigInt(character.id),
            creditsCost: character.priceCredits
          }
        });

        return {
          id: Number(item.id),
          characterId: Number(item.characterId),
          characterName: character.name,
          creditsCost: item.creditsCost
        };
      })
    );

    // 9. Atualiza total de créditos do pedido
    const updatedOrder = await tx.order.update({
      where: { id: BigInt(orderId) },
      data: { totalCredits: totalCredits }
    });

    // Retorna pedido atualizado
    return {
      id: Number(updatedOrder.id),
      userId: Number(updatedOrder.userId),
      subscriptionId: Number(updatedOrder.subscriptionId),
      productionCycleId: Number(updatedOrder.productionCycleId),
      orderType: updatedOrder.orderType as 'individual' | 'automatic',
      status: updatedOrder.status as any,
      isPriority: updatedOrder.isPriority,
      isLocked: updatedOrder.isLocked,
      totalCredits: updatedOrder.totalCredits,
      creditsDebited: updatedOrder.creditsDebited,
      createdAt: updatedOrder.createdAt,
      updatedAt: updatedOrder.updatedAt,
      lockedAt: updatedOrder.lockedAt,
      items: orderItems
    };
  });
}

/**
 * Obtém pedidos de um usuário com paginação básica
 * 
 * @param userId - ID do usuário
 * @param page - Página atual (padrão: 1)
 * @param limit - Itens por página (padrão: 20, máximo: 100)
 * @returns Lista paginada de pedidos
 * 
 * **Valida: Requisito 7.4**
 */
export async function getUserOrders(
  userId: number,
  page: number = 1,
  limit: number = 20
): Promise<{ orders: OrderResult[]; total: number }> {
  const validPage = Math.max(1, page);
  const validLimit = Math.min(100, Math.max(1, limit));
  const skip = (validPage - 1) * validLimit;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: { userId: BigInt(userId) },
      include: {
        orderItems: {
          include: {
            character: true
          }
        }
      },
      skip,
      take: validLimit,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.order.count({
      where: { userId: BigInt(userId) }
    })
  ]);

  return {
    orders: orders.map((order) => ({
      id: Number(order.id),
      userId: Number(order.userId),
      subscriptionId: Number(order.subscriptionId),
      productionCycleId: Number(order.productionCycleId),
      orderType: order.orderType as 'individual' | 'automatic',
      status: order.status as any,
      isPriority: order.isPriority,
      isLocked: order.isLocked,
      totalCredits: order.totalCredits,
      creditsDebited: order.creditsDebited,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      lockedAt: order.lockedAt,
      items: order.orderItems.map((item) => ({
        id: Number(item.id),
        characterId: Number(item.characterId),
        characterName: item.character.name,
        creditsCost: item.creditsCost
      }))
    })),
    total
  };
}

/**
 * Obtém um pedido específico por ID com validação de propriedade
 * 
 * @param orderId - ID do pedido
 * @param userId - ID do usuário (para validar propriedade)
 * @returns Pedido ou null se não encontrado/sem acesso
 * 
 * **Valida: Requisito 10.5**
 */
export async function getOrderById(
  orderId: number,
  userId: number
): Promise<OrderResult | null> {
  const order = await prisma.order.findFirst({
    where: {
      id: BigInt(orderId),
      userId: BigInt(userId)
    },
    include: {
      orderItems: {
        include: {
          character: true
        }
      }
    }
  });

  if (!order) {
    return null;
  }

  return {
    id: Number(order.id),
    userId: Number(order.userId),
    subscriptionId: Number(order.subscriptionId),
    productionCycleId: Number(order.productionCycleId),
    orderType: order.orderType as 'individual' | 'automatic',
    status: order.status as any,
    isPriority: order.isPriority,
    isLocked: order.isLocked,
    totalCredits: order.totalCredits,
    creditsDebited: order.creditsDebited,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    lockedAt: order.lockedAt,
    items: order.orderItems.map((item) => ({
      id: Number(item.id),
      characterId: Number(item.characterId),
      characterName: item.character.name,
      creditsCost: item.creditsCost
    }))
  };
}
