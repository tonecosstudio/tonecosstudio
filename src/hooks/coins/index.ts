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

// Compras com coins
export {
  usePurchaseCharacter,
  usePurchaseCollection,
  useRefundPurchase,
  usePurchaseItem,
} from "./usePurchaseWithCoins";

// Pacotes de coins (hook existente em src/hooks)
export { useCoinPackages } from "../useCoinPackages";
