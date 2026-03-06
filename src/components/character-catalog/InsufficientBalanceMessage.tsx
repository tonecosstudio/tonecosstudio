/**
 * InsufficientBalanceMessage Component
 * 
 * Displays detailed message when user has insufficient balance
 * Shows exact values: necessary, available, missing
 * 
 * Spec: contextual-pricing-system
 * Task: 9A.2 (RN007 - Insufficient Balance Behavior)
 */

import { AlertTriangle, Coins } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface InsufficientBalanceMessageProps {
  requiredAmount: number;
  availableAmount: number;
  className?: string;
}

export function InsufficientBalanceMessage({
  requiredAmount,
  availableAmount,
  className,
}: InsufficientBalanceMessageProps) {
  const missingAmount = requiredAmount - availableAmount;

  return (
    <Alert variant="destructive" className={className}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Saldo insuficiente</AlertTitle>
      <AlertDescription>
        <div className="space-y-1 mt-2">
          <div className="flex items-center justify-between text-sm">
            <span>Necessário:</span>
            <span className="font-semibold flex items-center gap-1">
              <Coins className="h-3 w-3" />
              {requiredAmount} 🪙
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Disponível:</span>
            <span className="font-semibold flex items-center gap-1">
              <Coins className="h-3 w-3" />
              {availableAmount} 🪙
            </span>
          </div>
          <div className="flex items-center justify-between text-sm border-t pt-1 mt-1">
            <span>Faltam:</span>
            <span className="font-bold flex items-center gap-1">
              <Coins className="h-3 w-3" />
              {missingAmount} 🪙
            </span>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
