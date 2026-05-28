/**
 * Componente de Filtros de Pedidos
 * 
 * Permite filtrar pedidos por tipo, status e intervalo de datas
 * 
 * IMPORTANTE: Tipagem completa habilitada para garantir seguranÃ§a de tipos.
 */

import { useState, useEffect } from 'react';
import { X, Filter, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useOrderStatusCounts } from '@/hooks/admin/useOrderStatusCounts';
import { validateDateRange } from '@/hooks/admin/useOrderFilters';
import { PlanTypeFilter } from './PlanTypeFilter';
import type { OrderFilters as OrderFiltersType, OrderStatus } from '@/types/admin/orders';
import { ORDER_TYPE_OPTIONS, getOrderStatusOptionsForType } from '@/config/admin-order-status';

interface OrderFiltersProps {
  filters: OrderFiltersType;
  onTypeChange: (type: OrderFiltersType['type']) => void;
  onStatusToggle: (status: OrderStatus) => void;
  onDateRangeChange: (dateFrom: string | null, dateTo: string | null) => void;
  onPlanTypeChange: (planType: 'trimestral' | 'semestral' | 'anual' | null) => void;
  onReset: () => void;
  activeFilterCount: number;
}

export function OrderFilters({
  filters,
  onTypeChange,
  onStatusToggle,
  onDateRangeChange,
  onPlanTypeChange,
  onReset,
  activeFilterCount
}: OrderFiltersProps) {
  // Buscar contadores de status
  const { counts, isLoading: isLoadingCounts } = useOrderStatusCounts(filters.type);

  // Estado de validaÃ§Ã£o de datas
  const [dateError, setDateError] = useState<string | null>(null);

  // Validar datas quando mudarem
  useEffect(() => {
    const validation = validateDateRange(filters.dateFrom, filters.dateTo);
    setDateError(validation.valid ? null : validation.error || null);
  }, [filters.dateFrom, filters.dateTo]);

  const availableStatuses = getOrderStatusOptionsForType(filters.type);

  // Handler para mudanÃ§a de data inicial
  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value || null;
    onDateRangeChange(value, filters.dateTo);
  };

  // Handler para mudanÃ§a de data final
  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value || null;
    onDateRangeChange(filters.dateFrom, value);
  };

  return (
    <div className="bg-card border rounded-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Filtros</h3>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {activeFilterCount}
            </Badge>
          )}
        </div>

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Filtro de Tipo */}
        <div className="space-y-2">
          <Label htmlFor="type-filter">Tipo de Pedido</Label>
          <Select
            value={filters.type}
            onValueChange={(value) => onTypeChange(value as OrderFiltersType['type'])}
          >
            <SelectTrigger id="type-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORDER_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filtro de Data Inicial */}
        <div className="space-y-2">
          <Label htmlFor="date-from">Data Inicial</Label>
          <Input
            id="date-from"
            type="date"
            value={filters.dateFrom || ''}
            onChange={handleDateFromChange}
            max={filters.dateTo || undefined}
            className={dateError ? 'border-destructive' : ''}
          />
        </div>

        {/* Filtro de Data Final */}
        <div className="space-y-2">
          <Label htmlFor="date-to">Data Final</Label>
          <Input
            id="date-to"
            type="date"
            value={filters.dateTo || ''}
            onChange={handleDateToChange}
            min={filters.dateFrom || undefined}
            className={dateError ? 'border-destructive' : ''}
          />
        </div>
      </div>

      {/* Mensagem de erro de validaÃ§Ã£o de datas */}
      {dateError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{dateError}</AlertDescription>
        </Alert>
      )}

      {/* Filtro de Tipo de Plano (apenas para assinaturas) */}
      {filters.type === 'subscription_delivery' && (
        <PlanTypeFilter
          value={filters.planType || null}
          onChange={onPlanTypeChange}
        />
      )}

      {/* Filtro de Status */}
      <div className="space-y-3">
        <Label>Status</Label>
        <div className="flex flex-wrap gap-2">
          {availableStatuses.map(({ value, label }) => {
            const isSelected = filters.status.includes(value);
            const count = counts[value] || 0;
            
            return (
              <button
                key={value}
                onClick={() => onStatusToggle(value)}
                className={`
                  px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                  inline-flex items-center gap-2
                  ${isSelected
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }
                `}
              >
                <span>{label}</span>
                {!isLoadingCounts && (
                  <Badge 
                    variant="outline" 
                    className={`
                      ${isSelected 
                        ? 'bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30' 
                        : 'bg-background/50 text-foreground border-border'
                      }
                    `}
                  >
                    {count}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
        
        {filters.status.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {filters.status.length} {filters.status.length === 1 ? 'status selecionado' : 'status selecionados'}
          </p>
        )}
      </div>
    </div>
  );
}
