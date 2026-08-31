import { supabase } from "@/integrations/supabase/client";
import { log } from "@/lib/logger";
import { formatCurrency } from "@/lib/utils";
import { fetchOrdersByUserId } from "@/services/admin/orders/orders-service";
import { requireCurrentUserAdminAccess } from "@/services/auth/current-user";
import { fetchPricingSettings } from "@/services/pricing/pricing-settings-service";

export interface TemplateVariable {
  key: string;
  label: string;
  description: string;
  example: string;
}

export interface CustomerOrderTemplateData {
  id: string;
  status: string;
  tracking_code?: string | null;
  created_at: string;
}

export interface CustomerQuoteTemplateData {
  id: string;
  total_price?: number | null;
  total_amount?: number | null;
}

export interface CustomerPaymentTemplateData {
  amount?: number | null;
  status: string;
}

export interface CustomerSubscriptionTemplateData {
  status: string;
  plan_type?: string | null;
  collections?: {
    name?: string | null;
  } | null;
}

export interface CustomerData {
  userId: string;
  name?: string;
  email?: string;
  orders?: CustomerOrderTemplateData[];
  quotes?: CustomerQuoteTemplateData[];
  payments?: CustomerPaymentTemplateData[];
  subscription?: CustomerSubscriptionTemplateData | null;
}

export interface SystemSettings {
  pixDiscountPercentage: number;
  defaultPriceFull: number;
  defaultPricePix: number;
  defaultDepositAmount: number;
  monthlyProductionLimit: number;
  salesOpenDay: number;
  currentMonthLimit?: number;
  currentMonthSold?: number;
  currentMonthAvailable?: number;
  currentMonthPercentage?: number;
}

export const TEMPLATE_VARIABLES: TemplateVariable[] = [
  { key: "{{NOME_CLIENTE}}", label: "Nome do Cliente", description: "Nome completo do cliente", example: "Nome do cliente" },
  { key: "{{EMAIL_CLIENTE}}", label: "Email do Cliente", description: "Email do cliente", example: "cliente@dominio.com" },
  { key: "{{ULTIMO_PEDIDO_ID}}", label: "ID do Último Pedido", description: "ID do pedido mais recente", example: "#pedido" },
  { key: "{{ULTIMO_PEDIDO_STATUS}}", label: "Status do Último Pedido", description: "Status atual do último pedido", example: "Em produção" },
  { key: "{{ULTIMO_PEDIDO_RASTREIO}}", label: "Código de Rastreio", description: "Código de rastreamento do último pedido", example: "código disponível" },
  { key: "{{ULTIMO_PEDIDO_DATA}}", label: "Data do Último Pedido", description: "Data de criação do último pedido", example: "data do pedido" },
  { key: "{{ULTIMO_ORCAMENTO_ID}}", label: "ID do Último Orçamento", description: "ID do orçamento mais recente", example: "#orçamento" },
  { key: "{{ULTIMO_ORCAMENTO_VALOR}}", label: "Valor do Último Orçamento", description: "Valor total do orçamento mais recente", example: "valor do orçamento" },
  { key: "{{ULTIMO_PAGAMENTO_VALOR}}", label: "Valor do Último Pagamento", description: "Valor do pagamento mais recente", example: "valor do pagamento" },
  { key: "{{ULTIMO_PAGAMENTO_STATUS}}", label: "Status do Último Pagamento", description: "Status do pagamento mais recente", example: "Aprovado" },
  { key: "{{ASSINATURA_PLANO}}", label: "Plano da Assinatura", description: "Plano da assinatura ativa", example: "plano ativo" },
  { key: "{{ASSINATURA_STATUS}}", label: "Status da Assinatura", description: "Status da assinatura", example: "Ativa" },
  { key: "{{DATA_HOJE}}", label: "Data de Hoje", description: "Data atual formatada", example: "data atual" },
  { key: "{{HORA_ATUAL}}", label: "Hora Atual", description: "Hora atual formatada", example: "hora atual" },
  { key: "{{PRECO_PADRAO}}", label: "Preço Padrão", description: "Preço cheio oficial em system_settings", example: "preço oficial" },
  { key: "{{PRECO_PIX}}", label: "Preço PIX", description: "Preço PIX oficial em system_settings", example: "preço PIX oficial" },
  { key: "{{VALOR_ENTRADA}}", label: "Valor da Entrada", description: "Entrada oficial em system_settings", example: "entrada oficial" },
  { key: "{{DESCONTO_PIX}}", label: "Desconto PIX (%)", description: "Percentual oficial de desconto PIX", example: "percentual configurado" },
  { key: "{{DESCONTO_PIX_VALOR}}", label: "Desconto PIX (Valor)", description: "Diferença entre preço cheio e PIX", example: "desconto calculado" },
  { key: "{{LIMITE_MENSAL}}", label: "Limite de Produção Mensal", description: "Limite mensal configurado", example: "limite configurado" },
  { key: "{{VENDAS_MES_ATUAL}}", label: "Vendas do Mês Atual", description: "Quantidade vendida no mês atual", example: "vendas atuais" },
  { key: "{{VAGAS_DISPONIVEIS}}", label: "Vagas Disponíveis", description: "Capacidade restante no mês atual", example: "vagas atuais" },
  { key: "{{PERCENTUAL_VENDIDO}}", label: "Percentual Vendido", description: "Percentual do limite mensal utilizado", example: "percentual atual" },
  { key: "{{DIA_ABERTURA_VENDAS}}", label: "Dia de Abertura das Vendas", description: "Dia mensal configurado para abertura", example: "dia configurado" },
];

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function formatOptionalCurrency(value: number | null | undefined): string {
  return isFiniteNumber(value) && value >= 0 ? formatCurrency(value) : "não disponível";
}

