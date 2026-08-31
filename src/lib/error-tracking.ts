/**
 * Centralized application error classification and logging.
 *
 * This module does not claim remote observability. Errors are routed through the
 * canonical logger; an external error-monitoring provider must be integrated and
 * proven separately before launch.
 */

import { log } from "@/lib/logger";

export enum ErrorSeverity {
  DEBUG = "debug",
  INFO = "info",
  WARNING = "warning",
  ERROR = "error",
  FATAL = "fatal",
}

export enum ErrorCategory {
  AUTHENTICATION = "authentication",
  AUTHORIZATION = "authorization",
  DATABASE = "database",
  NETWORK = "network",
  VALIDATION = "validation",
  BUSINESS_LOGIC = "business_logic",
  EXTERNAL_API = "external_api",
  UNKNOWN = "unknown",
}

export class AppError extends Error {
  constructor(
    message: string,
    public category: ErrorCategory = ErrorCategory.UNKNOWN,
    public severity: ErrorSeverity = ErrorSeverity.ERROR,
    public context?: Record<string, unknown>,
    public userMessage?: string,
    public recoverable: boolean = true,
  ) {
    super(message);
    this.name = this.constructor.name;

    const captureStackTrace = (
      Error as ErrorConstructor & {
        captureStackTrace?: (
          targetObject: object,
          constructorOpt?: new (...args: never[]) => Error,
        ) => void;
      }
    ).captureStackTrace;

    if (captureStackTrace) {
      captureStackTrace(this, this.constructor as new (...args: never[]) => Error);
    }
  }

  getUserMessage(): string {
    return this.userMessage || this.getDefaultUserMessage();
  }

  private getDefaultUserMessage(): string {
    switch (this.category) {
      case ErrorCategory.AUTHENTICATION:
        return "Erro de autenticação. Por favor, faça login novamente.";
      case ErrorCategory.AUTHORIZATION:
        return "Você não tem permissão para realizar esta ação.";
      case ErrorCategory.DATABASE:
        return "Erro ao acessar o banco de dados. Tente novamente.";
      case ErrorCategory.NETWORK:
        return "Erro de conexão. Verifique sua internet e tente novamente.";
      case ErrorCategory.VALIDATION:
        return "Dados inválidos. Verifique as informações e tente novamente.";
      case ErrorCategory.BUSINESS_LOGIC:
        return "Não foi possível completar a operação. Tente novamente.";
      case ErrorCategory.EXTERNAL_API:
        return "Erro ao comunicar com serviço externo. Tente novamente mais tarde.";
      default:
        return "Ocorreu um erro inesperado. Tente novamente.";
    }
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>, userMessage?: string) {
    super(
      message,
      ErrorCategory.AUTHENTICATION,
      ErrorSeverity.WARNING,
      context,
      userMessage,
      true,
    );
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>, userMessage?: string) {
    super(
      message,
      ErrorCategory.AUTHORIZATION,
      ErrorSeverity.WARNING,
      context,
      userMessage,
      false,
    );
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, context?: Record<string, unknown>, userMessage?: string) {
    super(
      message,
      ErrorCategory.DATABASE,
      ErrorSeverity.ERROR,
      context,
      userMessage,
      true,
    );
  }
}

export class NetworkError extends AppError {
  constructor(message: string, context?: Record<string, unknown>, userMessage?: string) {
    super(
      message,
      ErrorCategory.NETWORK,
      ErrorSeverity.WARNING,
      context,
      userMessage,
      true,
    );
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>, userMessage?: string) {
    super(
      message,
      ErrorCategory.VALIDATION,
      ErrorSeverity.WARNING,
      context,
      userMessage,
      true,
    );
  }
}

export class BusinessLogicError extends AppError {
  constructor(message: string, context?: Record<string, unknown>, userMessage?: string) {
    super(
      message,
      ErrorCategory.BUSINESS_LOGIC,
      ErrorSeverity.ERROR,
      context,
      userMessage,
      true,
    );
  }
}

export class ExternalAPIError extends AppError {
  constructor(message: string, context?: Record<string, unknown>, userMessage?: string) {
    super(
      message,
      ErrorCategory.EXTERNAL_API,
      ErrorSeverity.ERROR,
      context,
      userMessage,
      true,
    );
  }
}

class ErrorTrackingService {
  trackError(error: Error | AppError, additionalContext?: Record<string, unknown>): void {
    const isAppError = error instanceof AppError;
    const severity = isAppError ? error.severity : ErrorSeverity.ERROR;
    const metadata = {
      error,
      category: isAppError ? error.category : ErrorCategory.UNKNOWN,
      severity,
      recoverable: isAppError ? error.recoverable : true,
      userMessage: isAppError ? error.getUserMessage() : undefined,
      context: isAppError ? error.context : undefined,
      additionalContext,
    };

    if (severity === ErrorSeverity.WARNING) {
      log.warn(`${error.name}: ${error.message}`, metadata);
      return;
    }

    log.error(`${error.name}: ${error.message}`, metadata);
  }

  log(
    message: string,
    level: ErrorSeverity = ErrorSeverity.INFO,
    context?: Record<string, unknown>,
  ): void {
    const metadata = { severity: level, context };

    if (level === ErrorSeverity.ERROR || level === ErrorSeverity.FATAL) {
      log.error(message, metadata);
    } else if (level === ErrorSeverity.WARNING) {
      log.warn(message, metadata);
    } else if (level === ErrorSeverity.DEBUG) {
      log.debug(message, metadata);
    } else {
      log.info(message, metadata);
    }
  }

  /** Compatibility method. Remote user context is not configured yet. */
  setUser(_userId: string, _email?: string, _username?: string): void {
    log.debug("Remote error-monitoring user context is not configured");
  }

  /** Compatibility method. Remote user context is not configured yet. */
  clearUser(): void {
    log.debug("Remote error-monitoring user context is not configured");
  }

  /** Compatibility method. Remote breadcrumbs are not configured yet. */
  addBreadcrumb(
    _message: string,
    _category: string,
    _data?: Record<string, unknown>,
  ): void {
    log.debug("Remote error-monitoring breadcrumbs are not configured");
  }
}

export const errorTracking = new ErrorTrackingService();

export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  errorMessage: string,
  category: ErrorCategory = ErrorCategory.UNKNOWN,
  context?: Record<string, unknown>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const appError =
      error instanceof AppError
        ? error
        : new AppError(
            `${errorMessage}: ${error instanceof Error ? error.message : String(error)}`,
            category,
            ErrorSeverity.ERROR,
            { ...context, originalError: error },
          );

    errorTracking.trackError(appError);
    throw appError;
  }
}

export function withErrorHandlingSync<T>(
  operation: () => T,
  errorMessage: string,
  category: ErrorCategory = ErrorCategory.UNKNOWN,
  context?: Record<string, unknown>,
): T {
  try {
    return operation();
  } catch (error) {
    const appError =
      error instanceof AppError
        ? error
        : new AppError(
            `${errorMessage}: ${error instanceof Error ? error.message : String(error)}`,
            category,
            ErrorSeverity.ERROR,
            { ...context, originalError: error },
          );

    errorTracking.trackError(appError);
    throw appError;
  }
}
