#!/usr/bin/env node
/**
 * Script de Diagnóstico: Production Queue
 * 
 * Este script investiga por que a production_queue está vazia
 * e identifica a causa raiz do problema.
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erro: Variáveis de ambiente não configuradas');
  console.error('   VITE_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('🔍 DIAGNÓSTICO: Production Queue\n');
console.log('='.repeat(80));

// ============================================================================
// STEP 1: Verificar production_queue
// ============================================================================
console.log('\n📊 STEP 1: Contando registros em production_queue...');
const { data: queueData, error: queueError, count: queueCount } = await supabase
  .from('production_queue')
  .select('*', { count: 'exact' });

if (queueError) {
  console.error('❌ Erro ao buscar production_queue:', queueError.message);
} else {
  console.log(`✓ Total de registros: ${queueCount || 0}`);
  if (queueCount > 0) {
    console.log('✓ Primeiros registros:');
    queueData.slice(0, 3).forEach(item => {
      console.log(`  - ${item.customer_name} | ${item.collection_name} | ${item.current_stage}`);
    });
  }
}

// ============================================================================
// STEP 2: Verificar subscription_deliveries do João Trimestral
// ============================================================================
console.log('\n📊 STEP 2: Buscando deliveries do João Trimestral...');

// First, find João's user_id
const { data: joaoProfile, error: joaoError } = await supabase
  .from('profiles')
  .select('id, full_name, email')
  .or('full_name.ilike.%trimestral%,email.ilike.%joao%')
  .limit(1)
  .single();

let deliveriesData = null;
let deliveriesError = null;

if (joaoProfile) {
  console.log(`✓ Encontrado: ${joaoProfile.full_name} (${joaoProfile.email})`);
  
  // Now get his deliveries
  const result = await supabase
    .from('subscription_deliveries')
    .select('*')
    .eq('user_id', joaoProfile.id)
    .order('created_at', { ascending: false });
  
  deliveriesData = result.data;
  deliveriesError = result.error;
} else {
  console.log('ℹ️  João Trimestral não encontrado, buscando todos os deliveries...');
  
  const result = await supabase
    .from('subscription_deliveries')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  
  deliveriesData = result.data;
  deliveriesError = result.error;
}

if (deliveriesError) {
  console.error('❌ Erro ao buscar deliveries:', deliveriesError.message);
} else {
  console.log(`✓ Total de deliveries encontrados: ${deliveriesData?.length || 0}`);
  if (deliveriesData && deliveriesData.length > 0) {
    for (const delivery of deliveriesData) {
      // Get profile and collection info
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', delivery.user_id)
        .single();
      
      const { data: collection } = await supabase
        .from('collections')
        .select('name')
        .eq('id', delivery.collection_id)
        .single();
      
      console.log(`  - ID: ${delivery.id}`);
      console.log(`    Status: ${delivery.status}`);
      console.log(`    Cliente: ${profile?.full_name || 'N/A'} (${profile?.email || 'N/A'})`);
      console.log(`    Coleção: ${collection?.name || 'N/A'}`);
      console.log(`    Criado em: ${new Date(delivery.created_at).toLocaleString('pt-BR')}`);
      console.log('');
    }
  }
}

// ============================================================================
// STEP 3: Verificar standalone_purchases
// ============================================================================
console.log('\n📊 STEP 3: Verificando standalone_purchases...');
const { data: purchasesData, error: purchasesError, count: purchasesCount } = await supabase
  .from('standalone_purchases')
  .select('id, status, created_at, user_id', { count: 'exact' })
  .order('created_at', { ascending: false })
  .limit(5);

if (purchasesError) {
  console.error('❌ Erro ao buscar purchases:', purchasesError.message);
} else {
  console.log(`✓ Total de standalone_purchases: ${purchasesCount || 0}`);
  if (purchasesData && purchasesData.length > 0) {
    console.log('✓ Últimos 5 registros:');
    for (const purchase of purchasesData) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', purchase.user_id)
        .single();
      console.log(`  - ${profile?.full_name || 'N/A'} | Status: ${purchase.status}`);
    }
  }
}

// ============================================================================
// STEP 4: Verificar manual_payments
// ============================================================================
console.log('\n📊 STEP 4: Verificando manual_payments...');
const { data: paymentsData, error: paymentsError, count: paymentsCount } = await supabase
  .from('manual_payments')
  .select('id, status, created_at, user_id', { count: 'exact' })
  .order('created_at', { ascending: false })
  .limit(5);

if (paymentsError) {
  console.error('❌ Erro ao buscar payments:', paymentsError.message);
} else {
  console.log(`✓ Total de manual_payments: ${paymentsCount || 0}`);
  if (paymentsData && paymentsData.length > 0) {
    console.log('✓ Últimos 5 registros:');
    for (const payment of paymentsData) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', payment.user_id)
        .single();
      console.log(`  - ${profile?.full_name || 'N/A'} | Status: ${payment.status}`);
    }
  }
}

// ============================================================================
// STEP 5: Verificar admin users
// ============================================================================
console.log('\n📊 STEP 5: Verificando usuários admin...');
const { data: adminsData, error: adminsError } = await supabase
  .from('user_roles')
  .select('user_id, role')
  .eq('role', 'admin');

if (adminsError) {
  console.error('❌ Erro ao buscar admins:', adminsError.message);
} else {
  console.log(`✓ Total de admins: ${adminsData?.length || 0}`);
  if (adminsData && adminsData.length > 0) {
    for (const admin of adminsData) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', admin.user_id)
        .single();
      console.log(`  - ${profile?.full_name || 'N/A'} (${profile?.email || 'N/A'})`);
    }
  }
}

// ============================================================================
// ANÁLISE E DIAGNÓSTICO
// ============================================================================
console.log('\n' + '='.repeat(80));
console.log('📋 ANÁLISE E DIAGNÓSTICO\n');

if (queueCount === 0) {
  console.log('❌ PROBLEMA IDENTIFICADO: production_queue está vazia\n');
  console.log('🔍 CAUSAS POSSÍVEIS:\n');
  
  if (!deliveriesData || deliveriesData.length === 0) {
    console.log('1. ❌ Não existem subscription_deliveries no sistema');
    console.log('   → Solução: Criar deliveries de teste ou aguardar deliveries reais\n');
  } else {
    console.log('1. ✓ Existem subscription_deliveries no sistema');
    
    const confirmedDeliveries = deliveriesData.filter(d => d.status === 'confirmed');
    if (confirmedDeliveries.length === 0) {
      console.log('2. ❌ CAUSA RAIZ: Nenhum delivery tem status = "confirmed"');
      console.log('   → O trigger só dispara quando status = "confirmed"');
      console.log('   → Status encontrados:', [...new Set(deliveriesData.map(d => d.status))].join(', '));
      console.log('\n   💡 SOLUÇÃO PROFISSIONAL:');
      console.log('   a) Atualizar deliveries existentes para status "confirmed"');
      console.log('   b) Verificar se o fluxo de negócio está correto');
      console.log('   c) Garantir que deliveries sejam criados com status correto\n');
    } else {
      console.log('2. ✓ Existem deliveries com status "confirmed"');
      console.log('3. ❌ CAUSA RAIZ: Trigger não está funcionando ou não foi executado');
      console.log('\n   💡 SOLUÇÃO PROFISSIONAL:');
      console.log('   a) Verificar se trigger existe no banco');
      console.log('   b) Testar trigger manualmente');
      console.log('   c) Verificar logs de erro do Supabase\n');
    }
  }
  
  if (purchasesCount === 0 && paymentsCount === 0) {
    console.log('3. ℹ️  Não existem standalone_purchases nem manual_payments');
    console.log('   → Isso é normal se o sistema só usa subscriptions\n');
  }
}

console.log('='.repeat(80));
console.log('\n✅ Diagnóstico concluído!\n');
