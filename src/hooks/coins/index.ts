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
  useCoinsTransactionsPaginated,
  useCoinsTransactionsByType,
  useCoinsTransactionStats,
  invalidateCoinsTransactions,
  coinsTransactionsKeys,
} from "./useCoinsTransactions";

// Compras com coins
export {
  usePurchaseCharacter,
  usePurchaseCollection,
  useRefundPurchase,
  useValidatePurchase,
  invalidatePurchases,
  purchaseKeys,
} from "./usePurchaseWithCoins";

// Pacotes de coins (hook existente em src/hooks)
export { useCoinsPackages } from "../useCoinPackages";
