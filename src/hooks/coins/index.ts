/**
 * Exportações centralizadas dos hooks de Coins
 *
 * @module hooks/coins
 */

// Saldo de coins
export {
  useCoinsBalance,
  useHasSufficientBalance,
  useBalanceAfterPurchase,
  useInitializeBalance,
  invalidateCoinsBalance,
  updateCoinsBalanceCache,
  coinsBalanceKeys,
} from "./useCoinsBalance";

// Transações de coins
export {
  useCoinsTransactions,
  useTransactionsByType,
  useTransaction,
  useTransactionStats,
  useRecentTransactions,
  groupTransactionsByDate,
  groupTransactionsByType,
  calculateTotalByType,
  filterTransactionsByPeriod,
  coinsTransactionsKeys,
} from "./useCoinsTransactions";

// Reembolso de compras registradas no ledger canônico de coins.
export { useRefundPurchase } from "./usePurchaseWithCoins";
