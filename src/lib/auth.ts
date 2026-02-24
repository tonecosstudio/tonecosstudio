import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthState = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
};

/**
 * IMPORTANT: Fixed to prevent infinite re-renders
 * Only updates state when values actually change
 */
export function useAuth() {
  const [state, setState] = useState<AuthState>({ session: null, user: null, isLoading: true });

  useEffect(() => {
    let mounted = true;
    let initialLoadDone = false;

    // First, get the current session
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (mounted && !initialLoadDone) {
          initialLoadDone = true;
          setState({
            session: data.session ?? null,
            user: data.session?.user ?? null,
            isLoading: false,
          });
        }
      })
      .catch(() => {
        if (mounted && !initialLoadDone) {
          initialLoadDone = true;
          setState((s) => ({ ...s, isLoading: false }));
        }
      });

    // Then, listen for auth changes
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted && initialLoadDone) {
        // Only update if values actually changed
        setState((prev) => {
          const newUser = session?.user ?? null;
          const prevUser = prev.user;

          // Check if user actually changed
          const userChanged =
            newUser?.id !== prevUser?.id ||
            newUser?.email !== prevUser?.email ||
            newUser?.user_metadata !== prevUser?.user_metadata;

          if (userChanged || session !== prev.session) {
            return { session, user: newUser, isLoading: false };
          }
          return prev;
        });
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
