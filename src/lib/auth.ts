import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { log } from "@/lib/logger";

type AuthState = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  error: Error | null;
};

/**
 * Authentication hook with proper error handling
 * 
 * Features:
 * - Prevents infinite re-renders by only updating when values change
 * - Proper error handling and error state
 * - Type-safe implementation
 * - Cleanup on unmount
 * 
 * @returns Authentication state with session, user, loading, and error
 */
export function useAuth() {
  const [state, setState] = useState<AuthState>({ 
    session: null, 
    user: null, 
    isLoading: true,
    error: null
  });

  useEffect(() => {
    let mounted = true;
    let initialLoadDone = false;

    // First, get the current session
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!mounted || initialLoadDone) return;
        
        initialLoadDone = true;
        
        if (error) {
          log.error('Failed to get session', { error });
          setState({
            session: null,
            user: null,
            isLoading: false,
            error: new Error(`Failed to get session: ${error.message}`)
          });
          return;
        }

        setState({
          session: data.session ?? null,
          user: data.session?.user ?? null,
          isLoading: false,
          error: null
        });
      })
      .catch((error) => {
        if (!mounted || initialLoadDone) return;
        
        initialLoadDone = true;
        log.error('Exception while getting session', { error });
        
        setState({
          session: null,
          user: null,
          isLoading: false,
          error: error instanceof Error ? error : new Error('Unknown error while getting session')
        });
      });

    // Then, listen for auth changes
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted || !initialLoadDone) return;

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
          return { 
            session, 
            user: newUser, 
            isLoading: false,
            error: null
          };
        }
        
        return prev;
      });
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
