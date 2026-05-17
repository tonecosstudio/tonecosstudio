/**
 * Detalhes de Entrega de Assinatura
 * 
 * Exibe informações específicas de entregas de assinatura,
 * incluindo coleção escolhida, personagem e progresso.
 */

import { Package, Calendar, BookOpen, Palette } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import type { UnifiedOrder } from '@/types/admin/orders';
import { isSubscriptionDelivery } from '@/types/admin/orders';

interface SubscriptionDeliveryDetailsProps {
  order: UnifiedOrder;
}

export function SubscriptionDeliveryDetails({ order }: SubscriptionDeliveryDetailsProps) {
  if (!isSubscriptionDelivery(order)) {
    return null;
  }

  const { subscriptionDelivery } = order;

  // Delivery status labels
  const statusLabels: Record<string, string> = {
    scheduled: 'Agendada',
    in_production: 'Em Produção',
    shipped: 'Enviada',
    delivered: 'Entregue',
    cancelled: 'Cancelada',
  };

  return (
    <>
      <Separator />

      {/* Coleção Escolhida */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-muted-foreground">
            Coleção Escolhida
          </h3>
        </div>
        <div className="space-y-3">
          {order.collection ? (
            <div className="p-3 bg-muted/50 rounded-lg border">
              <span className="text-sm font-semibold">{order.collection.name}</span>
              <span className="text-xs text-muted-foreground ml-2">({order.collection.slug})</span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Nenhuma coleção vinculada a esta assinatura
            </p>
          )}
        </div>
      </section>

      <Separator />

      {/* Informações da Assinatura */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Package className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-muted-foreground">
            Assinatura
          </h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">ID da Assinatura</span>
            <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
              {subscriptionDelivery.subscriptionId.slice(0, 8)}
            </code>
          </div>

          {subscriptionDelivery.subscription && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tipo de Plano</span>
                <Badge variant="outline" className="capitalize">
                  {subscriptionDelivery.subscription.planType}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Progresso</span>
                <span className="text-sm font-medium">
                  {subscriptionDelivery.subscription.deliveriesCompleted} de{' '}
                  {subscriptionDelivery.subscription.deliveriesTotal} entregas
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status da Assinatura</span>
                <Badge variant={subscriptionDelivery.subscription.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                  {subscriptionDelivery.subscription.status}
                </Badge>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Personagem da Próxima Entrega */}
      <Separator />
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Palette className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-muted-foreground">
            Personagem (Próxima Entrega)
          </h3>
        </div>
        <div className="space-y-3">
          {subscriptionDelivery.character ? (
            <div className="p-3 bg-muted/50 rounded-lg border flex items-center gap-3">
              {subscriptionDelivery.character.imageUrl && (
                <img
                  src={subscriptionDelivery.character.imageUrl}
                  alt={subscriptionDelivery.character.name}
                  className="w-10 h-10 rounded object-cover"
                />
              )}
              <div>
                <span className="text-sm font-semibold">{subscriptionDelivery.character.name}</span>
                <p className="text-xs text-muted-foreground">
                  Entrega #{subscriptionDelivery.deliveryNumber}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Personagem ainda não definido para a próxima entrega
            </p>
          )}
        </div>
      </section>

      {/* Lista de Todas as Entregas */}
      {subscriptionDelivery.allDeliveries && subscriptionDelivery.allDeliveries.length > 0 && (
        <>
          <Separator />
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-muted-foreground">
                Todas as Entregas ({subscriptionDelivery.allDeliveries.length})
              </h3>
            </div>
            <div className="space-y-2">
              {subscriptionDelivery.allDeliveries.map((delivery, index: number) => (
                <div
                  key={delivery.id || index}
                  className="flex items-center justify-between p-2 rounded border text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      #{delivery.deliveryNumber}
                    </span>
                    <span className="font-medium">
                      {delivery.characterName || 'Personagem não definido'}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {statusLabels[delivery.status] || delivery.status}
                  </Badge>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {/* Informações do Ciclo de Produção */}
      {subscriptionDelivery.cycle && (
        <>
          <Separator />
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-muted-foreground">
                Ciclo de Produção
              </h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Número do Ciclo</span>
                <span className="text-sm font-medium">
                  #{subscriptionDelivery.cycle.cycleNumber}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Período</span>
                <span className="text-sm font-medium">
                  {subscriptionDelivery.cycle.month}/{subscriptionDelivery.cycle.year}
                </span>
              </div>
            </div>
          </section>
        </>
      )}

      {/* Data de Revelação */}
      {subscriptionDelivery.revealDate && (
        <>
          <Separator />
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-muted-foreground">
                Revelação
              </h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Data de Revelação</span>
                <span className="text-sm font-medium">
                  {new Date(subscriptionDelivery.revealDate).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>
          </section>
        </>
      )}
    </>
  );
}
