// @ts-nocheck
/**
 * My Automatic Order Section Component
 * Displays the automatic order with character list
 */

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Package, Calendar, Lock, AlertTriangle, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { subscriptionCreditAPI } from '@/services/subscription-credit-api';

interface MyAutomaticOrderSectionProps {
  subscriptionId: number;
}

export function MyAutomaticOrderSection({ subscriptionId }: MyAutomaticOrderSectionProps) {
  // Fetch user's orders to find the automatic order
  const ordersQuery = useQuery({
    queryKey: ['subscription-credit', 'orders', subscriptionId],
    queryFn: () => subscriptionCreditAPI.getUserOrders(),
  });

  // Find the automatic order (most recent one)
  const automaticOrder = ordersQuery.data?.orders.find((order) => order.order_type === 'automatic');

  // Fetch current cycle
  const cycleQuery = useQuery({
    queryKey: ['subscription-credit', 'current-cycle'],
    queryFn: () => subscriptionCreditAPI.getCurrentCycle(),
  });

  const cycle = cycleQuery.data;

  if (!automaticOrder) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Meu Pedido Automático</CardTitle>
          <CardDescription>Coleção padrão entregue automaticamente</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum pedido automático encontrado</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isLocked = automaticOrder.is_locked;
  const cycleCloseDate = cycle?.close_date;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Meu Pedido Automático</CardTitle>
            <CardDescription>
              {automaticOrder.items.length} personagem(ns) • {automaticOrder.total_credits} créditos
            </CardDescription>
          </div>
          {isLocked ? (
            <Badge variant="secondary">
              <Lock className="h-3 w-3 mr-1" />
              Bloqueado
            </Badge>
          ) : (
            <Badge className="bg-green-500">Aberto</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cycle Close Date */}
        {cycleCloseDate && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              Fechamento do ciclo:{' '}
              <span className="font-medium text-foreground">
                {format(new Date(cycleCloseDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </span>
            </span>
          </div>
        )}

        {/* Locked Warning */}
        {isLocked && (
          <Alert className="bg-yellow-50 border-yellow-200">
            <Lock className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-sm text-yellow-900">
              Este pedido está bloqueado. O ciclo de produção foi fechado e os créditos já foram
              debitados.
            </AlertDescription>
          </Alert>
        )}

        {/* Insufficient Credits Warning */}
        {!automaticOrder.credits_debited && automaticOrder.status === 'pending' && (
          <Alert className="bg-red-50 border-red-200">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-sm text-red-900">
              <strong>Saldo insuficiente!</strong> Você não tem créditos suficientes para este
              pedido. Adicione créditos ou remova personagens.
            </AlertDescription>
          </Alert>
        )}

        {/* Character List */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Personagens:</h4>
          <div className="space-y-2">
            {automaticOrder.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3">
                  {item.character?.image_url && (
                    <img
                      src={item.character.image_url}
                      alt={item.character.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                  )}
                  <div>
                    <div className="font-medium">{item.character?.name || 'Personagem'}</div>
                    {item.character?.description && (
                      <div className="text-xs text-muted-foreground">
                        {item.character.description}
                      </div>
                    )}
                  </div>
                </div>
                <Badge variant="outline">{item.credits_cost} créditos</Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Modify Button */}
        {!isLocked && (
          <Button variant="outline" className="w-full" disabled>
            <Edit className="h-4 w-4 mr-2" />
            Modificar Seleção
            <span className="ml-2 text-xs text-muted-foreground">(Em breve)</span>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
