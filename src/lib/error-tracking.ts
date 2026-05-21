/**
 * Professional Error Tracking and Logging Service
 * 
 * This service provides centralized error handling, logging, and tracking
 * for the entire application. It integrates with Sentry for production
 * error tracking and provides structured logging for development.
 * 
 * Features:
 * - Custom error types with context
 * - Automatic error categorization
 * - Integration with Sentry (when configured and available)
 * - Structured logging with levels
 * - Error recovery strategies
 * - User-friendly error messages
 * 
 * Note: Sentry is optional. If not installed, only centralized logging will be used.
 */

import { log } from "@/lib/logger";

// Sentry types (for when Sentry is available)
type SeverityLevel = 'debug' | 'info' | 'warning' | 'error' | 'fatal';

interface SentryUser {
  id: string;
  email?: string;
  username?: string;
}

interface SentryBreadcrumb {
  message: string;
  category: string;
  data?: Record<string, unknown>;
  level: SeverityLevel;
}

interface SentryCaptureContext {
  level?: SeverityLevel;
  tags?: Record<string, string | boolean>;
  contexts?: Record<string, unknown>;
}

/**
 * Get Sentry instance if available
 * Returns null if Sentry is not installed
 */
function getSentry() {
  // Sentry is optional and not installed - always return null
  return null;
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  FATAL = 'fatal'
}

/**
 * Error categories for better organization
 */
export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  DATABASE = 'database',
  NETWORK = 'network',
  VALIDATION = 'validation',
  BUSINESS_LOGIC = 'business_logic',
  EXTERNAL_API = 'external_api',
  UNKNOWN = 'unknown'
}

/**
 * Base application error with context
 */
export class AppError extends Error {
  constructor(
    message: string,
    public category: ErrorCategory = ErrorCategory.UNKNOWN,
    public severity: ErrorSeverity = ErrorSeverity.ERROR,
    public context?: Record<string, unknown>,
    public userMessage?: string,
    public recoverable: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    
    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    return this.userMessage || this.getDefaultUserMessage();
  }

  /**
   * Get default user message based on category
   */
  private getDefaultUserMessage(): string {
    switch (this.category) {
      case ErrorCategory.AUTHENTICATION:
        return 'Erro de autenticação. Por favor, faça login novamente.';
      case ErrorCategory.AUTHORIZATION:
        return 'Você não tem permissão para realizar esta ação.';
      case ErrorCategory.DATABASE:
        return 'Erro ao acessar o banco de dados. Tente novamente.';
      case ErrorCategory.NETWORK:
        return 'Erro de conexão. Verifique sua internet e tente novamente.';
      case ErrorCategory.VALIDATION:
        return 'Dados inválidos. Verifique as informações e tente novamente.';
      case ErrorCategory.BUSINESS_LOGIC:
        return 'Não foi possível completar a operação. Tente novamente.';
      case ErrorCategory.EXTERNAL_API:
        return 'Erro ao comunicar com serviço externo. Tente novamente mais tarde.';
      default:
        return 'Ocorreu um erro inesperado. Tente novamente.';
    }
  }
}

/**
 * Authentication errors
 */
export class AuthenticationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>, userMessage?: string) {
    super(message, ErrorCategory.AUTHENTICATION, ErrorSeverity.WARNING, context, userMessage, true);
  }
}

/**
 * Authorization errors
 */
export class AuthorizationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>, userMessage?: string) {
    super(message, ErrorCategory.AUTHORIZATION, ErrorSeverity.WARNING, context, userMessage, false);
  }
}

/**
 * Database errors
 */
export class DatabaseError extends AppError {
  constructor(message: string, context?: Record<string, unknown>, userMessage?: string) {
    super(message, ErrorCategory.DATABASE, ErrorSeverity.ERROR, context, userMessage, true);
  }
}

/**
 * Network errors
 */
export class NetworkError extends AppError {
  constructor(message: string, context?: Record<string, unknown>, userMessage?: string) {
    super(message, ErrorCategory.NETWORK, ErrorSeverity.WARNING, context, userMessage, true);
  }
}

/**
 * Validation errors
 */
export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>, userMessage?: string) {
    super(message, ErrorCategory.VALIDATION, ErrorSeverity.WARNING, context, userMessage, true);
  }
}

/**
 * Business logic errors
 */
export class BusinessLogicError extends AppError {
  constructor(message: string, context?: Record<string, unknown>, userMessage?: string) {
    super(message, ErrorCategory.BUSINESS_LOGIC, ErrorSeverity.ERROR, context, userMessage, true);
  }
}

/**
 * External API errors
 */
export class ExternalAPIError extends AppError {
  constructor(message: string, context?: Record<string, unknown>, userMessage?: string) {
    super(message, ErrorCategory.EXTERNAL_API, ErrorSeverity.ERROR, context, userMessage, true);
  }
}

/**
 * Error tracking service
 */
class ErrorTrackingService {
  private isDevelopment = import.meta.env.DEV;
  private isSentryEnabled = !!import.meta.env.VITE_SENTRY_DSN;

  /**
   * Track an error
   */
  trackError(error: Error | AppError, additionalContext?: Record<string, unknown>): void {
    // Log to console in development
    if (this.isDevelopment) {
      this.logToConsole(error, additionalContext);
    }

    // Send to Sentry in production (if configured)
    if (this.isSentryEnabled && !this.isDevelopment) {
      this.sendToSentry(error, additionalContext);
    }
  }

