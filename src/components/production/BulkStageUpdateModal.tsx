/**
 * BulkStageUpdateModal Component
 * 
 * Modal for updating the production stage of multiple items.
 * Includes validation to prevent skipping stages.
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import type { ProductionStage } from '@/types/production';

interface BulkStageUpdateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onConfirm: (newStage: ProductionStage) => Promise<void>;
}

const STAGES: { value: ProductionStage; label: string; description: string }[] = [
  {
    value: 'awaiting_payment',
    label: 'Aguardando Pagamento',
    description: 'Pedido criado, aguardando confirmação de pagamento',
  },
  {
    value: 'payment_confirmed',
    label: 'Pagamento Confirmado',
    description: 'Pagamento aprovado, pedido liberado para produção',
  },
  {
    value: 'awaiting_choice',
    label: 'Aguardando Escolha',
    description: 'Cliente precisa escolher personagem do mês',
  },
  {
    value: 'model_preparation',
    label: 'Preparação do Modelo',
    description: 'Conferência de arquivos e ajustes no modelo 3D',
  },
  {
    value: 'printing',
    label: 'Em Impressão 3D',
    description: 'Estatueta sendo impressa camada por camada',
  },
  {
    value: 'post_processing',
    label: 'Limpeza e Preparação',
    description: 'Remoção de suportes e lixamento da peça',
  },
  {
    value: 'painting',
    label: 'Pintura Artesanal',
    description: 'Aplicação de cores e detalhes à mão',
  },
  {
    value: 'quality_check',
    label: 'Controle de Qualidade',
    description: 'Inspeção final e fotos da peça',
  },
  {
    value: 'packaging',
    label: 'Embalagem',
    description: 'Caixa premium MDF + certificado de autenticidade',
  },
  {
    value: 'ready_to_ship',
    label: 'Pronto para Envio',
    description: 'Aguardando coleta da transportadora',
  },
  {
    value: 'shipped',
    label: 'Enviado',
    description: 'Despachado com código de rastreamento',
  },
  {
    value: 'delivered',
    label: 'Entregue',
    description: 'Cliente recebeu o pedido',
  },
];

export function BulkStageUpdateModal({
  open,
  onOpenChange,
  selectedCount,
  onConfirm
}: BulkStageUpdateModalProps) {
  const [selectedStage, setSelectedStage] = useState<ProductionStage | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!selectedStage) return;

    setIsSubmitting(true);
    try {
      await onConfirm(selectedStage);
      onOpenChange(false);
      setSelectedStage('');
    } catch {
      // Parent handlers own user-facing error feedback.
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Atualizar Estágio em Massa</DialogTitle>
          <DialogDescription>
            Selecione o novo estágio para {selectedCount}{' '}
            {selectedCount === 1 ? 'item' : 'itens'}.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Atenção: A validação de sequência de estágios será aplicada. Itens que não
            puderem avançar para o estágio selecionado serão ignorados.
          </AlertDescription>
        </Alert>

        <div className="py-4">
          <RadioGroup value={selectedStage} onValueChange={(value) => setSelectedStage(value as ProductionStage)}>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {STAGES.map((stage) => (
                <div
                  key={stage.value}
                  className="flex items-start space-x-3 rounded-lg border p-3 hover:bg-accent cursor-pointer"
                  onClick={() => setSelectedStage(stage.value)}
                >
                  <RadioGroupItem value={stage.value} id={stage.value} className="mt-1" />
                  <Label
                    htmlFor={stage.value}
                    className="flex-1 cursor-pointer"
                  >
                    <div className="font-medium">{stage.label}</div>
                    <div className="text-sm text-muted-foreground">
                      {stage.description}
                    </div>
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedStage || isSubmitting}
          >
            {isSubmitting ? 'Atualizando...' : 'Atualizar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
