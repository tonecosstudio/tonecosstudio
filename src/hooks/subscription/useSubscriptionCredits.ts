/**
 * Hook para gerenciar créditos de assinatura
 *
 * Integra com sistema de coins e assinaturas
 *
 * Spec: subscription-credit-system
 * Task: 1.0 (Subscription Credit System Integration)
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { log } from "@/lib/logger";

// =====================================================
// TYPES
// =====================================================

export interface SubscriptionCreditPlan {
  id: string;
  plan_type: 'trimestral' | 'semestral' | 'anual';
  name: string;
  description: string | null;
  price_full: number;
  price_pix: number;
  total_credits: number;
  monthly_credits: number;
  bonus_credits: number;
  credit_expiry_days: number | null;
  is_credit_based: boolean;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface UserSubscriptionCreditSummary {
  has_active_subscription: boolean;
  message?: string;
  subscription_id?: string;
  plan_type?: string;
  plan_name?: string;
  plan_description?: string;
  status?: string;
  credits_total: number;
  credits_used: number;
  credits_available: number;
  credits_expiry_date?: string;
  last_credit_distribution?: string;
  next_credit_distribution?: string;
  plan_total_credits?: number;
  plan_bonus_credits?: number;
  credit_expiry_days?: number;
  created_at?: string;
  updated_at?: string;
  percentage_used: number;
  days_until_expiry?: number;
}

export interface CreditValidationResult {
  can_purchase: boolean;
  reason?: string;
  required?: number;
  available?: number;
  missing?: number;
  total_credits?: number;
  used_credits?: number;
  expiry_date?: string;
}

function getMutationErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

// =====================================================
// QUERY KEYS
// =====================================================

export const subscriptionCreditKeys = {
  all: ["subscription-credits"] as const,
  plans: () => [...subscriptionCreditKeys.all, "plans"] as const,
  activePlans: () => [...subscriptionCreditKeys.plans(), "active"] as const,
  userSummary: (userId?: string) =>
    [...subscriptionCreditKeys.all, "summary", userId || "anonymous"] as const,
  validation: (userId?: string, requiredCredits?: number) =>
    [...subscriptionCreditKeys.all, "validation", userId || "anonymous", requiredCredits || 0] as const,
};

// =====================================================
// QUERIES
// =====================================================

/**
 * Hook para buscar planos de assinatura baseados em créditos
 *
 * @returns Lista de planos ativos com créditos
 */