function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime()) ? "não disponível" : date.toLocaleDateString("pt-BR");
}

function formatTime(value: Date = new Date()): string {
  return value.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function translateOrderStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending: "Pendente",
    confirmed: "Confirmado",
    in_production: "Em produção",
    ready: "Pronto",
    shipped: "Enviado",
    delivered: "Entregue",
    cancelled: "Cancelado",
  };
  return statusMap[status] ?? status;
}

function translatePaymentStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending: "Pendente",
    approved: "Aprovado",
    rejected: "Rejeitado",
    cancelled: "Cancelado",
  };
  return statusMap[status] ?? status;
}

export async function fetchSystemSettings(): Promise<SystemSettings> {
  const pricing = await fetchPricingSettings();

  return {
    pixDiscountPercentage: pricing.pixDiscountPercentage,
    defaultPriceFull: pricing.defaultPriceFull,
    defaultPricePix: pricing.defaultPricePix,
    defaultDepositAmount: pricing.defaultDepositAmount,
    monthlyProductionLimit: pricing.monthlyProductionLimit,
    salesOpenDay: pricing.salesOpenDay,
    currentMonthLimit: pricing.currentMonthLimit,
    currentMonthSold: pricing.currentMonthSold,
    currentMonthAvailable: pricing.currentMonthAvailable,
    currentMonthPercentage: pricing.currentMonthPercentage,
  };
}

export async function fetchCustomerData(userId: string): Promise<CustomerData> {
  await requireCurrentUserAdminAccess();

  const customerData: CustomerData = {
    userId,
    orders: [],
    quotes: [],
    payments: [],
    subscription: null,
  };

  const [profileResult, quotesResult, paymentsResult, ordersResult, subscriptionResult] =
    await Promise.allSettled([
      supabase.from("profiles").select("full_name, email").eq("id", userId).maybeSingle(),
      supabase
        .from("quotes")
        .select("id, total_price, total_amount")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("manual_payments")
        .select("amount, status")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5),
      fetchOrdersByUserId(userId),
      supabase
        .from("subscriptions")
        .select("status, plan_type, collections(name)")
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle(),
    ]);

  if (profileResult.status === "fulfilled" && !profileResult.value.error) {
    const profile = profileResult.value.data;
    customerData.name = profile?.full_name ?? undefined;
    customerData.email = profile?.email ?? undefined;
  } else if (profileResult.status === "rejected") {
    log.debug("Dados de perfil indisponíveis para template", { error: profileResult.reason, userId });
  }

  if (quotesResult.status === "fulfilled" && !quotesResult.value.error) {
    customerData.quotes = (quotesResult.value.data ?? []) as CustomerQuoteTemplateData[];
  } else if (quotesResult.status === "rejected") {
    log.debug("Orçamentos indisponíveis para template", { error: quotesResult.reason, userId });
  }

  if (paymentsResult.status === "fulfilled" && !paymentsResult.value.error) {
    customerData.payments = (paymentsResult.value.data ?? []) as CustomerPaymentTemplateData[];
  } else if (paymentsResult.status === "rejected") {
    log.debug("Pagamentos indisponíveis para template", { error: paymentsResult.reason, userId });
  }

  if (ordersResult.status === "fulfilled") {
    customerData.orders = ordersResult.value.slice(0, 5).map((order) => ({
      id: order.id,
      status: order.status,
      tracking_code: order.trackingCode,
      created_at: order.createdAt,
    }));
  } else {
    log.debug("Pedidos indisponíveis para template", { error: ordersResult.reason, userId });
  }

  if (subscriptionResult.status === "fulfilled" && !subscriptionResult.value.error) {
    customerData.subscription =
      (subscriptionResult.value.data as CustomerSubscriptionTemplateData | null) ?? null;
  } else if (subscriptionResult.status === "rejected") {
    log.debug("Assinatura indisponível para template", { error: subscriptionResult.reason, userId });
  }

  return customerData;
}

function replaceAll(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (output, [key, value]) => output.split(key).join(value),
    template,
  );
}

