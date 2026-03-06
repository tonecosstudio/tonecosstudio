// @ts-nocheck
/**
 * My Credits Section Component
 * Displays credit balance with visual bar and transaction history
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Coins, History, TrendingDown, TrendingUp, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CreditsBalanceResponse } from '@/types/subscription-credit-system';
import { subscriptionCreditAPI } from '@/services/subscription-credit-api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MyCreditsSectionProps {
  credits: CreditsBalanceResponse;
}

export function MyCreditsSection({ credits }: MyCreditsSectionProps) {
  const [showHistory, setShowHistory] = useState(false);

  const usagePercentage = (credits.used_credits / credits.total_credits) * 100;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Meus Créditos
          </CardTitle>
          <CardDescription>Saldo disponível para compras</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Credit Balance Numbers */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">{credits.available_credits}</div>
              <div className="text-xs text-muted-foreground">Disponíveis</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-muted-foreground">{credits.used_credits}</div>
              <div className="text-xs text-muted-foreground">Usados</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{credits.total_credits}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
          </div>

          {/* Visual Credit Bar */}
          <div>
            <div className="flex items-center justify-between mb-2 text-sm">
              <span className="text-muted-foreground">Uso de Créditos</span>
              <span className="font-medium">{Math.round(usagePercentage)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
              <div
                className="bg-gradient-to-r from-green-500 to-green-600 h-4 rounded-full transition-all flex items-center justify-end pr-2"
                style={{ width: `${usagePercentage}%` }}
              >
                {usagePercentage > 10 && (
                  <span className="text-xs font-medium text-white">{credits.used_credits}</span>
                )}
              </div>
            </div>
            <div className="flex justify-between mt-1 text-xs text-muted-foreground">
              <span>0</span>
              <span>{credits.total_credits}</span>
            </div>
          </div>

          {/* View History Button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowHistory(true)}
          >
            <History className="h-4 w-4 mr-2" />
            Ver Histórico Completo
          </Button>
        </CardContent>
      </Card>

      {/* Transaction History Dialog */}
      <TransactionHistoryDialog isOpen={showHistory} onOpenChange={setShowHistory} />
    </>
  );
}

// Transaction History Dialog Component
function TransactionHistoryDialog({
  isOpen,
  onOpenChange,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const transactionsQuery = useQuery({
    queryKey: ['subscription-credit', 'transactions'],
    queryFn: () => subscriptionCreditAPI.getCreditTransactions(1, 50),
    enabled: isOpen,
  });

  const transactions = transactionsQuery.data?.transactions || [];

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'allocation':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'debit_immediate':
      case 'debit_cycle_close':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'expiration':
        return <Clock className="h-4 w-4 text-gray-500" />;
      default:
        return <Coins className="h-4 w-4 text-blue-500" />;
    }
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'allocation':
        return 'Alocação de Créditos';
      case 'debit_immediate':
        return 'Compra Individual';
      case 'debit_cycle_close':
        return 'Débito Automático';
      case 'expiration':
        return 'Expiração';
      case 'adjustment':
        return 'Ajuste Manual';
      default:
        return type;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Histórico de Transações</DialogTitle>
          <DialogDescription>
            Todas as movimentações de créditos da sua conta
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[500px] pr-4">
          {transactionsQuery.isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma transação encontrada
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                >
                  <div className="flex-shrink-0 mt-1">
                    {getTransactionIcon(transaction.transaction_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-medium text-sm">
                        {getTransactionLabel(transaction.transaction_type)}
                      </span>
                      <Badge
                        variant={transaction.credits_amount > 0 ? 'default' : 'secondary'}
                        className={
                          transaction.credits_amount > 0
                            ? 'bg-green-500'
                            : 'bg-red-500 text-white'
                        }
                      >
                        {transaction.credits_amount > 0 ? '+' : ''}
                        {transaction.credits_amount}
                      </Badge>
                    </div>
                    {transaction.description && (
                      <p className="text-xs text-muted-foreground mb-1">
                        {transaction.description}
                      </p>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(transaction.created_at), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
