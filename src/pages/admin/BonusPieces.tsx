/**
 * BonusPieces Admin Page
 * 
 * Admin page for managing bonus piece catalog
 * Displays list of available bonus pieces with CRUD operations
 * 
 * Requirements: 11.2
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Edit, Trash2, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import SEOHead from '@/components/SEOHead';
import { useToast } from '@/hooks/use-toast';
import ImageUpload from '@/components/admin/ImageUpload';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BonusPiece {
  id: string;
  subscription_id: string;
  delivery_id: string | null;
  description: string;
  image_url: string | null;
  status: 'pending' | 'prepared' | 'shipped';
  prepared_at: string | null;
  shipped_at: string | null;
  created_at: string;
  updated_at: string;
}

interface BonusPieceCatalogItem {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  quantity_available: number;
  quantity_reserved: number;
  low_stock_threshold: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function BonusPieces() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<BonusPieceCatalogItem | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formQuantity, setFormQuantity] = useState(0);
  const [formLowStockThreshold, setFormLowStockThreshold] = useState(10);

  // Fetch all bonus piece catalog items
  const { data: catalogItems, isLoading } = useQuery({
    queryKey: ['bonus-pieces-catalog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bonus_piece_catalog' as any)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as BonusPieceCatalogItem[];
    },
  });

  // Create bonus piece mutation
  const createMutation = useMutation({
    mutationFn: async (newItem: { 
      name: string;
      description: string; 
      image_url: string | null;
      quantity_available: number;
      low_stock_threshold: number;
    }) => {
      const { data, error } = await supabase
        .from('bonus_piece_catalog' as any)
        .insert({
          name: newItem.name,
          description: newItem.description,
          image_url: newItem.image_url,
          quantity_available: newItem.quantity_available,
          quantity_reserved: 0,
          low_stock_threshold: newItem.low_stock_threshold,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bonus-pieces-catalog'] });
      toast({
        title: 'Peça bônus criada',
        description: 'A peça bônus foi adicionada ao catálogo com sucesso.',
      });
      setCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar peça bônus',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update bonus piece mutation
  const updateMutation = useMutation({
    mutationFn: async (params: { 
      id: string; 
      name: string;
      description: string; 
      image_url: string | null;
      quantity_available: number;
      low_stock_threshold: number;
    }) => {
      const { data, error } = await supabase
        .from('bonus_piece_catalog' as any)
        .update({
          name: params.name,
          description: params.description,
          image_url: params.image_url,
          quantity_available: params.quantity_available,
          low_stock_threshold: params.low_stock_threshold,
        })
        .eq('id', params.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bonus-pieces-catalog'] });
      toast({
        title: 'Peça bônus atualizada',
        description: 'As informações da peça bônus foram atualizadas com sucesso.',
      });
      setEditDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar peça bônus',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete bonus piece mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('bonus_piece_catalog' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bonus-pieces-catalog'] });
      toast({
        title: 'Peça bônus removida',
        description: 'A peça bônus foi removida do catálogo com sucesso.',
      });
      setDeleteDialogOpen(false);
      setSelectedItem(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao remover peça bônus',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormImageUrl('');
    setFormQuantity(0);
    setFormLowStockThreshold(10);
    setSelectedItem(null);
  };

  const handleCreateClick = () => {
    resetForm();
    setCreateDialogOpen(true);
  };

  const handleEditClick = (item: BonusPieceCatalogItem) => {
    setSelectedItem(item);
    setFormName(item.name);
    setFormDescription(item.description);
    setFormImageUrl(item.image_url || '');
    setFormQuantity(item.quantity_available);
    setFormLowStockThreshold(item.low_stock_threshold);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (item: BonusPieceCatalogItem) => {
    setSelectedItem(item);
    setDeleteDialogOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      name: formName,
      description: formDescription,
      image_url: formImageUrl || null,
      quantity_available: formQuantity,
      low_stock_threshold: formLowStockThreshold,
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    updateMutation.mutate({
      id: selectedItem.id,
      name: formName,
      description: formDescription,
      image_url: formImageUrl || null,
      quantity_available: formQuantity,
      low_stock_threshold: formLowStockThreshold,
    });
  };

  const handleDeleteConfirm = () => {
    if (!selectedItem) return;
    deleteMutation.mutate(selectedItem.id);
  };

  // Filter items based on search and filters
  const filteredItems = catalogItems?.filter((item) => {
    // Search filter
    const matchesSearch = 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());

    // Status filter - check if low stock
    const isLowStock = (item.quantity_available - item.quantity_reserved) <= item.low_stock_threshold;
    const isOutOfStock = (item.quantity_available - item.quantity_reserved) <= 0;
    
    let matchesStatus = true;
    if (statusFilter === 'low_stock') {
      matchesStatus = isLowStock && !isOutOfStock;
    } else if (statusFilter === 'out_of_stock') {
      matchesStatus = isOutOfStock;
    } else if (statusFilter === 'in_stock') {
      matchesStatus = !isLowStock && !isOutOfStock;
    }

    return matchesSearch && matchesStatus;
  });

  const getStockBadge = (item: BonusPieceCatalogItem) => {
    const quantityFree = item.quantity_available - item.quantity_reserved;
    
    if (quantityFree <= 0) {
      return <Badge variant="outline" className="bg-red-500/10 border-red-500/20 text-red-600">Esgotado</Badge>;
    } else if (quantityFree <= item.low_stock_threshold) {
      return <Badge variant="outline" className="bg-yellow-500/10 border-yellow-500/20 text-yellow-600">Estoque Baixo</Badge>;
    } else {
      return <Badge variant="outline" className="bg-green-500/10 border-green-500/20 text-green-600">Em Estoque</Badge>;
    }
  };

  return (
    <>
      <SEOHead
        title="Admin - Catálogo de Peças Bônus"
        description="Gerenciar catálogo de peças bônus"
        noindex={true}
      />

      <AdminLayout>
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight mb-2">Catálogo de Peças Bônus</h1>
              <p className="text-lg text-muted-foreground">
                Gerencie as peças bônus exclusivas do plano semestral
              </p>
            </div>
            <Button onClick={handleCreateClick} className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Peça Bônus
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Peças</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{catalogItems?.length || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {catalogItems?.filter(i => i.status === 'pending').length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Preparadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {catalogItems?.filter(i => i.status === 'prepared').length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Enviadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {catalogItems?.filter(i => i.status === 'shipped').length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Buscar e Filtrar</CardTitle>
            <CardDescription>Use os controles abaixo para encontrar peças específicas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search Input */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por descrição..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="prepared">Preparadas</SelectItem>
                  <SelectItem value="shipped">Enviadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Bonus Pieces Table */}
        <Card>
          <CardHeader>
            <CardTitle>Peças Bônus ({filteredItems?.length || 0})</CardTitle>
            <CardDescription>
              Lista completa de todas as peças bônus cadastradas no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando peças bônus...
              </div>
            ) : filteredItems && filteredItems.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Imagem</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data de Criação</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.description}
                              className="w-16 h-16 object-cover rounded border"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-muted rounded border flex items-center justify-center">
                              <Package className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-md">
                            <p className="font-medium line-clamp-2">{item.description}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(item.status)}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(item.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditClick(item)}
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(item)}
                              title="Remover"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery || statusFilter !== 'all'
                  ? 'Nenhuma peça bônus encontrada com os filtros aplicados.'
                  : 'Nenhuma peça bônus cadastrada ainda.'}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Adicionar Peça Bônus</DialogTitle>
              <DialogDescription>
                Adicione uma nova peça bônus ao catálogo do plano semestral
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição *</Label>
                  <Textarea
                    id="description"
                    placeholder="Descreva a peça bônus..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    required
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <ImageUpload
                    label="Imagem da Peça Bônus"
                    description="Imagem da peça bônus (PNG, JPG, WEBP - máx. 5MB)"
                    currentImageUrl={formImageUrl}
                    bucket="images"
                    folder="bonus-pieces"
                    onUploadComplete={setFormImageUrl}
                    maxSizeMB={5}
                    acceptedFormats={["image/png", "image/jpeg", "image/jpg", "image/webp"]}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                  disabled={createMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Criando...' : 'Criar Peça Bônus'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Peça Bônus</DialogTitle>
              <DialogDescription>
                Atualize as informações da peça bônus
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Descrição *</Label>
                  <Textarea
                    id="edit-description"
                    placeholder="Descreva a peça bônus..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    required
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <ImageUpload
                    label="Imagem da Peça Bônus"
                    description="Imagem da peça bônus (PNG, JPG, WEBP - máx. 5MB)"
                    currentImageUrl={formImageUrl}
                    bucket="images"
                    folder="bonus-pieces"
                    onUploadComplete={setFormImageUrl}
                    maxSizeMB={5}
                    acceptedFormats={["image/png", "image/jpeg", "image/jpg", "image/webp"]}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                  disabled={updateMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Remoção</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja remover esta peça bônus do catálogo?
                Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={deleteMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Removendo...' : 'Remover'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AdminLayout>
    </>
  );
}
