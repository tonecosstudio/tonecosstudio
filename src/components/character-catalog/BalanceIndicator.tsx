/**
 * BalanceIndicator Component
 * 
 * Displays user's coin balance with visual indicators
 * - Green when balance >= price (sufficient)
 * - Red when balance < price (insufficient)
 * - Shows preview of balance after purchase
 * 
 * Spec: contextual-pricing-system
 * Task: 9A.1 (RN007 - Insufficient Balance Behavior)
 */

import { Coins, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BalanceIndicatorProps {
  currentBalance: number;
  requiredAmount: number;
  className?: string;
}

export function BalanceIndicator({
  currentBalance,
  requiredAmount,
  className,
}: BalanceIndicatorProps) {
  const isSufficient = currentBalance >= requiredAmount;
  const balanceAfterPurchase = currentBalance - requiredAmount;

  return (
    <div
      className={cn(
        'flex items-center gap-2 p-3 rounded-lg border-2 transition-colors',
        isSufficient
          ? 'bg-green-50 dark:bg-green-950/20 border-green-500 text-green-700 dark:text-green-400'
          : 'bg-red-50 dark:bg-red-950/20 border-red-500 text-red-700 dark:text-red-400',
        className
      )}
    >
      {isSufficient ? (
        <CheckCircle className="h-5 w-5 flex-shrink-0" />
      ) : (
        <AlertCircle className="h-5 w-5 flex-shrink-0" />
      )}
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Coins className="h-4 w-4" />
          <span>Saldo: {currentBalance} 🪙</span>
        </div>
        
        {isSufficient ? (
          <p className="text-xs mt-1">
            Após compra: {balanceAfterPurchase} 🪙
          </p>
        ) : (
          <p className="text-xs mt-1 font-semibold">
            Saldo insuficiente
          </p>
        )}
      </div>
    </div>
  );
}
