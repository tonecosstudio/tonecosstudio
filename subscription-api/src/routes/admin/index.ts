/**
 * Admin Routes Index
 * 
 * Exporta todas as rotas administrativas.
 */

import { Router } from 'express';
import subscriptionsRoutes from './subscriptions.routes';
import charactersRoutes from './characters.routes';
import productionCyclesRoutes from './production-cycles.routes';
import dashboardRoutes from './dashboard.routes';

const router = Router();

// Monta rotas admin
router.use('/subscriptions', subscriptionsRoutes);
router.use('/characters', charactersRoutes);
router.use('/production-cycles', productionCyclesRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;
