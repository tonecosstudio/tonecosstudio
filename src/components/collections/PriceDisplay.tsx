/**
 * PriceDisplay Component
 * 
 * Displays prices with visual discount indicators
 * - Highlighted price with strikethrough original
 * - Economy badge showing savings
 * - Animated number transitions
 * 
 * Spec: contextual-pricing-system
 * Task: 9.12 (RN009 - Visual Explanation System)
 */

import { Badge } from '@/components/ui/badge';
import { TrendingDown, Coins } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PriceDisplayProps {
  currentPrice: number;
  originalPrice?: number;
  showDiscount?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function PriceDisplay({
  currentPrice,
  originalPrice,
  showDiscount = false,
  size = 'md',
  className,
}: PriceDisplayProps) {
  const hasDiscount = showDiscount && originalPrice && originalPrice > currentPrice;
  const discountAmount = hasDiscount ? originalPrice - currentPrice : 0;
  const discountPercentage = hasDiscount
    ? Math.round((discountAmount / originalPrice) * 100)
    : 0;

  const sizeClasses = {
    sm: {
      current: 'text-lg',
      original: 'text-sm',
      badge: 'text-xs',
    },
    md: {
      current: 'text-xl',
      original: 'text-base',
      badge: 'text-sm',
    },
    lg: {
      current: 'text-2xl',
      original: 'text-lg',
      badge: 'text-base',
    },
  };

  const classes = sizeClasses[size];

  return (
    <div className={cn('space-y-2', className)}>
      {/* Price display */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Original price (strikethrough) */}
        {hasDiscount && (
          <span
            className={cn(
              'text-muted-foreground line-through',
              classes.original
            )}
          >
            {originalPrice} 🪙
          </span>
        )}

        {/* Current price (highlighted if discount) */}
        <span
          className={cn(
            'font-bold flex items-center gap-1',
            hasDiscount ? 'text-green-600 dark:text-green-400' : 'text-primary',
            classes.current
          )}
        >
          <Coins className="h-4 w-4" />
          {currentPrice} 🪙
        </span>

        {/* Discount percentage badge */}
        {hasDiscount && (
          <Badge className="bg-green-500 text-white border-0 gap-1">
            <TrendingDown className="h-3 w-3" />
            {discountPercentage}% OFF
          </Badge>
        )}
      </div>

      {/* Economy badge */}
      {hasDiscount && (
        <div className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20 p-2 rounded inline-block">
          💰 Economize {discountAmount} 🪙
        </div>
      )}
    </div>
  );
}

/**
 * Compact version for use in cards
 */
export function CompactPriceDisplay({
  currentPrice,
  originalPrice,
  showDiscount = false,
  className,
}: Omit<PriceDisplayProps, 'size'>) {
  const hasDiscount = showDiscount && originalPrice && originalPrice > currentPrice;
  const discountPercentage = hasDiscount
    ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
    : 0;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {hasDiscount && (
        <span className="text-sm text-muted-foreground line-through">
          {originalPrice} 🪙
        </span>
      )}
      <span
        className={cn(
          'text-lg font-bold',
          hasDiscount ? 'text-green-600 dark:text-green-400' : 'text-primary'
        )}
      >
        {currentPrice} 🪙
      </span>
      {hasDiscount && (
        <Badge variant="secondary" className="text-xs">
          -{discountPercentage}%
        </Badge>
      )}
    </div>
  );
}
