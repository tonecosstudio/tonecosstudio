#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  console.log('🚀 Populando fila de produção (v2 - com deliveries reais)...\n');

  // Get users
  const { data: users } = await supabase
    .from('profiles')
    .select('id, email, full_name');

  if (!users?.length) {
    console.error('❌ Nenhum usuário encontrado');
    return;
  }

  console.log(`✅ Encontrados ${users.length} usuários\n`);

  // Get subscriptions with collections
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('id, user_id, active_collection_id')
    .not('active_collection_id', 'is', null);

  if (!subscriptions?.length) {
    console.error('❌ Nenhuma assinatura encontrada');
    return;
  }

  console.log(`✅ Encontradas ${subscriptions.length} assinaturas\n`);

  // Get profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, full_name');

  const profileMap = {};
  profiles?.forEach(p => {
    profileMap[p.id] = p;
  });

  // Get collections
  const { data: collections } = await supabase
    .from('collections')
    .select('id, name');

  const collectionMap = {};
  collections?.forEach(c => {
    collectionMap[c.id] = c;
  });

  // Get active cycle
  const { data: cycles } = await supabase
    .from('cycles')
    .select('id')
    .eq('status', 'active')
    .order('start_date', { ascending: false })
    .limit(1);

  const cycleId = cycles?.[0]?.id;
  if (!cycleId) {
    console.warn('⚠️ Nenhum ciclo ativo encontrado\n');
  }

  let totalCreated = 0;

  // Create deliveries for each subscription
  for (const sub of subscriptions) {
    const profile = profileMap[sub.user_id];
    const collection = collectionMap[sub.active_collection_id];

    if (!profile || !collection) continue;

    const email = profile.email;
    const name = profile.full_name || email;
    const collectionName = collection.name;

    console.log(`📦 ${name} (${collectionName}):`);

    // Create 3 deliveries per subscription (past, current, future)
    const deliveries = [
      {
        subscription_id: sub.id,
        cycle_id: cycleId,
        delivery_number: 1,
        status: 'delivered',
        expected_delivery_date: new Date('2026-01-15').toISOString(),
        actual_delivery_date: new Date('2026-01-20').toISOString()
      },
      {
        subscription_id: sub.id,
        cycle_id: cycleId,
        delivery_number: 2,
        status: 'in_production',
        expected_delivery_date: new Date('2026-02-15').toISOString()
      },
      {
        subscription_id: sub.id,
        cycle_id: cycleId,
        delivery_number: 3,
        status: 'scheduled',
        expected_delivery_date: new Date('2026-03-15').toISOString()
      }
    ];

    for (const delivery of deliveries) {
      const { data: createdDelivery, error } = await supabase
        .from('subscription_deliveries')
        .insert(delivery)
        .select()
        .single();

      if (error) {
        console.error(`  ❌ Erro ao criar delivery ${delivery.delivery_number}:`, error.message);
        continue;
      }

      totalCreated++;
      console.log(`  ✅ Delivery ${delivery.delivery_number}: ${delivery.status}`);
    }
  }

  console.log(`\n✅ Total de deliveries criados: ${totalCreated}\n`);
  console.log('Agora a fila de produção pode ser populada com referências reais aos deliveries!\n');
}

main().catch(console.error);
