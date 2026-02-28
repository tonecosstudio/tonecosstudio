/**
 * DeliveryManagement
 * 
 * Admin page for managing all deliveries across subscriptions and standalone purchases
 * Displays comprehensive table with filtering, search, and pagination
 * 
 * Requirements: 15.1, 15.2, 32.5
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Search, Package, ChevronLeft, ChevronRight, CheckSquare, Download, Printer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import SEOHead from '@/components/SEOHead';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DeliveryDetailModal } from '@/components/admin/DeliveryDetailModal';
import { BulkUpdateModal } from '@/components/admin/BulkUpdateModal';
import { getDeliveryDeadlineStatus, formatDeadlineStatus } from '@/lib/shipping-deadline';
import { ShippingService } from '@/services/shipping-service';
import { useToast } from '@/hooks/use-toast';

interface Delivery {
  id: string;
  subscription_id: string;
  cycle_id: string | null;
  delivery_number: number;
  status: string;
  expected_delivery_date: string | null;
  tracking_code: string | null;
  created_at: string;
  subscriptions: {
    user_id: string;
    collection_id: string;
    collections: {
      name: string;
    };
  } | null;
  cycles: {
    id: string;
    cycle_number: number;
    month: number;
    year: number;
  } | null;
}

const ITEMS_PER_PAGE = 50;

export default function DeliveryManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cycleFilter, setCycleFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDeliveryIds, setSelectedDeliveryIds] = useState<string[]>([]);
  const [isBulkUpdateModalOpen, setIsBulkUpdateModalOpen] = useState(false);
  const [isGeneratingLabels, setIsGeneratingLabels] = useState(false);
  const { toast } = useToast();
  const shippingService = new ShippingService();

  // Fetch all deliveries with related data
  const { data: deliveries, isLoading } = useQuery({
    queryKey: ['admin-deliveries'],
    queryFn: async () => {
      // First get deliveries with subscriptions and cycles
      const { data: deliveriesData, error: deliveriesError } = await supabase
        .from('subscription_deliveries')
        .select(`
          id,
          subscription_id,
          cycle_id,
          delivery_number,
          status,
          expected_delivery_date,
          tracking_code,
          created_at,
          subscriptions (
            user_id,
            collection_id,
            collections (
              name
            )
          ),
          cycles (
            id,
            cycle_number,
            month,
            year
          )
        `)
        .order('created_at', { ascending: false });

      if (deliveriesError) throw deliveriesError;

      // Get unique user IDs
      const userIds = [...new Set(deliveriesData?.map(d => d.subscriptions?.user_id).filter(Boolean))];

      // Fetch profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Create a map of profiles by user ID
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]));

      // Combine the data
      const enrichedDeliveries = deliveriesData?.map(delivery => ({
        ...delivery,
        profile: delivery.subscriptions?.user_id ? profilesMap.get(delivery.subscriptions.user_id) : null,
      }));

      return enrichedDeliveries as unknown as (Delivery & { profile: { full_name: string | null; email: string | null } | null })[];
    },
  });

  // Fetch all cycles for the cycle filter dropdown
  const { data: cycles } = useQuery({
    queryKey: ['admin-cycles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cycles')
        .select('id, cycle_number, month, year')
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .order('cycle_number', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Filter deliveries based on search and status
  const filteredDeliveries = deliveries?.filter((delivery) => {
    // Search filter - search by subscriber name, email, or order ID
    const subscriberName = delivery.profile?.full_name?.toLowerCase() || '';
    const subscriberEmail = delivery.profile?.email?.toLowerCase() || '';
    const orderId = delivery.id.toLowerCase();
    const searchLower = searchQuery.toLowerCase();
    
    const matchesSearch = 
      subscriberName.includes(searchLower) ||
      subscriberEmail.includes(searchLower) ||
      orderId.includes(searchLower);

    // Status filter
    const matchesStatus = 
      statusFilter === 'all' || delivery.status === statusFilter;

    // Cycle filter
    const matchesCycle = 
      cycleFilter === 'all' || delivery.cycle_id === cycleFilter;

    // Date range filter (filter by expected_delivery_date or created_at)
    let matchesDateRange = true;
    if (dateFrom || dateTo) {
      const deliveryDate = delivery.expected_delivery_date 
        ? new Date(delivery.expected_delivery_date)
        : new Date(delivery.created_at);
      
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        matchesDateRange = matchesDateRange && deliveryDate >= fromDate;
      }
      
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        matchesDateRange = matchesDateRange && deliveryDate <= toDate;
      }
    }

    return matchesSearch && matchesStatus && matchesCycle && matchesDateRange;
  });

  // Pagination
  const totalPages = Math.ceil((filteredDeliveries?.length || 0) / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedDeliveries = filteredDeliveries?.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleCycleChange = (value: string) => {
    setCycleFilter(value);
    setCurrentPage(1);
  };

  const handleDateFromChange = (value: string) => {
    setDateFrom(value);
    setCurrentPage(1);
  };

  const handleDateToChange = (value: string) => {
    setDateTo(value);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setCycleFilter('all');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  };

  // Checkbox selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked && paginatedDeliveries) {
      setSelectedDeliveryIds(paginatedDeliveries.map(d => d.id));
    } else {
      setSelectedDeliveryIds([]);
    }
  };

  const handleSelectDelivery = (deliveryId: string, checked: boolean) => {
    if (checked) {
      setSelectedDeliveryIds(prev => [...prev, deliveryId]);
    } else {
      setSelectedDeliveryIds(prev => prev.filter(id => id !== deliveryId));
    }
  };

  const isAllSelected = paginatedDeliveries && paginatedDeliveries.length > 0 && 
    paginatedDeliveries.every(d => selectedDeliveryIds.includes(d.id));

  const handleBulkUpdateSuccess = () => {
    setSelectedDeliveryIds([]);
  };

  /**
   * Generate batch labels for selected deliveries
   * Requirements: 18.9
   */
  const handleGenerateBatchLabels = async () => {
    if (selectedDeliveryIds.length === 0) {
      toast({
        title: 'Nenhuma entrega selecionada',
        description: 'Selecione pelo menos uma entrega para gerar etiquetas.',
        variant: 'destructive',
      });
      return;
    }

    setIsGeneratingLabels(true);

    try {
      const result = await shippingService.generateBatchLabels(selectedDeliveryIds);

      // Show results
      if (result.successful.length > 0 && result.failed.length === 0) {
        // All successful
        toast({
          title: 'Etiquetas geradas com sucesso',
          description: `${result.successful.length} etiqueta(s) gerada(s) com sucesso.`,
        });

        // Open all label URLs in new tabs
        result.successful.forEach((item) => {
          window.open(item.labelUrl, '_blank');
        });

        // Clear selection
        setSelectedDeliveryIds([]);
      } else if (result.successful.length > 0 && result.failed.length > 0) {
        // Partial success
        toast({
          title: 'Etiquetas geradas parcialmente',
          description: `${result.successful.length} etiqueta(s) gerada(s) com sucesso. ${result.failed.length} falhou(ram).`,
          variant: 'default',
        });

        // Open successful label URLs
        result.successful.forEach((item) => {
          window.open(item.labelUrl, '_blank');
        });

        // Show failed deliveries
        console.error('Failed deliveries:', result.failed);
      } else {
        // All failed
        toast({
          title: 'Erro ao gerar etiquetas',
          description: `Falha ao gerar todas as ${result.failed.length} etiqueta(s). Verifique o console para detalhes.`,
          variant: 'destructive',
        });
        console.error('Failed deliveries:', result.failed);
      }
    } catch (error) {
      console.error('Error generating batch labels:', error);
      toast({
        title: 'Erro ao gerar etiquetas',
        description: error instanceof Error ? error.message : 'Erro desconhecido ao gerar etiquetas em lote.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingLabels(false);
    }
  };

  /**
   * Export filtered deliveries to CSV
   * Generates CSV with all relevant fields and downloads with timestamp in filename
   * Requirements: 15.9
   */
  const handleExportCSV = () => {
    if (!filteredDeliveries || filteredDeliveries.length === 0) {
      return;
    }

    // Define CSV headers
    const headers = [
      'ID da Entrega',
      'Nome do Assinante',
      'Email do Assinante',
      'Coleção',
      'Ciclo',
      'Número da Entrega',
      'Status',
      'Data Esperada',
      'Data de Criação',
      'Código de Rastreamento',
      'Prazo de Envio',
      'Status do Prazo'
    ];

    // Convert deliveries to CSV rows
    const rows = filteredDeliveries.map(delivery => {
      const cycleInfo = delivery.cycles 
        ? `Ciclo ${delivery.cycles.cycle_number} - ${format(new Date(delivery.cycles.year, delivery.cycles.month - 1), 'MMM/yyyy', { locale: ptBR })}`
        : '-';

      // Calculate deadline status
      let deadlineDate = '-';
      let deadlineStatus = '-';
      if (delivery.cycles) {
        const { month, year } = delivery.cycles;
        const deadline = getDeliveryDeadlineStatus(month, year, delivery.status, []);
        deadlineDate = format(deadline.deadline, 'dd/MM/yyyy', { locale: ptBR });
        deadlineStatus = deadline.isOverdue ? 'Atrasado' : 'No Prazo';
      }

      // Get status label
      const statusLabels: Record<string, string> = {
        scheduled: 'Agendado',
        pending_choice: 'Aguardando Escolha',
        confirmed: 'Confirmado',
        in_production: 'Em Produção',
        shipped: 'Enviado',
        delivered: 'Entregue',
        revealed: 'Revelado',
      };

      return [
        delivery.id,
        delivery.profile?.full_name || 'Nome não disponível',
        delivery.profile?.email || 'Email não disponível',
        delivery.subscriptions?.collections?.name || 'Coleção não disponível',
        cycleInfo,
        delivery.delivery_number.toString(),
        statusLabels[delivery.status] || delivery.status,
        delivery.expected_delivery_date 
          ? format(new Date(delivery.expected_delivery_date), 'dd/MM/yyyy', { locale: ptBR })
          : '-',
        format(new Date(delivery.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
        delivery.tracking_code || '-',
        deadlineDate,
        deadlineStatus
      ];
    });

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => {
        // Escape cells that contain commas, quotes, or newlines
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    // Generate filename with timestamp
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    const filename = `entregas_${timestamp}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; label: string }> = {
      scheduled: { className: 'bg-gray-100 text-gray-800 border-gray-300', label: 'Agendado' },
      pending_choice: { className: 'bg-yellow-100 text-yellow-800 border-yellow-300', label: 'Aguardando Escolha' },
      confirmed: { className: 'bg-blue-100 text-blue-800 border-blue-300', label: 'Confirmado' },
      in_production: { className: 'bg-purple-100 text-purple-800 border-purple-300', label: 'Em Produção' },
      shipped: { className: 'bg-green-100 text-green-800 border-green-300', label: 'Enviado' },
      delivered: { className: 'bg-emerald-100 text-emerald-800 border-emerald-300', label: 'Entregue' },
      revealed: { className: 'bg-indigo-100 text-indigo-800 border-indigo-300', label: 'Revelado' },
    };

    const config = variants[status] || { className: 'bg-gray-100 text-gray-800 border-gray-300', label: status };
    return (
      <Badge className={config.className} variant="outline">
        {config.label}
      </Badge>
    );
  };

  const formatCycleInfo = (cycles: Delivery['cycles']) => {
    if (!cycles) return '-';
    return `Ciclo ${cycles.cycle_number} - ${format(new Date(cycles.year, cycles.month - 1), 'MMM/yyyy', { locale: ptBR })}`;
  };

  const renderDeadlineStatus = (delivery: Delivery) => {
    // If no cycle information, can't calculate deadline
    if (!delivery.cycles) {
      return <span className="text-muted-foreground">-</span>;
    }

    const { month, year } = delivery.cycles;
    const deadlineStatus = getDeliveryDeadlineStatus(month, year, delivery.status, []);
    const statusText = formatDeadlineStatus(deadlineStatus);

    // Format the deadline date
    const deadlineDate = format(deadlineStatus.deadline, 'dd/MM/yyyy', { locale: ptBR });

    if (deadlineStatus.isOverdue) {
      return (
        <div className="text-sm">
          <div className="font-medium text-red-600">{statusText}</div>
          <div className="text-xs text-muted-foreground">Prazo: {deadlineDate}</div>
        </div>
      );
    } else {
      return (
        <div className="text-sm">
          <div className="font-medium text-green-600">{statusText}</div>
          <div className="text-xs text-muted-foreground">Prazo: {deadlineDate}</div>
        </div>
      );
    }
  };

  const handleRowClick = (deliveryId: string) => {
    setSelectedDeliveryId(deliveryId);
    setIsModalOpen(true);
  };

  const handleModalClose = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) {
      setSelectedDeliveryId(null);
    }
  };

  // Get profile data for selected delivery
  const selectedDeliveryProfile = selectedDeliveryId 
    ? deliveries?.find(d => d.id === selectedDeliveryId)?.profile 
    : null;

  return (
    <>
      <SEOHead
        title="Admin - Gerenciamento de Entregas"
        description="Gerenciar entregas do sistema"
        noindex={true}
      />

      <AdminLayout>
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight mb-2">Gerenciamento de Entregas</h1>
              <p className="text-lg text-muted-foreground">
                Visualize e gerencie todas as entregas de assinaturas e compras avulsas
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Entregas</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{deliveries?.length || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Agendadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">
                {deliveries?.filter(d => d.status === 'scheduled').length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Em Produção</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {deliveries?.filter(d => d.status === 'in_production').length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Enviadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {deliveries?.filter(d => d.status === 'shipped' || d.status === 'delivered').length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Buscar e Filtrar</CardTitle>
            <CardDescription>Use os controles abaixo para encontrar entregas específicas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              {/* First Row: Search and Status */}
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search Input */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome do assinante, email ou ID do pedido..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="scheduled">Agendado</SelectItem>
                    <SelectItem value="pending_choice">Aguardando Escolha</SelectItem>
                    <SelectItem value="confirmed">Confirmado</SelectItem>
                    <SelectItem value="in_production">Em Produção</SelectItem>
                    <SelectItem value="shipped">Enviado</SelectItem>
                    <SelectItem value="delivered">Entregue</SelectItem>
                    <SelectItem value="revealed">Revelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Second Row: Cycle and Date Range */}
              <div className="flex flex-col md:flex-row gap-4">
                {/* Cycle Filter */}
                <Select value={cycleFilter} onValueChange={handleCycleChange}>
                  <SelectTrigger className="w-full md:w-[250px]">
                    <SelectValue placeholder="Ciclo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Ciclos</SelectItem>
                    {cycles?.map((cycle) => (
                      <SelectItem key={cycle.id} value={cycle.id}>
                        Ciclo {cycle.cycle_number} - {format(new Date(cycle.year, cycle.month - 1), 'MMM/yyyy', { locale: ptBR })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Date From */}
                <div className="flex-1">
                  <Input
                    type="date"
                    placeholder="Data inicial"
                    value={dateFrom}
                    onChange={(e) => handleDateFromChange(e.target.value)}
                  />
                </div>

                {/* Date To */}
                <div className="flex-1">
                  <Input
                    type="date"
                    placeholder="Data final"
                    value={dateTo}
                    onChange={(e) => handleDateToChange(e.target.value)}
                  />
                </div>

                {/* Clear Filters Button */}
                {(searchQuery || statusFilter !== 'all' || cycleFilter !== 'all' || dateFrom || dateTo) && (
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                    className="w-full md:w-auto"
                  >
                    Limpar Filtros
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Deliveries Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Entregas ({filteredDeliveries?.length || 0})</CardTitle>
                <CardDescription>
                  Lista completa de todas as entregas cadastradas no sistema
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {selectedDeliveryIds.length > 0 && (
                  <>
                    <Button
                      onClick={handleGenerateBatchLabels}
                      disabled={isGeneratingLabels}
                      className="gap-2"
                      variant="default"
                    >
                      <Printer className="h-4 w-4" />
                      {isGeneratingLabels ? 'Gerando...' : `Imprimir Etiquetas (${selectedDeliveryIds.length})`}
                    </Button>
                    <Button
                      onClick={() => setIsBulkUpdateModalOpen(true)}
                      className="gap-2"
                      variant="secondary"
                    >
                      <CheckSquare className="h-4 w-4" />
                      Atualizar em Massa ({selectedDeliveryIds.length})
                    </Button>
                  </>
                )}
                <Button
                  onClick={handleExportCSV}
                  variant="outline"
                  className="gap-2"
                  disabled={!filteredDeliveries || filteredDeliveries.length === 0}
                >
                  <Download className="h-4 w-4" />
                  Exportar CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando entregas...
              </div>
            ) : paginatedDeliveries && paginatedDeliveries.length > 0 ? (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">
                          <Checkbox
                            checked={isAllSelected}
                            onCheckedChange={handleSelectAll}
                            aria-label="Selecionar todas"
                          />
                        </TableHead>
                        <TableHead>ID do Pedido</TableHead>
                        <TableHead>Assinante</TableHead>
                        <TableHead>Coleção</TableHead>
                        <TableHead>Ciclo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data Esperada</TableHead>
                        <TableHead>Prazo de Envio</TableHead>
                        <TableHead>Rastreamento</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedDeliveries.map((delivery) => {
                        const isOverdue = delivery.cycles 
                          ? getDeliveryDeadlineStatus(delivery.cycles.month, delivery.cycles.year, delivery.status, []).isOverdue
                          : false;
                        const isSelected = selectedDeliveryIds.includes(delivery.id);
                        
                        return (
                          <TableRow 
                            key={delivery.id}
                            className={`cursor-pointer hover:bg-muted/50 transition-colors ${
                              isOverdue ? 'bg-red-50 hover:bg-red-100' : ''
                            }`}
                          >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => handleSelectDelivery(delivery.id, checked as boolean)}
                              aria-label={`Selecionar entrega ${delivery.id}`}
                            />
                          </TableCell>
                          <TableCell onClick={() => handleRowClick(delivery.id)}>
                            <div className="font-mono text-xs">
                              {delivery.id.substring(0, 8)}...
                            </div>
                          </TableCell>
                          <TableCell onClick={() => handleRowClick(delivery.id)}>
                            <div>
                              <div className="font-medium">
                                {delivery.profile?.full_name || 'Nome não disponível'}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {delivery.profile?.email || 'Email não disponível'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell onClick={() => handleRowClick(delivery.id)}>
                            <div className="font-medium">
                              {delivery.subscriptions?.collections?.name || 'Coleção não disponível'}
                            </div>
                          </TableCell>
                          <TableCell onClick={() => handleRowClick(delivery.id)}>
                            <div className="text-sm">
                              {formatCycleInfo(delivery.cycles)}
                            </div>
                          </TableCell>
                          <TableCell onClick={() => handleRowClick(delivery.id)}>
                            {getStatusBadge(delivery.status)}
                          </TableCell>
                          <TableCell onClick={() => handleRowClick(delivery.id)}>
                            {delivery.expected_delivery_date ? (
                              <div className="text-sm">
                                {format(new Date(delivery.expected_delivery_date), 'dd/MM/yyyy', { locale: ptBR })}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell onClick={() => handleRowClick(delivery.id)}>
                            {renderDeadlineStatus(delivery)}
                          </TableCell>
                          <TableCell onClick={() => handleRowClick(delivery.id)}>
                            {delivery.tracking_code ? (
                              <div className="font-mono text-xs">
                                {delivery.tracking_code}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Mostrando {startIndex + 1} a {Math.min(endIndex, filteredDeliveries?.length || 0)} de {filteredDeliveries?.length || 0} entregas
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                      </Button>
                      <div className="text-sm">
                        Página {currentPage} de {totalPages}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Próxima
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery || statusFilter !== 'all' || cycleFilter !== 'all' || dateFrom || dateTo
                  ? 'Nenhuma entrega encontrada com os filtros aplicados.'
                  : 'Nenhuma entrega cadastrada ainda.'}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delivery Detail Modal */}
        <DeliveryDetailModal
          deliveryId={selectedDeliveryId}
          open={isModalOpen}
          onOpenChange={handleModalClose}
          profileData={selectedDeliveryProfile}
        />

        {/* Bulk Update Modal */}
        <BulkUpdateModal
          open={isBulkUpdateModalOpen}
          onOpenChange={setIsBulkUpdateModalOpen}
          selectedDeliveryIds={selectedDeliveryIds}
          onSuccess={handleBulkUpdateSuccess}
        />
      </AdminLayout>
    </>
  );
}
