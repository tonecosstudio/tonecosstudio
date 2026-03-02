/**
 * Admin Characters Routes
 * 
 * Rotas administrativas para gerenciamento de personagens.
 */

import { Router } from 'express';
import { authenticate, authorize, validate } from '../../middleware';
import { z } from 'zod';
import {
  createCharacter,
  updateCharacter,
  deactivateCharacter
} from '../../services/character.service';
import { AuthRequest } from '../../middleware/auth.middleware';

const router = Router();

// Schemas de validação
const createCharacterSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  priceCash: z.number().positive(),
  priceCredits: z.number().int().positive(),
  isExclusiveSemestral: z.boolean().optional(),
  isStandardCollection: z.boolean().optional(),
  imageUrl: z.string().url().optional()
});

const updateCharacterSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  priceCash: z.number().positive().optional(),
  priceCredits: z.number().int().positive().optional(),
  isExclusiveSemestral: z.boolean().optional(),
  isStandardCollection: z.boolean().optional(),
  isActive: z.boolean().optional(),
  imageUrl: z.string().url().optional()
});

/**
 * POST /admin/characters
 * Cria um novo personagem
 */
router.post(
  '/',
  authenticate,
  authorize('admin'),
  validate(createCharacterSchema),
  async (req: AuthRequest, res) => {
    try {
      const character = await createCharacter(req.body);

      res.status(201).json({
        success: true,
        data: character,
        message: 'Character created successfully'
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
 * PUT /admin/characters/:id
 * Atualiza um personagem existente
 */
router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  validate(updateCharacterSchema),
  async (req: AuthRequest, res) => {
    try {
      const characterId = parseInt(req.params.id, 10);
      const character = await updateCharacter(characterId, req.body);

      res.json({
        success: true,
        data: character,
        message: 'Character updated successfully'
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
 * DELETE /admin/characters/:id
 * Desativa um personagem (soft delete)
 */
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  async (req: AuthRequest, res) => {
    try {
      const characterId = parseInt(req.params.id, 10);
      const character = await deactivateCharacter(characterId);

      res.json({
        success: true,
        data: character,
        message: 'Character deactivated successfully'
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
