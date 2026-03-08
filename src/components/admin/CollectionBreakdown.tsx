// @ts-nocheck
/**
 * CollectionBreakdown Component
 * 
 * Displays the distribution of pieces by collection in a specific cycle,
 * including both subscription deliveries and standalone purchases.
 * Shows data in both table and visual chart format.
 * 
 * Requirements: 13.3, 13.7
 */

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Package, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CollectionBreakdownProps {
  cycleId: string;
  cycleName?: string;
}

interface CollectionData {
  collection_id: string;
  collection_name: string;
  subscription_deliveries: number;
  standalone_purchases: number;
  total: number;
}

// Colors for pie chart
const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
];

export function CollectionBreakdown({ cycleId, cycleName }: CollectionBreakdownProps) {
  // Fetch collection breakdown data
  const { data: collectionData, isLoading } = useQuery({
    queryKey: ['collection-breakdown', cycleId],
    queryFn: async () => {
      // Query subscription deliveries by collection
      const { data: deliveries, error: deliveriesError } = await supabase
        .from('subscription_deliveries')
        .select(`
          collection_id,
          collections (
            id,
            name
          )
        `)
        .eq('cycle_id', cycleId)
        .not('collection_id', 'is', null);

      if (deliveriesError) throw deliveriesError;

      // Query standalone purchases by collection
      const { data: purchases, error: purchasesError } = await supabase
        .from('standalone_purchases')
        .select(`
          collection_id,
          collections (
            id,
            name
          )
        `)
        .eq('cycle_id', cycleId)
        .not('status', 'eq', 'cancelled');

      if (purchasesError) throw purchasesError;

      // Aggregate data by collection
      const collectionMap = new Map<string, CollectionData>();

      // Process deliveries
      deliveries?.forEach((delivery: any) => {
        const collectionId = delivery.collection_id;
        const collectionName = delivery.collections?.name || 'Desconhecida';

        if (!collectionMap.has(collectionId)) {
          collectionMap.set(collectionId, {
            collection_id: collectionId,
            collection_name: collectionName,
            subscription_deliveries: 0,
            standalone_purchases: 0,
            total: 0,
          });
        }

        const data = collectionMap.get(collectionId)!;
        data.subscription_deliveries++;
        data.total++;
      });

      // Process standalone purchases
      purchases?.forEach((purchase: any) => {
        const collectionId = purchase.collection_id;
        const collectionName = purchase.collections?.name || 'Desconhecida';

        if (!collectionMap.has(collectionId)) {
          collectionMap.set(collectionId, {
            collection_id: collectionId,
            collection_name: collectionName,
            subscription_deliveries: 0,
            standalone_purchases: 0,
            total: 0,
          });
        }

        const data = collectionMap.get(collectionId)!;
        data.standalone_purchases++;
        data.total++;
      });

      // Convert to array and sort by total descending
      return Array.from(collectionMap.values()).sort((a, b) => b.total - a.total);
    },
    enabled: !!cycleId,
  });

  // Calculate totals
  const totals = collectionData?.reduce(
    (acc, item) => ({
      subscription_deliveries: acc.subscription_deliveries + item.subscription_deliveries,
      standalone_purchases: acc.standalone_purchases + item.standalone_purchases,
      total: acc.total + item.total,
    }),
    { subscription_deliveries: 0, standalone_purchases: 0, total: 0 }
  );

  // Prepare data for charts
  const chartData = collectionData?.map((item) => ({
    name: item.collection_name,
    'Entregas de Assinatura': item.subscription_deliveries,
    'Compras Avulsas': item.standalone_purchases,
    total: item.total,
  }));

  const pieData = collectionData?.map((item) => ({
    name: item.collection_name,
    value: item.total,
  }));

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Carregando distribuição por coleção...
        </CardContent>
      </Card>
    );
  }

  if (!collectionData || collectionData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Distribuição por Coleção
          </CardTitle>
          {cycleName && <CardDescription>{cycleName}</CardDescription>}
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          Nenhuma peça em produção para este ciclo
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Distribuição por Coleção
        </CardTitle>
        {cycleName && <CardDescription>{cycleName}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-600 font-medium">Entregas de Assinatura</div>
            <div className="text-2xl font-bold text-blue-900">{totals?.subscription_deliveries || 0}</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-sm text-green-600 font-medium">Compras Avulsas</div>
            <div className="text-2xl font-bold text-green-900">{totals?.standalone_purchases || 0}</div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="text-sm text-purple-600 font-medium">Total de Peças</div>
            <div className="text-2xl font-bold text-purple-900">{totals?.total || 0}</div>
          </div>
        </div>

        {/* Table and Charts Tabs */}
        <Tabs defaultValue="table" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="table">Tabela</TabsTrigger>
            <TabsTrigger value="bar">Gráfico de Barras</TabsTrigger>
            <TabsTrigger value="pie">Gráfico de Pizza</TabsTrigger>
          </TabsList>

          {/* Table View */}
          <TabsContent value="table" className="mt-4">
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Coleção</TableHead>
                    <TableHead className="text-right">Entregas de Assinatura</TableHead>
                    <TableHead className="text-right">Compras Avulsas</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {collectionData.map((item) => (
                    <TableRow key={item.collection_id}>
                      <TableCell className="font-medium">{item.collection_name}</TableCell>
                      <TableCell className="text-right">{item.subscription_deliveries}</TableCell>
                      <TableCell className="text-right">{item.standalone_purchases}</TableCell>
                      <TableCell className="text-right font-bold">{item.total}</TableCell>
                    </TableRow>
                  ))}
                  {totals && (
                    <TableRow className="bg-muted/50 font-bold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">{totals.subscription_deliveries}</TableCell>
                      <TableCell className="text-right">{totals.standalone_purchases}</TableCell>
                      <TableCell className="text-right">{totals.total}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Bar Chart View */}
          <TabsContent value="bar" className="mt-4">
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={100}
                    interval={0}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Entregas de Assinatura" fill="#3b82f6" />
                  <Bar dataKey="Compras Avulsas" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          {/* Pie Chart View */}
          <TabsContent value="pie" className="mt-4">
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
