#!/usr/bin/env node
/**
 * Verificar Schema Real do Banco
 * 
 * Este script verifica o schema real da tabela production_queue
 * para identificar todas as inconsistências
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 VERIFICANDO SCHEMA REAL DO BANCO\n');
console.log('='.repeat(80));

// Tentar inserir um registro de teste para ver quais colunas existem
const testId = '00000000-0000-0000-0000-000000000001';

console.log('\n1. Testando inserção com customer_id...');
let { error: error1 } = await supabase
  .from('production_queue')
  .insert({
    order_id: testId,
    order_type: 'standalone_purchase',
    customer_id: testId,
    customer_name: 'Test',
    customer_email: 'test@test.com',
    collection_id: testId,
    collection_name: 'Test',
    production_status: 'ready_for_production',
    current_stage: 'design',
    choice_status: 'approved'
  });

if (error1) {
  console.log('   ❌ Falhou:', error1.message);
  if (error1.message.includes('customer_id')) {
    console.log('   → Coluna customer_id NÃO existe ou tem problema');
  }
} else {
  console.log('   ✅ Sucesso com customer_id');
  await supabase.from('production_queue').delete().eq('order_id', testId);
}

console.log('\n2. Testando inserção com user_id...');
let { error: error2 } = await supabase
  .from('production_queue')
  .insert({
    order_id: testId,
    order_type: 'standalone_purchase',
    user_id: testId,
    customer_name: 'Test',
    customer_email: 'test@test.com',
    collection_id: testId,
    collection_name: 'Test',
    production_status: 'ready_for_production',
    current_stage: 'design',
    choice_status: 'approved'
  });

if (error2) {
  console.log('   ❌ Falhou:', error2.message);
  if (error2.message.includes('user_id')) {
    console.log('   → Coluna user_id NÃO existe ou tem problema');
  }
} else {
  console.log('   ✅ Sucesso com user_id');
  await supabase.from('production_queue').delete().eq('order_id', testId);
}

console.log('\n3. Testando inserção com priority como TEXT...');
let { error: error3 } = await supabase
  .from('production_queue')
  .insert({
    order_id: testId,
    order_type: 'standalone_purchase',
    user_id: testId,
    customer_name: 'Test',
    customer_email: 'test@test.com',
    collection_id: testId,
    collection_name: 'Test',
    production_status: 'ready_for_production',
    current_stage: 'design',
    choice_status: 'approved',
    priority: 'normal'
  });

if (error3) {
  console.log('   ❌ Falhou:', error3.message);
  if (error3.message.includes('integer')) {
    console.log('   → Coluna priority é INTEGER, não TEXT');
  }
} else {
  console.log('   ✅ Sucesso com priority TEXT');
  await supabase.from('production_queue').delete().eq('order_id', testId);
}

console.log('\n4. Testando inserção com priority como INTEGER...');
let { error: error4 } = await supabase
  .from('production_queue')
  .insert({
    order_id: testId,
    order_type: 'standalone_purchase',
    user_id: testId,
    customer_name: 'Test',
    customer_email: 'test@test.com',
    collection_id: testId,
    collection_name: 'Test',
    production_status: 'ready_for_production',
    current_stage: 'design',
    choice_status: 'approved',
    priority: 50
  });

if (error4) {
  console.log('   ❌ Falhou:', error4.message);
} else {
  console.log('   ✅ Sucesso com priority INTEGER');
  await supabase.from('production_queue').delete().eq('order_id', testId);
}

console.log('\n' + '='.repeat(80));
console.log('\n📋 CONCLUSÃO:\n');

if (!error2 && error1) {
  console.log('✓ Tabela usa user_id (NÃO customer_id)');
}
if (!error4 && error3) {
  console.log('✓ Coluna priority é INTEGER (NÃO TEXT)');
}

console.log('\n');
