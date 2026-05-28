/**
 * Template Service
 * Processa templates de mensagens com variáveis dinâmicas
 * Substitui placeholders por dados reais do cliente
 */

import { supabase } from "@/integrations/supabase/client";
import { log } from "@/lib/logger";
import { parseSystemSettingNumber } from "@/lib/system-settings-values";
import { BATCH, PRICING } from "@/config/constants";
import { fetchOrdersByUserId } from "@/services/admin/orders-service";

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
}

// Variáveis disponíveis para templates
export const TEMPLATE_VARIABLES: TemplateVariable[] = [
  // Cliente
  {
    key: "{{NOME_CLIENTE}}",
    label: "Nome do Cliente",
    description: "Nome completo do cliente",
    example: "João Silva",
  },
  {
    key: "{{EMAIL_CLIENTE}}",
    label: "Email do Cliente",
    description: "Email do cliente",
    example: "joao@email.com",
  },

  // Pedidos
  {
    key: "{{ULTIMO_PEDIDO_ID}}",
    label: "ID do Último Pedido",
    description: "ID do pedido mais recente",
    example: "#12345",
  },
  {
    key: "{{ULTIMO_PEDIDO_STATUS}}",
    label: "Status do Último Pedido",
    description: "Status atual do último pedido",
    example: "Em produção",
  },
  {
    key: "{{ULTIMO_PEDIDO_RASTREIO}}",
    label: "Código de Rastreio",
    description: "Código de rastreamento do último pedido",
    example: "BR123456789BR",
  },
  {
    key: "{{ULTIMO_PEDIDO_DATA}}",
    label: "Data do Último Pedido",
    description: "Data de criação do último pedido",
    example: "15/02/2026",
  },

  // Orçamentos
  {
    key: "{{ULTIMO_ORCAMENTO_ID}}",
    label: "ID do Último Orçamento",
    description: "ID do orçamento mais recente",
    example: "#ORC-789",
  },
  {
    key: "{{ULTIMO_ORCAMENTO_VALOR}}",
    label: "Valor do Último Orçamento",
    description: "Valor total do último orçamento",
    example: "R$ 150,00",
  },

  // Pagamentos
  {
    key: "{{ULTIMO_PAGAMENTO_VALOR}}",
    label: "Valor do Último Pagamento",
    description: "Valor do pagamento mais recente",
    example: "R$ 75,00",
  },
  {
    key: "{{ULTIMO_PAGAMENTO_STATUS}}",
    label: "Status do Último Pagamento",
    description: "Status do pagamento mais recente",
    example: "Aprovado",
  },

  // Assinatura
  {
    key: "{{ASSINATURA_PLANO}}",
    label: "Plano da Assinatura",
    description: "Nome do plano de assinatura ativo",
    example: "Premium",
  },
  {
    key: "{{ASSINATURA_STATUS}}",
    label: "Status da Assinatura",
    description: "Status da assinatura",
    example: "Ativa",
  },

  // Data e Hora
  {
    key: "{{DATA_HOJE}}",
    label: "Data de Hoje",
    description: "Data atual formatada",
    example: "22/02/2026",
  },
  {
    key: "{{HORA_ATUAL}}",
    label: "Hora Atual",
    description: "Hora atual formatada",
    example: "14:30",
  },

  // ===== CONFIGURAÇÕES DO SISTEMA (SSOT) =====

  // Preços
  {
    key: "{{PRECO_PADRAO}}",
    label: "Preço Padrão (Cheio)",
    description: "Preço padrão cheio das peças (system_settings)",
    example: "R$ 500,00",
  },
  {
    key: "{{PRECO_PIX}}",
    label: "Preço PIX",
    description: "Preço padrão com desconto PIX (system_settings)",
    example: "R$ 475,00",
  },
  {
    key: "{{VALOR_ENTRADA}}",
    label: "Valor da Entrada",
    description: "Valor padrão da entrada (system_settings)",
    example: "R$ 100,00",
  },

  // Descontos
  {
    key: "{{DESCONTO_PIX}}",
    label: "Desconto PIX (%)",
    description: "Percentual de desconto PIX (system_settings)",
    example: "5%",
  },
  {
    key: "{{DESCONTO_PIX_VALOR}}",
    label: "Desconto PIX (Valor)",
    description: "Valor do desconto PIX sobre preço padrão",
    example: "R$ 25,00",
  },

  // Limites de Produção
  {
    key: "{{LIMITE_MENSAL}}",
    label: "Limite de Produção Mensal",
    description: "Limite global de produção do mês (system_settings)",
    example: "20 peças",
  },
  {
    key: "{{VENDAS_MES_ATUAL}}",
    label: "Vendas do Mês Atual",
    description: "Quantidade vendida no mês atual",
    example: "12 peças",
  },
  {
    key: "{{VAGAS_DISPONIVEIS}}",
    label: "Vagas Disponíveis",
    description: "Vagas restantes no mês atual",
    example: "8 vagas",
  },
  {
    key: "{{PERCENTUAL_VENDIDO}}",
    label: "Percentual Vendido",
    description: "Percentual do limite mensal já vendido",
    example: "60%",
  },

  // Datas de Abertura
  {
    key: "{{DIA_ABERTURA_VENDAS}}",
    label: "Dia de Abertura das Vendas",
    description: "Dia do mês em que as vendas abrem (system_settings)",
    example: "Dia 15",
  },
];