  /**
   * Log error through the centralized logger.
   */
  private logToConsole(error: Error | AppError, additionalContext?: Record<string, unknown>): void {
    const isAppError = error instanceof AppError;

    log.error(`${error.name}: ${error.message}`, {
      category: isAppError ? error.category : ErrorCategory.UNKNOWN,
      severity: isAppError ? error.severity : ErrorSeverity.ERROR,
      recoverable: isAppError ? error.recoverable : true,
      userMessage: isAppError ? error.getUserMessage() : undefined,
      context: isAppError ? error.context : undefined,
      additionalContext,
      stack: error.stack,
    });
  }

  /**
   * Send error to Sentry
   */
  private sendToSentry(error: Error | AppError, additionalContext?: Record<string, unknown>): void {
    const Sentry = getSentry();
    if (!Sentry) return; // Sentry not available
    
    const isAppError = error instanceof AppError;
    
    const captureContext: SentryCaptureContext = {
      level: isAppError ? this.mapSeverityToSentryLevel(error.severity) : 'error',
      tags: {
        category: isAppError ? error.category : ErrorCategory.UNKNOWN,
        recoverable: isAppError ? String(error.recoverable) : 'true'
      },
      contexts: {
        error_context: isAppError ? error.context : undefined,
        additional_context: additionalContext
      }
    };
    
    Sentry.captureException(error, captureContext);
  }

  /**
   * Map error severity to Sentry level
   */
  private mapSeverityToSentryLevel(severity: ErrorSeverity): SeverityLevel {
    switch (severity) {
      case ErrorSeverity.DEBUG:
        return 'debug';
      case ErrorSeverity.INFO:
        return 'info';
      case ErrorSeverity.WARNING:
        return 'warning';
      case ErrorSeverity.ERROR:
        return 'error';
      case ErrorSeverity.FATAL:
        return 'fatal';
      default:
        return 'error';
    }
  }

  /**
   * Log a message (non-error)
   */
  log(
    message: string, 
    level: ErrorSeverity = ErrorSeverity.INFO, 
    context?: Record<string, unknown>
  ): void {
    if (this.isDevelopment) {
      const meta = { severity: level, context };
      if (level === ErrorSeverity.ERROR || level === ErrorSeverity.FATAL) {
        log.error(message, meta);
      } else if (level === ErrorSeverity.WARNING) {
        log.warn(message, meta);
      } else if (level === ErrorSeverity.DEBUG) {
        log.debug(message, meta);
      } else {
        log.info(message, meta);
      }
    }

    const Sentry = getSentry();
    if (Sentry && this.isSentryEnabled && !this.isDevelopment && level !== ErrorSeverity.DEBUG) {
      Sentry.captureMessage(message, {
        level: this.mapSeverityToSentryLevel(level),
        contexts: { log_context: context }
      });
    }
  }

  /**
   * Get emoji for log level
   */
  private getEmojiForLevel(level: ErrorSeverity): string {
    switch (level) {
      case ErrorSeverity.DEBUG:
        return '🐛';
      case ErrorSeverity.INFO:
        return 'ℹ️';
      case ErrorSeverity.WARNING:
        return '⚠️';
      case ErrorSeverity.ERROR:
        return '❌';
      case ErrorSeverity.FATAL:
        return '💀';
      default:
        return '📝';
    }
  }

  /**
   * Set user context for error tracking
   */
  setUser(userId: string, email?: string, username?: string): void {
    const Sentry = getSentry();
    if (Sentry && this.isSentryEnabled) {
      const user: SentryUser = { id: userId, email, username };
      Sentry.setUser(user);
    }
  }

  /**
   * Clear user context
   */
  clearUser(): void {
    const Sentry = getSentry();
    if (Sentry && this.isSentryEnabled) {
      Sentry.setUser(null);
    }
  }

  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb(message: string, category: string, data?: Record<string, unknown>): void {
    const Sentry = getSentry();
    if (Sentry && this.isSentryEnabled) {
      const breadcrumb: SentryBreadcrumb = {
        message,
        category,
        data,
        level: 'info'
      };
      Sentry.addBreadcrumb(breadcrumb);
    }
  }
}

// Export singleton instance
export const errorTracking = new ErrorTrackingService();

/**
 * Utility function to wrap async operations with error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  errorMessage: string,
  category: ErrorCategory = ErrorCategory.UNKNOWN,
  context?: Record<string, unknown>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const appError = error instanceof AppError 
      ? error 
      : new AppError(
          `${errorMessage}: ${error instanceof Error ? error.message : String(error)}`,
          category,
          ErrorSeverity.ERROR,
          { ...context, originalError: error }
        );
    
    errorTracking.trackError(appError);
    throw appError;
  }
}

/**
 * Utility function to wrap sync operations with error handling
 */
export function withErrorHandlingSync<T>(
  operation: () => T,
  errorMessage: string,
  category: ErrorCategory = ErrorCategory.UNKNOWN,
  context?: Record<string, unknown>
): T {
  try {
    return operation();
  } catch (error) {
    const appError = error instanceof AppError 
      ? error 
      : new AppError(
          `${errorMessage}: ${error instanceof Error ? error.message : String(error)}`,
          category,
          ErrorSeverity.ERROR,
          { ...context, originalError: error }
        );
    
    errorTracking.trackError(appError);
    throw appError;
  }
}
