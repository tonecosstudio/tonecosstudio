/**
 * CollectionStatusBadge Component
 * 
 * Displays status badge for collections based on user context
 * - "Sua Coleção" (green) for chosen collections
 * - "Disponível" (gray) for non-chosen collections (subscribers)
 * - "Preço Avulso" (gray) for non-subscribers
 * 
 * Spec: contextual-pricing-system
 * Task: 9.11 (RN009 - Visual Explanation System)
 */

import { Badge } from '@/components/ui/badge';
import { CheckCircle, Package, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CollectionStatus = 'chosen' | 'available' | 'standalone';

interface CollectionStatusBadgeProps {
  status: CollectionStatus;
  className?: string;
}

export function CollectionStatusBadge({
  status,
  className,
}: CollectionStatusBadgeProps) {
  const config = {
    chosen: {
      label: 'Sua Coleção',
      icon: CheckCircle,
      className: 'bg-green-500 text-white border-0 shadow-lg',
      ariaLabel: 'Coleção escolhida na sua assinatura com desconto',
    },
    available: {
      label: 'Disponível',
      icon: Package,
      className: 'bg-gray-400 text-white border-0',
      ariaLabel: 'Coleção disponível para escolher',
    },
    standalone: {
      label: 'Preço Avulso',
      icon: ShoppingBag,
      className: 'bg-gray-500 text-white border-0',
      ariaLabel: 'Compra avulsa sem assinatura',
    },
  };

  const { label, icon: Icon, className: badgeClassName, ariaLabel } = config[status];

  return (
    <Badge
      className={cn(badgeClassName, 'gap-1 font-semibold uppercase text-xs px-2 py-1', className)}
      aria-label={ariaLabel}
    >
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

/**
 * Hook helper to determine collection status for a user
 */
export function useCollectionStatus(
  isSubscriber: boolean,
  isChosen: boolean
): CollectionStatus {
  if (!isSubscriber) {
    return 'standalone';
  }
  
  return isChosen ? 'chosen' : 'available';
}
