/**
 * Admin Production Cycles Routes
 * 
 * Rotas administrativas para gerenciamento de ciclos de produção.
 */

import { Router } from 'express';
import { authenticate, authorize, validate } from '../../middleware';
import { z } from 'zod';
import {
  createProductionCycle,
  closeProductionCycle,
  getCycleById
} from '../../services/production-cycle.service';
import { AuthRequest } from '../../middleware/auth.middleware';

const router = Router();

// Schemas de validação
const createCycleSchema = z.object({
  name: z.string().min(1),
  capacityLimit: z.number().int().positive(),
  closeDate: z.string().datetime()
});

/**
 * POST /admin/production-cycles
 * Cria um novo ciclo de produção
 */
router.post(
  '/',
  authenticate,
  authorize('admin'),
  validate(createCycleSchema),
  async (req: AuthRequest, res) => {
    try {
      const { name, capacityLimit, closeDate } = req.body;

      const cycle = await createProductionCycle(
        name,
        capacityLimit,
        new Date(closeDate)
      );

      res.status(201).json({
        success: true,
        data: cycle,
        message: 'Production cycle created successfully'
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
 * POST /admin/production-cycles/:id/close
 * Fecha um ciclo de produção manualmente
 */
router.post(
  '/:id/close',
  authenticate,
  authorize('admin'),
  async (req: AuthRequest, res) => {
    try {
      const cycleId = parseInt(req.params.id, 10);

      const result = await closeProductionCycle(cycleId);

      res.json({
        success: true,
        data: result,
        message: `Cycle closed. ${result.confirmedOrders} orders confirmed, ${result.pendingOrders} pending.`
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
 * GET /admin/production-cycles/:id/statistics
 * Retorna estatísticas de um ciclo
 */
router.get(
  '/:id/statistics',
  authenticate,
  authorize('admin'),
  async (req: AuthRequest, res) => {
    try {
      const cycleId = parseInt(req.params.id, 10);

      const { getPrismaClient } = await import('../../config/database');
      const prisma = getPrismaClient();

      // Busca ciclo
      const cycle = await getCycleById(cycleId);

      if (!cycle) {
        res.status(404).json({
          success: false,
          error: 'Production cycle not found'
        });
        return;
      }

      // Busca estatísticas de pedidos
      const [totalOrders, confirmedOrders, pendingOrders, totalCredits] = await Promise.all([
        prisma.order.count({
          where: { productionCycleId: BigInt(cycleId) }
        }),
        prisma.order.count({
          where: {
            productionCycleId: BigInt(cycleId),
            status: 'confirmed'
          }
        }),
        prisma.order.count({
          where: {
            productionCycleId: BigInt(cycleId),
            status: 'pending'
          }
        }),
        prisma.order.aggregate({
          where: { productionCycleId: BigInt(cycleId) },
          _sum: { totalCredits: true }
        })
      ]);

      // Busca pedidos por tipo
      const ordersByType = await prisma.order.groupBy({
        by: ['orderType'],
        where: { productionCycleId: BigInt(cycleId) },
        _count: true
      });

      res.json({
        success: true,
        data: {
          cycle,
          statistics: {
            totalOrders,
            confirmedOrders,
            pendingOrders,
            totalCredits: totalCredits._sum.totalCredits || 0,
            ordersByType: ordersByType.map(item => ({
              type: item.orderType,
              count: item._count
            })),
            capacityUsed: cycle.currentCount,
            capacityLimit: cycle.capacityLimit,
            capacityPercentage: (cycle.currentCount / cycle.capacityLimit) * 100
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
