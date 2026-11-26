import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { hasTonecosAdminAccess } from "@/services/auth/tonecos-admin-access";
import { addPromotionImage } from "@/services/catalog/promotion-selection-service";
import { PromotionSelectionContext } from "./PromotionSelectionContext";

export function PromotionSelectionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { session } = useAuth();
  const token = session?.access_token;
  const [allowedToken, setAllowedToken] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    if (token)
      void hasTonecosAdminAccess()
        .then((allowed) => {
          if (active) setAllowedToken(allowed ? token : null);
        })
        .catch(() => {
          if (active) setAllowedToken(null);
        });
    return () => {
      active = false;
    };
  }, [token]);
  const access = useMemo(
    () =>
      token && allowedToken === token ? { save: addPromotionImage } : null,
    [token, allowedToken],
  );
  return (
    <PromotionSelectionContext.Provider value={access}>
      {children}
    </PromotionSelectionContext.Provider>
  );
}
