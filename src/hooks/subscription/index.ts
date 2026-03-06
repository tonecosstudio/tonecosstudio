/**
 * Exportações centralizadas dos hooks de Subscription
 * 
 * @module hooks/subscription
 */

// Assinatura
export {
  useSubscription,
  useIsSubscriber,
  useSubscriptionPlan,
  useAvailablePlans,
  useCreateSubscription,
  useCancelSubscription,
  invalidateSubscription,
  subscriptionKeys,
} from './useSubscription';

// Pagamentos
export {
  useProcessSubscriptionPayment,
  useAdminAddSubscriptionCoins,
  useSubscriptionPayments,
  formatBRL,
  formatPaymentDate,
} from './useProcessPayment';

// Créditos de Assinatura
export {
  useSubscriptionCreditPlans,
  useUserSubscriptionCreditSummary,
  useValidateSubscriptionCredits,
  useSubscriptionCreditsForPurchase,
  useProcessSubscriptionPayment as useProcessSubscriptionPaymentWithCredits,
  calculatePricePerCredit,
  formatCredits,
  calculateSavings,
  isCreditsExpiringSoon,
  type SubscriptionCreditPlan,
  type UserSubscriptionCreditSummary,
  type CreditValidationResult,
  subscriptionCreditKeys,
} from './useSubscriptionCredits';
