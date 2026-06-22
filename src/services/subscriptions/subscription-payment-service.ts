import { supabase } from "@/integrations/supabase/client";
import { callAdminRpc } from "@/services/admin/admin-rpc-gateway";
import { requireAuthenticatedUserId } from "@/services/auth/current-user";
import type {
  ProcessPaymentResponse,
  ProcessSubscriptionPaymentParams,
  SubscriptionPayment,
  UserId,
} from "@/types/subscription";
import type { CoinsAmount } from "@/types/coins";

type QueryError = { message?: string } | null;

interface SubscriptionPaymentsQueryClient {
  from(table: "subscription_payments"): {
    select(columns: "*"): {
      eq(column: "subscription_id", value: string): {
        order(
          column: "created_at",
          options: { ascending: boolean },
        ): PromiseLike<{ data: SubscriptionPayment[] | null; error: QueryError }>;
      };
    };
  };
}

const subscriptionPaymentsQuery = supabase as unknown as SubscriptionPaymentsQueryClient;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toProcessSubscriptionPaymentResponse(data: unknown): ProcessPaymentResponse {
  if (
    !isRecord(data) ||
    typeof data.success !== "boolean" ||
    !isRecord(data.payment) ||
    typeof data.coins_credited !== "number" ||
    typeof data.new_balance !== "number" ||
    typeof data.message !== "string"
  ) {
    throw new Error("Resposta invalida ao processar pagamento");
  }

  return data as unknown as ProcessPaymentResponse;
}

function mapSubscriptionPaymentRpcError(message: string | undefined): string {
  const value = message ?? "";

  if (value.includes("FORBIDDEN")) return "Apenas admins podem processar pagamentos";
  if (value.includes("SUBSCRIPTION_NOT_FOUND")) return "Assinatura nao encontrada";
  if (value.includes("INVALID_PAYMENT_AMOUNT")) return "Valor de pagamento invalido";
  if (value.includes("INVALID_PAYMENT_METHOD")) return "Metodo de pagamento invalido";
  if (value.includes("EXTERNAL_REFERENCE_REQUIRED")) return "Referencia externa obrigatoria";
  if (value.includes("INVALID_EXTERNAL_REFERENCE")) return "Referencia externa invalida";
  if (value.includes("DUPLICATE_SUBSCRIPTION_PAYMENT")) {
    return "Pagamento ja processado para esta referencia";
  }
  if (value.includes("INVALID_SUBSCRIPTION_STATUS")) return "Status da assinatura invalido";
  if (value.includes("SUBSCRIPTION_CREDITS_NOT_CONFIGURED")) {
    return "Creditos da assinatura nao configurados";
  }
  if (value.includes("USER_NOT_FOUND")) return "Usuario nao encontrado";
  if (value.includes("INVALID_COINS_AMOUNT")) return "Quantidade de coins invalida";
  if (value.includes("COINS_DESCRIPTION_REQUIRED")) return "Motivo obrigatorio";
  if (value.includes("COINS_REFERENCE_ID_REQUIRED")) return "Referencia de credito obrigatoria";
  if (value.includes("DUPLICATE_COIN_CREDIT_REFERENCE")) {
    return "Credito de coins ja processado para esta referencia";
  }

  return value || "Erro ao processar pagamento";
}

export async function processSubscriptionPayment(
  params: ProcessSubscriptionPaymentParams,
): Promise<ProcessPaymentResponse> {
  const { subscription_id, amount, payment_method, external_reference } = params;

  try {
    const data = await callAdminRpc<unknown>("admin_process_subscription_payment", {
      p_subscription_id: subscription_id,
      p_amount: amount,
      p_payment_method: payment_method,
      p_external_reference: external_reference,
    });
    return toProcessSubscriptionPaymentResponse(data);
  } catch (error) {
    throw new Error(
      mapSubscriptionPaymentRpcError(
        error instanceof Error ? error.message : undefined,
      ),
    );
  }
}

export async function adminAddSubscriptionCoins(params: {
  user_id: UserId;
  amount: CoinsAmount;
  reason: string;
}): Promise<{ success: true; amount: CoinsAmount }> {
  const adminUserId = await requireAuthenticatedUserId();

  try {
    await callAdminRpc("admin_add_coins_to_user", {
      p_user_id: params.user_id,
      p_amount: params.amount,
      p_description: `Ajuste manual: ${params.reason}`,
      p_reference_id: adminUserId,
      p_reference_type: "admin_adjustment",
    });
  } catch (error) {
    throw new Error(
      mapSubscriptionPaymentRpcError(
        error instanceof Error ? error.message : undefined,
      ),
    );
  }

  return { success: true, amount: params.amount };
}

export async function listSubscriptionPayments(
  subscriptionId: string,
): Promise<SubscriptionPayment[]> {
  const { data, error } = await subscriptionPaymentsQuery
    .from("subscription_payments")
    .select("*")
    .eq("subscription_id", subscriptionId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Erro ao buscar pagamentos: ${error.message}`);
  }

  return data || [];
}
