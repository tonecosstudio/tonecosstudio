#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pabxpvqwtvbjaunjejud.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTgxNTg1NiwiZXhwIjoyMDg1MzkxODU2fQ.vYLGOmT_A4G-tfH87mxIk8Oc5QJRxmcGvy2JSafMGns';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkCharacters() {
  console.log('\n🔍 Verificando personagens da coleção One Piece...\n');

  try {
    // Buscar coleção One Piece
    const { data: collection, error: collError } = await supabase
      .from('collections')
      .select('id, name')
      .ilike('name', '%one piece%')
      .single();

    if (collError) throw collError;

    console.log('✅ Coleção encontrada:', collection.name);
    console.log('   ID:', collection.id);
    console.log('');

    // Buscar personagens desta coleção
    const { data: characters, error: charError } = await supabase
      .from('collection_characters')
      .select('id, name, status')
      .eq('collection_id', collection.id)
      .order('release_order');

    if (charError) throw charError;

    console.log(`📋 Personagens da coleção (${characters.length}):`);
    console.log('─'.repeat(80));
    characters.forEach((char, idx) => {
      console.log(`${idx + 1}. ${char.name}`);
      console.log(`   ID: ${char.id}`);
      console.log(`   Status: ${char.status}`);
      console.log('');
    });

    // Verificar os IDs que estão sendo usados nas escolhas
    console.log('🔍 Verificando IDs usados nas escolhas do João Trimestral...\n');

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', 'trimestral@ordax.com.br')
      .single();

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', profile.id)
      .single();

    const { data: selections } = await supabase
      .from('subscription_monthly_selections')
      .select('character_id, delivery_month')
      .eq('subscription_id', subscription.id)
      .order('delivery_month');

    console.log('📅 IDs usados nas escolhas:');
    console.log('─'.repeat(80));
    selections.forEach((sel) => {
      console.log(`Mês: ${sel.delivery_month}`);
      console.log(`ID: ${sel.character_id}`);
      
      const exists = characters.find(c => c.id === sel.character_id);
      console.log(`Existe? ${exists ? '✅ SIM - ' + exists.name : '❌ NÃO'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

checkCharacters();
