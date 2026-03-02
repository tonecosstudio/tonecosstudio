/**
 * Admin Dashboard Routes
 * 
 * Rotas para dashboard administrativo com métricas principais.
 */

import { Router } from 'express';
import { authenticate, authorize } from '../../middleware';
import { AuthRequest } from '../../middleware/auth.middleware';

const router = Router();

/**
 * GET /admin/dashboard/metrics
 * Retorna métricas principais do sistema
 */
router.get(
  '/metrics',
  authenticate,
  authorize('admin'),
  async (req: AuthRequest, res) => {
    try {
      const { getPrismaClient } = await import('../../config/database');
      const prisma = getPrismaClient();

      // Métricas de assinaturas
      const [
        totalActiveSubscriptions,
        totalExpiredSubscriptions,
        totalCancelledSubscriptions,
        subscriptionsByPlan
      ] = await Promise.all([
        prisma.subscription.count({
          where: { status: 'active' }
        }),
        prisma.subscription.count({
          where: { status: 'expired' }
        }),
        prisma.subscription.count({
          where: { status: 'cancelled' }
        }),
        prisma.subscription.groupBy({
          by: ['planType'],
          where: { status: 'active' },
          _count: true
        })
      ]);

      // Métricas de créditos
      const creditsStats = await prisma.userCredit.aggregate({
        _sum: {
          totalCredits: true,
          usedCredits: true,
          availableCredits: true,
          expiredCredits: true
        }
      });

      // Métricas de ciclos
      const [openCycles, closedCycles, currentCycle] = await Promise.all([
        prisma.productionCycle.count({
          where: { status: 'open' }
        }),
        prisma.productionCycle.count({
          where: { status: 'closed' }
        }),
        prisma.productionCycle.findFirst({
          where: { status: 'open' },
          orderBy: { closeDate: 'asc' }
        })
      ]);

      // Métricas de pedidos
      const [totalOrders, ordersByType, ordersByStatus] = await Promise.all([
        prisma.order.count(),
        prisma.order.groupBy({
          by: ['orderType'],
          _count: true
        }),
        prisma.order.groupBy({
          by: ['status'],
          _count: true
        })
      ]);

      // Métricas de personagens
      const [totalCharacters, activeCharacters, exclusiveCharacters] = await Promise.all([
        prisma.character.count(),
        prisma.character.count({
          where: { isActive: true }
        }),
        prisma.character.count({
          where: {
            isActive: true,
            isExclusiveSemestral: true
          }
        })
      ]);

      // Receita estimada (baseada em assinaturas ativas)
      const revenueEstimate = await prisma.subscription.findMany({
        where: { status: 'active' },
        include: { plan: true }
      });

      const totalRevenue = revenueEstimate.reduce(
        (sum, sub) => sum + Number(sub.plan.price),
        0
      );

      res.json({
        success: true,
        data: {
          subscriptions: {
            total: totalActiveSubscriptions + totalExpiredSubscriptions + totalCancelledSubscriptions,
            active: totalActiveSubscriptions,
            expired: totalExpiredSubscriptions,
            cancelled: totalCancelledSubscriptions,
            byPlan: subscriptionsByPlan.map(item => ({
              planType: item.planType,
              count: item._count
            }))
          },
          credits: {
            totalAllocated: creditsStats._sum.totalCredits || 0,
            totalUsed: creditsStats._sum.usedCredits || 0,
            totalAvailable: creditsStats._sum.availableCredits || 0,
            totalExpired: creditsStats._sum.expiredCredits || 0
          },
          productionCycles: {
            open: openCycles,
            closed: closedCycles,
            current: currentCycle ? {
              id: Number(currentCycle.id),
              name: currentCycle.name,
              capacityUsed: currentCycle.currentCount,
              capacityLimit: currentCycle.capacityLimit,
              capacityPercentage: (currentCycle.currentCount / currentCycle.capacityLimit) * 100,
              closeDate: currentCycle.closeDate
            } : null
          },
          orders: {
            total: totalOrders,
            byType: ordersByType.map(item => ({
              type: item.orderType,
              count: item._count
            })),
            byStatus: ordersByStatus.map(item => ({
              status: item.status,
              count: item._count
            }))
          },
          characters: {
            total: totalCharacters,
            active: activeCharacters,
            exclusive: exclusiveCharacters
          },
          revenue: {
            estimatedMonthly: totalRevenue,
            currency: 'BRL'
          }
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
