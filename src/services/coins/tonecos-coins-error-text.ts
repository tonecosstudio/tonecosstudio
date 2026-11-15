type CoinsErrorAudience = "customer" | "admin";

const exact: Record<string, string> = {
  tonecos_commercial_mvp_disabled:
    "A carteira TONART não está disponível neste ambiente.",
  tonecos_supabase_project_mismatch:
    "A carteira TONART não está configurada neste ambiente.",
  tonecos_login_required:
    "Sua sessão expirou. Entre novamente para consultar a carteira.",
  tonecos_coin_balance_invalid:
    "O saldo retornado está inconsistente. Atualize a carteira ou fale com o suporte.",
  tonecos_coin_entry_invalid:
    "Uma movimentação retornou dados inconsistentes. Fale com o suporte.",
  tonecos_coin_limit_invalid:
    "Não foi possível abrir esta página de movimentações.",
  tonecos_coin_credit_input_invalid:
    "Confira o cliente, a quantidade e a justificativa do crédito.",
  tonecos_coin_credit_result_invalid:
    "O servidor não confirmou o crédito. Atualize o histórico antes de tentar novamente.",
  tonecos_coin_reversal_input_invalid:
    "Informe uma movimentação válida e um motivo com pelo menos quatro caracteres.",
  tonecos_coin_reversal_result_invalid:
    "O servidor não confirmou a reversão. Atualize o ledger antes de tentar novamente.",
  tonecos_local_preview_read_only:
    "A prévia local permite apenas consulta; alterações de Coins exigem o serviço TONART conectado.",
  tonecos_coin_recipient_email_invalid:
    "Informe um e-mail válido para localizar o cliente.",
  tonecos_coin_recipient_invalid:
    "O cadastro localizado não pôde ser validado.",
  "Admin access required":
    "Acesso administrativo não autorizado.",
  "Coin recipient not found":
    "Nenhum cliente encontrado com esse e-mail.",
  "Coin balance cap exceeded":
    "O limite máximo do saldo seria ultrapassado por esse crédito.",
  "Invalid coin credit request":
    "Confira a quantidade e a justificativa do crédito.",
  "Coin credit reference conflicts with different request":
    "Esta referência já está vinculada a outro crédito. Recarregue a página antes de continuar.",
  "Coins reversal would create a negative wallet balance":
    "Esta reversão deixaria o saldo do cliente negativo e não foi registrada.",
  "Coins reversal reference conflicts with different request":
    "Esta movimentação já foi revertida com outro motivo. Consulte o histórico antes de continuar.",
  "Invalid Coins reversal request":
    "Confira a movimentação e o motivo da reversão.",
  "Coins entry type is not reversible":
    "Este tipo de movimentação não pode ser revertido por esta operação.",
};

function errorMessage(value: unknown): string {
  if (value instanceof Error) return value.message.trim();
  if (value && typeof value === "object" && "message" in value &&
      typeof (value as { message?: unknown }).message === "string") {
    return (value as { message: string }).message.trim();
  }
  return "";
}

export function isTonecosCoinsAuthError(value: unknown): boolean {
  const message = errorMessage(value).toLocaleLowerCase();
  return message === "tonecos_login_required" ||
    message.includes("not authenticated") ||
    message.includes("jwt expired");
}

export function tonecosCoinsErrorText(
  value: unknown,
  audience: CoinsErrorAudience = "customer",
): string {
  const message = errorMessage(value);
  if (exact[message]) return exact[message];
  const normalized = message.toLocaleLowerCase();
  if (normalized.includes("network") || normalized.includes("offline") ||
      normalized.includes("failed to fetch") || normalized.includes("connection")) {
    return audience === "admin"
      ? "Não foi possível confirmar a operação. Tente novamente; o mesmo crédito não será duplicado."
      : "Não foi possível conectar à carteira. Verifique sua conexão e tente novamente.";
  }
  if (isTonecosCoinsAuthError(value)) {
    return "Sua sessão expirou. Entre novamente para continuar.";
  }
  return audience === "admin"
    ? "Não foi possível concluir a operação de Coins. Atualize a página e tente novamente."
    : "Não foi possível carregar a carteira Coins. Tente novamente.";
}
