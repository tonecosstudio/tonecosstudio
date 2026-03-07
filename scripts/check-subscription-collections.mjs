#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  console.log('🔍 Verificando assinaturas e coleções...\n');

  const { data: subs } = await supabase
    .from('subscriptions')
    .select(`
      id,
      user_id,
      plan_type,
      status,
      active_collection_id,
      coins_balance,
      coins_initial,
      profiles(email, full_name),
      collections(name, slug)
    `);

  if (!subs?.length) {
    console.log('❌ Nenhuma assinatura encontrada\n');
    return;
  }

  console.log(`📋 Total de assinaturas: ${subs.length}\n`);

  subs.forEach(s => {
    const email = s.profiles?.email || 'N/A';
    const name = s.profiles?.full_name || 'N/A';
    const collection = s.collections?.name || '❌ SEM COLEÇÃO';
    const coins = `${s.coins_balance}/${s.coins_initial}`;

    console.log(`👤 ${name} (${email})`);
    console.log(`   Plano: ${s.plan_type}`);
    console.log(`   Coleção: ${collection}`);
    console.log(`   Coins: ${coins}`);
    console.log(`   Status: ${s.status}`);
    console.log('');
  });
}

main().catch(console.error);
