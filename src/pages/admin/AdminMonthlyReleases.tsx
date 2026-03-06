/**
 * Página Admin - Gerenciamento de Lançamentos Mensais
 * Permite configurar qual personagem de cada coleção será disponibilizado por mês
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AppShell from '@/components/AppShell';
import SEOHead from '@/components/SEOHead';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import {
  Calendar,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Package,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AdminMonthlyReleases() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedCollection, setSelectedCollection] = useState('');
  const [selectedCharacter, setSelectedCharacter] = useState('');

  // Buscar lançamentos
  const { data: releases, isLoading: releasesLoading } = useQuery({
    queryKey: ['admin-monthly-releases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collection_monthly_releases')
        .select(`
          *,
          collections (name, slug),
          collection_characters (name, character_type)
        `)
        .order('release_month', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Buscar coleções ativas
  const { data: collections } = useQuery({
    queryKey: ['active-collections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collections')
        .select('id, name, slug')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data;
    },
  });

  // Buscar personagens da coleção selecionada
  const { data: characters } = useQuery({
    queryKey: ['collection-characters', selectedCollection],
    enabled: Boolean(selectedCollection),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collection_characters')
        .select('id, name, character_type, status')
        .eq('collection_id', selectedCollection)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      return data;
    },
  });

  // Criar lançamento
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMonth || !selectedCollection || !selectedCharacter) {
        throw new Error('Preencha todos os campos');
      }

      // Verificar se já existe lançamento para esta coleção neste mês
      const { data: existing } = await supabase
        .from('collection_monthly_releases')
        .select('id')
        .eq('collection_id', selectedCollection)
        .eq('release_month', selectedMonth)
        .maybeSingle();

      if (existing) {
        throw new Error('Já existe um lançamento para esta coleção neste mês');
      }

      const { error } = await supabase
        .from('collection_monthly_releases')
        .insert({
          collection_id: selectedCollection,
          character_id: selectedCharacter,
          release_month: selectedMonth,
          is_active: true,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-monthly-releases'] });
      setIsCreateDialogOpen(false);
      setSelectedMonth('');
      setSelectedCollection('');
      setSelectedCharacter('');
      toast({
        title: 'Lançamento criado!',
        description: 'O personagem foi configurado para o mês selecionado.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao criar lançamento',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Desativar lançamento
  const deactivateMutation = useMutation({
    mutationFn: async (releaseId: string) => {
      const { error } = await supabase
        .from('collection_monthly_releases')
        .update({ is_active: false })
        .eq('id', releaseId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-monthly-releases'] });
      toast({
        title: 'Lançamento desativado',
        description: 'O lançamento foi desativado com sucesso.',
      });
    },
  });

  // Gerar próximos 12 meses
  const getNextMonths = () => {
    const months = [];
    const today = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
      months.push(format(date, 'yyyy-MM'));
    }
    return months;
  };

  const nextMonths = getNextMonths();

  // Agrupar lançamentos por mês
  const releasesByMonth = releases?.reduce((acc: any, release: any) => {
    if (!acc[release.release_month]) {
      acc[release.release_month] = [];
    }
    acc[release.release_month].push(release);
    return acc;
  }, {});

  return (
    <AppShell>
      <SEOHead title="Lançamentos Mensais - Admin" noindex />

      <div className="container py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Lançamentos Mensais</h1>
            <p className="text-muted-foreground">
              Configure qual personagem de cada coleção será disponibilizado por mês
            </p>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Lançamento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Criar Lançamento Mensal</DialogTitle>
                <DialogDescription>
                  Configure um personagem para ser disponibilizado em um mês específico
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Mês */}
                <div className="space-y-2">
                  <Label>Mês</Label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o mês" />
                    </SelectTrigger>
                    <SelectContent>
                      {nextMonths.map((month) => (
                        <SelectItem key={month} value={month}>
                          {format(new Date(month + '-01'), 'MMMM yyyy', { locale: ptBR })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Coleção */}
                <div className="space-y-2">
                  <Label>Coleção</Label>
                  <Select value={selectedCollection} onValueChange={setSelectedCollection}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a coleção" />
                    </SelectTrigger>
                    <SelectContent>
                      {collections?.map((col: any) => (
                        <SelectItem key={col.id} value={col.id}>
                          {col.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Personagem */}
                <div className="space-y-2">
                  <Label>Personagem</Label>
                  <Select
                    value={selectedCharacter}
                    onValueChange={setSelectedCharacter}
                    disabled={!selectedCollection}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o personagem" />
                    </SelectTrigger>
                    <SelectContent>
                      {characters?.map((char: any) => (
                        <SelectItem key={char.id} value={char.id}>
                          {char.name}
                          {char.character_type === 'premium' && ' ⭐'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    Apenas 1 personagem por coleção por mês. Escolhas duplicadas serão bloqueadas.
                  </AlertDescription>
                </Alert>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending || !selectedMonth || !selectedCollection || !selectedCharacter}
                  className="flex-1"
                >
                  {createMutation.isPending ? 'Criando...' : 'Criar'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Estatísticas */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total de Lançamentos</p>
                  <p className="text-2xl font-bold">{releases?.length || 0}</p>
                </div>
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Lançamentos Ativos</p>
                  <p className="text-2xl font-bold text-green-600">
                    {releases?.filter((r: any) => r.is_active).length || 0}
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Meses Configurados</p>
                  <p className="text-2xl font-bold">
                    {Object.keys(releasesByMonth || {}).length}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Lançamentos */}
        <Card>
          <CardHeader>
            <CardTitle>Lançamentos Configurados</CardTitle>
            <CardDescription>
              Visualize e gerencie os lançamentos mensais por coleção
            </CardDescription>
          </CardHeader>
          <CardContent>
            {releasesLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
              </div>
            ) : releases && releases.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mês</TableHead>
                    <TableHead>Coleção</TableHead>
                    <TableHead>Personagem</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {releases.map((release: any) => (
                    <TableRow key={release.id}>
                      <TableCell className="font-medium">
                        {format(new Date(release.release_month + '-01'), 'MMM yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell>{release.collections?.name}</TableCell>
                      <TableCell>{release.collection_characters?.name}</TableCell>
                      <TableCell>
                        <Badge variant={release.collection_characters?.character_type === 'premium' ? 'default' : 'secondary'}>
                          {release.collection_characters?.character_type === 'premium' ? '⭐ Premium' : 'Padrão'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={release.is_active ? 'default' : 'secondary'}>
                          {release.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {release.is_active && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deactivateMutation.mutate(release.id)}
                            disabled={deactivateMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">Nenhum lançamento configurado</p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Lançamento
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
