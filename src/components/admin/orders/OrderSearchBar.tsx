/**
 * Barra de Busca de Pedidos
 * 
 * Permite buscar pedidos por nome do cliente, email, ID do pedido ou código de rastreamento
 * 
 * Implementa sanitização de input para prevenir SQL injection e XSS
 */

import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { sanitizeSearchInput } from '@/lib/sanitizer';

interface OrderSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder?: string;
  isSearching?: boolean;
}

export function OrderSearchBar({
  value,
  onChange,
  onClear,
  placeholder = 'Buscar por cliente, email, ID do pedido ou código de rastreamento...',
  isSearching = false
}: OrderSearchBarProps) {
  /**
   * Handler para mudanças no input de busca
   * Aplica sanitização antes de passar o valor para o componente pai
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    // Sanitizar o input antes de enviar para o estado
    const sanitizedValue = sanitizeSearchInput(rawValue);
    onChange(sanitizedValue);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="pl-10 pr-10"
        />
        {value && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Limpar busca</span>
          </Button>
        )}
      </div>
      
      {isSearching && (
        <p className="text-xs text-muted-foreground mt-2">
          Buscando...
        </p>
      )}
      
      {value && !isSearching && (
        <p className="text-xs text-muted-foreground mt-2">
          Buscando por: <span className="font-medium">{value}</span>
        </p>
      )}
    </div>
  );
}
