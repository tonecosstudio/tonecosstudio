/**
 * Detalhes de Compra Avulsa
 * 
 * Exibe informações específicas de compras avulsas
 */

import { DollarSign, Calendar, FileText, User as UserIcon, Image } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import type { UnifiedOrder } from '@/types/admin/orders';
import { isStandalonePurchase } from '@/types/admin/orders';
import { formatCurrency } from '@/lib/utils';

interface StandalonePurchaseDetailsProps {
  order: UnifiedOrder;
}

export function StandalonePurchaseDetails({ order }: StandalonePurchaseDetailsProps) {
  if (!isStandalonePurchase(order)) {
    return null;
  }

  const { standalonePurchase } = order;

  return (
    <>
      <Separator />

      {/* Informações Financeiras Detalhadas */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-muted-foreground">
            Detalhes Financeiros
          </h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Valor do Depósito</span>
            <span className="text-sm font-medium">
              {formatCurrency(standalonePurchase.priceDeposit)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Valor do Saldo</span>
            <span className="text-sm font-medium">
              {formatCurrency(standalonePurchase.priceBalance)}
            </span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm font-medium">Valor Total</span>
            <span className="text-lg font-semibold">
              {formatCurrency(standalonePurchase.priceFull)}
            </span>
          </div>
        </div>
      </section>

      {/* Datas de Pagamento */}
      <Separator />
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-muted-foreground">
            Pagamentos
          </h3>
        </div>
        <div className="space-y-3">
          {standalonePurchase.depositPaidAt && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Depósito Pago em</span>
              <span className="text-sm font-medium">
                {new Date(standalonePurchase.depositPaidAt).toLocaleDateString('pt-BR')}
              </span>
            </div>
          )}

          {standalonePurchase.balancePaidAt && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Saldo Pago em</span>
              <span className="text-sm font-medium">
                {new Date(standalonePurchase.balancePaidAt).toLocaleDateString('pt-BR')}
              </span>
            </div>
          )}

          {standalonePurchase.balanceDueDate && !standalonePurchase.balancePaidAt && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Vencimento do Saldo</span>
              <span className="text-sm font-medium text-orange-600">
                {new Date(standalonePurchase.balanceDueDate).toLocaleDateString('pt-BR')}
              </span>
            </div>
          )}

          {!standalonePurchase.depositPaidAt && !standalonePurchase.balancePaidAt && (
            <p className="text-sm text-muted-foreground">
              Nenhum pagamento registrado
            </p>
          )}
        </div>
      </section>

      {/* Comprovantes de Pagamento */}
      {(standalonePurchase.depositVoucherUrl || standalonePurchase.balanceVoucherUrl) && (
        <>
          <Separator />
          <section>
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-muted-foreground">
                Comprovantes
              </h3>
            </div>
            <div className="space-y-3">
              {standalonePurchase.depositVoucherUrl && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Comprovante do Depósito</span>
                  <a
                    href={standalonePurchase.depositVoucherUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    Ver comprovante
                  </a>
                </div>
              )}

              {standalonePurchase.balanceVoucherUrl && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Comprovante do Saldo</span>
                  <a
                    href={standalonePurchase.balanceVoucherUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    Ver comprovante
                  </a>
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {/* Informações do Ciclo */}
      {standalonePurchase.cycle && (
        <>
          <Separator />
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-muted-foreground">
                Ciclo de Produção
              </h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Número do Ciclo</span>
                <span className="text-sm font-medium">
                  #{standalonePurchase.cycle.cycleNumber}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Período</span>
                <span className="text-sm font-medium">
                  {standalonePurchase.cycle.month}/{standalonePurchase.cycle.year}
                </span>
              </div>
            </div>
          </section>
        </>
      )}

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
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Nome</span>
                <span className="text-sm font-medium">
                  {standalonePurchase.character.name}
                </span>
              </div>

              {standalonePurchase.character.imageUrl && (
                <div className="flex items-start justify-between">
                  <span className="text-sm text-muted-foreground">Imagem</span>
                  <div className="flex items-center gap-2">
                    <Image className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={standalonePurchase.character.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      Ver imagem
                    </a>
                  </div>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </>
  );
}
