import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { log } from "@/lib/logger";
import {
  getCurrentAuthSession,
  subscribeToAuthSessionChanges,
} from "@/services/auth/auth-session-service";

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

    getCurrentAuthSession()
      .then((session) => {
        if (!mounted || initialLoadDone) return;
        
        initialLoadDone = true;

        setState({
          session,
          user: session?.user ?? null,
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

    const unsubscribe = subscribeToAuthSessionChanges((session) => {
      if (!mounted || !initialLoadDone) return;

      setState((prev) => {
        const newUser = session?.user ?? null;
        const prevUser = prev.user;

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
      unsubscribe();
    };
  }, []);

  return state;
}
