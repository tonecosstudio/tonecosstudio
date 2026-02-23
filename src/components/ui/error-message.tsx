/**
 * ErrorMessage Component
 * Requirements: 19.1-19.15
 * Task: 26.2 Criar componentes de feedback
 */

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PaymentError, toPaymentError } from '@/lib/payment-errors';

interface ErrorMessageProps {
  error: Error | PaymentError | unknown;
  title?: string;
  onRetry?: () => void;
  className?: string;
  showRetry?: boolean;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  error,
  title,
  onRetry,
  className,
  showRetry = true,
}) => {
  const paymentError = toPaymentError(error);
  const canRetry = paymentError.isRetryable() && onRetry && showRetry;

  return (
    <Alert variant="destructive" className={cn('', className)}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title || 'Erro'}</AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <p>{paymentError.getUserMessage()}</p>
        
        {paymentError.details && (
          <details className="text-xs opacity-75">
            <summary className="cursor-pointer">Detalhes técnicos</summary>
            <pre className="mt-2 p-2 bg-black/10 rounded overflow-auto">
              {JSON.stringify(paymentError.details, null, 2)}
            </pre>
          </details>
        )}
        
        {canRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="mt-2"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar Novamente
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};
