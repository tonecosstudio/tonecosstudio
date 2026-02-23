/**
 * PaymentError - Custom error class for payment-related errors
 * Requirements: 19.1-19.15
 * Task: 26.1 Implementar tratamento abrangente de erros
 */

export enum PaymentErrorCode {
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  INVALID_STATUS_TRANSITION = 'INVALID_STATUS_TRANSITION',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Payment errors
  PAYMENT_NOT_FOUND = 'PAYMENT_NOT_FOUND',
  PAYMENT_ALREADY_APPROVED = 'PAYMENT_ALREADY_APPROVED',
  PAYMENT_ALREADY_REJECTED = 'PAYMENT_ALREADY_REJECTED',
  
  // File upload errors
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  MAX_FILES_EXCEEDED = 'MAX_FILES_EXCEEDED',
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  
  // Authorization errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Database errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  
  // Unknown errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class PaymentError extends Error {
  constructor(
    public code: PaymentErrorCode,
    message: string,
    public statusCode: number = 400,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'PaymentError';
    Object.setPrototypeOf(this, PaymentError.prototype);
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    switch (this.code) {
      case PaymentErrorCode.VALIDATION_ERROR:
        return 'Por favor, verifique os dados informados e tente novamente.';
      case PaymentErrorCode.INVALID_AMOUNT:
        return 'O valor do pagamento deve ser maior que zero.';
      case PaymentErrorCode.INVALID_STATUS_TRANSITION:
        return 'Esta ação não é permitida para o status atual do pagamento.';
      case PaymentErrorCode.MISSING_REQUIRED_FIELD:
        return 'Alguns campos obrigatórios não foram preenchidos.';
      case PaymentErrorCode.PAYMENT_NOT_FOUND:
        return 'Pagamento não encontrado.';
      case PaymentErrorCode.PAYMENT_ALREADY_APPROVED:
        return 'Este pagamento já foi aprovado e não pode ser modificado.';
      case PaymentErrorCode.PAYMENT_ALREADY_REJECTED:
        return 'Este pagamento já foi rejeitado.';
      case PaymentErrorCode.FILE_TOO_LARGE:
        return 'O arquivo é muito grande. O tamanho máximo é 5MB.';
      case PaymentErrorCode.INVALID_FILE_TYPE:
        return 'Tipo de arquivo não suportado. Use JPG, PNG ou PDF.';
      case PaymentErrorCode.MAX_FILES_EXCEEDED:
        return 'Número máximo de arquivos atingido (5 arquivos por pagamento).';
      case PaymentErrorCode.UPLOAD_FAILED:
        return 'Falha no upload do arquivo. Tente novamente.';
      case PaymentErrorCode.UNAUTHORIZED:
        return 'Você precisa estar autenticado para realizar esta ação.';
      case PaymentErrorCode.FORBIDDEN:
        return 'Você não tem permissão para realizar esta ação.';
      case PaymentErrorCode.RATE_LIMIT_EXCEEDED:
        return 'Muitas tentativas. Por favor, aguarde alguns minutos e tente novamente.';
      case PaymentErrorCode.DATABASE_ERROR:
        return 'Erro ao processar sua solicitação. Tente novamente.';
      case PaymentErrorCode.NETWORK_ERROR:
        return 'Erro de conexão. Verifique sua internet e tente novamente.';
      case PaymentErrorCode.TIMEOUT:
        return 'A operação demorou muito tempo. Tente novamente.';
      default:
        return 'Ocorreu um erro inesperado. Tente novamente.';
    }
  }

  /**
   * Check if error is retryable
   */
  isRetryable(): boolean {
    return [
      PaymentErrorCode.NETWORK_ERROR,
      PaymentErrorCode.TIMEOUT,
      PaymentErrorCode.DATABASE_ERROR,
    ].includes(this.code);
  }
}

/**
 * Convert unknown error to PaymentError
 */
export function toPaymentError(error: unknown): PaymentError {
  if (error instanceof PaymentError) {
    return error;
  }

  if (error instanceof Error) {
    // Check for specific error patterns
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return new PaymentError(
        PaymentErrorCode.NETWORK_ERROR,
        error.message,
        0
      );
    }

    if (error.message.includes('timeout')) {
      return new PaymentError(
        PaymentErrorCode.TIMEOUT,
        error.message,
        408
      );
    }

    if (error.message.includes('unauthorized') || error.message.includes('auth')) {
      return new PaymentError(
        PaymentErrorCode.UNAUTHORIZED,
        error.message,
        401
      );
    }

    return new PaymentError(
      PaymentErrorCode.UNKNOWN_ERROR,
      error.message,
      500
    );
  }

  return new PaymentError(
    PaymentErrorCode.UNKNOWN_ERROR,
    'An unknown error occurred',
    500
  );
}
