import type { PaymentMethod, PaymentMethodType } from "@/types/manual-payment";
import type { Json } from "@/integrations/supabase/types";
import { sanitizeURL } from "@/lib/security/input-sanitizer";

export interface PaymentMethodFormState {
  name: string;
  type: PaymentMethodType;
  instructions: string;
  paymentLink: string;
  pixKey: string;
  accountDetails: string;
  isActive: boolean;
  isDefault: boolean;
}

export interface PaymentMethodPayload {
  name: string;
  type: PaymentMethodType;
  instructions: string;
  payment_link?: string;
  pix_key?: string;
  account_details?: Record<string, Json>;
  is_active: boolean;
  is_default: boolean;
}

export interface PaymentMethodFormValidationError {
  title: string;
  description: string;
}

const DEFAULT_STATE: PaymentMethodFormState = {
  name: "",
  type: "other",
  instructions: "",
  paymentLink: "",
  pixKey: "",
  accountDetails: "",
  isActive: true,
  isDefault: false,
};

export function getInitialPaymentMethodFormState(
  method?: PaymentMethod | null
): PaymentMethodFormState {
  if (!method) {
    return { ...DEFAULT_STATE };
  }

  return {
    name: method.name,
    type: method.type,
    instructions: method.instructions || "",
    paymentLink: method.payment_link || "",
    pixKey: method.pix_key || "",
    accountDetails: method.account_details ? JSON.stringify(method.account_details, null, 2) : "",
    isActive: method.is_active ?? false,
    isDefault: method.is_default ?? false,
  };
}

function parseAccountDetails(accountDetails: string): Record<string, Json> | undefined {
  if (!accountDetails.trim()) {
    return undefined;
  }

  const parsed = JSON.parse(accountDetails) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Account details must be a JSON object");
  }

  return parsed as Record<string, Json>;
}

function sanitizePaymentLink(paymentLink: string): string | undefined {
  const trimmed = paymentLink.trim();
  if (!trimmed) {
    return undefined;
  }

  return sanitizeURL(trimmed, ["http", "https"]);
}

export function validatePaymentMethodForm(
  state: PaymentMethodFormState
): PaymentMethodFormValidationError | null {
  if (!state.name.trim()) {
    return {
      title: "Nome obrigatorio",
      description: "Por favor, informe o nome do metodo de pagamento.",
    };
  }

  if (!state.type) {
    return {
      title: "Tipo obrigatorio",
      description: "Por favor, selecione o tipo do metodo de pagamento.",
    };
  }

  if (state.type === "pix" && !state.pixKey.trim()) {
    return {
      title: "Chave PIX obrigatoria",
      description: "Para metodos PIX, a chave PIX e obrigatoria.",
    };
  }

  if (state.type === "bank_transfer" && !state.accountDetails.trim()) {
    return {
      title: "Dados bancarios obrigatorios",
      description: "Para transferencia bancaria, os dados bancarios sao obrigatorios.",
    };
  }

  if (state.accountDetails.trim()) {
    try {
      parseAccountDetails(state.accountDetails);
    } catch {
      return {
        title: "Dados bancarios invalidos",
        description: "Os dados bancarios devem estar em formato JSON valido.",
      };
    }
  }

  if (state.paymentLink.trim()) {
    try {
      sanitizePaymentLink(state.paymentLink);
    } catch {
      return {
        title: "Link de pagamento invalido",
        description: "Informe uma URL http ou https valida para o link de pagamento.",
      };
    }
  }

  return null;
}

export function buildPaymentMethodPayload(state: PaymentMethodFormState): PaymentMethodPayload {
  return {
    name: state.name,
    type: state.type,
    instructions: state.instructions,
    payment_link: sanitizePaymentLink(state.paymentLink),
    pix_key: state.pixKey || undefined,
    account_details: parseAccountDetails(state.accountDetails),
    is_active: state.isActive,
    is_default: state.isDefault,
  };
}
