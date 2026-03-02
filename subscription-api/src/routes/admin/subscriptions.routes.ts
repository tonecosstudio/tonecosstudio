/**
 * Admin Subscriptions Routes
 * 
 * Rotas administrativas para gerenciamento de assinaturas.
 */

import { Router } from 'express';
import { authenticate, authorize, validate } from '../../middleware';
import { z } from 'zod';
import { AuthRequest } from '../../middleware/auth.middleware';
import { allocateCredits } from '../../services/credit.service';
import { recordTransaction } from '../../services/transaction.service';

const router = Router();

// Schemas de validação
const adjustCreditsSchema = z.object({
  amount: z.number().int(),
  reason: z.string().min(1)
});

/**
 * GET /admin/subscriptions
 * Lista todas as assinaturas com filtros básicos
 */
router.get(
  '/',
  authenticate,
  authorize('admin'),
  async (req: AuthRequest, res) => {
    try {
      const { getPrismaClient } = await import('../../config/database');
      const prisma = getPrismaClient();

      const status = req.query.status as string | undefined;
      const planType = req.query.planType as string | undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const skip = (page - 1) * limit;

      const where: any = {};
      if (status) where.status = status;
      if (planType) where.planType = planType;

      const [subscriptions, total] = await Promise.all([
        prisma.subscription.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true
              }
            },
            plan: true
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.subscription.count({ where })
      ]);

      res.json({
        success: true,
        data: subscriptions.map(sub => ({
          id: Number(sub.id),
          userId: Number(sub.userId),
          user: {
            id: Number(sub.user.id),
            email: sub.user.email,
            name: sub.user.name
          },
          planType: sub.planType,
          status: sub.status,
          startDate: sub.startDate,
          endDate: sub.endDate,
          nextBillingDate: sub.nextBillingDate,
          autoRenew: sub.autoRenew,
          pendingPlanChange: sub.pendingPlanChange,
          plan: {
            name: sub.plan.name,
            price: Number(sub.plan.price),
            baseCredits: sub.plan.baseCredits,
            bonusCredits: sub.plan.bonusCredits
          }
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * POST /admin/subscriptions/:id/adjust-credits
 * Ajusta créditos manualmente (positivo ou negativo)
 */
router.post(
  '/:id/adjust-credits',
  authenticate,
  authorize('admin'),
  validate(adjustCreditsSchema),
  async (req: AuthRequest, res) => {
    try {
      const subscriptionId = parseInt(req.params.id, 10);
      const { amount, reason } = req.body;

      const { getPrismaClient } = await import('../../config/database');
      const prisma = getPrismaClient();

      // Busca assinatura
      const subscription = await prisma.subscription.findUnique({
        where: { id: BigInt(subscriptionId) }
      });

      if (!subscription) {
        res.status(404).json({
          success: false,
          error: 'Subscription not found'
        });
        return;
      }

      const userId = Number(subscription.userId);

      // Ajuste positivo: aloca créditos
      if (amount > 0) {
        await allocateCredits(userId, subscriptionId, amount);
        await recordTransaction(userId, 'adjustment', amount, {
          description: `Admin adjustment: ${reason}`
        });
      }
      // Ajuste negativo: registra apenas transação (não debita)
      else if (amount < 0) {
        await recordTransaction(userId, 'adjustment', amount, {
          description: `Admin adjustment: ${reason}`
        });
      }

      res.json({
        success: true,
        message: `Credits adjusted by ${amount}`,
        data: {
          subscriptionId,
          userId,
          adjustment: amount,
          reason
        }
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

export default router;
