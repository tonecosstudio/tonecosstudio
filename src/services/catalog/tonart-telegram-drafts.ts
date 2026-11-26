/**
 * Admin-only bridge to the existing Cloudflare catalog Worker.
 * No public R2 URL, Supabase mirror, or direct D1 credentials in the browser.
 */
import { getCurrentAuthSession } from "@/services/auth/auth-session-service";
import { CANONICAL_CATALOG_API_BASE } from "@/config/canonical-catalog-endpoint";
import { requireTonecosAdminAccess } from "@/services/auth/tonecos-admin-access";
import type { PrivateTelegramManifest } from "./telegram-private-import-plan";

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
  const session = await getCurrentAuthSession();
  if (!session?.access_token) throw new Error("admin_session_missing");
  const url = base() + path;
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      authorization: "Bearer " + session.access_token,
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

/**
 * Read-only, public projection of the SAME Cloudflare D1 catalog.
 * Reuse its indexed global search and gallery covers in the private workbench;
 * every edit is still re-read and written through the protected draft API.
 */
export type TelegramStudioIndexItem = {
  id: string;
  name: string;
  studio: string;
  character: string;
  variant: string;
  imageCount: number;
  provisional: boolean;
  cover: string | null;
};
export type TelegramStudioIndexPage = {
  total: number;
  offset: number;
  limit: number;
  items: TelegramStudioIndexItem[];
};

export async function searchTelegramStudioIndex(
  studio = "",
  q = "",
  offset = 0,
  onlyProvisional = false,
) {
  await requireTonecosAdminAccess();
  const query = new URLSearchParams({
    limit: "24",
    offset: String(offset),
  });
  if (studio) query.set("studio", studio);
  if (q) query.set("q", q);
  if (onlyProvisional) query.set("provisional", "1");
  const response = await fetch(base() + "/api/telegram-studios?" + query, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error("catalog_search_unavailable");
  return (await response.json()) as TelegramStudioIndexPage;
}

export function telegramStudioCoverUrl(path: string | null) {
  return path &&
    /^\/api\/telegram-studios\/tg_[a-f0-9]{24}\/media\/[a-f0-9]{64}\/thumb$/.test(
      path,
    )
    ? base() + path
    : undefined;
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

/**
 * Authenticated transport only. The canonical Worker validates live D1 SHA
 * ownership, franchise, gallery identity, R2 HEAD and atomic changes. No
 * browser-side SQL, R2 writes or publication paths are introduced here.
 */
export async function importPrivateTelegramDraft(
  manifest: PrivateTelegramManifest & {
    operation?: "create" | "append";
    expectedModelId?: string;
  },
) {
  const response = await request("/api/admin/telegram-drafts/import", {
    method: "POST",
    body: JSON.stringify(manifest),
  });
  return (await response.json()) as {
    id: string;
    created: boolean;
    reused: boolean;
    published: false;
    imageCount?: number;
    appended?: number;
  };
}
