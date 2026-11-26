
import { CANONICAL_CATALOG_ADMIN_API_BASE } from "@/config/canonical-catalog-endpoint";
import { getCurrentAuthSession } from "@/services/auth/auth-session-service";
import { requireTonecosAdminAccess } from "@/services/auth/tonecos-admin-access";
import type { PromotionSource } from "@/components/catalog/PromotionSelectionContext";

export type PromotionItem = {
  sha256: string; modelId: string; modelSlug: string | null;
  name: string; franchise: string; category: string; mediaPath: string | null;
  mime: string; selectedAt: string; exportable: boolean; reason: string | null; filename: string;
};
export type PromotionSnapshot = {version: 1; campaign: "blackfriday"; generatedAt: string; items: PromotionItem[]};
async function request(data?: object) {
  await requireTonecosAdminAccess();
  const session = await getCurrentAuthSession();
  if (!session?.access_token || !CANONICAL_CATALOG_ADMIN_API_BASE) throw new Error("admin_session_missing");
  const response = await fetch(CANONICAL_CATALOG_ADMIN_API_BASE.replace(/\/+$/, "") + "/api/admin/promotions/blackfriday", {
    method: data ? "POST" : "GET", cache: "no-store", redirect: "error",
    headers: {authorization: "Bearer " + session.access_token, ...(data ? {"content-type":"application/json"} : {})},
    ...(data ? {body:JSON.stringify(data)} : {}),
  });
  if (!response.ok) throw new Error("promotion_unavailable");
  return response.json();
}
export async function addPromotionImage(source: PromotionSource) {
  const result = await request({action:"add",...source});
  if(result?.saved !== true || !/^[a-f0-9]{64}$/.test(result.sha256)) throw new Error("promotion_save_unconfirmed");
}
export async function removePromotionImage(sha256: string) {
  const result = await request({action:"remove",sha256});
  if(result?.removed !== true || result.sha256!==sha256) throw new Error("promotion_remove_unconfirmed");
}
export async function listPromotionImages(): Promise<PromotionSnapshot> {
  const result = await request();
  if(result?.version!==1||result.campaign!=="blackfriday"||!Array.isArray(result.items)||result.items.length>1000||typeof result.generatedAt!=="string") throw new Error("promotion_invalid_snapshot");
  return result;
}
