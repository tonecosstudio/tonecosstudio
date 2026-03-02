import { PrismaClient } from '@prisma/client';

// Singleton instance do Prisma Client
let prisma: PrismaClient;

/**
 * Obtém a instância do Prisma Client
 * Usa singleton para evitar múltiplas conexões
 */
export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env['NODE_ENV'] === 'development' 
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
    });
  }
  return prisma;
}

/**
 * Desconecta o Prisma Client
 * Útil para testes e shutdown graceful
 */
export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
  }
}

/**
 * Verifica a conexão com o banco de dados
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const client = getPrismaClient();
    await client.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Erro ao conectar com o banco de dados:', error);
    return false;
  }
}

// Export default para facilitar imports
export default getPrismaClient;
