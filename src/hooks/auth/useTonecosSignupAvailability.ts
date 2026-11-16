import { useEffect, useState } from "react";
import { getTonecosPublicSignupEnabled } from "@/services/auth/auth-session-service";

/** Read Supabase Auth only for guest flows that may offer new registration. */
export function useTonecosSignupAvailability(shouldCheck: boolean) {
  const [status, setStatus] = useState<"checking" | "enabled" | "disabled">(
    "checking",
  );

  useEffect(() => {
    if (!shouldCheck) {
      setStatus("checking");
      return;
    }
    let active = true;
    void getTonecosPublicSignupEnabled()
      .then((allowed) => {
        if (active) setStatus(allowed ? "enabled" : "disabled");
      })
      .catch(() => {
        if (active) setStatus("disabled");
      });
    return () => {
      active = false;
    };
  }, [shouldCheck]);

  return status;
}
