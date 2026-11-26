
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { hasTonecosAdminAccess } from "@/services/auth/tonecos-admin-access";
import { getCurrentAuthSession } from "@/services/auth/auth-session-service";
import { CANONICAL_CATALOG_ADMIN_API_BASE } from "@/config/canonical-catalog-endpoint";
import { CatalogImageDriveContext, type CatalogImageDriveResult } from "./CatalogImageDriveContext";

const endpoint = () => CANONICAL_CATALOG_ADMIN_API_BASE.replace(/\/+$/, "") + "/api/admin/blackfriday-drive";
async function request(token: string, source?: {path: string; modelSlug?: string}) {
  if (!CANONICAL_CATALOG_ADMIN_API_BASE) throw new Error("catalog_gateway_unconfigured");
  const response = await fetch(endpoint(), {
    method: source ? "POST" : "GET", cache: "no-store", redirect: "error",
    headers: { authorization: "Bearer " + token, ...(source ? {"content-type":"application/json"} : {}) },
    ...(source ? {body:JSON.stringify(source)} : {}),
  });
  if (!response.ok) throw new Error("drive_unavailable");
  return response.json();
}

export function TonartBlackFridayDriveProvider({ children }: {children: ReactNode}) {
  const { session } = useAuth();
  const token = session?.access_token;
  const [state,setState] = useState<{token:string; configured:boolean} | null>(null);
  useEffect(() => {
    let current = true;
    if (token) void (async () => {
      try {
        if (!(await hasTonecosAdminAccess())) return;
        const result = await request(token);
        if (current && typeof result.configured === "boolean") setState({token,configured:result.configured});
      } catch { if (current) setState(null); }
    })();
    return () => { current = false; };
  }, [token]);
  const access = useMemo(() => {
    if (!state || !token || state.token !== token) return null;
    return {
      configured: state.configured,
      async save(source: {path: string; modelSlug?: string}): Promise<CatalogImageDriveResult> {
        const current = await getCurrentAuthSession();
        if (!current?.access_token || current.user.id !== session?.user.id) throw new Error("admin_session_missing");
        const result = await request(current.access_token,source);
        if (result.saved !== true || typeof result.duplicate !== "boolean" || typeof result.folderName !== "string" ||
            !Number.isSafeInteger(result.count) || result.count < 0) throw new Error("drive_result_invalid");
        return result;
      },
    };
  }, [state,token,session?.user.id]);
  return <CatalogImageDriveContext.Provider value={access}>{children}</CatalogImageDriveContext.Provider>;
}
