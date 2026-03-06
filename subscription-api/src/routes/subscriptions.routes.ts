/**
 * Subscription Routes
 *
 * Rotas para gerenciamento de assinaturas.
 */

import { Router } from 'express';
import { authenticate, authorize, validate } from '../middleware';
import { z } from 'zod';
import {
  activateSubscription,
  schedulePlanChange,
  setNoRenewal,
} from '../services/subscription.service';
import { cancelSubscriptionWithRefund, simulateCancellation } from '../services/refund.service';
import { AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Schemas de validação
const activateSchema = z.object({
  planType: z.enum(['trimestral', 'semestral']),
  paymentMethodId: z.string().min(1),
});

const schedulePlanChangeSchema = z.object({
  newPlanType: z.enum(['trimestral', 'semestral']),
});

/**
 * POST /api/subscriptions/activate
 * Ativa uma nova assinatura
 */
router.post(
  '/activate',
  authenticate,
  authorize('user'),
  validate(activateSchema),
  async (req: AuthRequest, res) => {
    try {
      const { planType, paymentMethodId } = req.body;
      const userId = req.user!.id;

      const result = await activateSubscription(userId, planType, paymentMethodId);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * POST /api/subscriptions/:id/schedule-plan-change
 * Agenda mudança de plano para próxima renovação
 */
router.post(
  '/:id/schedule-plan-change',
  authenticate,
  authorize('user'),
  validate(schedulePlanChangeSchema),
  async (req: AuthRequest, res) => {
    try {
      const subscriptionId = parseInt(req.params.id, 10);
      const { newPlanType } = req.body;

      const result = await schedulePlanChange(subscriptionId, newPlanType);

      res.json({
        success: true,
        data: result,
        message: `Plan change to ${newPlanType} scheduled for ${result.effectiveDate.toISOString()}`,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/subscriptions/:id/simulate-cancellation
 * Simula cancelamento (dry-run) para mostrar valor de reembolso
 */
router.get(
  '/:id/simulate-cancellation',
  authenticate,
  authorize('user'),
  async (req: AuthRequest, res) => {
    try {
      const subscriptionId = req.params.id;

      const result = await simulateCancellation(subscriptionId);

      res.json({
        success: true,
        data: result,
        message: `Refund simulation: R$ ${result.refundAmount.toFixed(2)} (${result.charactersDelivered} characters delivered)`,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * POST /api/subscriptions/:id/cancel
 * Cancela assinatura com reembolso segundo CDC
 *
 * Fórmula: Reembolso = Valor Pago - (Personagens Entregues × Valor Avulso)
 */
router.post('/:id/cancel', authenticate, authorize('user'), async (req: AuthRequest, res) => {
  try {
    const subscriptionId = req.params.id;

    const result = await cancelSubscriptionWithRefund(subscriptionId);

    res.json({
      success: true,
      data: result,
      message: result.message,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/subscriptions/:id/no-renewal
 * Desativa renovação automática
 */
router.post('/:id/no-renewal', authenticate, authorize('user'), async (req: AuthRequest, res) => {
  try {
    const subscriptionId = parseInt(req.params.id, 10);

    const result = await setNoRenewal(subscriptionId);

    res.json({
      success: true,
      data: result,
      message: 'Auto-renewal disabled. Subscription will expire on end date.',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/subscriptions/:id
 * Consulta detalhes de uma assinatura
 */
router.get('/:id', authenticate, authorize('user'), async (req: AuthRequest, res) => {
  try {
    const subscriptionId = parseInt(req.params.id, 10);
    const userId = req.user!.id;

    // Busca assinatura do banco
    const { getPrismaClient } = await import('../config/database');
    const prisma = getPrismaClient();

    const subscription = await prisma.subscription.findFirst({
      where: {
        id: BigInt(subscriptionId),
        userId: BigInt(userId),
      },
      include: {
        plan: true,
      },
    });

    if (!subscription) {
      res.status(404).json({
        success: false,
        error: 'Subscription not found',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: Number(subscription.id),
        userId: Number(subscription.userId),
        planType: subscription.planType,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        nextBillingDate: subscription.nextBillingDate,
        autoRenew: subscription.autoRenew,
        pendingPlanChange: subscription.pendingPlanChange,
        plan: {
          name: subscription.plan.name,
          price: Number(subscription.plan.price),
          durationMonths: subscription.plan.durationMonths,
          baseCredits: subscription.plan.baseCredits,
          bonusCredits: subscription.plan.bonusCredits,
        },
      },
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
