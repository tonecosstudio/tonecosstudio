/**
 * Seção de Informações de Produção
 * 
 * Exibe informações de produção e escolha de personagem no painel de detalhes do pedido.
 */

import type { ComponentType } from "react";
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Factory, 
  ExternalLink, 
  User, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertCircle 
} from 'lucide-react';
import { ProductionStatusBadge } from './ProductionStatusBadge';
import { useProductionInfo, useCharacterChoice } from '@/hooks/admin/useProductionInfo';
import type { UnifiedOrder } from '@/types/admin/orders';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ADMIN_ROUTES } from '@/config/routes';
import { Link } from 'react-router-dom';

interface ProductionInfoSectionProps {
  order: UnifiedOrder;
}

export function ProductionInfoSection({ order }: ProductionInfoSectionProps) {
  // Determinar se deve buscar informações de produção
  const productionOrderType =
    order.type === 'subscription_delivery' || order.type === 'standalone_purchase'
      ? order.type
      : null;
  
  const { data: productionInfo, isLoading: isLoadingProduction } = useProductionInfo(
    productionOrderType ? order.id : null,
    productionOrderType
  );

  const { data: characterChoice } = useCharacterChoice(
    productionOrderType ? order.id : null,
    productionOrderType
  );

  // Apenas mostrar para pedidos elegíveis
  if (!productionOrderType) {
    return null;
  }

  // Se não há informações de produção, não mostrar a seção
  if (!isLoadingProduction && !productionInfo) {
    return null;
  }

  return (
    <>
      <Separator />
      
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Factory className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-muted-foreground">Produção</h3>
        </div>

        {isLoadingProduction ? (
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
            <div className="h-4 bg-muted rounded w-2/3 animate-pulse" />
          </div>
        ) : productionInfo ? (
          <div className="space-y-4">
            {/* Estágio Atual */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Estágio Atual</span>
              <ProductionStatusBadge stage={productionInfo.currentStage} />
            </div>

            {/* Data Estimada de Conclusão */}
            {productionInfo.estimatedCompletionDate && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Previsão de Conclusão</span>
                <span className="text-sm">
                  {new Date(productionInfo.estimatedCompletionDate).toLocaleDateString('pt-BR')}
                </span>
              </div>
            )}

            {/* Status da Escolha de Personagem */}
            {characterChoice && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>Escolha de Personagem</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <ChoiceStatusBadge status={characterChoice.status} />
                </div>

                {characterChoice.characterName && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Personagem</span>
                    <span className="text-sm font-medium">{characterChoice.characterName}</span>
                  </div>
                )}

                {characterChoice.deadline && characterChoice.status === 'pending' && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Prazo</span>
                    <span className="text-sm text-amber-600 dark:text-amber-400">
                      {formatDistanceToNow(new Date(characterChoice.deadline), {
                        addSuffix: true,
                        locale: ptBR
                      })}
                    </span>
                  </div>
                )}

                {characterChoice.approvedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Aprovado em</span>
                    <span className="text-sm">
                      {new Date(characterChoice.approvedAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Botão para Dashboard de Produção */}
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                asChild
              >
                <Link
                  to={`${ADMIN_ROUTES.production}?order=${encodeURIComponent(order.id)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ver no Dashboard de Produção
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Este pedido ainda não foi adicionado à fila de produção.
          </p>
        )}
      </section>
    </>
  );
}

/**
 * Badge de Status da Escolha de Personagem
 */
function ChoiceStatusBadge({ status }: { status: string }) {
  const config: Record<string, {
    label: string;
    icon: ComponentType<{ className?: string }>;
    className: string;
  }> = {
    pending: {
      label: 'Pendente',
      icon: Clock,
      className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800'
    },
    submitted: {
      label: 'Enviado',
      icon: AlertCircle,
      className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800'
    },
    approved: {
      label: 'Aprovado',
      icon: CheckCircle,
      className: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800'
    },
    rejected: {
      label: 'Rejeitado',
      icon: XCircle,
      className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800'
    },
    locked: {
      label: 'Bloqueado',
      icon: CheckCircle,
      className: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950/20 dark:text-gray-400 dark:border-gray-800'
    }
  };

  const statusConfig = config[status] || config.pending;
  const Icon = statusConfig.icon;

  return (
    <Badge variant="outline" className={`gap-1 ${statusConfig.className}`}>
      <Icon className="h-3 w-3" />
      <span>{statusConfig.label}</span>
    </Badge>
  );
}
