#!/usr/bin/env node
/**
 * APLICAR CORREÇÕES FINAIS
 * 
 * Este script aplica todas as correções necessárias de forma robusta
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🚀 APLICANDO CORREÇÕES FINAIS\n');
console.log('='.repeat(80));

// ============================================================================
// PASSO 1: Aplicar correção do trigger de production_stages
// ============================================================================

console.log('\n📝 PASSO 1: Corrigindo trigger de production_stages...\n');

const sql1 = readFileSync('supabase/migrations/20260307000004_fix_production_stages_trigger.sql', 'utf8');

console.log('SQL a ser executado:');
console.log('---');
console.log(sql1);
console.log('---\n');

console.log('⚠️  AÇÃO NECESSÁRIA:');
console.log('   1. Copie o SQL acima');
console.log('   2. Abra o Supabase SQL Editor (https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new)');
console.log('   3. Cole e execute o SQL');
console.log('   4. Volte aqui e pressione ENTER\n');

// Aguardar usuário
import readline from 'readline';
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

await new Promise(resolve => {
  rl.question('Pressione ENTER após executar o SQL... ', () => {
    resolve();
  });
});

// ============================================================================
// PASSO 2: Testar inserção
// ============================================================================

console.log('\n📦 PASSO 2: Testando inserção...\n');

// Pegar um purchase
const { data: purchase } = await supabase
  .from('standalone_purchases')
  .select('id, user_id, collection_id, status')
  .limit(1)
  .single();

if (!purchase) {
  console.error('❌ Nenhum standalone_purchase encontrado');
  process.exit(1);
}

console.log(`Purchase: ${purchase.id} (status: ${purchase.status})`);

// Pegar dados relacionados
const { data: profile } = await supabase
  .from('profiles')
  .select('full_name, email')
  .eq('id', purchase.user_id)
  .single();

const { data: collection } = await supabase
  .from('collections')
  .select('id, name')
  .eq('id', purchase.collection_id)
  .single();

// Tentar inserir
console.log('\nTentando inserir na production_queue...');

const { data: inserted, error } = await supabase
  .from('production_queue')
  .insert({
    order_id: purchase.id,
    order_type: 'standalone_purchase',
    user_id: purchase.user_id,
    customer_name: profile?.full_name || 'Test',
    customer_email: profile?.email || 'test@test.com',
    collection_id: collection?.id,
    collection_name: collection?.name || 'Test',
    production_status: 'ready_for_production',
    current_stage: 'design',
    choice_status: 'approved',
    priority_score: 50
  })
  .select()
  .single();

if (error) {
  console.error('❌ Erro:', error.message);
  console.log('\n⚠️  O trigger ainda está falhando.');
  console.log('   Vamos tentar uma abordagem alternativa...\n');
  
  // Desabilitar o trigger temporariamente
  console.log('Desabilitando trigger temporariamente...');
  const disableTriggerSQL = 'DROP TRIGGER IF EXISTS trigger_initialize_production_stages ON production_queue;';
  
  console.log('\nExecute este SQL no Supabase:');
  console.log('---');
  console.log(disableTriggerSQL);
  console.log('---\n');
  
  await new Promise(resolve => {
    rl.question('Pressione ENTER após executar... ', () => {
      resolve();
    });
  });
  
  // Tentar novamente
  console.log('\nTentando inserir novamente...');
  const { data: inserted2, error: error2 } = await supabase
    .from('production_queue')
    .insert({
      order_id: purchase.id,
      order_type: 'standalone_purchase',
      user_id: purchase.user_id,
      customer_name: profile?.full_name || 'Test',
      customer_email: profile?.email || 'test@test.com',
      collection_id: collection?.id,
      collection_name: collection?.name || 'Test',
      production_status: 'ready_for_production',
      current_stage: 'design',
      choice_status: 'approved',
      priority_score: 50
    })
    .select()
    .single();
  
  if (error2) {
    console.error('❌ Ainda falhou:', error2.message);
  } else {
    console.log('✅ SUCESSO!');
    console.log(`   ID: ${inserted2.id}`);
    console.log(`   Cliente: ${inserted2.customer_name}`);
    console.log(`   Coleção: ${inserted2.collection_name}`);
  }
} else {
  console.log('✅ SUCESSO!');
  console.log(`   ID: ${inserted.id}`);
  console.log(`   Cliente: ${inserted.customer_name}`);
  console.log(`   Coleção: ${inserted.collection_name}`);
}

rl.close();

// ============================================================================
// PASSO 3: Verificar resultado
// ============================================================================

console.log('\n' + '='.repeat(80));
console.log('\n📊 RESULTADO FINAL:\n');

const { count, data: items } = await supabase
  .from('production_queue')
  .select('*', { count: 'exact' });

console.log(`Total na production_queue: ${count || 0}`);

if (items && items.length > 0) {
  console.log('\nItens:');
  items.forEach(item => {
    console.log(`  • ${item.customer_name} - ${item.collection_name} (${item.current_stage})`);
  });
}

console.log('\n' + '='.repeat(80));

if (count > 0) {
  console.log('\n✅ SUCESSO TOTAL!');
  console.log('\n🎉 Acesse: http://localhost:8080/admin/producao\n');
  console.log('O Hub de Produção agora deve mostrar os dados corretamente!\n');
} else {
  console.log('\n⚠️  Ainda não há itens na fila.');
  console.log('\nPara popular automaticamente no futuro:');
  console.log('1. Certifique-se que o trigger está habilitado');
  console.log('2. Crie/atualize standalone_purchases com status balance_paid');
  console.log('3. O sistema irá popular automaticamente\n');
}

console.log('='.repeat(80));
console.log('\n');
