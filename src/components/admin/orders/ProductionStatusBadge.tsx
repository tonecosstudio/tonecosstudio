/**
 * Badge de Status de Produção
 * 
 * Exibe o estágio atual de produção de um pedido com cores e ícones apropriados.
 */

import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  CheckCircle, 
  Package, 
  Truck,
  AlertCircle,
  CreditCard,
  CheckSquare,
  FileText,
  Printer,
  Wrench,
  Paintbrush,
  Search,
  Mail
} from 'lucide-react';
import type { ComponentType } from 'react';
import type { ProductionStage } from '@/hooks/admin/useProductionStage';

interface ProductionStatusBadgeProps {
  stage: ProductionStage | null;
  className?: string;
}

const stageConfig: Record<ProductionStage, {
  label: string;
  icon: ComponentType<{ className?: string }>;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className: string;
}> = {
  awaiting_payment: {
    label: 'Aguardando Pagamento',
    icon: CreditCard,
    variant: 'outline',
    className: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950/20 dark:text-gray-400 dark:border-gray-800'
  },
  payment_confirmed: {
    label: 'Pagamento Confirmado',
    icon: CheckSquare,
    variant: 'outline',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800'
  },
  awaiting_choice: {
    label: 'Aguardando Escolha',
    icon: Clock,
    variant: 'outline',
    className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800'
  },
  model_preparation: {
    label: 'Preparação do Modelo',
    icon: FileText,
    variant: 'outline',
    className: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-800'
  },
  printing: {
    label: 'Em Impressão 3D',
    icon: Printer,
    variant: 'outline',
    className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800'
  },
  post_processing: {
    label: 'Limpeza e Preparação',
    icon: Wrench,
    variant: 'outline',
    className: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950/20 dark:text-slate-400 dark:border-slate-800'
  },
  painting: {
    label: 'Pintura Artesanal',
    icon: Paintbrush,
    variant: 'outline',
    className: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/20 dark:text-pink-400 dark:border-pink-800'
  },
  quality_check: {
    label: 'Controle de Qualidade',
    icon: Search,
    variant: 'outline',
    className: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/20 dark:text-cyan-400 dark:border-cyan-800'
  },
  packaging: {
    label: 'Embalagem',
    icon: Package,
    variant: 'outline',
    className: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-800'
  },
  ready_to_ship: {
    label: 'Pronto para Envio',
    icon: Mail,
    variant: 'outline',
    className: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/20 dark:text-teal-400 dark:border-teal-800'
  },
  shipped: {
    label: 'Enviado',
    icon: Truck,
    variant: 'outline',
    className: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800'
  },
  delivered: {
    label: 'Entregue',
    icon: CheckCircle,
    variant: 'outline',
    className: 'bg-lime-50 text-lime-700 border-lime-200 dark:bg-lime-950/20 dark:text-lime-400 dark:border-lime-800'
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

  const config = stageConfig[stage] || {
    label: stage,
    icon: AlertCircle,
    variant: 'outline' as const,
    className: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950/20 dark:text-gray-400 dark:border-gray-800'
  };
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
