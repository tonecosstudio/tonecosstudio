import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface UserOrderFiltersProps {
  typeFilter: string;
  statusFilter: string;
  searchQuery: string;
  onTypeChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onSearchChange: (value: string) => void;
}

export function UserOrderFilters({
  typeFilter,
  statusFilter,
  searchQuery,
  onTypeChange,
  onStatusChange,
  onSearchChange,
}: UserOrderFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por ID, rastreio..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      
      <Select value={typeFilter} onValueChange={onTypeChange}>
        <SelectTrigger className="w-full sm:w-[200px]">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os Tipos</SelectItem>
          <SelectItem value="subscription_delivery">Assinatura</SelectItem>
          <SelectItem value="standalone_purchase">Compra Avulsa</SelectItem>
          <SelectItem value="manual_payment">Pagamento Manual</SelectItem>
          <SelectItem value="quote">Orçamento</SelectItem>
        </SelectContent>
      </Select>

      <Select value={statusFilter} onValueChange={onStatusChange}>
        <SelectTrigger className="w-full sm:w-[200px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os Status</SelectItem>
          <SelectItem value="pending">Pendente</SelectItem>
          <SelectItem value="processing">Processando</SelectItem>
          <SelectItem value="confirmed">Confirmado</SelectItem>
          <SelectItem value="in_production">Em Produção</SelectItem>
          <SelectItem value="shipped">Enviado</SelectItem>
          <SelectItem value="delivered">Entregue</SelectItem>
          <SelectItem value="completed">Completo</SelectItem>
          <SelectItem value="cancelled">Cancelado</SelectItem>
          <SelectItem value="approved">Aprovado</SelectItem>
          <SelectItem value="rejected">Rejeitado</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
