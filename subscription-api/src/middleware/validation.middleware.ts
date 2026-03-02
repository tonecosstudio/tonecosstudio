/**
 * Validation Middleware
 * 
 * Middleware de validação de entrada usando Zod.
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

/**
 * Middleware de validação de entrada com Zod
 * 
 * Valida body, query ou params da requisição contra um schema Zod.
 * 
 * @param schema - Schema Zod para validação
 * @param source - Fonte dos dados ('body', 'query', 'params')
 */
export function validate(
  schema: ZodSchema,
  source: 'body' | 'query' | 'params' = 'body'
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = req[source];
      const validated = schema.parse(data);
      
      // Substitui dados originais pelos validados
      req[source] = validated;
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid input data',
          details: error.errors.map((err) => ({
            path: err.path.join('.'),
            message: err.message
          }))
        });
        return;
      }

      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid input data'
      });
    }
  };
}
