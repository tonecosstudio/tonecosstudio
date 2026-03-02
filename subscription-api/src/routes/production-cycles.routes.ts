/**
 * Production Cycles Routes
 * 
 * Rotas para consulta de ciclos de produção.
 */

import { Router } from 'express';
import { authenticate, authorize } from '../middleware';
import {
  getCurrentOpenCycle,
  getCycleById
} from '../services/production-cycle.service';
import { AuthRequest } from '../middleware/auth.middleware';

const router = Router();

/**
 * GET /api/production-cycles/current
 * Retorna ciclo de produção aberto atual
 */
router.get(
  '/current',
  authenticate,
  authorize('user'),
  async (req: AuthRequest, res) => {
    try {
      const cycle = await getCurrentOpenCycle();

      if (!cycle) {
        res.status(404).json({
          success: false,
          error: 'No open production cycle available'
        });
        return;
      }

      res.json({
        success: true,
        data: cycle
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
 * GET /api/production-cycles/:id
 * Consulta detalhes de um ciclo de produção
 */
router.get(
  '/:id',
  authenticate,
  authorize('user'),
  async (req: AuthRequest, res) => {
    try {
      const cycleId = parseInt(req.params.id, 10);

      const cycle = await getCycleById(cycleId);

      if (!cycle) {
        res.status(404).json({
          success: false,
          error: 'Production cycle not found'
        });
        return;
      }

      res.json({
        success: true,
        data: cycle
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
