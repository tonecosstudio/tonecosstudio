/**
 * Credits Routes
 * 
 * Rotas para consulta de créditos e histórico de transações.
 */

import { Router } from 'express';
import { authenticate, authorize } from '../middleware';
import { getUserCredits } from '../services/credit.service';
import { getTransactionHistory } from '../services/transaction.service';
import { AuthRequest } from '../middleware/auth.middleware';

const router = Router();

/**
 * GET /api/credits/balance
 * Consulta saldo de créditos do usuário
 */
router.get(
  '/balance',
  authenticate,
  authorize('user'),
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;

      const credits = await getUserCredits(userId);

      if (!credits) {
        res.status(404).json({
          success: false,
          error: 'No credits found for user'
        });
        return;
      }

      res.json({
        success: true,
        data: credits
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
 * GET /api/credits/transactions
 * Lista histórico de transações de crédito com paginação
 */
router.get(
  '/transactions',
  authenticate,
  authorize('user'),
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await getTransactionHistory(userId, page, limit);

      res.json({
        success: true,
        data: result.transactions,
        pagination: {
          currentPage: result.currentPage,
          perPage: result.perPage,
          total: result.total,
          totalPages: result.totalPages,
          hasNext: result.hasNext,
          hasPrev: result.hasPrev
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
