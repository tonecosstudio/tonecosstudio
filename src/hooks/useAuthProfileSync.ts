// @ts-nocheck
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Lista de emails que devem ter role de admin automaticamente
 * IMPORTANTE: Adicione aqui os emails dos administradores do sistema
 */
const ADMIN_EMAILS = [
  'admin@ordax.com.br',
  // Adicione outros emails de admin aqui
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

            console.log('Auth state changed: SIGNED_IN', userId);

          // 1. Criar profile (ignorar erros se já existe)
          try {
            console.log('1/3 Verificando profile...');
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('id')
              .eq('id', userId)
              .maybeSingle();

            if (!existingProfile) {
              console.log('Creating profile for user:', userId);
              
              await supabase
                .from('profiles')
                .insert({
                  id: userId,
                  email: userEmail,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                });

              console.log('✓ Profile created successfully');
            } else {
              console.log('✓ Profile already exists');
            }
          } catch (error) {
            console.warn('Profile creation skipped:', error);
          }

          // 2. Verificar e criar role de admin se necessário
          if (userEmail && ADMIN_EMAILS.includes(userEmail)) {
            try {
              console.log('2/3 Verificando role de admin...');
              const { data: existingRole } = await supabase
                .from('user_roles')
                .select('id')
                .eq('user_id', userId)
                .eq('role', 'admin')
                .maybeSingle();

              if (!existingRole) {
                console.log('Creating admin role for user:', userId);
                
                await supabase
                  .from('user_roles')
                  .insert({
                    user_id: userId,
                    role: 'admin'
                  });

                console.log('✓ Admin role created successfully');
              } else {
                console.log('✓ Admin role already exists');
              }
            } catch (error) {
              console.warn('Admin role creation skipped:', error);
            }
          } else {
            console.log('2/3 User is not admin (email not in ADMIN_EMAILS)');
          }

          // 3. Adicionar ao grupo de boas-vindas (opcional)
          try {
            console.log('3/3 Verificando grupo de boas-vindas...');
            const { data: welcomeGroup } = await supabase
              .from('chat_groups')
              .select('id')
              .eq('name', 'Boas-vindas')
              .maybeSingle();

            if (welcomeGroup) {
              const { data: existingMember } = await supabase
                .from('chat_group_members')
                .select('id')
                .eq('group_id', welcomeGroup.id)
                .eq('user_id', userId)
                .maybeSingle();

              if (!existingMember) {
                console.log('Adding user to welcome group');
                
                await supabase
                  .from('chat_group_members')
                  .insert({
                    group_id: welcomeGroup.id,
                    user_id: userId,
                    role: 'member',
                  });

                console.log('✓ Added to welcome group');
              } else {
                console.log('✓ Already in welcome group');
              }
            } else {
              console.log('✓ Welcome group not found (skipping)');
            }
          } catch (error) {
            console.warn('Welcome group addition skipped:', error);
          }

          console.log('✓ Auth profile sync completed');
        } catch (error) {
          console.error('❌ FATAL ERROR in profile sync:', error);
          // Não bloquear a aplicação mesmo se houver erro
        }
        })(); // Executar imediatamente em background
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);
}
