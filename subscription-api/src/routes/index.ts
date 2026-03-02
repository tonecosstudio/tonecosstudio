/**
 * Routes Index
 * 
 * Exporta todas as rotas da aplicação.
 */

import { Router } from 'express';
import subscriptionsRoutes from './subscriptions.routes';
import creditsRoutes from './credits.routes';
import charactersRoutes from './characters.routes';
import ordersRoutes from './orders.routes';
import productionCyclesRoutes from './production-cycles.routes';
import webhooksRoutes from './webhooks.routes';
import adminRoutes from './admin';

const router = Router();

// Monta rotas públicas/usuário
router.use('/subscriptions', subscriptionsRoutes);
router.use('/credits', creditsRoutes);
router.use('/characters', charactersRoutes);
router.use('/orders', ordersRoutes);
router.use('/production-cycles', productionCyclesRoutes);
router.use('/webhooks', webhooksRoutes);

// Monta rotas admin
router.use('/admin', adminRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

export default router;
