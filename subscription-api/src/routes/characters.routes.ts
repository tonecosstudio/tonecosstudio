/**
 * Characters Routes
 * 
 * Rotas para consulta do catálogo de personagens.
 */

import { Router } from 'express';
import { authenticate, authorize } from '../middleware';
import {
  getCharacters,
  getCharacterById,
  getStandardCollection
} from '../services/character.service';
import { AuthRequest } from '../middleware/auth.middleware';

const router = Router();

/**
 * GET /api/characters
 * Lista catálogo de personagens com filtros e paginação
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

      // Busca plano do usuário
      const { getPrismaClient } = await import('../config/database');
      const prisma = getPrismaClient();

      const subscription = await prisma.subscription.findFirst({
        where: {
          userId: BigInt(userId),
          status: 'active'
        }
      });

      const planType = subscription?.planType;

      const result = await getCharacters(
        { page, limit },
        planType
      );

      res.json({
        success: true,
        data: result.characters,
        pagination: result.pagination
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
 * GET /api/characters/:id
 * Consulta detalhes de um personagem
 */
router.get(
  '/:id',
  authenticate,
  authorize('user'),
  async (req: AuthRequest, res) => {
    try {
      const characterId = parseInt(req.params.id, 10);
      const userId = req.user!.id;

      // Busca plano do usuário
      const { getPrismaClient } = await import('../config/database');
      const prisma = getPrismaClient();

      const subscription = await prisma.subscription.findFirst({
        where: {
          userId: BigInt(userId),
          status: 'active'
        }
      });

      const planType = subscription?.planType;

      const character = await getCharacterById(characterId, planType);

      if (!character) {
        res.status(404).json({
          success: false,
          error: 'Character not found or access denied'
        });
        return;
      }

      res.json({
        success: true,
        data: character
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
 * GET /api/characters/standard-collection
 * Retorna coleção padrão de personagens
 */
router.get(
  '/standard-collection',
  authenticate,
  authorize('user'),
  async (req: AuthRequest, res) => {
    try {
      const characters = await getStandardCollection();

      res.json({
        success: true,
        data: characters
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
