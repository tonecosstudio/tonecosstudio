/**
 * CollectionBreakdown Component
 *
 * Displays the distribution of pieces by collection in a specific cycle,
 * including both subscription deliveries and standalone purchases.
 * Shows data in both table and visual chart format.
 *
 * Requirements: 13.3, 13.7
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Package } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCollectionBreakdown } from '@/hooks/admin/useCollectionBreakdown';

interface CollectionBreakdownProps {
  cycleId: string;
  cycleName?: string;
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
  const { data: collectionData, isLoading } = useCollectionBreakdown(cycleId);

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
