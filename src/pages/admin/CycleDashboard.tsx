/**
 * CycleDashboard
 * 
 * Dashboard de ciclos para administradores
 * Exibe informações sobre Ciclo 1 e Ciclo 2 do mês atual/selecionado
 * 
 * Requirements: 13.1
 */

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Calendar, Package } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { timezoneService } from '@/lib/services/timezoneService';
import { CutoffCountdown } from '@/components/CutoffCountdown';
import { CollectionBreakdown } from '@/components/admin/CollectionBreakdown';
import { PendingChoicesList } from '@/components/admin/PendingChoicesList';
import { useToast } from '@/hooks/use-toast';

interface Cycle {
  id: string;
  cycle_number: 1 | 2;
  month: number;
  year: number;
  open_start: string;
  open_end: string;
  production_start: string;
  production_end: string;
  shipping_date: string;
  status: 'open' | 'production' | 'shipping' | 'completed';
  status_changed_at: string | null;
  capacity_max: number;
  capacity_current: number;
}

interface CollectionBreakdown {
  collection_id: string;
  collection_name: string;
  count: number;
}

export default function CycleDashboard() {
  const [searchParams] = useSearchParams();
  const now = timezoneService.getCurrentTime();
  const systemDate = timezoneService.toSystemTimezone(now);
  
  // Get month/year from URL params or default to current
  const monthParam = searchParams.get('month');
  const yearParam = searchParams.get('year');
  
  const [selectedMonth, setSelectedMonth] = useState<number>(
    monthParam ? parseInt(monthParam) : timezoneService.getMonth(systemDate)
  );
  const [selectedYear, setSelectedYear] = useState<number>(
    yearParam ? parseInt(yearParam) : timezoneService.getYear(systemDate)
  );
  
  // Update state when URL params change
  useEffect(() => {
    if (monthParam) setSelectedMonth(parseInt(monthParam));
    if (yearParam) setSelectedYear(parseInt(yearParam));
  }, [monthParam, yearParam]);
  
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    cycleId: string;
    currentStatus: Cycle['status'];
    newStatus: Cycle['status'];
  }>({
    open: false,
    cycleId: '',
    currentStatus: 'open',
    newStatus: 'production',
  });
  
  const { toast } = useToast();

  // Fetch cycles for selected month
  const { data: cycles, isLoading: cyclesLoading, refetch: refetchCycles } = useQuery({
    queryKey: ['cycles', selectedMonth, selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cycles')
        .select('*')
        .eq('month', selectedMonth)
        .eq('year', selectedYear)
        .order('cycle_number', { ascending: true });
      
      if (error) throw error;
      return (data as Cycle[]) || [];
    },
  });

  // Fetch collection breakdown for each cycle
  const { data: collectionBreakdowns } = useQuery({
    queryKey: ['collection-breakdowns', cycles?.map(c => c.id)],
    queryFn: async () => {
      if (!cycles || cycles.length === 0) return {};
      
      const breakdowns: Record<string, CollectionBreakdown[]> = {};
      
      for (const cycle of cycles) {
        // Get deliveries for this cycle grouped by collection
        const { data: deliveries, error } = await supabase
          .from('subscription_deliveries')
          .select(`
            collection_id,
            collections (
              id,
              name
            )
          `)
          .eq('cycle_id', cycle.id)
          .not('collection_id', 'is', null);
        
        if (error) throw error;
        
        // Count by collection
        const counts: Record<string, { name: string; count: number }> = {};
        deliveries?.forEach((delivery: any) => {
          const collectionId = delivery.collection_id;
          const collectionName = delivery.collections?.name || 'Desconhecida';
          
          if (!counts[collectionId]) {
            counts[collectionId] = { name: collectionName, count: 0 };
          }
          counts[collectionId].count++;
        });
        
        breakdowns[cycle.id] = Object.entries(counts).map(([id, data]) => ({
          collection_id: id,
          collection_name: data.name,
          count: data.count,
        }));
      }
      
      return breakdowns;
    },
    enabled: !!cycles && cycles.length > 0,
  });

  // Check if we should show cutoff countdown (only for current month)
  const shouldShowCutoff = () => {
    const currentBahiaTime = timezoneService.toSystemTimezone(timezoneService.getCurrentTime());
    const currentMonth = timezoneService.getMonth(currentBahiaTime);
    const currentYear = timezoneService.getYear(currentBahiaTime);
    
    return currentMonth === selectedMonth && currentYear === selectedYear;
  };

  // Status badge styling
  const getStatusBadge = (status: Cycle['status']) => {
    const variants = {
      open: { className: 'bg-green-100 text-green-800 border-green-300', label: 'Aberto' },
      production: { className: 'bg-blue-100 text-blue-800 border-blue-300', label: 'Produção' },
      shipping: { className: 'bg-yellow-100 text-yellow-800 border-yellow-300', label: 'Envio' },
      completed: { className: 'bg-gray-100 text-gray-800 border-gray-300', label: 'Concluído' },
    };
    
    const config = variants[status];
    return (
      <Badge className={config.className} variant="outline">
        {config.label}
      </Badge>
    );
  };

  // Capacity percentage
  const getCapacityPercentage = (current: number, max: number) => {
    return Math.round((current / max) * 100);
  };

  // Capacity color
  const getCapacityColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // Validate state machine transition
  const isValidTransition = (currentStatus: Cycle['status'], newStatus: Cycle['status']): boolean => {
    const validTransitions: Record<Cycle['status'], Cycle['status'][]> = {
      open: ['production'],
      production: ['shipping'],
      shipping: ['completed'],
      completed: [],
    };
    
    return validTransitions[currentStatus]?.includes(newStatus) || false;
  };

  // Get transition label
  const getTransitionLabel = (newStatus: Cycle['status']): string => {
    const labels: Record<Cycle['status'], string> = {
      open: 'Abrir',
      production: 'Iniciar Produção',
      shipping: 'Iniciar Envio',
      completed: 'Marcar Concluído',
    };
    
    return labels[newStatus] || newStatus;
  };

  // Get transition description
  const getTransitionDescription = (currentStatus: Cycle['status'], newStatus: Cycle['status']): string => {
    const descriptions: Record<string, string> = {
      'open-production': 'Isso bloqueará novas compras e alterações de coleção. Tem certeza que deseja iniciar a produção?',
      'production-shipping': 'Isso marcará a produção como concluída e iniciará o processo de envio. Confirmar?',
      'shipping-completed': 'Isso marcará o ciclo como concluído. Esta ação não pode ser desfeita. Confirmar?',
    };
    
    return descriptions[`${currentStatus}-${newStatus}`] || 'Tem certeza que deseja fazer esta transição?';
  };

  // Open confirmation dialog
  const openConfirmDialog = (cycleId: string, currentStatus: Cycle['status'], newStatus: Cycle['status']) => {
    if (!isValidTransition(currentStatus, newStatus)) {
      toast({
        title: 'Transição inválida',
        description: `Não é possível transicionar de "${currentStatus}" para "${newStatus}". Verifique o fluxo de estados.`,
        variant: 'destructive',
      });
      return;
    }
    
    setConfirmDialog({
      open: true,
      cycleId,
      currentStatus,
      newStatus,
    });
  };

  // Handle status transition
  const handleStatusTransition = async () => {
    const { cycleId, newStatus } = confirmDialog;
    
    try {
      const { error } = await supabase
        .from('cycles')
        .update({
          status: newStatus,
          status_changed_at: new Date().toISOString(),
        })
        .eq('id', cycleId);
      
      if (error) throw error;
      
      toast({
        title: 'Status atualizado',
        description: `Ciclo transicionado para "${getTransitionLabel(newStatus)}" com sucesso.`,
      });
      
      refetchCycles();
    } catch (error) {
      console.error('Erro ao atualizar status do ciclo:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status do ciclo. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setConfirmDialog({ ...confirmDialog, open: false });
    }
  };

  // Export cycle data as CSV with detailed information
  // Requirements: 13.8
  const handleExportCSV = async () => {
    if (!cycles || cycles.length === 0) return;
    
    try {
      // Fetch detailed data for all cycles
      const cycleDataPromises = cycles.map(async (cycle) => {
        // Get deliveries for this cycle
        const { data: deliveries } = await supabase
          .from('subscription_deliveries')
          .select(`
            id,
            collection_id,
            status,
            collections (name)
          `)
          .eq('cycle_id', cycle.id)
          .not('collection_id', 'is', null);
        
        // Get standalone purchases for this cycle
        const { data: purchases } = await supabase
          .from('standalone_purchases')
          .select(`
            id,
            collection_id,
            status,
            collections (name)
          `)
          .eq('cycle_id', cycle.id)
          .not('status', 'eq', 'cancelled');
        
        // Calculate collection breakdown
        const collectionMap = new Map<string, { name: string; deliveries: number; purchases: number }>();
        
        deliveries?.forEach((delivery: any) => {
          const collectionName = delivery.collections?.name || 'Desconhecida';
          if (!collectionMap.has(collectionName)) {
            collectionMap.set(collectionName, { name: collectionName, deliveries: 0, purchases: 0 });
          }
          collectionMap.get(collectionName)!.deliveries++;
        });
        
        purchases?.forEach((purchase: any) => {
          const collectionName = purchase.collections?.name || 'Desconhecida';
          if (!collectionMap.has(collectionName)) {
            collectionMap.set(collectionName, { name: collectionName, deliveries: 0, purchases: 0 });
          }
          collectionMap.get(collectionName)!.purchases++;
        });
        
        return {
          cycle,
          deliveriesCount: deliveries?.length || 0,
          purchasesCount: purchases?.length || 0,
          collectionBreakdown: Array.from(collectionMap.values()),
        };
      });
      
      const cycleData = await Promise.all(cycleDataPromises);
      
      // Build CSV content
      const csvLines: string[] = [];
      
      // Add header
      csvLines.push('RELATÓRIO DE CICLOS DE PRODUÇÃO');
      csvLines.push(`Período: ${format(new Date(selectedYear, selectedMonth - 1), 'MMMM yyyy', { locale: ptBR })}`);
      csvLines.push(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}`);
      csvLines.push('');
      
      // Add data for each cycle
      cycleData.forEach(({ cycle, deliveriesCount, purchasesCount, collectionBreakdown }) => {
        csvLines.push(`CICLO ${cycle.cycle_number}`);
        csvLines.push('');
        
        // Basic info
        csvLines.push('INFORMAÇÕES GERAIS');
        csvLines.push(`Status,${cycle.status}`);
        csvLines.push(`Período de Pedidos,${format(new Date(cycle.open_start), 'dd/MM/yyyy HH:mm')} até ${format(new Date(cycle.open_end), 'dd/MM/yyyy HH:mm')}`);
        csvLines.push(`Período de Produção,${format(new Date(cycle.production_start), 'dd/MM/yyyy HH:mm')} até ${format(new Date(cycle.production_end), 'dd/MM/yyyy HH:mm')}`);
        csvLines.push(`Data de Envio,${format(new Date(cycle.shipping_date), 'dd/MM/yyyy')}`);
        csvLines.push('');
        
        // Capacity usage
        const capacityPercentage = getCapacityPercentage(cycle.capacity_current, cycle.capacity_max);
        csvLines.push('USO DE CAPACIDADE');
        csvLines.push(`Capacidade Atual,${cycle.capacity_current}`);
        csvLines.push(`Capacidade Máxima,${cycle.capacity_max}`);
        csvLines.push(`Percentual Utilizado,${capacityPercentage}%`);
        csvLines.push(`Capacidade Disponível,${cycle.capacity_max - cycle.capacity_current}`);
        csvLines.push('');
        
        // Deliveries and purchases summary
        csvLines.push('RESUMO DE PEDIDOS');
        csvLines.push(`Entregas de Assinatura,${deliveriesCount}`);
        csvLines.push(`Compras Avulsas,${purchasesCount}`);
        csvLines.push(`Total de Peças,${deliveriesCount + purchasesCount}`);
        csvLines.push('');
        
        // Collection breakdown
        if (collectionBreakdown.length > 0) {
          csvLines.push('DISTRIBUIÇÃO POR COLEÇÃO');
          csvLines.push('Coleção,Entregas de Assinatura,Compras Avulsas,Total');
          
          collectionBreakdown.forEach((item) => {
            const total = item.deliveries + item.purchases;
            csvLines.push(`${item.name},${item.deliveries},${item.purchases},${total}`);
          });
          
          // Add totals row
          const totalDeliveries = collectionBreakdown.reduce((sum, item) => sum + item.deliveries, 0);
          const totalPurchases = collectionBreakdown.reduce((sum, item) => sum + item.purchases, 0);
          csvLines.push(`TOTAL,${totalDeliveries},${totalPurchases},${totalDeliveries + totalPurchases}`);
        } else {
          csvLines.push('DISTRIBUIÇÃO POR COLEÇÃO');
          csvLines.push('Nenhuma peça em produção para este ciclo');
        }
        
        csvLines.push('');
        csvLines.push('---');
        csvLines.push('');
      });
      
      // Create and download CSV file
      const csv = csvLines.join('\n');
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel compatibility
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `cycle-${selectedMonth}-${selectedYear}-${cycles.map(c => c.cycle_number).join('-')}.csv`;
      link.click();
      
      toast({
        title: 'CSV exportado',
        description: 'Os dados dos ciclos foram exportados com sucesso.',
      });
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      toast({
        title: 'Erro ao exportar',
        description: 'Não foi possível exportar os dados. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard de Ciclos</h1>
          <p className="text-muted-foreground">
            Monitore e gerencie os ciclos de produção
          </p>
        </div>
        <Button onClick={handleExportCSV} disabled={!cycles || cycles.length === 0}>
          Exportar CSV
        </Button>
      </div>

      {/* Month/Year Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Período</CardTitle>
          <CardDescription>Selecione o mês e ano para visualizar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Mês</label>
              <Select
                value={selectedMonth.toString()}
                onValueChange={(value) => setSelectedMonth(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                    <SelectItem key={month} value={month.toString()}>
                      {format(new Date(2026, month - 1), 'MMMM', { locale: ptBR })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Ano</label>
              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => 2026 + i).map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cutoff Countdown */}
      {shouldShowCutoff() && (
        <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-300 rounded-lg p-1">
          <CutoffCountdown variant="default" className="border-0 bg-transparent" />
        </div>
      )}

      {/* Loading State */}
      {cyclesLoading && (
        <div className="text-center py-8">Carregando ciclos...</div>
      )}

      {/* No Cycles Found */}
      {!cyclesLoading && (!cycles || cycles.length === 0) && (
        <Card>
          <CardContent className="text-center py-8 text-muted-foreground">
            Nenhum ciclo encontrado para {format(new Date(selectedYear, selectedMonth - 1), 'MMMM yyyy', { locale: ptBR })}
          </CardContent>
        </Card>
      )}

      {/* Cycle Cards */}
      {!cyclesLoading && cycles && cycles.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cycles.map((cycle) => {
            const capacityPercentage = getCapacityPercentage(cycle.capacity_current, cycle.capacity_max);
            const breakdown = collectionBreakdowns?.[cycle.id] || [];
            
            return (
              <Card key={cycle.id} className="border-2">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Ciclo {cycle.cycle_number}
                      </CardTitle>
                      <CardDescription>
                        {format(new Date(selectedYear, selectedMonth - 1), 'MMMM yyyy', { locale: ptBR })}
                      </CardDescription>
                    </div>
                    {getStatusBadge(cycle.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Capacity */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Capacidade</span>
                      <span className="text-sm font-bold">
                        {cycle.capacity_current} / {cycle.capacity_max} ({capacityPercentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all ${getCapacityColor(capacityPercentage)}`}
                        style={{ width: `${capacityPercentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Período de Pedidos:</span>
                      <div className="text-muted-foreground">
                        {format(new Date(cycle.open_start), 'dd/MM/yyyy HH:mm', { locale: ptBR })} até{' '}
                        {format(new Date(cycle.open_end), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">Período de Produção:</span>
                      <div className="text-muted-foreground">
                        {format(new Date(cycle.production_start), 'dd/MM/yyyy HH:mm', { locale: ptBR })} até{' '}
                        {format(new Date(cycle.production_end), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">Data de Envio:</span>
                      <div className="text-muted-foreground">
                        {format(new Date(cycle.shipping_date), 'dd/MM/yyyy', { locale: ptBR })}
                      </div>
                    </div>
                  </div>

                  {/* Collection Breakdown */}
                  {breakdown.length > 0 && (
                    <div>
                      <div className="font-medium text-sm mb-2 flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        Distribuição por Coleção
                      </div>
                      <div className="space-y-1">
                        {breakdown.map((item) => (
                          <div key={item.collection_id} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{item.collection_name}</span>
                            <span className="font-medium">{item.count} peças</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Status Transition Buttons */}
                  <div className="pt-2 border-t">
                    <div className="text-sm font-medium mb-2">Transição de Status</div>
                    <div className="flex gap-2 flex-wrap">
                      {cycle.status === 'open' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openConfirmDialog(cycle.id, cycle.status, 'production')}
                        >
                          Iniciar Produção
                        </Button>
                      )}
                      {cycle.status === 'production' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openConfirmDialog(cycle.id, cycle.status, 'shipping')}
                        >
                          Iniciar Envio
                        </Button>
                      )}
                      {cycle.status === 'shipping' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openConfirmDialog(cycle.id, cycle.status, 'completed')}
                        >
                          Marcar Concluído
                        </Button>
                      )}
                      {cycle.status === 'completed' && (
                        <div className="text-sm text-muted-foreground">
                          Ciclo concluído - sem transições disponíveis
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pending Choices */}
      {cycles && cycles.length > 0 && (
        <PendingChoicesList cycleIds={cycles.map(c => c.id)} />
      )}

      {/* Collection Breakdown for Each Cycle */}
      {!cyclesLoading && cycles && cycles.length > 0 && (
        <div className="space-y-6">
          {cycles.map((cycle) => (
            <CollectionBreakdown
              key={cycle.id}
              cycleId={cycle.id}
              cycleName={`Ciclo ${cycle.cycle_number} - ${format(new Date(selectedYear, selectedMonth - 1), 'MMMM yyyy', { locale: ptBR })}`}
            />
          ))}
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Transição de Status</AlertDialogTitle>
            <AlertDialogDescription>
              {getTransitionDescription(confirmDialog.currentStatus, confirmDialog.newStatus)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleStatusTransition}>
              {getTransitionLabel(confirmDialog.newStatus)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
