#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function validate() {
  console.log('\n🔍 VALIDANDO INTEGRIDADE DO SISTEMA...\n');

  let errors = 0;
  let warnings = 0;

  // 1. Verificar coleções
  const { data: collections } = await supabase.from('collections').select('id');
  if (!collections?.length) {
    console.error('❌ ERRO: Nenhuma coleção encontrada');
    errors++;
  } else {
    console.log(`✅ Coleções: ${collections.length}`);
  }

  // 2. Verificar personagens
  const { data: characters } = await supabase.from('collection_characters').select('id, collection_id');
  if (!characters?.length) {
    console.error('❌ ERRO: Nenhum personagem encontrado');
    errors++;
  } else {
    console.log(`✅ Personagens: ${characters.length}`);
    
    // Verificar se todos os personagens têm coleções válidas
    for (const char of characters) {
      const { data: col } = await supabase
        .from('collections')
        .select('id')
        .eq('id', char.collection_id)
        .single();
      
      if (!col) {
        console.error(`❌ ERRO: Personagem ${char.id} referencia coleção inexistente ${char.collection_id}`);
        errors++;
      }
    }
  }

  // 3. Verificar assinaturas
  const { data: subs } = await supabase.from('subscriptions').select('id, active_collection_id');
  if (!subs?.length) {
    console.warn('⚠️ AVISO: Nenhuma assinatura encontrada');
    warnings++;
  } else {
    console.log(`✅ Assinaturas: ${subs.length}`);
    
    // Verificar se todas as assinaturas têm coleções válidas
    for (const sub of subs) {
      if (sub.active_collection_id) {
        const { data: col } = await supabase
          .from('collections')
          .select('id')
          .eq('id', sub.active_collection_id)
          .single();
        
        if (!col) {
          console.error(`❌ ERRO: Assinatura ${sub.id} referencia coleção inexistente ${sub.active_collection_id}`);
          errors++;
        }
      }
    }
  }

  // 4. Verificar deliveries
  const { data: deliveries } = await supabase.from('subscription_deliveries').select('id, subscription_id');
  if (!deliveries?.length) {
    console.warn('⚠️ AVISO: Nenhum delivery encontrado');
    warnings++;
  } else {
    console.log(`✅ Deliveries: ${deliveries.length}`);
    
    // Verificar se todos os deliveries têm assinaturas válidas
    for (const delivery of deliveries) {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('id', delivery.subscription_id)
        .single();
      
      if (!sub) {
        console.error(`❌ ERRO: Delivery ${delivery.id} referencia assinatura inexistente ${delivery.subscription_id}`);
        errors++;
      }
    }
  }

  // 5. Verificar fila de produção
  const { data: queue } = await supabase.from('production_queue').select('id, order_id, collection_id');
  if (!queue?.length) {
    console.warn('⚠️ AVISO: Fila de produção vazia');
    warnings++;
  } else {
    console.log(`✅ Fila de produção: ${queue.length}`);
    
    // Verificar se todos os itens têm coleções válidas
    for (const item of queue) {
      const { data: col } = await supabase
        .from('collections')
        .select('id')
        .eq('id', item.collection_id)
        .single();
      
      if (!col) {
        console.error(`❌ ERRO: Item da fila ${item.id} referencia coleção inexistente ${item.collection_id}`);
        errors++;
      }

      // Verificar se order_id existe em deliveries
      const { data: delivery } = await supabase
        .from('subscription_deliveries')
        .select('id')
        .eq('id', item.order_id)
        .single();
      
      if (!delivery) {
        console.error(`❌ ERRO: Item da fila ${item.id} referencia delivery inexistente ${item.order_id}`);
        errors++;
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('RESULTADO DA VALIDAÇÃO');
  console.log('='.repeat(60));
  
  if (errors === 0 && warnings === 0) {
    console.log('\n✅ SISTEMA 100% VÁLIDO!');
    console.log('   Sem erros ou avisos encontrados.\n');
    return 0;
  } else if (errors === 0) {
    console.log(`\n⚠️ SISTEMA VÁLIDO COM AVISOS`);
    console.log(`   ${warnings} aviso(s) encontrado(s).\n`);
    return 0;
  } else {
    console.log(`\n❌ SISTEMA COM ERROS`);
    console.log(`   ${errors} erro(s) encontrado(s)`);
    console.log(`   ${warnings} aviso(s) encontrado(s)\n`);
    return 1;
  }
}

validate()
  .then(code => process.exit(code))
  .catch(err => {
    console.error('❌ Erro na validação:', err);
    process.exit(1);
  });
