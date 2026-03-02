import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import { checkDatabaseConnection, disconnectPrisma } from './config/database.js';
import { scheduleExpirationJob } from './jobs/expire-subscriptions.job.js';
import { scheduleAutoRenewalJob } from './jobs/auto-renew-subscriptions.job.js';
import { scheduleCycleClosingJob } from './jobs/close-production-cycles.job.js';

// Load environment variables
dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', async (_req: Request, res: Response) => {
  const dbConnected = await checkDatabaseConnection();
  res.json({ 
    status: dbConnected ? 'ok' : 'degraded',
    database: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString() 
  });
});

// Database check endpoint
app.get('/health/db', async (_req: Request, res: Response) => {
  const dbConnected = await checkDatabaseConnection();
  if (dbConnected) {
    res.json({ status: 'ok', message: 'Database connection successful' });
  } else {
    res.status(503).json({ status: 'error', message: 'Database connection failed' });
  }
});

// Start server
async function startServer() {
  try {
    // Check database connection
    console.log('🔍 Verificando conexão com o banco de dados...');
    const dbConnected = await checkDatabaseConnection();
    
    if (!dbConnected) {
      console.error('❌ Falha ao conectar com o banco de dados');
      console.error('   Verifique se o PostgreSQL está rodando e as credenciais estão corretas');
      process.exit(1);
    }
    
    console.log('✅ Conexão com o banco de dados estabelecida');
    
    // Schedule background jobs
    console.log('⏰ Configurando jobs agendados...');
    scheduleExpirationJob();
    scheduleAutoRenewalJob();
    scheduleCycleClosingJob();
    console.log('✅ Jobs agendados configurados');
    
    // Start Express server
    app.listen(port, () => {
      console.log(`⚡️ Servidor rodando em http://localhost:${port}`);
      console.log(`📊 Health check: http://localhost:${port}/health`);
      console.log(`🗄️  Database check: http://localhost:${port}/health/db`);
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Encerrando servidor...');
  await disconnectPrisma();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Encerrando servidor...');
  await disconnectPrisma();
  process.exit(0);
});

startServer();

export default app;