/**
 * Busca configurações do sistema (SSOT - Single Source of Truth)
 * Todas as informações vêm do banco de dados, garantindo dados sempre atualizados
 */
export async function fetchSystemSettings(): Promise<SystemSettings> {
  const settings: SystemSettings = {
    pixDiscountPercentage: PRICING.PIX_DISCOUNT_PERCENTAGE,
    defaultPriceFull: PRICING.DEFAULT_PRICE_FULL,
    defaultPricePix: PRICING.DEFAULT_PRICE_PIX,
    defaultDepositAmount: PRICING.DEFAULT_DEPOSIT_AMOUNT,
    monthlyProductionLimit: BATCH.MONTHLY_PRODUCTION_LIMIT,
    salesOpenDay: BATCH.SALES_OPEN_DAY,
  };

  try {
    // Buscar todas as configurações de uma vez
    const { data: systemSettings, error } = await supabase
      .from("system_settings")
      .select("key, value")
      .in("key", [
        "pix_discount_percentage",
        "default_price_full",
        "default_price_pix",
        "default_deposit_amount",
        "monthly_production_limit",
        "sales_open_day",
      ]);

    if (!error && systemSettings) {
      systemSettings.forEach((setting) => {
        const value = parseSystemSettingNumber(setting.key, setting.value);
        switch (setting.key) {
          case "pix_discount_percentage":
            settings.pixDiscountPercentage = value;
            break;
          case "default_price_full":
            settings.defaultPriceFull = value;
            break;
          case "default_price_pix":
            settings.defaultPricePix = value;
            break;
          case "default_deposit_amount":
            settings.defaultDepositAmount = value;
            break;
          case "monthly_production_limit":
            settings.monthlyProductionLimit = value;
            break;
          case "sales_open_day":
            settings.salesOpenDay = value;
            break;
        }
      });
    }

    // Buscar informações do mês atual usando a função do banco
    try {
      const { data: productionData, error: prodError } = await supabase.rpc(
        "get_current_production_limit"
      );

      if (!prodError && productionData && productionData.length > 0) {
        const current = productionData[0];
        settings.currentMonthLimit = current.prod_global_limit;
        settings.currentMonthSold = current.prod_units_sold;
        settings.currentMonthAvailable = current.prod_available;
      }
    } catch (error) {
      log.debug("Limite de produção atual indisponível para templates", { error });
    }
  } catch (error) {
    log.error("Erro ao buscar configurações do sistema para templates", { error });
  }

  return settings;
}