export function useSubscriptionCreditPlans() {
  return useQuery({
    queryKey: subscriptionCreditKeys.activePlans(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .eq("is_credit_based", true)
        .order("display_order", { ascending: true });

      if (error) throw error;

      return (data || []) as SubscriptionCreditPlan[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
}

/**
 * Hook para buscar resumo de créditos de assinatura do usuário
 *
 * @param userId - ID do usuário (opcional, usa usuário autenticado)
 * @returns Resumo detalhado dos créditos de assinatura
 */
export function useUserSubscriptionCreditSummary(userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: subscriptionCreditKeys.userSummary(targetUserId),
    queryFn: async () => {
      if (!targetUserId) {
        return {
          has_active_subscription: false,
          credits_total: 0,
          credits_used: 0,
          credits_available: 0,
          percentage_used: 0,
        } as UserSubscriptionCreditSummary;
      }

      const { data, error } = await supabase.rpc(
        "get_user_subscription_credit_summary",
        { p_user_id: targetUserId }
      );

      if (error) throw error;

      return data as UserSubscriptionCreditSummary;
    },
    enabled: !!targetUserId,
    staleTime: 30 * 1000, // 30 segundos
    gcTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Hook para validar se usuário tem créditos suficientes para compra
 *
 * @param requiredCredits - Créditos necessários para a compra
 * @param userId - ID do usuário (opcional, usa usuário autenticado)
 * @returns Resultado da validação
 */
export function useValidateSubscriptionCredits(
  requiredCredits?: number,
  userId?: string
) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: subscriptionCreditKeys.validation(targetUserId, requiredCredits),
    queryFn: async () => {
      if (!targetUserId || requiredCredits === undefined) {
        return {
          can_purchase: false,
          reason: "Missing user ID or required credits",
        } as CreditValidationResult;
      }

      const { data, error } = await supabase.rpc(
        "validate_subscription_credit_balance",
        {
          p_user_id: targetUserId,
          p_required_credits: requiredCredits,
        }
      );

      if (error) throw error;

      return data as CreditValidationResult;
    },
    enabled: !!targetUserId && requiredCredits !== undefined,
    staleTime: 10 * 1000, // 10 segundos (validação muda com compras)
    gcTime: 2 * 60 * 1000, // 2 minutos
  });
}

// =====================================================
// MUTATIONS
// =====================================================

/**
 * Hook para usar créditos de assinatura em uma compra
 *
 * @returns Mutation para usar créditos
 */
export function useSubscriptionCreditsForPurchase() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      characterId: string;
      requiredCredits: number;
    }) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase.rpc(
        "use_subscription_credits_for_purchase",
        {
          p_user_id: user.id,
          p_character_id: params.characterId,
          p_required_credits: params.requiredCredits,
        }
      );

      if (error) throw error;

      return data as { success: boolean; message: string; credits_remaining: number };
    },
    onSuccess: (data) => {
      // Invalidar caches relevantes
      queryClient.invalidateQueries({
        queryKey: subscriptionCreditKeys.userSummary(user?.id)
      });
      queryClient.invalidateQueries({
        queryKey: subscriptionCreditKeys.validation(user?.id)
      });
      queryClient.invalidateQueries({
        queryKey: ["user-coins", "balance", user?.id]
      });
      queryClient.invalidateQueries({
        queryKey: ["coin-transactions"]
      });

      // Mostrar toast de sucesso
      toast({
        title: "Compra realizada com créditos!",
        description: data.message,
        variant: "default",
      });
    },
    onError: (error: unknown) => {
      log.error("Failed to use subscription credits for purchase", { error });

      const errorMessage = getMutationErrorMessage(
        error,
        "Erro ao processar compra com créditos"
      );

      toast({
        title: "Erro na compra",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook para processar pagamento de assinatura e adicionar créditos
 *
 * @returns Mutation para processar pagamento
 */
export function useProcessSubscriptionPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      subscriptionId: string;
      paymentAmount: number;
      paymentMethod: string;
    }) => {
      const { data, error } = await supabase.rpc(
        "add_subscription_credits_to_user",
        {
          p_subscription_id: params.subscriptionId,
          p_payment_amount: params.paymentAmount,
          p_payment_method: params.paymentMethod,
        }
      );

      if (error) throw error;

      return data as {
        success: boolean;
        message: string;
        credits_added: number;
        user_id: string;
      };
    },
    onSuccess: (data) => {
      // Invalidar caches relevantes
      queryClient.invalidateQueries({
        queryKey: subscriptionCreditKeys.userSummary(data.user_id)
      });
      queryClient.invalidateQueries({
        queryKey: ["user-coins", "balance", data.user_id]
      });
      queryClient.invalidateQueries({
        queryKey: ["coin-transactions"]
      });

      // Mostrar toast de sucesso
      toast({
        title: "Assinatura processada!",
        description: `Créditos adicionados: ${data.credits_added}`,
        variant: "default",
      });
    },
    onError: (error: unknown) => {
      log.error("Failed to process subscription payment credits", { error });

      const errorMessage = getMutationErrorMessage(error, "Erro ao processar pagamento");

      toast({
        title: "Erro no pagamento",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Calcula preço por crédito para um plano
 */
export function calculatePricePerCredit(plan: SubscriptionCreditPlan): number {
  if (plan.total_credits <= 0) return 0;
  return plan.price_full / plan.total_credits;
}

/**
 * Formata créditos para exibição
 */
export function formatCredits(credits: number): string {
  return new Intl.NumberFormat('pt-BR').format(credits) + " créditos";
}

/**
 * Calcula economia comparando preço avulso com créditos
 */
export function calculateSavings(
  standalonePrice: number,
  creditPricePerUnit: number,
  creditsNeeded: number
): { amount: number; percentage: number } {
  const creditCost = creditPricePerUnit * creditsNeeded;
  const savingsAmount = standalonePrice - creditCost;
  const savingsPercentage = (savingsAmount / standalonePrice) * 100;

  return {
    amount: Math.max(0, savingsAmount),
    percentage: Math.max(0, savingsPercentage),
  };
}

/**
 * Verifica se créditos estão prestes a expirar
 */
export function isCreditsExpiringSoon(
  expiryDate?: string,
  warningDays: number = 7
): { isExpiring: boolean; daysRemaining?: number } {
  if (!expiryDate) {
    return { isExpiring: false };
  }

  const expiry = new Date(expiryDate);
  const now = new Date();
  const daysRemaining = Math.ceil(
    (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    isExpiring: daysRemaining <= warningDays,
    daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
  };
}
