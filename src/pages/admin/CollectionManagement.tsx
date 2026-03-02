/**
 * CollectionManagement
 * 
 * Admin page for managing collections with CRUD operations
 * Displays table of all collections with search and filter controls
 * 
 * Requirements: 14.1
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Edit, Eye, Ban, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import SEOHead from '@/components/SEOHead';
import { useNavigate } from 'react-router-dom';
import { DeactivateCollectionDialog } from '@/components/admin/DeactivateCollectionDialog';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CollectionStats } from '@/components/admin/CollectionStats';
import { useSanitizedInput } from '@/hooks/useSanitizedInput';
import { ValidationFeedback } from '@/components/ui/validation-feedback';
import { checkRateLimit, RATE_LIMITS } from '@/lib/security/rate-limiter';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_full: number;
  is_active: boolean;
  rotation_type: 'fixed' | 'odd_months' | 'even_months';
  character_revelation_date: string | null;
  revealed: boolean;
  created_at: string;
  updated_at: string;
}

export default function CollectionManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQueryRaw, setSearchQueryRaw, searchQuerySanitized] = useSanitizedInput('', 'search');
  const [rotationFilter, setRotationFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [statsCollection, setStatsCollection] = useState<Collection | null>(null);

  // Fetch all collections
  const { data: collections, isLoading } = useQuery({
    queryKey: ['admin-collections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Collection[];
    },
  });

  // Deactivate collection mutation
  const deactivateMutation = useMutation({
    mutationFn: async (collectionId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-deactivate-collection`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ id: collectionId }),
        }
      );

      const result = await response.json();
      
      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Failed to deactivate collection');
      }

      return result.collection;
    },
    onSuccess: (collection) => {
      queryClient.invalidateQueries({ queryKey: ['admin-collections'] });
      toast({
        title: 'Coleção desativada',
        description: `A coleção "${collection.name}" foi desativada com sucesso.`,
      });
      setDeactivateDialogOpen(false);
      setSelectedCollection(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao desativar coleção',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleDeactivateClick = (collection: Collection) => {
    setSelectedCollection(collection);
    setDeactivateDialogOpen(true);
  };

  const handleStatsClick = (collection: Collection) => {
    setStatsCollection(collection);
    setStatsDialogOpen(true);
  };

  const handleDeactivateConfirm = () => {
    if (selectedCollection) {
      deactivateMutation.mutate(selectedCollection.id);
    }
  };

  // Filter collections based on search and filters
  const filteredCollections = collections?.filter((collection) => {
    // Search filter
    const matchesSearch = 
      collection.name.toLowerCase().includes(searchQuerySanitized.toLowerCase()) ||
      collection.slug.toLowerCase().includes(searchQuerySanitized.toLowerCase());

    // Rotation type filter
    const matchesRotation = 
      rotationFilter === 'all' || collection.rotation_type === rotationFilter;

    // Status filter
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'active' && collection.is_active) ||
      (statusFilter === 'inactive' && !collection.is_active);

    return matchesSearch && matchesRotation && matchesStatus;
  });

  const getRotationTypeLabel = (type: string) => {
    switch (type) {
      case 'fixed':
        return 'Fixa (Todos os meses)';
      case 'odd_months':
        return 'Meses Ímpares';
      case 'even_months':
        return 'Meses Pares';
      default:
        return type;
    }
  };

  const getRotationTypeBadge = (type: string) => {
    switch (type) {
      case 'fixed':
        return <Badge variant="outline">Fixa</Badge>;
      case 'odd_months':
        return <Badge variant="outline" className="bg-blue-500/10 border-blue-500/20 text-blue-600">Ímpares</Badge>;
      case 'even_months':
        return <Badge variant="outline" className="bg-purple-500/10 border-purple-500/20 text-purple-600">Pares</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <>
      <SEOHead
        title="Admin - Gerenciamento de Coleções"
        description="Gerenciar coleções do sistema"
        noindex={true}
      />

      <AdminLayout>
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight mb-2">Gerenciamento de Coleções</h1>
              <p className="text-lg text-muted-foreground">
                Visualize e gerencie todas as coleções do sistema
              </p>
            </div>
            <Button onClick={() => navigate('/admin/colecoes/nova')} className="gap-2">
              <Plus className="h-4 w-4" />
              Criar Nova Coleção
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Coleções</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{collections?.length || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Coleções Ativas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {collections?.filter(c => c.is_active).length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Coleções Fixas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {collections?.filter(c => c.rotation_type === 'fixed').length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Coleções Rotativas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {collections?.filter(c => c.rotation_type !== 'fixed').length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Buscar e Filtrar</CardTitle>
            <CardDescription>Use os controles abaixo para encontrar coleções específicas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search Input */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou slug..."
                  value={searchQueryRaw}
                  onChange={(e) => {
                    // Check rate limit
                    const rateLimit = checkRateLimit('search-collections', RATE_LIMITS.search);
                    if (!rateLimit.allowed) {
                      toast({
                        title: 'Limite de busca excedido',
                        description: `Aguarde ${rateLimit.retryAfter} segundos antes de buscar novamente.`,
                        variant: 'destructive'
                      });
                      return;
                    }
                    setSearchQueryRaw(e.target.value);
                  }}
                  className="pl-10"
                />
                {searchQueryRaw !== searchQuerySanitized && searchQueryRaw.length > 0 && (
                  <ValidationFeedback 
                    info="Caracteres especiais foram removidos da busca"
                    className="mt-1"
                  />
                )}
              </div>

              {/* Rotation Type Filter */}
              <Select value={rotationFilter} onValueChange={setRotationFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Tipo de Rotação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Tipos</SelectItem>
                  <SelectItem value="fixed">Fixa</SelectItem>
                  <SelectItem value="odd_months">Meses Ímpares</SelectItem>
                  <SelectItem value="even_months">Meses Pares</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="active">Ativas</SelectItem>
                  <SelectItem value="inactive">Inativas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Collections Table */}
        <Card>
          <CardHeader>
            <CardTitle>Coleções ({filteredCollections?.length || 0})</CardTitle>
            <CardDescription>
              Lista completa de todas as coleções cadastradas no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando coleções...
              </div>
            ) : filteredCollections && filteredCollections.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Preço</TableHead>
                      <TableHead>Tipo de Rotação</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCollections.map((collection) => (
                      <TableRow key={collection.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{collection.name}</div>
                            <div className="text-sm text-muted-foreground">/{collection.slug}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-mono">
                            R$ {collection.price_full?.toFixed(2) || '0.00'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getRotationTypeBadge(collection.rotation_type)}
                        </TableCell>
                        <TableCell>
                          {collection.is_active ? (
                            <Badge className="bg-green-500">Ativa</Badge>
                          ) : (
                            <Badge variant="secondary">Inativa</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStatsClick(collection)}
                              title="Ver Estatísticas"
                            >
                              <BarChart3 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/colecoes/${collection.slug}`)}
                              title="Visualizar"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/admin/colecoes/${collection.id}/editar`)}
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {collection.is_active && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeactivateClick(collection)}
                                title="Desativar"
                                className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                              >
                                <Ban className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery || rotationFilter !== 'all' || statusFilter !== 'all'
                  ? 'Nenhuma coleção encontrada com os filtros aplicados.'
                  : 'Nenhuma coleção cadastrada ainda.'}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Deactivate Collection Dialog */}
        <DeactivateCollectionDialog
          open={deactivateDialogOpen}
          onOpenChange={setDeactivateDialogOpen}
          collectionName={selectedCollection?.name || ''}
          onConfirm={handleDeactivateConfirm}
          isLoading={deactivateMutation.isPending}
        />

        {/* Collection Statistics Dialog */}
        <Dialog open={statsDialogOpen} onOpenChange={setStatsDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Estatísticas da Coleção</DialogTitle>
              <DialogDescription>
                Visualize as estatísticas de vendas e seleções desta coleção
              </DialogDescription>
            </DialogHeader>
            {statsCollection && (
              <CollectionStats
                collectionId={statsCollection.id}
                collectionName={statsCollection.name}
              />
            )}
          </DialogContent>
        </Dialog>
      </AdminLayout>
    </>
  );
}
