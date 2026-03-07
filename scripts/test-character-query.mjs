#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pabxpvqwtvbjaunjejud.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTgxNTg1NiwiZXhwIjoyMDg1MzkxODU2fQ.vYLGOmT_A4G-tfH87mxIk8Oc5QJRxmcGvy2JSafMGns';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testQuery() {
  console.log('\n🔍 Testando query exata que está falhando...\n');

  const characterId = '11111111-1111-1111-1111-111111111102';

  try {
    // Query exata do código
    const { data, error } = await supabase
      .from("collection_characters")
      .select("name, rarity")
      .eq("id", characterId)
      .maybeSingle();

    if (error) {
      console.error('❌ Erro:', error);
      console.log('');
      console.log('Detalhes do erro:');
      console.log('  Code:', error.code);
      console.log('  Message:', error.message);
      console.log('  Details:', error.details);
      console.log('  Hint:', error.hint);
    } else {
      console.log('✅ Query funcionou!');
      console.log('Dados:', data);
    }

  } catch (err) {
    console.error('❌ Exceção:', err);
  }
}

testQuery();
