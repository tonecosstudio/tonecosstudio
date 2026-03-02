/**
 * Componente OrderRow
 * 
 * Representa uma linha individual na tabela de pedidos.
 * Exibe todos os campos do pedido e suporta seleção e clique para detalhes.
 */

import { TableCell, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import type { UnifiedOrder } from '@/types/admin/orders';
import { OrderStatusBadge } from './OrderStatusBadge';
import { OrderTypeIndicator } from './OrderTypeIndicator';
import { highlightText } from '@/lib/highlight-text';

interface OrderRowProps {
  order: UnifiedOrder;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onClick: () => void;
  searchQuery?: string;
}

export function OrderRow({ 
  order, 
  isSelected, 
  onSelect, 
  onClick,
  searchQuery = ''
}: OrderRowProps) {
  return (
    <TableRow
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onClick}
    >
      {/* Checkbox de seleção */}
      <TableCell onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          aria-label={`Selecionar pedido ${order.id}`}
        />
      </TableCell>

      {/* Tipo do pedido */}
      <TableCell>
        <OrderTypeIndicator type={order.type} />
      </TableCell>

      {/* ID do pedido (primeiros 8 caracteres) */}
      <TableCell className="font-mono text-sm">
        {highlightText(order.id.slice(0, 8), searchQuery)}
      </TableCell>

      {/* Cliente (nome e email) */}
      <TableCell>
        <div className="flex flex-col">
          <span className="font-medium">
            {highlightText(order.customer.name, searchQuery)}
          </span>
          <span className="text-xs text-muted-foreground">
            {highlightText(order.customer.email, searchQuery)}
          </span>
        </div>
      </TableCell>

      {/* Status */}
      <TableCell>
        <OrderStatusBadge status={order.status} />
      </TableCell>

      {/* Data de criação */}
      <TableCell className="text-sm text-muted-foreground">
        {new Date(order.createdAt).toLocaleDateString('pt-BR')}
      </TableCell>

      {/* Valor */}
      <TableCell className="text-right font-medium">
        R$ {order.amount.toFixed(2)}
      </TableCell>

      {/* Botão de ações */}
      <TableCell>
        <button
          className="text-sm text-primary hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          Ver
        </button>
      </TableCell>
    </TableRow>
  );
}
