/**
 * Detalhes de Compra Avulsa
 * 
 * Exibe informações específicas de compras avulsas
 * Alinhado com a estrutura real da tabela standalone_purchases
 */

import { DollarSign, Calendar, User as UserIcon, Image, CreditCard } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import type { UnifiedOrder } from '@/types/admin/orders';
import { isStandalonePurchase } from '@/types/admin/orders';
import { formatCurrency } from '@/lib/utils';

interface StandalonePurchaseDetailsProps {
  order: UnifiedOrder;
}

// Payment method labels
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: "PIX",
  cartao: "Cartão",
  boleto: "Boleto",
  transferencia: "Transferência",
  bank_transfer: "Transferência Bancária",
};

export function StandalonePurchaseDetails({ order }: StandalonePurchaseDetailsProps) {
  if (!isStandalonePurchase(order)) {
    return null;
  }

  const { standalonePurchase } = order;

  return (
    <>
      <Separator />

      {/* Informações Financeiras */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-muted-foreground">
            Detalhes Financeiros
          </h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between pt-1 pb-1 border-b">
            <span className="text-sm font-medium">Valor Total</span>
            <span className="text-lg font-semibold">
              {formatCurrency(standalonePurchase.priceFull)}
            </span>
          </div>

          {standalonePurchase.priceBalance > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Saldo Pendente</span>
              <span className="text-sm font-medium text-orange-600">
                {formatCurrency(standalonePurchase.priceBalance)}
              </span>
            </div>
          )}

          {/* Status de pagamento baseado no valor pago */}
          {standalonePurchase.balancePaidAt && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Pagamento</span>
              <Badge variant="default" className="bg-green-600">
                Pago
              </Badge>
            </div>
          )}

          {!standalonePurchase.balancePaidAt && standalonePurchase.priceFull > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Pagamento</span>
              <Badge variant="outline" className="text-orange-600 border-orange-300">
                Aguardando
              </Badge>
            </div>
          )}
        </div>
      </section>

      {/* Informações do Personagem */}
      {standalonePurchase.character && (
        <>
          <Separator />
          <section>
            <div className="flex items-center gap-2 mb-3">
              <UserIcon className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-muted-foreground">
                Personagem
              </h3>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg border flex items-center gap-3">
              {standalonePurchase.character.imageUrl && (
                <img
                  src={standalonePurchase.character.imageUrl}
                  alt={standalonePurchase.character.name}
                  className="w-10 h-10 rounded object-cover"
                />
              )}
              <span className="text-sm font-semibold">{standalonePurchase.character.name}</span>
            </div>
          </section>
        </>
      )}
    </>
  );
}
