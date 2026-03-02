/**
 * Error Handling Middleware
 * 
 * Middleware centralizado de tratamento de erros.
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Classe de erro customizada para erros de aplicação
 */
export class AppError extends Error {
  public statusCode: number;
  public details?: any;

  constructor(statusCode: number, message: string, details?: any) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Middleware de tratamento centralizado de erros
 * 
 * Captura todos os erros da aplicação e retorna resposta padronizada.
 */
export function errorHandler(
  error: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('Error:', error);

  // Erro customizado da aplicação
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: error.name,
      message: error.message,
      details: error.details
    });
    return;
  }

  // Erros conhecidos do Prisma
  if (error.name === 'PrismaClientKnownRequestError') {
    res.status(400).json({
      error: 'Database Error',
      message: 'Database operation failed'
    });
    return;
  }

  // Erro genérico
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env['NODE_ENV'] === 'production' 
      ? 'An unexpected error occurred' 
      : error.message
  });
}

/**
 * Middleware para capturar rotas não encontradas
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
}
