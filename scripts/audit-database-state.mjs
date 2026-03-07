#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function audit() {
  console.log('🔍 AUDITORIA DO BANCO DE DADOS\n');
  console.log('='.repeat(60));

  // 1. Coleções
  const { data: collections, count: collectionsCount } = await supabase
    .from('collections')
    .select('*', { count: 'exact' });
  
  console.log(`\n📦 COLEÇÕES: ${collectionsCount || 0}`);
  if (collections?.length) {
    collections.forEach(c => console.log(`   - ${c.name} (${c.slug})`));
  } else {
    console.log('   ❌ NENHUMA COLEÇÃO REAL NO BANCO');
  }

  // 2. Personagens
  const { data: characters, count: charsCount } = await supabase
    .from('collection_characters')
    .select('*', { count: 'exact' });
  
  console.log(`\n👤 PERSONAGENS: ${charsCount || 0}`);
  if (!charsCount) {
    console.log('   ❌ NENHUM PERSONAGEM REAL NO BANCO');
  }

  // 3. Assinaturas
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('id, user_id, plan_type, status, active_collection_id, coins_balance');
  
  console.log(`\n📋 ASSINATURAS: ${subscriptions?.length || 0}`);
  if (subscriptions?.length) {
    for (const sub of subscriptions) {
      console.log(`   - ${sub.plan_type}: ${sub.coins_balance} coins, Coleção: ${sub.active_collection_id ? '✅' : '❌'}`);
      
      // Verificar se a coleção existe
      if (sub.active_collection_id) {
        const { data: col } = await supabase
          .from('collections')
          .select('name')
          .eq('id', sub.active_collection_id)
          .single();
        
        if (!col) {
          console.log(`   ⚠️ COLEÇÃO NÃO EXISTE NO BANCO (referência órfã)`);
        }
      }
    }
  }

  // 4. User Coins
  const { data: coins } = await supabase
    .from('user_coins')
    .select('*, profiles(email)');
  
  console.log(`\n💰 COINS:`);
  if (coins?.length) {
    for (const c of coins) {
      console.log(`   ${c.profiles?.email}: ${c.balance} coins`);
    }
  }

  // 5. Transações de Coins
  const { data: transactions, count: txCount } = await supabase
    .from('coin_transactions')
    .select('*', { count: 'exact' });
  
  console.log(`\n💸 TRANSAÇÕES DE COINS: ${txCount || 0}`);
  if (!txCount) {
    console.log('   ⚠️ NENHUMA TRANSAÇÃO (coins não foram usados)');
  }

  // 6. Personagens Adquiridos
  const { data: userChars, count: userCharsCount } = await supabase
    .from('user_characters')
    .select('*', { count: 'exact' });
  
  console.log(`\n🎭 PERSONAGENS ADQUIRIDOS: ${userCharsCount || 0}`);
  if (!userCharsCount) {
    console.log('   ⚠️ NENHUM PERSONAGEM FOI ADQUIRIDO');
  }

  // 7. Fila de Produção
  const { data: queue, count: queueCount } = await supabase
    .from('production_queue')
    .select('*', { count: 'exact' });
  
  console.log(`\n🏭 FILA DE PRODUÇÃO: ${queueCount || 0}`);
  if (queue?.length) {
    const statusCounts = queue.reduce((acc, item) => {
      acc[item.production_status] = (acc[item.production_status] || 0) + 1;
      return acc;
    }, {});
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   - ${status}: ${count}`);
    });
    
    // Verificar referências órfãs
    const orphans = queue.filter(q => {
      const colExists = collections?.some(c => c.id === q.collection_id);
      return !colExists;
    });
    
    if (orphans.length) {
      console.log(`   ⚠️ ${orphans.length} itens com referências órfãs de coleções`);
    }
  }

  // 8. Subscription Collections (junction table)
  const { data: subCols, count: subColsCount } = await supabase
    .from('subscription_collections')
    .select('*', { count: 'exact' });
  
  console.log(`\n🔗 SUBSCRIPTION_COLLECTIONS: ${subColsCount || 0}`);
  if (!subColsCount) {
    console.log('   ⚠️ NENHUMA RELAÇÃO ASSINATURA-COLEÇÃO');
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 RESUMO DA AUDITORIA:\n');
  
  const issues = [];
  
  if (!collectionsCount) {
    issues.push('❌ Não há coleções reais no banco');
  }
  
  if (!charsCount) {
    issues.push('❌ Não há personagens reais no banco');
  }
  
  if (subscriptions?.some(s => s.active_collection_id && !collections?.some(c => c.id === s.active_collection_id))) {
    issues.push('⚠️ Assinaturas com referências órfãs de coleções');
  }
  
  if (!txCount && coins?.some(c => c.balance > 0)) {
    issues.push('⚠️ Usuários têm coins mas nenhuma transação registrada');
  }
  
  if (!userCharsCount) {
    issues.push('⚠️ Nenhum personagem foi adquirido (sistema não foi usado)');
  }
  
  if (queue?.some(q => !collections?.some(c => c.id === q.collection_id))) {
    issues.push('⚠️ Fila de produção com referências órfãs');
  }
  
  if (issues.length) {
    console.log('PROBLEMAS ENCONTRADOS:\n');
    issues.forEach(issue => console.log(`  ${issue}`));
    console.log('\n⚠️ O SISTEMA CONTÉM DADOS MOCK/INCONSISTENTES');
  } else {
    console.log('✅ Sistema está consistente e profissional');
  }
  
  console.log('\n' + '='.repeat(60));
}

audit().catch(console.error);
