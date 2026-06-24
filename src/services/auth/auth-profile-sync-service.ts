import { supabase } from "@/integrations/supabase/client";
import { log } from "@/lib/logger";

async function verifyProfileExists(userId: string): Promise<void> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) {
    log.warn("Profile not found after auth sync", { userId });
  }
}

export function subscribeToAuthProfileSync(): () => void {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    if (event !== "SIGNED_IN" || !session?.user) {
      return;
    }

    void verifyProfileExists(session.user.id).catch((error) => {
      log.error("Auth profile sync failed", { error });
    });
  });

  return () => {
    subscription.unsubscribe();
  };
}
