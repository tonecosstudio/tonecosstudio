import type { PaymentMethod, PaymentMethodType } from "@/types/manual-payment";

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
  instructions?: string;
  payment_link?: string;
  pix_key?: string;
  account_details?: unknown;
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
    isActive: method.is_active,
    isDefault: method.is_default,
  };
}

function parseAccountDetails(accountDetails: string): unknown | undefined {
  if (!accountDetails.trim()) {
    return undefined;
  }

  return JSON.parse(accountDetails);
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

  return null;
}

export function buildPaymentMethodPayload(state: PaymentMethodFormState): PaymentMethodPayload {
  return {
    name: state.name,
    type: state.type,
    instructions: state.instructions || undefined,
    payment_link: state.paymentLink || undefined,
    pix_key: state.pixKey || undefined,
    account_details: parseAccountDetails(state.accountDetails),
    is_active: state.isActive,
    is_default: state.isDefault,
  };
}
