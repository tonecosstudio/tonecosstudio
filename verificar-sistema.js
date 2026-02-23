import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Ler .env
const envFile = readFileSync('.env', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    // Remover aspas
    env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
  }
});

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_PUBLISHABLE_KEY
);

async function verificarSistema() {
  console.log('============================================');
  console.log('VERIFICAÇÃO DO SISTEMA DINÂMICO');
  console.log('============================================\n');

  // 1. Ver próximo lançamento
  console.log('1. Ver próximo lançamento (deve aparecer no banner)');
  const { data: nextRelease, error: error1 } = await supabase.rpc('get_next_release');
  if (error1) {
    console.error('❌ Erro:', error1.message);
  } else {
    console.log('✅ Próximo lançamento:', nextRelease);
  }
  console.log('');

  // 2. Ver todos os personagens com datas
  console.log('2. Ver todos os personagens com datas');
  const { data: characters, error: error2 } = await supabase
    .from('collection_characters')
    .select(`
      name,
      release_order,
      status,
      release_date,
      collections!inner(name)
    `)
    .not('release_date', 'is', null)
    .order('release_date')
    .limit(10);
  
  if (error2) {
    console.error('❌ Erro:', error2.message);
  } else {
    console.log('✅ Personagens com datas:', characters?.length || 0);
    characters?.forEach(char => {
      const daysUntil = Math.ceil((new Date(char.release_date) - new Date()) / (1000 * 60 * 60 * 24));
      console.log(`   - ${char.name} (${char.collections.name}) - ${char.status} - ${daysUntil} dias`);
    });
  }
  console.log('');

  // 3. Ver estatísticas gerais
  console.log('3. Ver estatísticas gerais');
  const { data: allChars, error: error3 } = await supabase
    .from('collection_characters')
    .select('release_date, status');
  
  if (error3) {
    console.error('❌ Erro:', error3.message);
  } else {
    const stats = {
      total: allChars?.length || 0,
      withDates: allChars?.filter(c => c.release_date).length || 0,
      upcoming: allChars?.filter(c => c.status === 'upcoming').length || 0,
      revealed: allChars?.filter(c => c.status === 'revealed').length || 0,
      released: allChars?.filter(c => c.status === 'released').length || 0,
    };
    console.log('✅ Estatísticas:');
    console.log(`   - Total de personagens: ${stats.total}`);
    console.log(`   - Com datas: ${stats.withDates}`);
    console.log(`   - Upcoming: ${stats.upcoming}`);
    console.log(`   - Revealed: ${stats.revealed}`);
    console.log(`   - Released: ${stats.released}`);
  }
  console.log('');

  // 4. Ver eventos criados
  console.log('4. Ver eventos criados (se houver)');
  const { data: events, error: error4 } = await supabase
    .from('collection_events')
    .select(`
      event_type,
      old_status,
      new_status,
      created_at,
      collection_characters!inner(name)
    `)
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (error4) {
    console.error('❌ Erro:', error4.message);
  } else {
    console.log(`✅ Eventos criados: ${events?.length || 0}`);
    events?.forEach(event => {
      console.log(`   - ${event.event_type}: ${event.old_status} → ${event.new_status} (${event.collection_characters.name})`);
    });
  }
  console.log('');

  // 5. Ver notificações criadas
  console.log('5. Ver notificações criadas (se houver)');
  const { data: notifications, error: error5 } = await supabase
    .from('collection_notifications')
    .select(`
      type,
      title,
      message,
      created_at,
      collection_characters!inner(name)
    `)
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (error5) {
    console.error('❌ Erro:', error5.message);
  } else {
    console.log(`✅ Notificações criadas: ${notifications?.length || 0}`);
    notifications?.forEach(notif => {
      console.log(`   - ${notif.type}: ${notif.title} (${notif.collection_characters.name})`);
    });
  }
  console.log('');

  // 6. Testar atualização automática
  console.log('6. Testar atualização automática');
  const { data: updateResult, error: error6 } = await supabase.rpc('auto_update_character_status');
  if (error6) {
    console.error('❌ Erro:', error6.message);
  } else {
    console.log('✅ Função executada com sucesso');
  }
  console.log('');

  console.log('============================================');
  console.log('VERIFICAÇÃO CONCLUÍDA');
  console.log('============================================');
}

verificarSistema().catch(console.error);
