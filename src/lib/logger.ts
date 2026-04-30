/**
 * Professional Logger Service
 *
 * Provides structured logging with different levels and environment-aware behavior.
 * In production, only errors and warnings are logged.
 * In development, all levels are logged including debug information.
 */

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// Determine if we're in production
const isProduction = import.meta.env.PROD;

type LogLevel = keyof typeof levels;

function normalizeMeta(meta?: Record<string, unknown>) {
  if (!meta) return undefined;

  return Object.fromEntries(
    Object.entries(meta).map(([key, value]) => {
      if (value instanceof Error) {
        return [key, { name: value.name, message: value.message, stack: value.stack }];
      }
      return [key, value];
    }),
  );
}

function write(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  if (isProduction && levels[level] > levels.warn) return;

  const payload = normalizeMeta(meta);
  const prefix = `[${level}] ${message}`;

  if (level === 'error') {
    console.error(prefix, payload);
  } else if (level === 'warn') {
    console.warn(prefix, payload);
  } else if (!isProduction) {
    console.info(prefix, payload);
  }
}

// Export a simplified interface
export const log = {
  /**
   * Log error messages (always logged, even in production)
   */
  error: (message: string, meta?: Record<string, unknown>) => {
    write('error', message, meta);
  },

  /**
   * Log warning messages (logged in production)
   */
  warn: (message: string, meta?: Record<string, unknown>) => {
    write('warn', message, meta);
  },

  /**
   * Log info messages (only in development)
   */
  info: (message: string, meta?: Record<string, unknown>) => {
    write('info', message, meta);
  },

  /**
   * Log debug messages (only in development)
   */
  debug: (message: string, meta?: Record<string, unknown>) => {
    write('debug', message, meta);
  },
};

// Legacy API support (deprecated - use log.error(), log.warn(), etc instead)
// These are kept for backward compatibility during migration
export const logError = (message: string, error?: unknown, context?: string) => {
  log.error(message, { error, context });
};

export const logWarn = (message: string, meta?: unknown, context?: string) => {
  log.warn(message, { meta, context });
};

export const logInfo = (message: string, meta?: unknown, context?: string) => {
  log.info(message, { meta, context });
};

export const logDebug = (message: string, meta?: unknown, context?: string) => {
  log.debug(message, { meta, context });
};

export default log;
