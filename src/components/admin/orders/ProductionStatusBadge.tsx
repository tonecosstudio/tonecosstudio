/**
 * Badge de Status de Produção
 * 
 * Exibe o estágio atual de produção de um pedido com cores e ícones apropriados.
 */

import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  Palette, 
  Hammer, 
  CheckCircle, 
  Package, 
  Truck,
  AlertCircle 
} from 'lucide-react';
import type { ProductionStage } from '@/services/admin/production-service';

interface ProductionStatusBadgeProps {
  stage: ProductionStage | null;
  className?: string;
}

const stageConfig: Record<ProductionStage, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className: string;
}> = {
  awaiting_choice: {
    label: 'Aguardando Escolha',
    icon: Clock,
    variant: 'outline',
    className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800'
  },
  design: {
    label: 'Design',
    icon: Palette,
    variant: 'outline',
    className: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-800'
  },
  production: {
    label: 'Produção',
    icon: Hammer,
    variant: 'outline',
    className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800'
  },
  quality_check: {
    label: 'Controle de Qualidade',
    icon: CheckCircle,
    variant: 'outline',
    className: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/20 dark:text-cyan-400 dark:border-cyan-800'
  },
  packaging: {
    label: 'Embalagem',
    icon: Package,
    variant: 'outline',
    className: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-800'
  },
  shipped: {
    label: 'Enviado',
    icon: Truck,
    variant: 'outline',
    className: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800'
  }
};

export function ProductionStatusBadge({ stage, className = '' }: ProductionStatusBadgeProps) {
  if (!stage) {
    return (
      <Badge variant="outline" className={`gap-1 ${className}`}>
        <AlertCircle className="h-3 w-3" />
        <span>Não iniciado</span>
      </Badge>
    );
  }

  const config = stageConfig[stage];
  const Icon = config.icon;

  return (
    <Badge 
      variant={config.variant} 
      className={`gap-1 ${config.className} ${className}`}
    >
      <Icon className="h-3 w-3" />
      <span>{config.label}</span>
    </Badge>
  );
}
