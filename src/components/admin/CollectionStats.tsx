// @ts-nocheck
/**
 * CollectionStats Component
 * 
 * Displays statistics for a specific collection including:
 * - Total pieces sold all-time (subscription deliveries + standalone purchases)
 * - Current month selections count
 * - Revenue generated
 * 
 * Requirements: 14.9
 */

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Package, DollarSign, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CollectionStatsProps {
  collectionId: string;
  collectionName?: string;
}

interface StatsData {
  totalPiecesSold: number;
  currentMonthSelections: number;
  totalRevenue: number;
  subscriptionDeliveries: number;
  standalonePurchases: number;
}

export function CollectionStats({ collectionId, collectionName }: CollectionStatsProps) {
  // Fetch collection statistics
  const { data: stats, isLoading } = useQuery({
    queryKey: ['collection-stats', collectionId],
    queryFn: async (): Promise<StatsData> => {
      // Get current month and year
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      // Query all subscription deliveries for this collection
      const { data: allDeliveries, error: allDeliveriesError } = await supabase
        .from('subscription_deliveries')
        .select('id, status')
        .eq('collection_id', collectionId)
        .in('status', ['confirmed', 'in_production', 'shipped', 'delivered']);

      if (allDeliveriesError) throw allDeliveriesError;

      // Query current month subscription deliveries
      const { data: currentMonthDeliveries, error: currentMonthError } = await supabase
        .from('subscription_deliveries')
        .select('id, cycle_id, cycles!inner(month, year)')
        .eq('collection_id', collectionId)
        .in('status', ['confirmed', 'in_production', 'shipped', 'delivered']);

      if (currentMonthError) throw currentMonthError;

      // Filter current month deliveries
      const currentMonthCount = currentMonthDeliveries?.filter((d: any) => {
        const cycle = d.cycles;
        return cycle && cycle.month === currentMonth && cycle.year === currentYear;
      }).length || 0;

      // Query all standalone purchases for this collection (excluding cancelled)
      const { data: allPurchases, error: allPurchasesError } = await supabase
        .from('standalone_purchases')
        .select('id, status, total_amount')
        .eq('collection_id', collectionId)
        .neq('status', 'cancelled');

      if (allPurchasesError) throw allPurchasesError;

      // Query current month standalone purchases
      const { data: currentMonthPurchases, error: currentMonthPurchasesError } = await supabase
        .from('standalone_purchases')
        .select('id, cycle_id, cycles!inner(month, year)')
        .eq('collection_id', collectionId)
        .neq('status', 'cancelled');

      if (currentMonthPurchasesError) throw currentMonthPurchasesError;

      // Filter current month purchases
      const currentMonthPurchasesCount = currentMonthPurchases?.filter((p: any) => {
        const cycle = p.cycles;
        return cycle && cycle.month === currentMonth && cycle.year === currentYear;
      }).length || 0;

      // Get collection price for revenue calculation
      const { data: collection, error: collectionError } = await supabase
        .from('collections')
        .select('price_full')
        .eq('id', collectionId)
        .single();

      if (collectionError) throw collectionError;

      const collectionPrice = collection?.price_full || 0;

      // Calculate statistics
      const subscriptionDeliveriesCount = allDeliveries?.length || 0;
      const standalonePurchasesCount = allPurchases?.length || 0;
      const totalPiecesSold = subscriptionDeliveriesCount + standalonePurchasesCount;
      const currentMonthSelections = currentMonthCount + currentMonthPurchasesCount;

      // Calculate revenue
      // For subscription deliveries, we use the collection price
      // For standalone purchases, we use the actual total_amount from the purchase
      const subscriptionRevenue = subscriptionDeliveriesCount * collectionPrice;
      const standaloneRevenue = allPurchases?.reduce((sum: number, p: any) => sum + (p.total_amount || 0), 0) || 0;
      const totalRevenue = subscriptionRevenue + standaloneRevenue;

      return {
        totalPiecesSold,
        currentMonthSelections,
        totalRevenue,
        subscriptionDeliveries: subscriptionDeliveriesCount,
        standalonePurchases: standalonePurchasesCount,
      };
    },
    enabled: !!collectionId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Estatísticas da Coleção
          </CardTitle>
          {collectionName && <CardDescription>{collectionName}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-20 bg-gray-200 rounded animate-pulse" />
            <div className="h-20 bg-gray-200 rounded animate-pulse" />
            <div className="h-20 bg-gray-200 rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Estatísticas da Coleção
          </CardTitle>
          {collectionName && <CardDescription>{collectionName}</CardDescription>}
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          Não foi possível carregar as estatísticas
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Estatísticas da Coleção
        </CardTitle>
        {collectionName && <CardDescription>{collectionName}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Pieces Sold All-Time */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm text-blue-600 font-medium mb-1">
                <Package className="h-4 w-4" />
                Total de Peças Vendidas
              </div>
              <div className="text-3xl font-bold text-blue-900">{stats.totalPiecesSold}</div>
              <div className="text-xs text-blue-600 mt-1">
                {stats.subscriptionDeliveries} assinaturas + {stats.standalonePurchases} avulsas
              </div>
            </div>
          </div>
        </div>

        {/* Current Month Selections */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm text-green-600 font-medium mb-1">
                <Calendar className="h-4 w-4" />
                Seleções do Mês Atual
              </div>
              <div className="text-3xl font-bold text-green-900">{stats.currentMonthSelections}</div>
              <div className="text-xs text-green-600 mt-1">
                {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Generated */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm text-purple-600 font-medium mb-1">
                <DollarSign className="h-4 w-4" />
                Receita Gerada
              </div>
              <div className="text-3xl font-bold text-purple-900">
                R$ {stats.totalRevenue.toFixed(2)}
              </div>
              <div className="text-xs text-purple-600 mt-1">
                Todas as vendas confirmadas
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