/**
 * Busca dados do cliente para substituição de variáveis
 * Versão otimizada que evita erros 404/400 no console
 */
export async function fetchCustomerData(userId: string): Promise<CustomerData> {
  const customerData: CustomerData = {
    userId,
    orders: [],
    quotes: [],
    payments: [],
    subscription: null,
  };

  try {
    // Buscar dados do perfil
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", userId)
        .maybeSingle();

      if (!error && profile) {
        customerData.name = profile.full_name ?? undefined;
        customerData.email = profile.email ?? undefined;
      }
    } catch (error) {
      log.debug("Dados de perfil indisponíveis para template", { error, userId });
    }

    // Buscar orçamentos (quotes) - esta tabela provavelmente existe
    try {
      const { data: quotes, error } = await supabase
        .from("quotes")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (!error) {
        customerData.quotes = (quotes || []) as CustomerQuoteTemplateData[];
      }
    } catch (error) {
      log.debug("Orçamentos indisponíveis para template", { error, userId });
    }

    // Buscar pagamentos manuais
    try {
      const { data: payments, error } = await supabase
        .from("manual_payments")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (!error) {
        customerData.payments = (payments || []) as CustomerPaymentTemplateData[];
      }
    } catch (error) {
      log.debug("Pagamentos indisponíveis para template", { error, userId });
    }

    // Buscar pedidos pelo serviço unificado de pedidos
    try {
      const orders = await fetchOrdersByUserId(userId);
      customerData.orders = orders.slice(0, 5).map((order) => ({
        id: order.id,
        status: order.status,
        tracking_code: order.trackingCode,
        created_at: order.createdAt,
      }));
    } catch (error) {
      log.debug("Pedidos indisponíveis para template", { error, userId });
    }

    // Buscar assinatura ativa (estrutura real: collection_id, plan_type)
    try {
      const { data: subscription, error } = await supabase
        .from("subscriptions")
        .select(
          `
          *,
          collections (
            name,
            description
          )
        `
        )
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();

      if (!error && subscription) {
        customerData.subscription = subscription as CustomerSubscriptionTemplateData;
      }
    } catch (error) {
      log.debug("Assinatura indisponível para template", { error, userId });
    }
  } catch (error) {
    log.error("Erro ao buscar dados do cliente para template", { error, userId });
  }

  return customerData;
}

/**
 * Formata valor monetário
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/**
 * Formata data
 */
function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR");
}

/**
 * Formata hora
 */
function formatTime(date: Date = new Date()): string {
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Traduz status de pedido
 */
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
  return statusMap[status] || status;
}

/**
 * Traduz status de pagamento
 */
function translatePaymentStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending: "Pendente",
    approved: "Aprovado",
    rejected: "Rejeitado",
    cancelled: "Cancelado",
  };
  return statusMap[status] || status;
}

/**
 * Detecta se o template tem variáveis de pedido
 */
function hasOrderVariables(template: string): boolean {
  return /\{\{ULTIMO_PEDIDO_(ID|STATUS|RASTREIO|DATA)\}\}/g.test(template);
}

/**
 * Detecta se o template tem variáveis de orçamento
 */
function hasQuoteVariables(template: string): boolean {
  return /\{\{ULTIMO_ORCAMENTO_(ID|VALOR)\}\}/g.test(template);
}

/**
 * Detecta se o template tem variáveis de pagamento
 */
function hasPaymentVariables(template: string): boolean {
  return /\{\{ULTIMO_PAGAMENTO_(VALOR|STATUS)\}\}/g.test(template);
}

/**
 * Detecta se o template tem variáveis de assinatura
 */
function hasSubscriptionVariables(template: string): boolean {
  return /\{\{ASSINATURA_(PLANO|STATUS)\}\}/g.test(template);
}

/**
 * Processa template substituindo variáveis por dados reais
 * Busca dados do cliente E configurações do sistema (SSOT)
 * Ajusta mensagem automaticamente quando não há dados
 */
