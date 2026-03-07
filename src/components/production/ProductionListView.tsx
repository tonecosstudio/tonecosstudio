/**
 * ProductionListView Component
 * 
 * Displays production queue items in a table format with sorting,
 * row selection, and detail panel functionality.
 * Reuses patterns from OrdersTable component.
 */

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ArrowUpDown, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ProductionQueueItem } from '@/services/admin/production-service';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type SortColumn = 'customer' | 'collection' | 'character' | 'stage' | 'priority' | 'deadline' | 'assignedTo';
type SortDirection = 'asc' | 'desc';

interface ProductionListViewProps {
  items: ProductionQueueItem[];
  isLoading?: boolean;
  selectedIds: Set<string>;
  onSelectAll: (checked: boolean) => void;
  onSelectItem: (itemId: string, checked: boolean) => void;
  onItemClick: (item: ProductionQueueItem) => void;
  isAllSelected: boolean;
}

export function ProductionListView({
  items,
  isLoading = false,
  selectedIds,
  onSelectAll,
  onSelectItem,
  onItemClick,
  isAllSelected
}: ProductionListViewProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>('priority');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Handle column sorting
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Sort items based on current sort column and direction
  const sortedItems = [...(items || [])].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortColumn) {
      case 'customer':
        aValue = a.customerName.toLowerCase();
        bValue = b.customerName.toLowerCase();
        break;
      case 'collection':
        aValue = a.collectionName.toLowerCase();
        bValue = b.collectionName.toLowerCase();
        break;
      case 'character':
        aValue = (a.characterName || '').toLowerCase();
        bValue = (b.characterName || '').toLowerCase();
        break;
      case 'stage':
        aValue = a.currentStage;
        bValue = b.currentStage;
        break;
      case 'priority':
        aValue = a.priorityScore;
        bValue = b.priorityScore;
        break;
      case 'deadline':
        aValue = a.choiceDeadline || '';
        bValue = b.choiceDeadline || '';
        break;
      case 'assignedTo':
        aValue = (a.assignedToName || '').toLowerCase();
        bValue = (b.assignedToName || '').toLowerCase();
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Loading state
  if (isLoading) {
    return <ProductionListViewSkeleton />;
  }

  // Empty state
  if (items.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg">
        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Nenhum item encontrado</h3>
        <p className="text-muted-foreground">
          Não há itens de produção que correspondam aos filtros aplicados
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={onSelectAll}
                aria-label="Selecionar todos os itens"
              />
            </TableHead>
            <SortableTableHead
              label="Cliente"
              column="customer"
              currentColumn={sortColumn}
              direction={sortDirection}
              onSort={handleSort}
            />
            <SortableTableHead
              label="Coleção"
              column="collection"
              currentColumn={sortColumn}
              direction={sortDirection}
              onSort={handleSort}
            />
            <SortableTableHead
              label="Personagem"
              column="character"
              currentColumn={sortColumn}
              direction={sortDirection}
              onSort={handleSort}
            />
            <SortableTableHead
              label="Estágio"
              column="stage"
              currentColumn={sortColumn}
              direction={sortDirection}
              onSort={handleSort}
            />
            <SortableTableHead
              label="Prioridade"
              column="priority"
              currentColumn={sortColumn}
              direction={sortDirection}
              onSort={handleSort}
            />
            <SortableTableHead
              label="Prazo"
              column="deadline"
              currentColumn={sortColumn}
              direction={sortDirection}
              onSort={handleSort}
            />
            <SortableTableHead
              label="Responsável"
              column="assignedTo"
              currentColumn={sortColumn}
              direction={sortDirection}
              onSort={handleSort}
            />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedItems.map((item) => (
            <ProductionListRow
              key={item.id}
              item={item}
              isSelected={selectedIds.has(item.id)}
              onSelect={(checked) => onSelectItem(item.id, checked)}
              onClick={() => onItemClick(item)}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

interface SortableTableHeadProps {
  label: string;
  column: SortColumn;
  currentColumn: SortColumn;
  direction: SortDirection;
  onSort: (column: SortColumn) => void;
}

function SortableTableHead({
  label,
  column,
  currentColumn,
  onSort
}: SortableTableHeadProps) {
  const isActive = currentColumn === column;

  return (
    <TableHead>
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8 data-[state=open]:bg-accent"
        onClick={() => onSort(column)}
      >
        <span>{label}</span>
        <ArrowUpDown className={`ml-2 h-4 w-4 ${isActive ? 'opacity-100' : 'opacity-50'}`} />
      </Button>
    </TableHead>
  );
}

interface ProductionListRowProps {
  item: ProductionQueueItem;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onClick: () => void;
}

function ProductionListRow({ item, isSelected, onSelect, onClick }: ProductionListRowProps) {
  const priorityColors = {
    critical: 'bg-red-500 text-white',
    high: 'bg-orange-500 text-white',
    normal: 'bg-blue-500 text-white',
    low: 'bg-gray-500 text-white'
  };

  const stageLabels: Record<string, string> = {
    awaiting_choice: 'Aguardando Escolha',
    design: 'Design',
    production: 'Produção',
    quality_check: 'Controle de Qualidade',
    packaging: 'Embalagem',
    shipped: 'Enviado'
  };

  const formatDeadline = (deadline: string | null) => {
    if (!deadline) return '-';
    try {
      return format(new Date(deadline), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return '-';
    }
  };

  return (
    <TableRow
      className="cursor-pointer hover:bg-muted/50"
      onClick={onClick}
    >
      <TableCell onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          aria-label={`Selecionar ${item.customerName}`}
        />
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
          <span className="font-medium">{item.customerName}</span>
          <span className="text-xs text-muted-foreground">{item.customerEmail}</span>
        </div>
      </TableCell>
      <TableCell>{item.collectionName}</TableCell>
      <TableCell>{item.characterName || '-'}</TableCell>
      <TableCell>
        <Badge variant="outline">{stageLabels[item.currentStage] || item.currentStage}</Badge>
      </TableCell>
      <TableCell>
        <Badge className={priorityColors[item.priority]}>
          {item.priority.toUpperCase()}
        </Badge>
      </TableCell>
      <TableCell>{formatDeadline(item.choiceDeadline)}</TableCell>
      <TableCell>{item.assignedToName || '-'}</TableCell>
    </TableRow>
  );
}

function ProductionListViewSkeleton() {
  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Skeleton className="h-4 w-4" />
            </TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Coleção</TableHead>
            <TableHead>Personagem</TableHead>
            <TableHead>Estágio</TableHead>
            <TableHead>Prioridade</TableHead>
            <TableHead>Prazo</TableHead>
            <TableHead>Responsável</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, index) => (
            <TableRow key={index}>
              <TableCell>
                <Skeleton className="h-4 w-4" />
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-16" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-24" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
