/**
 * Componente de Progresso de Ação em Massa
 * 
 * Exibe uma barra de progresso durante o processamento de ações em massa.
 * Mostra o número de pedidos processados e o total.
 * 
 * Requisitos: 7.5
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';

interface BulkActionProgressProps {
  open: boolean;
  current: number;
  total: number;
  actionDescription: string;
}

export function BulkActionProgress({
  open,
  current,
  total,
  actionDescription
}: BulkActionProgressProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Processando Ação em Massa
          </DialogTitle>
          <DialogDescription>
            {actionDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Barra de progresso */}
          <Progress value={percentage} className="h-2" />

          {/* Contador */}
          <div className="text-center">
            <p className="text-2xl font-bold">
              {current} / {total}
            </p>
            <p className="text-sm text-muted-foreground">
              {current === 1 ? 'pedido processado' : 'pedidos processados'}
            </p>
          </div>

          {/* Mensagem de aguarde */}
          <p className="text-sm text-center text-muted-foreground">
            Por favor, aguarde. Não feche esta janela.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
