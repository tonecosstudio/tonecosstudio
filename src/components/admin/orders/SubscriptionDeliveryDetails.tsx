/**
 * Detalhes de Entrega de Assinatura
 * 
 * Exibe informações específicas de entregas de assinatura
 */

import { Package, Calendar, User as UserIcon, Image } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
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

  return (
    <>
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
              {subscriptionDelivery.subscriptionId}
            </code>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Número da Entrega</span>
            <span className="text-sm font-medium">
              {subscriptionDelivery.deliveryNumber}
            </span>
          </div>

          {subscriptionDelivery.subscription && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tipo de Plano</span>
                <span className="text-sm font-medium capitalize">
                  {subscriptionDelivery.subscription.planType}
                </span>
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
                <span className="text-sm font-medium capitalize">
                  {subscriptionDelivery.subscription.status}
                </span>
              </div>
            </>
          )}
        </div>
      </section>

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

      {/* Informações do Personagem */}
      {subscriptionDelivery.character && (
        <>
          <Separator />
          <section>
            <div className="flex items-center gap-2 mb-3">
              <UserIcon className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-muted-foreground">
                Personagem
              </h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Nome</span>
                <span className="text-sm font-medium">
                  {subscriptionDelivery.character.name}
                </span>
              </div>

              {subscriptionDelivery.character.imageUrl && (
                <div className="flex items-start justify-between">
                  <span className="text-sm text-muted-foreground">Imagem</span>
                  <div className="flex items-center gap-2">
                    <Image className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={subscriptionDelivery.character.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      Ver imagem
                    </a>
                  </div>
                </div>
              )}
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
