/**
 * PendingChoicesList Component
 * 
 * Displays list of subscribers who haven't chosen a collection for the current cycle.
 * Highlights urgent cases (< 3 days until cutoff) and provides links to subscriber profiles.
 * 
 * Requirements: 13.6
 */

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Users, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentCutoffDate } from '@/lib/cutoff-middleware';
import { Link } from 'react-router-dom';

interface PendingChoice {
  delivery_id: string;
  delivery_number: number;
  user_id: string;
  user_name: string;
  user_email: string;
  subscription_id: string;
}

interface PendingChoicesListProps {
  cycleIds?: string[];
  className?: string;
}

/**
 * Calculate days until cutoff from current time
 */
function getDaysUntilCutoff(): number {
  const now = new Date();
  const cutoff = getCurrentCutoffDate();
  const diffMs = cutoff.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * PendingChoicesList Component
 * 
 * Displays subscribers with pending collection choices for current cycle.
 * Highlights urgent cases and provides navigation to subscriber profiles.
 */
export function PendingChoicesList({ cycleIds, className }: PendingChoicesListProps) {
  const daysUntilCutoff = getDaysUntilCutoff();

  // Fetch pending choices for the specified cycles
  const { data: pendingChoices, isLoading } = useQuery({
    queryKey: ['pending-choices', cycleIds],
    queryFn: async () => {
      if (!cycleIds || cycleIds.length === 0) return [];

      const { data, error } = await supabase
        .from('subscription_deliveries')
        .select(`
          id,
          delivery_number,
          subscription_id,
          subscriptions!inner (
            id,
            user_id,
            users:user_id (
              id,
              email,
              raw_user_meta_data
            )
          )
        `)
        .in('cycle_id', cycleIds)
        .eq('status', 'pending_choice')
        .is('collection_id', null)
        .order('delivery_number', { ascending: true });

      if (error) {
        console.error('Error fetching pending choices:', error);
        throw error;
      }

      return (data || []).map((delivery: any) => ({
        delivery_id: delivery.id,
        delivery_number: delivery.delivery_number,
        subscription_id: delivery.subscriptions?.id || '',
        user_id: delivery.subscriptions?.users?.id || '',
        user_name: delivery.subscriptions?.users?.raw_user_meta_data?.full_name || 'Sem nome',
        user_email: delivery.subscriptions?.users?.email || '',
      })) as PendingChoice[];
    },
    enabled: !!cycleIds && cycleIds.length > 0,
  });

  // Determine if case is urgent (< 3 days until cutoff)
  const isUrgent = daysUntilCutoff < 3;

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center text-muted-foreground">
          Carregando escolhas pendentes...
        </CardContent>
      </Card>
    );
  }

  if (!pendingChoices || pendingChoices.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-green-500" />
            Escolhas Pendentes
          </CardTitle>
          <CardDescription>
            Todos os assinantes escolheram suas coleções
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            ✓ Nenhuma escolha pendente para este ciclo
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className={`h-5 w-5 ${isUrgent ? 'text-red-500' : 'text-orange-500'}`} />
          Escolhas Pendentes
          {isUrgent && (
            <Badge variant="destructive" className="ml-2">
              Urgente
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {pendingChoices.length} assinante(s) ainda não escolheram a coleção
          {daysUntilCutoff > 0 && (
            <span className={isUrgent ? 'text-red-600 font-semibold' : ''}>
              {' '}• {daysUntilCutoff} dia(s) até o cutoff
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                  Assinante
                </th>
                <th className="text-center py-3 px-4 font-medium text-sm text-muted-foreground">
                  Nº Entrega
                </th>
                <th className="text-center py-3 px-4 font-medium text-sm text-muted-foreground">
                  Dias até Cutoff
                </th>
                <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {pendingChoices.map((choice) => (
                <tr
                  key={choice.delivery_id}
                  className={`border-b hover:bg-muted/50 transition-colors ${
                    isUrgent ? 'bg-red-50' : ''
                  }`}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium truncate">{choice.user_name}</div>
                        <div className="text-sm text-muted-foreground truncate">
                          {choice.user_email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Badge variant="outline">#{choice.delivery_number}</Badge>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`font-semibold ${
                        isUrgent ? 'text-red-600' : 'text-orange-600'
                      }`}
                    >
                      {daysUntilCutoff} dia(s)
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link to={`/admin/subscribers/${choice.user_id}`}>
                      <Button variant="ghost" size="sm" className="gap-2">
                        Ver Perfil
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary footer */}
        <div className="mt-4 pt-4 border-t flex justify-between items-center text-sm">
          <div className="text-muted-foreground">
            Total: {pendingChoices.length} escolha(s) pendente(s)
          </div>
          {isUrgent && (
            <div className="flex items-center gap-2 text-red-600 font-medium">
              <AlertCircle className="h-4 w-4" />
              Atenção: Menos de 3 dias até o cutoff!
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
