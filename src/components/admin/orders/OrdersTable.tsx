/**
 * Componente de Tabela de Pedidos
 * 
 * Exibe uma tabela responsiva com todos os pedidos unificados,
 * incluindo entregas de assinatura e compras avulsas.
 * 
 * IMPORTANTE: Tipagem completa habilitada para garantir segurança de tipos.
 */

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import type { UnifiedOrder } from '@/types/admin/orders';
import { Package } from 'lucide-react';
import { OrderRow } from './OrderRow';

interface OrdersTableProps {
  orders: UnifiedOrder[];
  isLoading?: boolean;
  selectedIds: Set<string>;
  onSelectAll: (checked: boolean) => void;
  onSelectOrder: (orderId: string, checked: boolean) => void;
  onOrderClick: (order: UnifiedOrder) => void;
  isAllSelected: boolean;
  searchQuery?: string;
}

export function OrdersTable({
  orders,
  isLoading = false,
  selectedIds,
  onSelectAll,
  onSelectOrder,
  onOrderClick,
  isAllSelected,
  searchQuery = ''
}: OrdersTableProps) {
  // Estado de loading
  if (isLoading) {
    return <OrdersTableSkeleton />;
  }

  // Estado vazio
  if (orders.length === 0) {
    return (
      <div className="text-center py-16 border rounded-lg bg-muted/20">
        <Package className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Nenhum pedido encontrado</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Não há pedidos que correspondam aos filtros aplicados. Tente ajustar os filtros ou limpar a busca.
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-12">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={onSelectAll}
                  aria-label="Selecionar todos os pedidos"
                />
              </TableHead>
              <TableHead className="font-semibold">Tipo</TableHead>
              <TableHead className="font-semibold">ID</TableHead>
              <TableHead className="font-semibold min-w-[200px]">Cliente</TableHead>
              <TableHead className="font-semibold min-w-[140px]">Status</TableHead>
              <TableHead className="font-semibold min-w-[140px]">Produção</TableHead>
              <TableHead className="font-semibold">Data</TableHead>
              <TableHead className="text-right font-semibold">Valor</TableHead>
              <TableHead className="w-20 font-semibold">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                isSelected={selectedIds.has(order.id)}
                onSelect={(checked) => onSelectOrder(order.id, checked)}
                onClick={() => onOrderClick(order)}
                searchQuery={searchQuery}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/**
 * Skeleton loading state para a tabela
 */
function OrdersTableSkeleton() {
  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12">
                <Skeleton className="h-4 w-4" />
              </TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Produção</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="w-20">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 10 }).map((_, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Skeleton className="h-4 w-4" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </TableCell>
                <TableCell>
                  <Skeleton className="h-6 w-28" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-6 w-28" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="h-4 w-20 ml-auto" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-8 w-12" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
