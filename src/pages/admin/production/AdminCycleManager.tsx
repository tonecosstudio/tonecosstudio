/**
 * AdminCycleManager
 *
 * Painel administrativo para gerenciar ciclos de produção
 * Usa a tabela real `cycles` do banco de dados
 */

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Package, TrendingUp, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { adminProductionGateway as supabase } from '@/services/admin/admin-production-gateway';
import { useState } from 'react';

export default function AdminCycleManager() {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Fetch cycles from real table
  const { data: cycles, isLoading } = useQuery({
    queryKey: ['admin-cycles', selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cycles')
        .select('*')
        .eq('year', selectedYear)
        .order('month', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
      planning: { variant: 'outline', label: 'Planejamento' },
      active: { variant: 'default', label: 'Ativo' },
      production: { variant: 'secondary', label: 'Produção' },
      shipping: { variant: 'secondary', label: 'Envio' },
      completed: { variant: 'outline', label: 'Concluído' },
      closed: { variant: 'destructive', label: 'Fechado' },
    };
    const config = variants[status] || { variant: 'outline' as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getCapacityIndicator = (used: number, max: number) => {
    if (!max || max === 0) return <span className="text-muted-foreground text-sm">N/A</span>;
    const percentage = (used / max) * 100;
    const color = percentage >= 90 ? 'text-red-600' : percentage >= 70 ? 'text-yellow-600' : 'text-green-600';

    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-muted rounded-full h-2 min-w-[60px]">
          <div
            className={`h-2 rounded-full ${
              percentage >= 90 ? 'bg-destructive' : percentage >= 70 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        <span className={`text-sm font-medium ${color}`}>
          {used}/{max}
        </span>
      </div>
    );
  };

  const activeCycles = cycles?.filter(c => c.status === 'active') || [];
  const totalCapacity = cycles?.reduce((sum, c) => sum + (c.capacity || 0), 0) || 0;
  const totalUsed = cycles?.reduce((sum, c) => sum + (c.used_capacity || 0), 0) || 0;
  const criticalCycles = cycles?.filter(c => c.capacity && c.used_capacity && (c.used_capacity / c.capacity) >= 0.9) || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Gestão de Ciclos</h1>
        <p className="text-muted-foreground">
          Gerencie ciclos de produção e monitore capacidade
        </p>
      </div>

      {/* Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1 max-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Ano</label>
              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => 2025 + i).map((year) => (
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ciclos Ativos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCycles.length}</div>
            <p className="text-xs text-muted-foreground">de {cycles?.length || 0} ciclos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Capacidade Total</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCapacity}</div>
            <p className="text-xs text-muted-foreground">{totalUsed} usado(s)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Uso</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalCapacity > 0 ? Math.round((totalUsed / totalCapacity) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">capacidade utilizada</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{criticalCycles.length}</div>
            <p className="text-xs text-muted-foreground">capacidade crítica (≥90%)</p>
          </CardContent>
        </Card>
      </div>

      {/* Cycles Table */}
      <Card>
        <CardHeader>
          <CardTitle>Ciclos de {selectedYear}</CardTitle>
          <CardDescription>
            Visualize e gerencie os ciclos de produção
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : !cycles || cycles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum ciclo encontrado para {selectedYear}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Mês</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Capacidade</TableHead>
                  <TableHead>Data de Corte</TableHead>
                  <TableHead>Envio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cycles.map((cycle) => (
                  <TableRow key={cycle.id}>
                    <TableCell className="font-medium">{cycle.name}</TableCell>
                    <TableCell>
                      {format(new Date(cycle.year, cycle.month - 1), 'MMMM', { locale: ptBR })}
                    </TableCell>
                    <TableCell>{getStatusBadge(cycle.status)}</TableCell>
                    <TableCell className="min-w-[150px]">
                      {getCapacityIndicator(cycle.used_capacity || 0, cycle.capacity || 0)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {cycle.cutoff_date
                        ? format(new Date(cycle.cutoff_date), 'dd/MM/yyyy', { locale: ptBR })
                        : '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {cycle.shipping_start_date
                        ? format(new Date(cycle.shipping_start_date), 'dd/MM/yyyy', { locale: ptBR })
                        : '-'}
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
