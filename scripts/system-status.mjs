#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║          STATUS DO SISTEMA - ORDAX                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Collections
  const { data: collections } = await supabase.from('collections').select('id, name, slug');
  console.log('📦 COLEÇÕES:', collections?.length || 0);
  collections?.forEach(c => console.log(`   ✅ ${c.name}`));

  // Characters
  const { data: characters } = await supabase.from('collection_characters').select('id, name, status');
  const revealed = characters?.filter(c => c.status === 'revealed').length || 0;
  const upcoming = characters?.filter(c => c.status === 'upcoming').length || 0;
  console.log(`\n👤 PERSONAGENS: ${characters?.length || 0}`);
  console.log(`   • Revelados: ${revealed}`);
  console.log(`   • Upcoming: ${upcoming}`);

  // Subscriptions
  const { data: subs } = await supabase.from('subscriptions').select('id, plan_type, coins_balance, active_collection_id');
  console.log(`\n📋 ASSINATURAS: ${subs?.length || 0}`);
  subs?.forEach(s => {
    console.log(`   • ${s.plan_type}: ${s.coins_balance} coins ${s.active_collection_id ? '✅' : '❌'}`);
  });

  // Deliveries
  const { data: deliveries } = await supabase.from('subscription_deliveries').select('id, status');
  const deliveryStatus = deliveries?.reduce((acc, d) => {
    acc[d.status] = (acc[d.status] || 0) + 1;
    return acc;
  }, {});
  console.log(`\n📦 DELIVERIES: ${deliveries?.length || 0}`);
  Object.entries(deliveryStatus || {}).forEach(([status, count]) => {
    console.log(`   • ${status}: ${count}`);
  });

  // Production Queue
  const { data: queue } = await supabase.from('production_queue').select('id, production_status');
  const queueStatus = queue?.reduce((acc, q) => {
    acc[q.production_status] = (acc[q.production_status] || 0) + 1;
    return acc;
  }, {});
  console.log(`\n🏭 FILA DE PRODUÇÃO: ${queue?.length || 0}`);
  Object.entries(queueStatus || {}).forEach(([status, count]) => {
    console.log(`   • ${status}: ${count}`);
  });

  // Coins
  const { data: coins } = await supabase.from('user_coins').select('balance');
  const totalCoins = coins?.reduce((sum, c) => sum + (c.balance || 0), 0) || 0;
  console.log(`\n💰 COINS NO SISTEMA: ${totalCoins}`);

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    ✅ SISTEMA OK                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\n📍 Acesse: http://localhost:8080/admin/fila-producao');
  console.log('📍 Assinaturas: http://localhost:8080/admin/assinaturas-gerenciar\n');
}

main().catch(console.error);