export async function processTemplate(
  template: string,
  customerData: CustomerData,
): Promise<string> {
  const validation = validateTemplate(template);
  if (!validation.valid) {
    throw new Error(`Template contém variáveis desconhecidas: ${validation.unknownVars.join(", ")}`);
  }

  const systemSettings = await fetchSystemSettings();
  const lastOrder = customerData.orders?.[0];
  const lastQuote = customerData.quotes?.[0];
  const lastPayment = customerData.payments?.[0];
  const subscription = customerData.subscription;
  const subscriptionName = subscription?.collections?.name ?? subscription?.plan_type ?? "sem assinatura ativa";
  const discountValue = systemSettings.defaultPriceFull - systemSettings.defaultPricePix;
  const currentPercentage =
    isFiniteNumber(systemSettings.currentMonthPercentage)
      ? systemSettings.currentMonthPercentage
      : isFiniteNumber(systemSettings.currentMonthSold) &&
          isFiniteNumber(systemSettings.currentMonthLimit) &&
          systemSettings.currentMonthLimit > 0
        ? (systemSettings.currentMonthSold / systemSettings.currentMonthLimit) * 100
        : null;

  const values: Record<string, string> = {
    "{{NOME_CLIENTE}}": customerData.name?.trim() || "Cliente",
    "{{EMAIL_CLIENTE}}": customerData.email?.trim() || "não disponível",
    "{{ULTIMO_PEDIDO_ID}}": lastOrder ? `#${lastOrder.id.slice(0, 8)}` : "sem pedido",
    "{{ULTIMO_PEDIDO_STATUS}}": lastOrder ? translateOrderStatus(lastOrder.status) : "sem pedido",
    "{{ULTIMO_PEDIDO_RASTREIO}}": lastOrder?.tracking_code?.trim() || "não disponível",
    "{{ULTIMO_PEDIDO_DATA}}": lastOrder ? formatDate(lastOrder.created_at) : "não disponível",
    "{{ULTIMO_ORCAMENTO_ID}}": lastQuote ? `#ORC-${lastQuote.id.slice(0, 6)}` : "sem orçamento",
    "{{ULTIMO_ORCAMENTO_VALOR}}": formatOptionalCurrency(lastQuote?.total_price ?? lastQuote?.total_amount),
    "{{ULTIMO_PAGAMENTO_VALOR}}": formatOptionalCurrency(lastPayment?.amount),
    "{{ULTIMO_PAGAMENTO_STATUS}}": lastPayment ? translatePaymentStatus(lastPayment.status) : "sem pagamento",
    "{{ASSINATURA_PLANO}}": subscriptionName,
    "{{ASSINATURA_STATUS}}": subscription?.status === "active" ? "Ativa" : "sem assinatura ativa",
    "{{DATA_HOJE}}": formatDate(new Date()),
    "{{HORA_ATUAL}}": formatTime(),
    "{{PRECO_PADRAO}}": formatCurrency(systemSettings.defaultPriceFull),
    "{{PRECO_PIX}}": formatCurrency(systemSettings.defaultPricePix),
    "{{VALOR_ENTRADA}}": formatCurrency(systemSettings.defaultDepositAmount),
    "{{DESCONTO_PIX}}": `${systemSettings.pixDiscountPercentage.toFixed(2).replace(".", ",")}%`,
    "{{DESCONTO_PIX_VALOR}}": formatCurrency(discountValue),
    "{{LIMITE_MENSAL}}": `${systemSettings.monthlyProductionLimit} peças`,
    "{{VENDAS_MES_ATUAL}}": isFiniteNumber(systemSettings.currentMonthSold)
      ? `${systemSettings.currentMonthSold} peças`
      : "não disponível",
    "{{VAGAS_DISPONIVEIS}}": isFiniteNumber(systemSettings.currentMonthAvailable)
      ? `${systemSettings.currentMonthAvailable} vagas`
      : "não disponível",
    "{{PERCENTUAL_VENDIDO}}": currentPercentage == null
      ? "não disponível"
      : `${currentPercentage.toFixed(0)}%`,
    "{{DIA_ABERTURA_VENDAS}}": `Dia ${systemSettings.salesOpenDay}`,
  };

  const processed = replaceAll(template, values).replace(/\n\s*\n\s*\n+/g, "\n\n").trim();

  if (detectVariables(processed).length > 0) {
    throw new Error("Template não pôde ser resolvido por completo.");
  }

  return processed;
}

export function detectVariables(template: string): string[] {
  const regex = /\{\{([A-Z_]+)\}\}/g;
  return Array.from(template.matchAll(regex), (match) => `{{${match[1]}}}`);
}

export function validateTemplate(template: string): {
  valid: boolean;
  unknownVars: string[];
} {
  const knownVars = new Set(TEMPLATE_VARIABLES.map((variable) => variable.key));
  const unknownVars = detectVariables(template).filter((variable) => !knownVars.has(variable));

  return {
    valid: unknownVars.length === 0,
    unknownVars,
  };
}
