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

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Package, DollarSign, Calendar } from 'lucide-react';
import { useCollectionStats } from '@/hooks/admin/useCollectionStats';

interface CollectionStatsProps {
  collectionId: string;
  collectionName?: string;
}

export function CollectionStats({ collectionId, collectionName }: CollectionStatsProps) {
  const { data: stats, isLoading } = useCollectionStats(collectionId);

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
