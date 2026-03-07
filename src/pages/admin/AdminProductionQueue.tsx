import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Package, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ProductionQueueItem {
  id: string;
  order_id: string;
  order_type: 'subscription_delivery' | 'standalone_purchase';
  customer_name: string;
  customer_email: string;
  collection_name: string;
  character_name: string | null;
  production_status: string;
  current_stage: string;
  choice_status: string;
  choice_deadline: string | null;
  choice_made_at: string | null;
  priority: string;
  priority_score: number;
  created_at: string;
}

const statusColors = {
  awaiting_choice: 'bg-yellow-100 text-yellow-800',
  ready_for_production: 'bg-blue-100 text-blue-800',
  in_production: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  on_hold: 'bg-orange-100 text-orange-800',
  cancelled: 'bg-red-100 text-red-800',
};

const stageColors = {
  awaiting_choice: 'bg-gray-100 text-gray-800',
  design: 'bg-blue-100 text-blue-800',
  production: 'bg-purple-100 text-purple-800',
  quality_check: 'bg-indigo-100 text-indigo-800',
  packaging: 'bg-cyan-100 text-cyan-800',
  shipped: 'bg-green-100 text-green-800',
};

const priorityColors = {
  critical: 'bg-red-100 text-red-800 border-red-300',
  high: 'bg-orange-100 text-orange-800 border-orange-300',
  normal: 'bg-blue-100 text-blue-800 border-blue-300',
  low: 'bg-gray-100 text-gray-800 border-gray-300',
};

const statusIcons = {
  awaiting_choice: Clock,
  ready_for_production: Package,
  in_production: Package,
  completed: CheckCircle,
  on_hold: AlertCircle,
  cancelled: XCircle,
};

export default function AdminProductionQueue() {
  const [items, setItems] = useState<ProductionQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadProductionQueue();
  }, []);

  async function loadProductionQueue() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('production_queue')
        .select('*')
        .order('priority_score', { ascending: false })
        .order('choice_deadline', { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      console.error('Error loading production queue:', error);
      toast.error('Erro ao carregar fila de produção');
    } finally {
      setLoading(false);
    }
  }

  const filteredItems = items.filter((item) => {
    if (filter === 'all') return true;
    return item.production_status === filter;
  });

  const stats = {
    total: items.length,
    awaiting_choice: items.filter((i) => i.production_status === 'awaiting_choice').length,
    ready_for_production: items.filter((i) => i.production_status === 'ready_for_production').length,
    in_production: items.filter((i) => i.production_status === 'in_production').length,
    completed: items.filter((i) => i.production_status === 'completed').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fila de Produção</h1>
          <p className="text-muted-foreground">
            Gerencie todos os itens em produção
          </p>
        </div>
        <Button onClick={loadProductionQueue} variant="outline">
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Aguardando Escolha
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.awaiting_choice}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pronto para Produção
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.ready_for_production}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Em Produção
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {stats.in_production}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Concluídos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.completed}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
          size="sm"
        >
          Todos ({stats.total})
        </Button>
        <Button
          variant={filter === 'awaiting_choice' ? 'default' : 'outline'}
          onClick={() => setFilter('awaiting_choice')}
          size="sm"
        >
          Aguardando Escolha ({stats.awaiting_choice})
        </Button>
        <Button
          variant={filter === 'ready_for_production' ? 'default' : 'outline'}
          onClick={() => setFilter('ready_for_production')}
          size="sm"
        >
          Pronto ({stats.ready_for_production})
        </Button>
        <Button
          variant={filter === 'in_production' ? 'default' : 'outline'}
          onClick={() => setFilter('in_production')}
          size="sm"
        >
          Em Produção ({stats.in_production})
        </Button>
        <Button
          variant={filter === 'completed' ? 'default' : 'outline'}
          onClick={() => setFilter('completed')}
          size="sm"
        >
          Concluídos ({stats.completed})
        </Button>
      </div>

      {/* Production Queue Items */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhum item encontrado
            </CardContent>
          </Card>
        ) : (
          filteredItems.map((item) => {
            const StatusIcon = statusIcons[item.production_status as keyof typeof statusIcons] || Package;
            
            return (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="mt-1">
                        <StatusIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={priorityColors[item.priority as keyof typeof priorityColors]}>
                            {item.priority.toUpperCase()} ({item.priority_score})
                          </Badge>
                          <Badge className={statusColors[item.production_status as keyof typeof statusColors]}>
                            {item.production_status.replace(/_/g, ' ')}
                          </Badge>
                          <Badge className={stageColors[item.current_stage as keyof typeof stageColors]}>
                            {item.current_stage.replace(/_/g, ' ')}
                          </Badge>
                          <Badge variant="outline">
                            {item.order_type === 'subscription_delivery' ? 'Assinatura' : 'Avulso'}
                          </Badge>
                        </div>

                        <div>
                          <h3 className="font-semibold text-lg">
                            {item.customer_name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {item.customer_email}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="font-medium">Coleção:</span>{' '}
                            {item.collection_name}
                          </div>
                          <div>
                            <span className="font-medium">Personagem:</span>{' '}
                            {item.character_name || (
                              <span className="text-yellow-600">Aguardando escolha</span>
                            )}
                          </div>
                          {item.choice_deadline && (
                            <div>
                              <span className="font-medium">Prazo escolha:</span>{' '}
                              {new Date(item.choice_deadline).toLocaleDateString('pt-BR')}
                            </div>
                          )}
                          {item.choice_made_at && (
                            <div>
                              <span className="font-medium">Escolha feita:</span>{' '}
                              {new Date(item.choice_made_at).toLocaleDateString('pt-BR')}
                            </div>
                          )}
                        </div>

                        <div className="text-xs text-muted-foreground">
                          Criado em: {new Date(item.created_at).toLocaleDateString('pt-BR')} às{' '}
                          {new Date(item.created_at).toLocaleTimeString('pt-BR')}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
