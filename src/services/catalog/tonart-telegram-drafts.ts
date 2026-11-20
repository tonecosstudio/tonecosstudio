/**
 * Admin-only bridge to the existing Cloudflare catalog Worker.
 * No public R2 URL, Supabase mirror, or direct D1 credentials in the browser.
 */
import { supabase } from "@/integrations/supabase/client";
import { CANONICAL_CATALOG_API_BASE } from "@/config/canonical-catalog-endpoint";
import { requireTonecosAdminAccess } from "@/services/auth/tonecos-admin-access";

export type TelegramDraftImage = {
  messageId: number;
  sha256: string;
  role: "cover" | "gallery";
  position: number;
  thumbPath: string;
  displayPath: string;
};
export type TelegramDraft = {
  id: string;
  source: "telegram_studios";
  studio: string;
  name: string;
  character: string;
  variant: string;
  collection: string;
  groupKey: string;
  originId: string;
  provisionalName: boolean;
  reviewStatus: "pending" | "reviewing" | "confirmed" | "rejected";
  rightsStatus: "not_reviewed" | "rejected" | "approved";
  revision: number;
  published: false;
  imageCount: number;
  images: TelegramDraftImage[];
};
export type TelegramDraftSummary = Pick<
  TelegramDraft,
  | "id"
  | "name"
  | "studio"
  | "character"
  | "variant"
  | "reviewStatus"
  | "provisionalName"
  | "imageCount"
  | "revision"
>;
export type TelegramDraftList = {
  total: number;
  offset: number;
  limit: number;
  items: TelegramDraftSummary[];
};
export type TelegramDraftEdit = {
  revision: number;
  name: string;
  studio: string;
  character: string;
  variant: string;
  reviewStatus: TelegramDraft["reviewStatus"];
  imageOrder: number[];
};

function base() {
  if (!CANONICAL_CATALOG_API_BASE)
    throw new Error("catalog_gateway_not_configured");
  return CANONICAL_CATALOG_API_BASE.replace(/\/+$/, "");
}

async function request(path: string, init?: RequestInit) {
  await requireTonecosAdminAccess();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token)
    throw new Error("admin_session_missing");
  const url = base() + path;
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      authorization: "Bearer " + data.session.access_token,
      ...(init?.body ? { "content-type": "application/json" } : {}),
    },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(
      typeof payload?.error === "string"
        ? payload.error
        : "catalog_admin_unavailable",
    );
  }
  return response;
}

export type TelegramDraftStudio = { studio: string; total: number };

export async function listTelegramDraftStudios() {
  return (await (
    await request("/api/admin/telegram-drafts/studios")
  ).json()) as { studios: TelegramDraftStudio[] };
}

export async function listTelegramDrafts(studio = "", offset = 0) {
  const query = new URLSearchParams({
    studio,
    offset: String(offset),
    limit: "12",
  });
  return (await (
    await request("/api/admin/telegram-drafts?" + query)
  ).json()) as TelegramDraftList;
}
export async function getTelegramDraft(id: string) {
  return (await (
    await request("/api/admin/telegram-drafts/" + encodeURIComponent(id))
  ).json()) as TelegramDraft;
}
export async function editTelegramDraft(id: string, values: TelegramDraftEdit) {
  return (await (
    await request("/api/admin/telegram-drafts/" + encodeURIComponent(id), {
      method: "PATCH",
      body: JSON.stringify(values),
    })
  ).json()) as TelegramDraft;
}
export async function getTelegramDraftImage(path: string) {
  if (
    !/^\/api\/admin\/telegram-drafts\/tg_[a-f0-9]{24}\/media\/[a-f0-9]{64}\/(display|thumb)$/.test(
      path,
    )
  ) {
    throw new Error("invalid_private_media_path");
  }
  const res = await request(path);
  if (!(res.headers.get("content-type") || "").startsWith("image/webp"))
    throw new Error("invalid_private_media");
  return URL.createObjectURL(await res.blob());
}
