import { CoinsTransactionType } from "@/types/coins";

export interface CoinLedgerTransaction {
  amount: number;
  transaction_type?: string | null;
  type?: string | null;
}

export interface CoinLedgerSummary {
  totalEarned: number;
  grossSpent: number;
  totalRefunded: number;
  totalSpent: number;
  netBalance: number;
}

function getTransactionType(transaction: CoinLedgerTransaction): string {
  return transaction.transaction_type ?? transaction.type ?? "";
}

export function getCoinLedgerCreditAmount(transaction: CoinLedgerTransaction): number {
  const type = getTransactionType(transaction);

  if (type === CoinsTransactionType.SPEND || type === CoinsTransactionType.REFUND) {
    return 0;
  }

  return transaction.amount > 0 ? transaction.amount : 0;
}

export function getCoinLedgerSpendAmount(transaction: CoinLedgerTransaction): number {
  return getTransactionType(transaction) === CoinsTransactionType.SPEND
    ? Math.abs(transaction.amount)
    : 0;
}

export function getCoinLedgerRefundAmount(transaction: CoinLedgerTransaction): number {
  return getTransactionType(transaction) === CoinsTransactionType.REFUND
    ? Math.abs(transaction.amount)
    : 0;
}

export function summarizeCoinLedger(
  transactions: readonly CoinLedgerTransaction[]
): CoinLedgerSummary {
  return transactions.reduce<CoinLedgerSummary>(
    (summary, transaction) => {
      const creditAmount = getCoinLedgerCreditAmount(transaction);
      const spendAmount = getCoinLedgerSpendAmount(transaction);
      const refundAmount = getCoinLedgerRefundAmount(transaction);

      const grossSpent = summary.grossSpent + spendAmount;
      const totalRefunded = summary.totalRefunded + refundAmount;

      return {
        totalEarned: summary.totalEarned + creditAmount,
        grossSpent,
        totalRefunded,
        totalSpent: Math.max(grossSpent - totalRefunded, 0),
        netBalance: summary.netBalance + creditAmount + refundAmount - spendAmount,
      };
    },
    {
      totalEarned: 0,
      grossSpent: 0,
      totalRefunded: 0,
      totalSpent: 0,
      netBalance: 0,
    }
  );
}
