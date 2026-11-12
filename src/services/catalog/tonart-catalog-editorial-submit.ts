import { supabase } from "@/integrations/supabase/client";
import type { PublicCatalogModel } from "./public-catalog-gateway";
import {
  validateTonartCatalogEditorialProposal,
  type TonartCatalogEditorialProposal,
} from "./tonart-catalog-review-export";

export type TonartCatalogReviewReceipt = {
  state: "awaiting_review";
  receipt: string;
  changed: number;
  modelIds: string[];
};

/**
 * Authenticated submission to the original Git-owned editorial contract.
 * Never writes to D1/R2 or keeps a secondary catalogue in Supabase.
 */
export async function submitTonartCatalogEditorialReview(
  loadedPage: readonly PublicCatalogModel[],
  drafts: ReadonlyMap<string, TonartCatalogEditorialProposal>,
): Promise<TonartCatalogReviewReceipt> {
  if (!drafts.size || drafts.size > 12 || loadedPage.length > 12) {
    throw new Error("Selecione até 12 modelos desta página.");
  }
  const byId = new Map(loadedPage.map((model) => [model.id, model]));
  const edits = [...drafts].map(([id, proposal]) => {
    const model = byId.get(id);
    if (!model) throw new Error("Um modelo já não pertence à página consultada.");
    const change = validateTonartCatalogEditorialProposal(model, proposal);
    return {
      id: model.id, slug: model.slug, code: model.code,
      name: model.name, variantName: model.variantName,
      category: model.category, franchise: model.franchise,
      newName: change.name, newVariant: change.variant,
    };
  }).filter((change) => Boolean(change.newName || change.newVariant));
  if (!edits.length) throw new Error("Não há mudanças válidas para enviar.");

  const { data, error } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (error || !token) throw new Error("Sua sessão expirou. Entre novamente como administrador.");

  const response = await fetch("/api/catalog-editorial", {
    method: "POST",
    credentials: "omit",
    redirect: "error",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify({ edits }),
  });
  const body: unknown = await response.json().catch(() => null);
  const payload = (body && typeof body === "object") ? body as Record<string, unknown> : {};
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Acesso não autorizado. Confirme sua sessão administrativa.");
    }
    if (response.status === 409) {
      throw new Error("O catálogo ou a revisão mudou. Atualize a página antes de tentar novamente.");
    }
    if (payload.error === "editorial_backend_not_configured" ||
        payload.error === "editorial_github_authority_unavailable") {
      throw new Error("Gravação indisponível: integração segura com o repositório ainda não configurada.");
    }
    throw new Error("Não foi possível gravar a revisão. Nenhuma alteração foi confirmada.");
  }
  if (payload.state !== "awaiting_review" ||
      typeof payload.receipt !== "string" ||
      !/^https:\/\/github\.com\/washingtonmsdj\/catalogo\/pull\/\d+$/.test(payload.receipt) ||
      !Number.isSafeInteger(payload.changed) ||
      !Array.isArray(payload.modelIds)) {
    throw new Error("O servidor não confirmou o recibo de revisão. Verifique o repositório antes de repetir.");
  }
  return payload as TonartCatalogReviewReceipt;
}