export async function processTemplate(
  template: string,
  customerData: CustomerData
): Promise<string> {
  let processed = template;

  // Buscar configurações do sistema (SSOT)
  const systemSettings = await fetchSystemSettings();

  // ===== DADOS DO CLIENTE =====
  processed = processed.replace(/\{\{NOME_CLIENTE\}\}/g, customerData.name || "Cliente");
  processed = processed.replace(/\{\{EMAIL_CLIENTE\}\}/g, customerData.email || "");

  // ===== ÚLTIMO PEDIDO =====
  const lastOrder = customerData.orders?.[0];
  const hasOrderVars = hasOrderVariables(template);

  if (lastOrder) {
    // Cliente TEM pedido - substituir normalmente
    processed = processed.replace(/\{\{ULTIMO_PEDIDO_ID\}\}/g, `#${lastOrder.id.substring(0, 8)}`);
    processed = processed.replace(
      /\{\{ULTIMO_PEDIDO_STATUS\}\}/g,
      translateOrderStatus(lastOrder.status)
    );
    processed = processed.replace(
      /\{\{ULTIMO_PEDIDO_RASTREIO\}\}/g,
      lastOrder.tracking_code || "ainda não disponível"
    );
    processed = processed.replace(/\{\{ULTIMO_PEDIDO_DATA\}\}/g, formatDate(lastOrder.created_at));
  } else if (hasOrderVars) {
    // Cliente NÃO TEM pedido - substituir mensagem inteira por algo apropriado

    // Detectar tipo de mensagem pelo contexto
    const isDeliveryMessage = /foi entregue|entregue com sucesso|recebeu|chegou/i.test(template);
    const isShippedMessage = /foi enviado|já enviamos|em trânsito|rastreamento/i.test(template);
    const isProductionMessage = /em produção|produzindo|fabricando/i.test(template);
    const isStatusMessage = /status|situação|andamento/i.test(template);

    if (isDeliveryMessage) {
      // Mensagem sobre entrega - cliente não tem pedidos
      processed = `Olá ${customerData.name || "Cliente"}! 😊\n\nVocê ainda não tem pedidos registrados no sistema.\n\nGostaria de fazer um pedido? Posso te ajudar com informações sobre nossos produtos e preços! 🎯`;
    } else if (isShippedMessage) {
      // Mensagem sobre envio - cliente não tem pedidos
      processed = `Olá ${customerData.name || "Cliente"}! 👋\n\nVocê ainda não tem pedidos registrados no sistema.\n\nAssim que você fizer um pedido, enviaremos o código de rastreamento para acompanhar a entrega! 📦`;
    } else if (isProductionMessage) {
      // Mensagem sobre produção - cliente não tem pedidos
      processed = `Olá ${customerData.name || "Cliente"}! 😊\n\nVocê ainda não tem pedidos em produção no momento.\n\nQuer fazer um pedido? Nosso prazo de produção é de 15-20 dias úteis! 🎨`;
    } else if (isStatusMessage) {
      // Mensagem sobre status - cliente não tem pedidos
      processed = `Olá ${customerData.name || "Cliente"}! 👋\n\nVocê ainda não tem pedidos registrados no sistema.\n\nGostaria de fazer um pedido? Posso te passar todas as informações! 😊`;
    } else {
      // Mensagem genérica - remover partes específicas do pedido
      processed = processed.replace(
        /Seu pedido \{\{ULTIMO_PEDIDO_ID\}\}[^.!?]*[.!?]/g,
        "Você ainda não tem pedidos registrados."
      );
      processed = processed.replace(
        /O pedido \{\{ULTIMO_PEDIDO_ID\}\}[^.!?]*[.!?]/g,
        "Você ainda não tem pedidos registrados."
      );
      processed = processed.replace(
        /Pedido \{\{ULTIMO_PEDIDO_ID\}\}[^.!?]*[.!?]/g,
        "Você ainda não tem pedidos."
      );

      // Remover linhas de detalhes
      processed = processed.replace(/.*Status.*\{\{ULTIMO_PEDIDO_STATUS\}\}.*/g, "");
      processed = processed.replace(
        /.*[Cc]ódigo de rastreamento.*\{\{ULTIMO_PEDIDO_RASTREIO\}\}.*/g,
        ""
      );
      processed = processed.replace(/.*[Rr]astreio.*\{\{ULTIMO_PEDIDO_RASTREIO\}\}.*/g, "");
      processed = processed.replace(/.*[Dd]ata.*\{\{ULTIMO_PEDIDO_DATA\}\}.*/g, "");

      // Substituir variáveis restantes
      processed = processed.replace(/\{\{ULTIMO_PEDIDO_ID\}\}/g, "");
      processed = processed.replace(/\{\{ULTIMO_PEDIDO_STATUS\}\}/g, "");
      processed = processed.replace(/\{\{ULTIMO_PEDIDO_RASTREIO\}\}/g, "");
      processed = processed.replace(/\{\{ULTIMO_PEDIDO_DATA\}\}/g, "");
    }

    // Limpar linhas vazias múltiplas
    processed = processed.replace(/\n\s*\n\s*\n+/g, "\n\n");
    processed = processed.trim();
  }

  // ===== ÚLTIMO ORÇAMENTO =====
  const lastQuote = customerData.quotes?.[0];
  const hasQuoteVars = hasQuoteVariables(template);

  if (lastQuote) {
    // Cliente TEM orçamento - substituir normalmente
    processed = processed.replace(
      /\{\{ULTIMO_ORCAMENTO_ID\}\}/g,
      `#ORC-${lastQuote.id.substring(0, 6)}`
    );
    processed = processed.replace(
      /\{\{ULTIMO_ORCAMENTO_VALOR\}\}/g,
      formatCurrency(lastQuote.total_price || 0)
    );
  } else if (hasQuoteVars) {
    // Cliente NÃO TEM orçamento - detectar contexto
    const isApprovedMessage = /aprovado|confirmado|aceito/i.test(template);
    const isPendingMessage = /pendente|aguardando|esperando/i.test(template);

    if (isApprovedMessage) {
      processed = `Olá ${customerData.name || "Cliente"}! 😊\n\nVocê ainda não tem orçamentos registrados no sistema.\n\nGostaria de solicitar um orçamento? Posso te ajudar com isso! 💰`;
    } else if (isPendingMessage) {
      processed = `Olá ${customerData.name || "Cliente"}! 👋\n\nVocê não tem orçamentos pendentes no momento.\n\nPrecisa de um orçamento para algum produto? Estou aqui para ajudar! 😊`;
    } else {
      // Remover partes específicas
      processed = processed.replace(
        /Seu orçamento \{\{ULTIMO_ORCAMENTO_ID\}\}[^.!?]*[.!?]/g,
        "Você ainda não tem orçamentos registrados."
      );
      processed = processed.replace(
        /O orçamento \{\{ULTIMO_ORCAMENTO_ID\}\}[^.!?]*[.!?]/g,
        "Você ainda não tem orçamentos."
      );
      processed = processed.replace(/Orçamento \{\{ULTIMO_ORCAMENTO_ID\}\}/g, "");
      processed = processed.replace(/.*[Vv]alor.*\{\{ULTIMO_ORCAMENTO_VALOR\}\}.*/g, "");
      processed = processed.replace(/.*[Tt]otal.*\{\{ULTIMO_ORCAMENTO_VALOR\}\}.*/g, "");

      processed = processed.replace(/\{\{ULTIMO_ORCAMENTO_ID\}\}/g, "");
      processed = processed.replace(/\{\{ULTIMO_ORCAMENTO_VALOR\}\}/g, "");
    }

    processed = processed.replace(/\n\s*\n\s*\n+/g, "\n\n");
    processed = processed.trim();
  }

  // ===== ÚLTIMO PAGAMENTO =====
  const lastPayment = customerData.payments?.[0];
  const hasPaymentVars = hasPaymentVariables(template);

  if (lastPayment) {
    // Cliente TEM pagamento - substituir normalmente
    processed = processed.replace(
      /\{\{ULTIMO_PAGAMENTO_VALOR\}\}/g,
      formatCurrency(lastPayment.amount || 0)
    );
    processed = processed.replace(
      /\{\{ULTIMO_PAGAMENTO_STATUS\}\}/g,
      translatePaymentStatus(lastPayment.status)
    );
  } else if (hasPaymentVars) {
    // Cliente NÃO TEM pagamento - detectar contexto
    const isConfirmedMessage = /confirmado|recebido|aprovado/i.test(template);
    const isPendingMessage = /aguardando|pendente|esperando/i.test(template);

    if (isConfirmedMessage) {
      processed = `Olá ${customerData.name || "Cliente"}! 😊\n\nVocê ainda não tem pagamentos registrados no sistema.\n\nQuando realizar um pagamento, confirmaremos aqui imediatamente! ✅`;
    } else if (isPendingMessage) {
      processed = `Olá ${customerData.name || "Cliente"}! 👋\n\nVocê não tem pagamentos pendentes no momento.\n\nQuando fizer um pedido, te enviaremos as informações de pagamento! 💰`;
    } else {
      // Remover partes específicas
      processed = processed.replace(
        /Seu pagamento de \{\{ULTIMO_PAGAMENTO_VALOR\}\}[^.!?]*[.!?]/g,
        "Você ainda não tem pagamentos registrados."
      );
      processed = processed.replace(/Pagamento de \{\{ULTIMO_PAGAMENTO_VALOR\}\}/g, "");
      processed = processed.replace(/.*[Vv]alor.*\{\{ULTIMO_PAGAMENTO_VALOR\}\}.*/g, "");
      processed = processed.replace(/.*[Ss]tatus.*\{\{ULTIMO_PAGAMENTO_STATUS\}\}.*/g, "");

      processed = processed.replace(/\{\{ULTIMO_PAGAMENTO_VALOR\}\}/g, "");
      processed = processed.replace(/\{\{ULTIMO_PAGAMENTO_STATUS\}\}/g, "");
    }

    processed = processed.replace(/\n\s*\n\s*\n+/g, "\n\n");
    processed = processed.trim();
  }

  // ===== ASSINATURA =====
  const hasSubVars = hasSubscriptionVariables(template);

  if (customerData.subscription) {
    // Cliente TEM assinatura - substituir normalmente
    const planName = customerData.subscription.collections?.name || "N/A";
    const planType = customerData.subscription.plan_type || "";
    const fullPlanName = planType ? `${planName} (${planType})` : planName;

    processed = processed.replace(/\{\{ASSINATURA_PLANO\}\}/g, fullPlanName);
    processed = processed.replace(
      /\{\{ASSINATURA_STATUS\}\}/g,
      customerData.subscription.status === "active" ? "Ativa" : "Inativa"
    );
  } else if (hasSubVars) {
    // Cliente NÃO TEM assinatura - detectar contexto
    const isActiveMessage = /ativa|funcionando|vigente/i.test(template);
    const isStatusMessage = /status|situação/i.test(template);

    if (isActiveMessage || isStatusMessage) {
      processed = `Olá ${customerData.name || "Cliente"}! 😊\n\nVocê ainda não tem uma assinatura ativa.\n\nGostaria de conhecer nossos planos de assinatura? Temos ótimas vantagens! 🎯`;
    } else {
      // Remover partes específicas
      processed = processed.replace(
        /Sua assinatura \{\{ASSINATURA_PLANO\}\}[^.!?]*[.!?]/g,
        "Você ainda não tem assinatura ativa."
      );
      processed = processed.replace(/Assinatura \{\{ASSINATURA_PLANO\}\}/g, "");
      processed = processed.replace(/.*[Pp]lano.*\{\{ASSINATURA_PLANO\}\}.*/g, "");
      processed = processed.replace(/.*[Ss]tatus.*\{\{ASSINATURA_STATUS\}\}.*/g, "");

      processed = processed.replace(/\{\{ASSINATURA_PLANO\}\}/g, "");
      processed = processed.replace(/\{\{ASSINATURA_STATUS\}\}/g, "");
    }

    processed = processed.replace(/\n\s*\n\s*\n+/g, "\n\n");
    processed = processed.trim();
  }

  // ===== DATA E HORA ATUAIS =====
  processed = processed.replace(/\{\{DATA_HOJE\}\}/g, formatDate(new Date()));
  processed = processed.replace(/\{\{HORA_ATUAL\}\}/g, formatTime());

  // ===== CONFIGURAÇÕES DO SISTEMA (SSOT) =====

  // Preços
  processed = processed.replace(
    /\{\{PRECO_PADRAO\}\}/g,
    formatCurrency(systemSettings.defaultPriceFull)
  );
  processed = processed.replace(
    /\{\{PRECO_PIX\}\}/g,
    formatCurrency(systemSettings.defaultPricePix)
  );
  processed = processed.replace(
    /\{\{VALOR_ENTRADA\}\}/g,
    formatCurrency(systemSettings.defaultDepositAmount)
  );

  // Descontos
  processed = processed.replace(
    /\{\{DESCONTO_PIX\}\}/g,
    `${systemSettings.pixDiscountPercentage}%`
  );
  const descontoValor = systemSettings.defaultPriceFull - systemSettings.defaultPricePix;
  processed = processed.replace(/\{\{DESCONTO_PIX_VALOR\}\}/g, formatCurrency(descontoValor));

  // Limites de Produção
  processed = processed.replace(
    /\{\{LIMITE_MENSAL\}\}/g,
    `${systemSettings.monthlyProductionLimit} peças`
  );

  if (systemSettings.currentMonthSold !== undefined) {
    processed = processed.replace(
      /\{\{VENDAS_MES_ATUAL\}\}/g,
      `${systemSettings.currentMonthSold} peças`
    );
  } else {
    processed = processed.replace(/\{\{VENDAS_MES_ATUAL\}\}/g, "N/A");
  }

  if (systemSettings.currentMonthAvailable !== undefined) {
    processed = processed.replace(
      /\{\{VAGAS_DISPONIVEIS\}\}/g,
      `${systemSettings.currentMonthAvailable} vagas`
    );
  } else {
    processed = processed.replace(/\{\{VAGAS_DISPONIVEIS\}\}/g, "N/A");
  }

  if (
    systemSettings.currentMonthSold !== undefined &&
    systemSettings.currentMonthLimit !== undefined
  ) {
    const percentual =
      systemSettings.currentMonthLimit > 0
        ? Math.round((systemSettings.currentMonthSold / systemSettings.currentMonthLimit) * 100)
        : 0;
    processed = processed.replace(/\{\{PERCENTUAL_VENDIDO\}\}/g, `${percentual}%`);
  } else {
    processed = processed.replace(/\{\{PERCENTUAL_VENDIDO\}\}/g, "N/A");
  }

  // Datas de Abertura
  processed = processed.replace(
    /\{\{DIA_ABERTURA_VENDAS\}\}/g,
    `Dia ${systemSettings.salesOpenDay}`
  );

  return processed;
}

/**
 * Detecta variáveis usadas em um template
 */
export function detectVariables(template: string): string[] {
  const regex = /\{\{([A-Z_]+)\}\}/g;
  const matches = template.matchAll(regex);
  return Array.from(matches, (m) => `{{${m[1]}}}`);
}

/**
 * Valida se todas as variáveis são conhecidas
 */
export function validateTemplate(template: string): { valid: boolean; unknownVars: string[] } {
  const usedVars = detectVariables(template);
  const knownVars = TEMPLATE_VARIABLES.map((v) => v.key);
  const unknownVars = usedVars.filter((v) => !knownVars.includes(v));

  return {
    valid: unknownVars.length === 0,
    unknownVars,
  };
}
