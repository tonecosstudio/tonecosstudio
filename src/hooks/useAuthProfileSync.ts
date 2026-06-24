import { useEffect } from "react";
import { subscribeToAuthProfileSync } from "@/services/auth/auth-profile-sync-service";

export function useAuthProfileSync() {
  useEffect(() => {
    return subscribeToAuthProfileSync();
  }, []);
}
