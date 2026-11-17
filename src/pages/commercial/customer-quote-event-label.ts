import type { CatalogQuoteEvent } from "@/services/quotes/catalog-quote-history-service";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** Shared copy for authenticated quote history and account notifications. */
export function customerQuoteEventLabel(event: CatalogQuoteEvent): string {
  if (event.type === "submitted") return "Solicitação enviada";
  if (event.type === "answered") {
    return event.amount === null
      ? "Orçamento respondido"
      : `Orçamento respondido: ${brl.format(event.amount)}`;
  }
  if (event.toStatus === "reviewing") return "Em análise pela TONART";
  if (event.toStatus === "archived") return "Atendimento arquivado";
  if (event.toStatus === "pending") return "Solicitação retornou para análise";
  return "Situação atualizada";
}
