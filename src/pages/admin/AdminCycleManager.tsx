// @ts-nocheck
/**
 * AdminCycleManager
 * 
 * Painel administrativo para gerenciar ciclos de produção
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Package, TrendingUp, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  capacity_max: number;
  capacity_current: number;
}

export default function AdminCycleManager() {
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cycleNumberFilter, setCycleNumberFilter] = useState<string>("all");
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Status badge styling
  const getStatusBadge = (status: Cycle['status']) => {
    const variants = {
      open: { variant: 'default' as const, label: 'Aberto' },
      production: { variant: 'secondary' as const, label: 'Produção' },
      shipping: { variant: 'outline' as const, label: 'Envio' },
      completed: { variant: 'default' as const, label: 'Concluído' },
    };
    
    const config = variants[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Capacity indicator
  const getCapacityIndicator = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    const color = percentage >= 90 ? 'text-red-600' : percentage >= 70 ? 'text-yellow-600' : 'text-green-600';
    
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${
              percentage >= 90 ? 'bg-red-600' : percentage >= 70 ? 'bg-yellow-600' : 'bg-green-600'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className={`text-sm font-medium ${color}`}>
          {current}/{max}
        </span>
      </div>
    );
  };

  // Format date in Brazilian Portuguese
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  };

  const formatDateOnly = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Gestão de Ciclos</h1>
        <p className="text-muted-foreground">
          Gerencie ciclos de produção e monitore capacidade
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Selecione o período para visualizar</CardDescription>
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

            <div className="flex items-end">
              <Button onClick={() => {/* TODO: Load cycles */}}>
                Buscar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ciclos Ativos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">Ciclo 1 e Ciclo 2</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Capacidade Total</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">200</div>
            <p className="text-xs text-muted-foreground">100 por ciclo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assinaturas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Neste mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Capacidade crítica</p>
          </CardContent>
        </Card>
      </div>

      {/* Cycles Table */}
      <Card>
        <CardHeader>
          <CardTitle>Ciclos do Período</CardTitle>
          <CardDescription>
            Visualize e gerencie os ciclos de {format(new Date(selectedYear, selectedMonth - 1), 'MMMM yyyy', { locale: ptBR })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : cycles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum ciclo encontrado para este período
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ciclo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Período de Pedidos</TableHead>
                  <TableHead>Período de Produção</TableHead>
                  <TableHead>Data de Envio</TableHead>
                  <TableHead>Capacidade</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cycles.map((cycle) => (
                  <TableRow key={cycle.id}>
                    <TableCell className="font-medium">
                      Ciclo {cycle.cycle_number}
                    </TableCell>
                    <TableCell>{getStatusBadge(cycle.status)}</TableCell>
                    <TableCell className="text-sm">
                      <div>{formatDate(cycle.open_start)}</div>
                      <div className="text-muted-foreground">até {formatDate(cycle.open_end)}</div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>{formatDate(cycle.production_start)}</div>
                      <div className="text-muted-foreground">até {formatDate(cycle.production_end)}</div>
                    </TableCell>
                    <TableCell>{formatDateOnly(cycle.shipping_date)}</TableCell>
                    <TableCell>
                      {getCapacityIndicator(cycle.capacity_current, cycle.capacity_max)}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">
                        Ver Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
