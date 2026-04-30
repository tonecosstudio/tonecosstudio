// @ts-nocheck
/**
 * HistoricalCycles
 *
 * Exibe histórico de ciclos passados com métricas-chave
 * Permite filtrar por ano e status, ordenar por data
 * Links para visualização detalhada de cada ciclo
 *
 * Requirements: 13.9
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Calendar, TrendingUp, Package, ArrowUpDown } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { timezoneService } from '@/lib/services/timezoneService';
import { useNavigate } from 'react-router-dom';

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
  created_at: string;
}

type SortField = 'date' | 'capacity' | 'status';
type SortOrder = 'asc' | 'desc';

export function HistoricalCycles() {
  const navigate = useNavigate();
  const currentBahiaTime = timezoneService.toSystemTimezone(timezoneService.getCurrentTime());
  const currentYear = timezoneService.getYear(currentBahiaTime);

  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Fetch historical cycles (past cycles only)
  const { data: cycles, isLoading } = useQuery({
    queryKey: ['historical-cycles', selectedYear, selectedStatus],
    queryFn: async () => {
      let query = supabase
        .from('cycles')
        .select('*');

      // Filter by year if selected
      if (selectedYear !== 'all') {
        query = query.eq('year', selectedYear);
      }

      // Filter by status if selected
      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus);
      }

      // Only get past cycles (before current month)
      const currentMonth = timezoneService.getMonth(currentBahiaTime);
      query = query.or(`year.lt.${currentYear},and(year.eq.${currentYear},month.lt.${currentMonth})`);

      const { data, error } = await query;

      if (error) throw error;
      return (data as Cycle[]) || [];
    },
  });

  // Sort cycles
  const sortedCycles = cycles ? [...cycles].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case 'date':
        // Sort by year, then month, then cycle_number
        comparison = a.year - b.year || a.month - b.month || a.cycle_number - b.cycle_number;
        break;
      case 'capacity':
        const aPercentage = (a.capacity_current / a.capacity_max) * 100;
        const bPercentage = (b.capacity_current / b.capacity_max) * 100;
        comparison = aPercentage - bPercentage;
        break;
      case 'status':
        const statusOrder = { open: 0, production: 1, shipping: 2, completed: 3 };
        comparison = statusOrder[a.status] - statusOrder[b.status];
        break;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  }) : [];

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
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-green-600';
  };

  // Toggle sort
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Calculate statistics
  const stats = sortedCycles.reduce(
    (acc, cycle) => {
      acc.totalCycles++;
      acc.totalCapacity += cycle.capacity_current;
      acc.totalMaxCapacity += cycle.capacity_max;
      if (cycle.status === 'completed') acc.completedCycles++;
      return acc;
    },
    { totalCycles: 0, totalCapacity: 0, totalMaxCapacity: 0, completedCycles: 0 }
  );

  const avgCapacityUsage = stats.totalMaxCapacity > 0
    ? Math.round((stats.totalCapacity / stats.totalMaxCapacity) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="h-6 w-6" />
          Histórico de Ciclos
        </h2>
        <p className="text-muted-foreground">
          Visualize ciclos passados com métricas-chave
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de Ciclos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCycles}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ciclos Concluídos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedCycles}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Peças Produzidas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCapacity}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Uso Médio de Capacidade</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getCapacityColor(avgCapacityUsage)}`}>
              {avgCapacityUsage}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Ano</label>
              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => setSelectedYear(value === 'all' ? 'all' : parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os anos</SelectItem>
                  {Array.from({ length: 5 }, (_, i) => currentYear - i).map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select
                value={selectedStatus}
                onValueChange={setSelectedStatus}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="open">Aberto</SelectItem>
                  <SelectItem value="production">Produção</SelectItem>
                  <SelectItem value="shipping">Envio</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Historical Cycles Table */}
      <Card>
        <CardHeader>
          <CardTitle>Ciclos Passados</CardTitle>
          <CardDescription>
            {sortedCycles.length} {sortedCycles.length === 1 ? 'ciclo encontrado' : 'ciclos encontrados'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando histórico...
            </div>
          ) : sortedCycles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum ciclo encontrado com os filtros selecionados
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => toggleSort('date')}
                      >
                        Período
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>Ciclo</TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => toggleSort('status')}
                      >
                        Status
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => toggleSort('capacity')}
                      >
                        Capacidade
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>Data de Envio</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedCycles.map((cycle) => {
                    const capacityPercentage = getCapacityPercentage(cycle.capacity_current, cycle.capacity_max);

                    return (
                      <TableRow key={cycle.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="font-medium">
                            {format(new Date(cycle.year, cycle.month - 1), 'MMMM yyyy', { locale: ptBR })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            Ciclo {cycle.cycle_number}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(cycle.status)}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className={`font-medium ${getCapacityColor(capacityPercentage)}`}>
                              {cycle.capacity_current} / {cycle.capacity_max}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {capacityPercentage}% utilizado
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {format(new Date(cycle.shipping_date), 'dd/MM/yyyy', { locale: ptBR })}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-sm text-muted-foreground">
                            {cycle.status === 'completed' ? 'Concluído' : 'Em andamento'}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
