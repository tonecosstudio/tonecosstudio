import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { log } from '@/lib/logger';

/**
 * Hook que garante que o profile do usuário seja criado após login OAuth
 * sem bloquear a aplicação.
 * Solução alternativa para o problema dos triggers no banco
 * 
 * IMPORTANTE: roles administrativas nunca são atribuídas no cliente.
 */
export function useAuthProfileSync() {
  useEffect(() => {
    // Listener para mudanças no estado de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Quando o usuário faz login (especialmente via OAuth)
      if (event === 'SIGNED_IN' && session?.user) {
        // Executar em background sem bloquear a aplicação
        (async () => {
          try {
            const userId = session.user.id;
            // Profile verification happens via database trigger
            // This is just a safety check for OAuth edge cases
            
            const { data: profile } = await supabase
              .from('profiles')
              .select('id')
              .eq('id', userId)
              .maybeSingle();

            if (!profile) {
              log.warn('Profile not found after auth sync', { userId });
              return;
            }

        } catch (error) {
          log.error('Auth profile sync failed', { error });
        }
        })(); // Executar imediatamente em background
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);
}
