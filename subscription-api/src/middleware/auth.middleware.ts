/**
 * Authentication Middleware
 * 
 * Middleware básico de autenticação JWT para MVP.
 * Em produção, integrar com serviço de autenticação real.
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Interface estendida do Request com dados do usuário autenticado
 */
export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: 'user' | 'admin';
  };
}

/**
 * Middleware de autenticação JWT (simplificado para MVP)
 * 
 * Em produção, implementar:
 * - Validação real de JWT token
 * - Verificação de expiração
 * - Refresh token
 * - Integração com serviço de autenticação
 * 
 * Para MVP, aceita header Authorization: Bearer <userId>
 */
export function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header'
      });
      return;
    }

    // MVP: Extrai userId do token (em produção, validar JWT real)
    const token = authHeader.substring(7);
    const userId = parseInt(token, 10);

    if (isNaN(userId)) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token format'
      });
      return;
    }

    // MVP: Assume role 'user' por padrão
    // Em produção, buscar role do banco de dados ou JWT payload
    req.user = {
      id: userId,
      email: `user${userId}@example.com`,
      role: 'user'
    };

    next();
  } catch (error) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication failed'
    });
  }
}

/**
 * Middleware de autorização por role
 * 
 * Valida que o usuário autenticado tem uma das roles permitidas.
 * 
 * @param allowedRoles - Roles permitidas para acessar o endpoint
 */
export function authorize(...allowedRoles: Array<'user' | 'admin'>) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions'
      });
      return;
    }

    next();
  };
}
