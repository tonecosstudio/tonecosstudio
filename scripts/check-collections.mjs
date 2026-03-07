#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  console.log('🔍 Verificando coleções...\n');

  const { data: collections, error } = await supabase
    .from('collections')
    .select('*')
    .order('created_at');

  if (error) {
    console.error('❌ Erro:', error);
    return;
  }

  console.log(`📦 Total de coleções: ${collections?.length || 0}\n`);

  if (collections?.length) {
    collections.forEach(c => {
      console.log(`  • ${c.name} (${c.slug})`);
      console.log(`    ID: ${c.id}`);
      console.log(`    Status: ${c.status}`);
      console.log('');
    });
  } else {
    console.log('❌ Nenhuma coleção encontrada no banco!\n');
  }

  const { data: characters } = await supabase
    .from('collection_characters')
    .select('*');

  console.log(`👤 Total de personagens: ${characters?.length || 0}\n`);

  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('*, profiles(email)');

  console.log(`📋 Total de assinaturas: ${subscriptions?.length || 0}\n`);

  if (subscriptions?.length) {
    subscriptions.forEach(s => {
      console.log(`  • ${s.profiles?.email}: active_collection_id = ${s.active_collection_id || 'NULL'}`);
    });
  }
}

main().catch(console.error);
