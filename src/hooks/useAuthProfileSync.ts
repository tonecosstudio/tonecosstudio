import { useEffect } from "react";
import { subscribeToAuthProfileSync } from "@/services/auth/auth-profile-sync-service";

export function useAuthProfileSync() {
  useEffect(() => {
    if (import.meta.env.VITE_PREVIEW_READ_ONLY === "true") return;
    return subscribeToAuthProfileSync();
  }, []);
}
