type QuoteErrorAudience = "customer" | "admin";

const exact: Record<string, string> = {
  catalog_quotes_not_enabled:
    "O atendimento de orçamentos está temporariamente indisponível.",
  catalog_quote_selection_invalid:
    "Selecione entre 1 e 50 modelos válidos para solicitar um orçamento.",
  catalog_quote_item_invalid:
    "Revise os modelos selecionados e informe quantidades entre 1 e 10.",
  catalog_quote_notes_invalid:
    "As observações devem ter no máximo 2.000 caracteres.",
  catalog_quote_contact_invalid:
    "Revise WhatsApp, CEP, escala e acabamento antes de enviar.",
  catalog_quote_response_invalid:
    "Não foi possível registrar a solicitação. Tente novamente.",
  catalog_quote_list_query_invalid:
    "Não foi possível carregar esta página de orçamentos.",
  catalog_quote_count_invalid:
    "Não foi possível confirmar a lista de orçamentos. Tente novamente.",
  catalog_quote_row_invalid:
    "Um orçamento retornou dados inconsistentes. Tente novamente.",
  catalog_quote_rows_invalid:
    "Um orçamento retornou modelos inconsistentes. Tente novamente.",
  catalog_quote_history_ids_invalid:
    "Não foi possível carregar o histórico desta solicitação.",
  catalog_quote_history_row_invalid:
    "O histórico do orçamento retornou dados inconsistentes.",
  admin_catalog_quote_query_invalid:
    "O filtro de orçamentos administrativos é inválido.",
  admin_catalog_quote_directory_invalid:
    "Não foi possível carregar a fila administrativa de orçamentos.",
  admin_catalog_quote_row_invalid:
    "Um orçamento administrativo retornou dados inconsistentes.",
  admin_catalog_quote_items_invalid:
    "Um orçamento contém uma seleção de modelos inválida.",
  admin_catalog_quote_item_invalid:
    "Um orçamento contém um modelo ou quantidade inválida.",
  admin_catalog_quote_response_invalid:
    "Informe um valor válido e uma mensagem ao cliente com até 2.000 caracteres.",
  admin_catalog_quote_result_invalid:
    "A resposta não foi confirmada pelo servidor. Recarregue a solicitação.",
  admin_catalog_quote_status_invalid:
    "A situação escolhida não é válida para este orçamento.",
  admin_catalog_quote_status_result_invalid:
    "A mudança de situação não foi confirmada pelo servidor. Recarregue a solicitação.",
  "Admin access required":
    "Acesso administrativo não autorizado.",
  "Authentication required":
    "Sua sessão expirou. Entre novamente para continuar.",
  "User not authenticated":
    "Sua sessão expirou. Entre novamente para continuar.",
  "Customer account not initialized":
    "Não foi possível preparar sua conta para o orçamento. Atualize a página e tente novamente.",
  "Select between 1 and 50 models":
    "Selecione entre 1 e 50 modelos válidos para solicitar um orçamento.",
  "Quote notes exceed 2000 characters":
    "As observações devem ter no máximo 2.000 caracteres.",
  "Quote contact or preferences invalid":
    "Revise WhatsApp, CEP, escala e acabamento antes de enviar.",
  "Invalid or duplicate model":
    "Revise os modelos selecionados; não envie referências duplicadas.",
  "Wait before submitting another quote":
    "Sua solicitação anterior acabou de ser enviada. Aguarde um minuto antes de enviar outra.",
  "Invalid quote response":
    "Informe um valor válido e uma mensagem ao cliente.",
  "Invalid quote amount":
    "Informe um valor válido para o orçamento.",
  "Invalid quote status":
    "A situação escolhida não é válida para este orçamento.",
  "Quote unavailable for pricing":
    "Este orçamento foi atualizado e não pode mais receber preço neste estado. Recarregue a página.",
  "Quote unavailable for status change":
    "Este orçamento foi atualizado e não aceita essa mudança de situação. Recarregue a página.",
};

export function commercialQuoteErrorText(
  value: unknown,
  audience: QuoteErrorAudience = "customer",
): string {
  const message = value instanceof Error
    ? value.message.trim()
    : value && typeof value === "object" && "message" in value &&
        typeof (value as { message?: unknown }).message === "string"
      ? ((value as { message: string }).message).trim()
      : "";

  if (message && exact[message]) return exact[message];

  const normalized = message.toLocaleLowerCase();
  if (
    normalized.includes("network") ||
    normalized.includes("failed to fetch") ||
    normalized.includes("fetch failed") ||
    normalized.includes("offline") ||
    normalized.includes("connection")
  ) {
    return "Não foi possível conectar ao serviço de orçamentos. Verifique sua conexão e tente novamente.";
  }
  if (
    normalized.includes("jwt") ||
    normalized.includes("not authenticated") ||
    normalized.includes("session")
  ) {
    return "Sua sessão expirou. Entre novamente para continuar.";
  }
  if (
    normalized.includes("permission") ||
    normalized.includes("not authorized") ||
    normalized.includes("row-level security") ||
    normalized.includes("rls")
  ) {
    return audience === "admin"
      ? "Acesso administrativo não autorizado."
      : "Não foi possível acessar este orçamento com a conta atual.";
  }

  return audience === "admin"
    ? "Não foi possível concluir a operação administrativa. Recarregue a página e tente novamente."
    : "Não foi possível concluir a operação de orçamento. Tente novamente.";
}
