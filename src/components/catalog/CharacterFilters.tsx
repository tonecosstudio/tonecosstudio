/**
 * Filtros do Catálogo de Personagens
 *
 * Permite filtrar personagens por:
 * - Saldo disponível
 * - Coleção
 * - Multiplicador de preço
 *
 * @module components/catalog/CharacterFilters
 */

import { Filter, Coins, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ============================================================================
// TYPES
// ============================================================================

interface CharacterFiltersProps {
  showOnlyAvailable: boolean;
  onToggleAvailable: () => void;
  showOnlyWithMultiplier: boolean;
  onToggleMultiplier: () => void;
  isSubscriber: boolean;
  activeFiltersCount: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CharacterFilters({
  showOnlyAvailable,
  onToggleAvailable,
  showOnlyWithMultiplier,
  onToggleMultiplier,
  isSubscriber,
  activeFiltersCount,
}: CharacterFiltersProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-semibold">Personagens Disponíveis</h2>
        {activeFiltersCount > 0 && (
          <Badge variant="secondary">
            {activeFiltersCount} {activeFiltersCount === 1 ? "filtro" : "filtros"}
          </Badge>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filtros
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Filtrar por</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Filtro: Apenas disponíveis (com saldo) */}
          {isSubscriber && (
            <DropdownMenuCheckboxItem
              checked={showOnlyAvailable}
              onCheckedChange={onToggleAvailable}
            >
              <Coins className="h-4 w-4 mr-2" />
              Apenas com saldo suficiente
            </DropdownMenuCheckboxItem>
          )}

          {/* Filtro: Com multiplicador */}
          <DropdownMenuCheckboxItem
            checked={showOnlyWithMultiplier}
            onCheckedChange={onToggleMultiplier}
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Com multiplicador de preço
          </DropdownMenuCheckboxItem>

        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
