/**
 * BulkActionsToolbar Component
 * 
 * Displays a toolbar with bulk action buttons when items are selected.
 * Appears at the top of the list view with action buttons.
 */

import { Button } from '@/components/ui/button';
import { Users, ArrowRight, Download, X } from 'lucide-react';

interface BulkActionsToolbarProps {
  selectedCount: number;
  onAssign: () => void;
  onUpdateStage: () => void;
  onExportCSV: () => void;
  onClearSelection: () => void;
}

export function BulkActionsToolbar({
  selectedCount,
  onAssign,
  onUpdateStage,
  onExportCSV,
  onClearSelection
}: BulkActionsToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="bg-primary text-primary-foreground px-4 py-3 rounded-lg mb-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <span className="font-medium">
          {selectedCount} {selectedCount === 1 ? 'item selecionado' : 'itens selecionados'}
        </span>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onAssign}
            className="gap-2"
          >
            <Users className="h-4 w-4" />
            Atribuir
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onUpdateStage}
            className="gap-2"
          >
            <ArrowRight className="h-4 w-4" />
            Atualizar Estágio
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onExportCSV}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearSelection}
        className="gap-2 hover:bg-primary-foreground/10"
      >
        <X className="h-4 w-4" />
        Limpar Seleção
      </Button>
    </div>
  );
}
