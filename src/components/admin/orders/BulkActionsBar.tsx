/**
 * Componente de Barra de Ações em Massa
 * 
 * Exibe uma barra fixa na parte inferior da tela quando pedidos estão selecionados,
 * permitindo executar ações em massa como atualizar status, gerar etiquetas e exportar CSV.
 */

import { Button } from '@/components/ui/button';
import { X, RefreshCw, Tag, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BulkActionsBarProps {
  selectedCount: number;
  onUpdateStatus: () => void;
  onGenerateLabels: () => void;
  onExportCSV: () => void;
  onClearSelection: () => void;
  isExporting?: boolean;
  className?: string;
}

export function BulkActionsBar({
  selectedCount,
  onUpdateStatus,
  onGenerateLabels,
  onExportCSV,
  onClearSelection,
  isExporting = false,
  className
}: BulkActionsBarProps) {
  // Não exibir se nenhum pedido está selecionado
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'bg-background border-t shadow-lg',
        'animate-in slide-in-from-bottom duration-300',
        className
      )}
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Contador de seleção */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {selectedCount} {selectedCount === 1 ? 'pedido selecionado' : 'pedidos selecionados'}
            </span>
          </div>

          {/* Botões de ação */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onUpdateStatus}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar Status
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={onGenerateLabels}
              className="gap-2"
            >
              <Tag className="h-4 w-4" />
              Gerar Etiquetas
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={onExportCSV}
              disabled={isExporting}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {isExporting ? 'Exportando...' : 'Exportar CSV'}
            </Button>

            {/* Botão de cancelar seleção */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
