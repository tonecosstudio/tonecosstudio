/**
 * Modal de Confirmação para Ações em Massa
 * 
 * Componente reutilizável que exibe um modal de confirmação antes de executar
 * ações em massa em pedidos. Mostra a lista de pedidos afetados e a ação
 * que será executada.
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UnifiedOrder } from '@/types/admin/orders';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type BulkActionType = 'update_status' | 'generate_labels' | 'export_csv';

interface BulkActionConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionType: BulkActionType;
  orders: UnifiedOrder[];
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  additionalInfo?: string;
}

/**
 * Retorna o título do modal baseado no tipo de ação
 */
function getActionTitle(actionType: BulkActionType): string {
  switch (actionType) {
    case 'update_status':
      return 'Confirmar Atualização de Status';
    case 'generate_labels':
      return 'Confirmar Geração de Etiquetas';
    case 'export_csv':
      return 'Confirmar Exportação';
    default:
      return 'Confirmar Ação';
  }
}

/**
 * Retorna a descrição da ação baseado no tipo
 */
function getActionDescription(actionType: BulkActionType, count: number): string {
  const plural = count === 1 ? 'pedido' : 'pedidos';
  
  switch (actionType) {
    case 'update_status':
      return `Você está prestes a atualizar o status de ${count} ${plural}. Esta ação não pode ser desfeita.`;
    case 'generate_labels':
      return `Você está prestes a gerar etiquetas para ${count} ${plural}. Verifique se todos os endereços estão corretos.`;
    case 'export_csv':
      return `Você está prestes a exportar ${count} ${plural} para um arquivo CSV.`;
    default:
      return `Você está prestes a executar uma ação em ${count} ${plural}.`;
  }
}

/**
 * Retorna o texto do botão de confirmação baseado no tipo de ação
 */
function getConfirmButtonText(actionType: BulkActionType): string {
  switch (actionType) {
    case 'update_status':
      return 'Atualizar Status';
    case 'generate_labels':
      return 'Gerar Etiquetas';
    case 'export_csv':
      return 'Exportar';
    default:
      return 'Confirmar';
  }
}

/**
 * Formata o tipo de pedido para exibição
 */
function formatOrderType(type: 'subscription_delivery' | 'standalone_purchase'): string {
  return type === 'subscription_delivery' ? 'Entrega de Assinatura' : 'Compra Avulsa';
}

export function BulkActionConfirmationModal({
  open,
  onOpenChange,
  actionType,
  orders,
  onConfirm,
  onCancel,
  isLoading = false,
  additionalInfo,
}: BulkActionConfirmationModalProps) {
  const handleCancel = () => {
    if (!isLoading) {
      onCancel();
      onOpenChange(false);
    }
  };

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            {getActionTitle(actionType)}
          </DialogTitle>
          <DialogDescription>
            {getActionDescription(actionType, orders.length)}
          </DialogDescription>
        </DialogHeader>

        {/* Informação adicional (ex: novo status) */}
        {additionalInfo && (
          <div className="rounded-md bg-muted p-3">
            <p className="text-sm font-medium">{additionalInfo}</p>
          </div>
        )}

        {/* Lista de pedidos afetados */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">
            Pedidos que serão afetados ({orders.length}):
          </h4>
          
          <ScrollArea className="h-[300px] rounded-md border">
            <div className="p-4 space-y-2">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className={cn(
                    'flex items-start justify-between gap-4 p-3 rounded-md',
                    'bg-muted/50 hover:bg-muted transition-colors'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-muted-foreground">
                        {order.id.slice(0, 8)}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-background">
                        {formatOrderType(order.type)}
                      </span>
                    </div>
                    <p className="text-sm font-medium truncate">
                      {order.customer.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {order.collection.name}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Status atual</p>
                    <p className="text-sm font-medium">{order.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Processando...' : getConfirmButtonText(actionType)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
