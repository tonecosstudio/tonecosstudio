/**
 * Orders Routes
 * 
 * Rotas para gerenciamento de pedidos.
 */

import { Router } from 'express';
import { authenticate, authorize, validate } from '../middleware';
import { z } from 'zod';
import {
  createIndividualOrder,
  updateAutomaticOrder,
  getUserOrders,
  getOrderById
} from '../services/order.service';
import { AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Schemas de validação
const createIndividualOrderSchema = z.object({
  characterId: z.number().int().positive(),
  useCredits: z.boolean().optional().default(true)
});

const updateAutomaticOrderSchema = z.object({
  characterIds: z.array(z.number().int().positive()).min(1)
});

/**
 * POST /api/orders/individual
 * Cria pedido individual com débito imediato
 */
router.post(
  '/individual',
  authenticate,
  authorize('user'),
  validate(createIndividualOrderSchema),
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const { characterId, useCredits } = req.body;

      const order = await createIndividualOrder(userId, characterId, useCredits);

      res.status(201).json({
        success: true,
        data: order,
        message: 'Individual order created successfully'
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
 * GET /api/orders/automatic/:id
 * Consulta pedido automático
 */
router.get(
  '/automatic/:id',
  authenticate,
  authorize('user'),
  async (req: AuthRequest, res) => {
    try {
      const orderId = parseInt(req.params.id, 10);
      const userId = req.user!.id;

      const order = await getOrderById(orderId, userId);

      if (!order) {
        res.status(404).json({
          success: false,
          error: 'Order not found'
        });
        return;
      }

      if (order.orderType !== 'automatic') {
        res.status(400).json({
          success: false,
          error: 'Order is not an automatic order'
        });
        return;
      }

      res.json({
        success: true,
        data: order
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
 * PUT /api/orders/automatic/:id
 * Modifica pedido automático (antes do fechamento do ciclo)
 */
router.put(
  '/automatic/:id',
  authenticate,
  authorize('user'),
  validate(updateAutomaticOrderSchema),
  async (req: AuthRequest, res) => {
    try {
      const orderId = parseInt(req.params.id, 10);
      const { characterIds } = req.body;

      const order = await updateAutomaticOrder(orderId, characterIds);

      res.json({
        success: true,
        data: order,
        message: 'Automatic order updated successfully'
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
 * GET /api/orders
 * Lista pedidos do usuário com paginação
 */
router.get(
  '/',
  authenticate,
  authorize('user'),
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await getUserOrders(userId, page, limit);

      res.json({
        success: true,
        data: result.orders,
        pagination: {
          total: result.total,
          page,
          limit
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
