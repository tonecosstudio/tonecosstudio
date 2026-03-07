// @ts-nocheck
/**
 * Página Admin - Gerenciamento de Assinaturas (Sistema Híbrido)
 * Versão profissional para o sistema híbrido de coins
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import SEOHead from '@/components/SEOHead';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Users,
  Coins,
  Calendar,
  Search,
  Eye,
  TrendingUp,
  Package,
  ExternalLink,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SubscriptionWithDetails {
  id: string;
  user_id: string;
  plan_type: string;
  status: string;
  coins_balance: number;
  coins_initial: number;
  created_at: string;
  user_email: string;
  user_name: string;
  active_collection_name: string | null;
  selections_count: number;
}

export default function AdminSubscriptionsHybrid() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionWithDetails | null>(null);

  // Buscar assinaturas com detalhes
  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ['admin-subscriptions-hybrid'],
    queryFn: async () => {
      // Buscar assinaturas
      const { data: subs, error: subsError } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (subsError) throw subsError;

      // Enriquecer com dados do usuário e coleção
      const enriched = await Promise.all(
        (subs || []).map(async (sub: any) => {
          // Buscar usuário
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', sub.user_id)
            .single();

          // Buscar coleção ativa diretamente
          let collectionName = null;
          if (sub.active_collection_id) {
            const { data: collection } = await supabase
              .from('collections')
              .select('name')
              .eq('id', sub.active_collection_id)
              .single();
            
            if (collection) {
              collectionName = collection.name;
            }
          }

          // Contar escolhas
          const { count } = await supabase
            .from('subscription_monthly_selections')
            .select('*', { count: 'exact', head: true })
            .eq('subscription_id', sub.id);

          return {
            id: sub.id,
            user_id: sub.user_id,
            plan_type: sub.plan_type,
            status: sub.status,
            coins_balance: sub.coins_balance || 0,
            coins_initial: sub.coins_initial || 0,
            created_at: sub.created_at,
            user_email: profile?.email || 'N/A',
            user_name: profile?.full_name || 'Sem nome',
            active_collection_name: collectionName,
            selections_count: count || 0,
          };
        })
      );

      return enriched as SubscriptionWithDetails[];
    },
  });

  // Buscar escolhas de uma assinatura
  const { data: selections } = useQuery({
    queryKey: ['admin-subscription-selections', selectedSubscription?.id],
    enabled: Boolean(selectedSubscription),
    queryFn: async () => {
      if (!selectedSubscription) return [];

      const { data, error } = await supabase
        .from('subscription_selections_detailed')
        .select('*')
        .eq('subscription_id', selectedSubscription.id)
        .order('delivery_month', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  // Filtrar assinaturas
  const filteredSubscriptions = subscriptions?.filter((sub) => {
    const search = searchTerm.toLowerCase();
    return (
      sub.user_name.toLowerCase().includes(search) ||
      sub.user_email.toLowerCase().includes(search) ||
      sub.plan_type.toLowerCase().includes(search)
    );
  });

  // Estatísticas
  const stats = {
    total: subscriptions?.length || 0,
    active: subscriptions?.filter(s => s.status === 'active').length || 0,
    totalCoins: subscriptions?.reduce((sum, s) => sum + s.coins_balance, 0) || 0,
    totalSelections: subscriptions?.reduce((sum, s) => sum + s.selections_count, 0) || 0,
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      active: { variant: 'default', label: 'Ativa' },
      pending_payment: { variant: 'secondary', label: 'Aguardando Pagamento' },
      cancelled: { variant: 'destructive', label: 'Cancelada' },
      expired: { variant: 'outline', label: 'Expirada' },
    };

    const config = variants[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPlanBadge = (planType: string) => {
    const colors: Record<string, string> = {
      trimestral: 'bg-blue-500',
      semestral: 'bg-purple-500',
      anual: 'bg-amber-500',
    };

    return (
      <Badge className={`${colors[planType] || 'bg-gray-500'} text-white`}>
        {planType.charAt(0).toUpperCase() + planType.slice(1)}
      </Badge>
    );
  };

  return (
    <AdminLayout>
      <SEOHead title="Gerenciar Assinaturas - Admin" noindex />

      <div className="space-y-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Gerenciar Assinaturas</h1>
          <p className="text-muted-foreground">
            Sistema híbrido de assinaturas com coins e escolhas mensais
          </p>
        </div>

        {/* Estatísticas */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Ativas</p>
                  <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Coins Totais</p>
                  <p className="text-2xl font-bold text-amber-600">{stats.totalCoins}</p>
                </div>
                <Coins className="h-8 w-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Escolhas</p>
                  <p className="text-2xl font-bold">{stats.totalSelections}</p>
                </div>
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Busca */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou plano..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <CardHeader>
            <CardTitle>Assinaturas</CardTitle>
            <CardDescription>
              Lista de todas as assinaturas do sistema híbrido
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
              </div>
            ) : filteredSubscriptions && filteredSubscriptions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Coleção Ativa</TableHead>
                    <TableHead>Coins</TableHead>
                    <TableHead>Escolhas</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubscriptions.map((sub) => (
                    <TableRow 
                      key={sub.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => navigate(`/admin/users/${sub.user_id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="font-medium">{sub.user_name}</div>
                            <div className="text-sm text-muted-foreground">{sub.user_email}</div>
                          </div>
                          <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </TableCell>
                      <TableCell>{getPlanBadge(sub.plan_type)}</TableCell>
                      <TableCell>{getStatusBadge(sub.status)}</TableCell>
                      <TableCell>
                        {sub.active_collection_name || (
                          <span className="text-muted-foreground text-sm">Não definida</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Coins className="h-4 w-4 text-amber-500" />
                          <span className="font-medium">{sub.coins_balance}</span>
                          <span className="text-muted-foreground text-sm">/ {sub.coins_initial}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{sub.selections_count}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(sub.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSubscription(sub);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Detalhes da Assinatura</DialogTitle>
                              <DialogDescription>
                                {sub.user_name} - {sub.user_email}
                              </DialogDescription>
                            </DialogHeader>

                            <Tabs defaultValue="info" className="mt-4">
                              <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="info">Informações</TabsTrigger>
                                <TabsTrigger value="selections">Escolhas Mensais</TabsTrigger>
                              </TabsList>

                              <TabsContent value="info" className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-sm text-muted-foreground mb-1">Plano</p>
                                    <p className="font-medium capitalize">{sub.plan_type}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground mb-1">Status</p>
                                    {getStatusBadge(sub.status)}
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground mb-1">Coleção Ativa</p>
                                    <p className="font-medium">{sub.active_collection_name || 'Não definida'}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground mb-1">Data de Criação</p>
                                    <p className="font-medium">
                                      {format(new Date(sub.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground mb-1">Coins Iniciais</p>
                                    <p className="font-medium text-amber-600">{sub.coins_initial} coins</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground mb-1">Coins Disponíveis</p>
                                    <p className="font-medium text-green-600">{sub.coins_balance} coins</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground mb-1">Coins Gastos</p>
                                    <p className="font-medium text-red-600">
                                      {sub.coins_initial - sub.coins_balance} coins
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground mb-1">Total de Escolhas</p>
                                    <p className="font-medium">{sub.selections_count}</p>
                                  </div>
                                </div>
                              </TabsContent>

                              <TabsContent value="selections">
                                {selections && selections.length > 0 ? (
                                  <div className="space-y-3">
                                    {selections.map((sel: any) => (
                                      <Card key={sel.id}>
                                        <CardContent className="p-4">
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                              <Calendar className="h-5 w-5 text-muted-foreground" />
                                              <div>
                                                <div className="font-medium">{sel.character_name}</div>
                                                <div className="text-sm text-muted-foreground">
                                                  {sel.collection_name} • {format(new Date(sel.delivery_month + '-01'), 'MMMM yyyy', { locale: ptBR })}
                                                </div>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <Badge variant="outline">
                                                <Coins className="h-3 w-3 mr-1" />
                                                {sel.coins_spent} coins
                                              </Badge>
                                              <Badge variant={sel.is_auto_selected ? 'secondary' : 'default'}>
                                                {sel.is_auto_selected ? 'Automático' : 'Manual'}
                                              </Badge>
                                              <Badge variant={
                                                sel.status === 'pending' ? 'secondary' :
                                                sel.status === 'confirmed' ? 'default' :
                                                sel.status === 'in_production' ? 'outline' :
                                                'default'
                                              }>
                                                {sel.status}
                                              </Badge>
                                            </div>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center py-8 text-muted-foreground">
                                    Nenhuma escolha registrada
                                  </div>
                                )}
                              </TabsContent>
                            </Tabs>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm ? 'Nenhuma assinatura encontrada' : 'Nenhuma assinatura cadastrada'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
