import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { log } from '@/lib/logger';

/**
 * Lista de emails que devem ter role de admin automaticamente
 * IMPORTANTE: Adicione aqui os emails dos administradores do sistema
 */
const ADMIN_EMAILS = [
  'washingtonmsdj@gmail.com',
  'admin@ordax.com.br',
];

/**
 * Hook que garante que o profile do usuário seja criado após login OAuth
 * Também cria notification_preferences, adiciona ao grupo de boas-vindas
 * e atribui role de admin para emails específicos
 * Solução alternativa para o problema dos triggers no banco
 * 
 * IMPORTANTE: Este hook NÃO deve bloquear a aplicação mesmo se houver erros
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
            const userEmail = session.user.email;

            // Profile verification happens via database trigger
            // This is just a safety check for OAuth edge cases
            
            const { data: profile } = await supabase
              .from('profiles')
              .select('id, role')
              .eq('id', userId)
              .maybeSingle();

            if (!profile) {
              log.warn('Profile not found after auth sync', { userId });
              return;
            }

            // Auto-promote to admin if email is in ADMIN_EMAILS
            if (userEmail && ADMIN_EMAILS.includes(userEmail) && profile.role === 'customer') {
              await supabase
                .from('profiles')
                .update({ role: 'admin' })
                .eq('id', userId);
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
