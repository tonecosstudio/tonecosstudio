#!/usr/bin/env node

/**
 * Script automático para atribuir collection_id às assinaturas
 * Atribui a primeira coleção disponível (One Piece - Tripulação Mugiwara)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('🔍 Buscando assinaturas sem collection_id...\n');

  // Buscar assinaturas sem collection_id
  const { data: subscriptions, error: subsError } = await supabase
    .from('subscriptions')
    .select('id, user_id, plan_type')
    .is('collection_id', null);

  if (subsError) {
    console.error('❌ Erro:', subsError);
    process.exit(1);
  }

  if (!subscriptions || subscriptions.length === 0) {
    console.log('✅ Todas as assinaturas já têm collection_id!');
    return;
  }

  console.log(`⚠️  Encontradas ${subscriptions.length} assinaturas sem collection_id\n`);

  // Buscar a coleção One Piece (primeira criada)
  const { data: collection, error: collError } = await supabase
    .from('collections')
    .select('id, name')
    .eq('slug', 'one-piece-mugiwara')
    .single();

  if (collError || !collection) {
    console.error('❌ Erro ao buscar coleção padrão:', collError);
    process.exit(1);
  }

  console.log(`📚 Atribuindo coleção: ${collection.name}\n`);

  let success = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    const { error } = await supabase
      .from('subscriptions')
      .update({ collection_id: collection.id })
      .eq('id', sub.id);

    if (error) {
      console.error(`❌ Erro ao atualizar ${sub.id}:`, error.message);
      failed++;
    } else {
      console.log(`✅ ${sub.id} (${sub.plan_type}) → ${collection.name}`);
      success++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ ${success} assinatura(s) atualizada(s)`);
  if (failed > 0) {
    console.log(`❌ ${failed} assinatura(s) falharam`);
  }
  console.log('='.repeat(60));
}

main().catch(err => {
  console.error('❌ Erro:', err);
  process.exit(1);
});
