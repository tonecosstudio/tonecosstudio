/**
 * Logger Service
 * 
 * Serviço centralizado de logging para substituir console.log em produção.
 * Usa diferentes níveis de log e pode ser integrado com serviços externos.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: Date;
  context?: string;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private isTest = import.meta.env.MODE === 'test';

  /**
   * Log de debug - apenas em desenvolvimento
   */
  debug(message: string, data?: any, context?: string): void {
    if (this.isDevelopment) {
      this.log('debug', message, data, context);
    }
  }

  /**
   * Log de informação
   */
  info(message: string, data?: any, context?: string): void {
    this.log('info', message, data, context);
  }

  /**
   * Log de aviso
   */
  warn(message: string, data?: any, context?: string): void {
    this.log('warn', message, data, context);
  }

  /**
   * Log de erro
   */
  error(message: string, error?: any, context?: string): void {
    this.log('error', message, error, context);
  }

  /**
   * Método interno de log
   */
  private log(level: LogLevel, message: string, data?: any, context?: string): void {
    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: new Date(),
      context,
    };

    // Em testes, não logar nada
    if (this.isTest) {
      return;
    }

    // Em desenvolvimento, usar console
    if (this.isDevelopment) {
      const prefix = context ? `[${context}]` : '';
      const timestamp = entry.timestamp.toISOString();
      
      switch (level) {
        case 'debug':
          console.debug(`${timestamp} ${prefix} ${message}`, data || '');
          break;
        case 'info':
          console.info(`${timestamp} ${prefix} ${message}`, data || '');
          break;
        case 'warn':
          console.warn(`${timestamp} ${prefix} ${message}`, data || '');
          break;
        case 'error':
          console.error(`${timestamp} ${prefix} ${message}`, data || '');
          break;
      }
      return;
    }

    // Em produção, enviar para serviço externo (Sentry, LogRocket, etc)
    this.sendToExternalService(entry);
  }

  /**
   * Enviar logs para serviço externo em produção
   */
  private sendToExternalService(entry: LogEntry): void {
    // TODO: Integrar com serviço de logging externo
    // Exemplos: Sentry, LogRocket, Datadog, CloudWatch
    
    // Por enquanto, apenas logar erros críticos no console em produção
    if (entry.level === 'error') {
      console.error(`[${entry.level.toUpperCase()}] ${entry.message}`, entry.data);
    }
  }
}

// Exportar instância singleton
export const logger = new Logger();

// Exportar funções de conveniência
export const logDebug = (message: string, data?: any, context?: string) => 
  logger.debug(message, data, context);

export const logInfo = (message: string, data?: any, context?: string) => 
  logger.info(message, data, context);

export const logWarn = (message: string, data?: any, context?: string) => 
  logger.warn(message, data, context);

export const logError = (message: string, error?: any, context?: string) => 
  logger.error(message, error, context);
