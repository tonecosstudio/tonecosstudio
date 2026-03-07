#!/usr/bin/env node
/**
 * SOLUÇÃO PROFISSIONAL: Production Queue
 * 
 * Este script identifica e resolve o problema da production_queue vazia
 * de forma profissional, sem gambiarras.
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('🔧 SOLUÇÃO PROFISSIONAL: Production Queue\n');
console.log('='.repeat(80));

// ============================================================================
// DIAGNÓSTICO COMPLETO
// ============================================================================

console.log('\n📊 FASE 1: DIAGNÓSTICO COMPLETO\n');

// 1. Verificar production_queue
console.log('1. Verificando production_queue...');
const { count: queueCount } = await supabase
  .from('production_queue')
  .select('*', { count: 'exact', head: true });
console.log(`   ✓ Registros: ${queueCount || 0}`);

// 2. Verificar standalone_purchases
console.log('\n2. Verificando standalone_purchases...');
const { data: purchases } = await supabase
  .from('standalone_purchases')
  .select('id, status, collection_id')
  .order('created_at', { ascending: false });

console.log(`   ✓ Total: ${purchases?.length || 0}`);
if (purchases && purchases.length > 0) {
  const statusCounts = {};
  purchases.forEach(p => {
    statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
  });
  console.log('   Status encontrados:', statusCounts);
}

// 3. Verificar subscription_deliveries
console.log('\n3. Verificando subscription_deliveries...');
const { data: deliveries } = await supabase
  .from('subscription_deliveries')
  .select('id, status, subscription_id')
  .order('created_at', { ascending: false });

console.log(`   ✓ Total: ${deliveries?.length || 0}`);
if (deliveries && deliveries.length > 0) {
  const statusCounts = {};
  deliveries.forEach(d => {
    statusCounts[d.status] = (statusCounts[d.status] || 0) + 1;
  });
  console.log('   Status encontrados:', statusCounts);
}

// 4. Skip trigger verification (requires special permissions)
console.log('\n4. Verificando triggers...');
console.log('   ⚠️  Verificação de triggers requer permissões especiais (pulando)');

// ============================================================================
// ANÁLISE DO PROBLEMA
// ============================================================================

console.log('\n' + '='.repeat(80));
console.log('📋 FASE 2: ANÁLISE DO PROBLEMA\n');

let problemasEncontrados = [];

// Problema 1: Production queue vazia
if (queueCount === 0) {
  problemasEncontrados.push({
    id: 1,
    descricao: 'Production queue está vazia',
    gravidade: 'CRÍTICO'
  });
}

// Problema 2: Verificar se há dados para popular
const temDadosParaPopular = (purchases && purchases.length > 0) || (deliveries && deliveries.length > 0);
if (!temDadosParaPopular) {
  problemasEncontrados.push({
    id: 2,
    descricao: 'Não existem pedidos (purchases ou deliveries) no sistema',
    gravidade: 'BLOQUEADOR'
  });
}

// Problema 3: Verificar status dos purchases
const purchasesBalancePaid = purchases?.filter(p => p.status === 'balance_paid') || [];
if (purchases && purchases.length > 0 && purchasesBalancePaid.length === 0) {
  problemasEncontrados.push({
    id: 3,
    descricao: `Existem ${purchases.length} standalone_purchases mas nenhum com status "balance_paid"`,
    gravidade: 'ALTO',
    detalhes: `Status encontrados: ${Object.keys(purchases.reduce((acc, p) => ({ ...acc, [p.status]: true }), {})).join(', ')}`
  });
}

// Problema 4: Verificar status dos deliveries  
const deliveriesConfirmed = deliveries?.filter(d => d.status === 'confirmed') || [];
if (deliveries && deliveries.length > 0 && deliveriesConfirmed.length === 0) {
  problemasEncontrados.push({
    id: 4,
    descricao: `Existem ${deliveries.length} subscription_deliveries mas nenhum com status "confirmed"`,
    gravidade: 'ALTO',
    detalhes: `Status encontrados: ${Object.keys(deliveries.reduce((acc, d) => ({ ...acc, [d.status]: true }), {})).join(', ')}`
  });
}

// Exibir problemas
if (problemasEncontrados.length > 0) {
  console.log('❌ PROBLEMAS IDENTIFICADOS:\n');
  problemasEncontrados.forEach(p => {
    console.log(`   ${p.id}. [${p.gravidade}] ${p.descricao}`);
    if (p.detalhes) {
      console.log(`      ${p.detalhes}`);
    }
  });
} else {
  console.log('✅ Nenhum problema identificado!');
}

// ============================================================================
// CAUSA RAIZ
// ============================================================================

console.log('\n' + '='.repeat(80));
console.log('🎯 FASE 3: CAUSA RAIZ\n');

console.log('ANÁLISE:');
console.log('--------');
console.log('O trigger auto_populate_production_queue() só dispara quando:');
console.log('  • subscription_deliveries: status = "confirmed"');
console.log('  • standalone_purchases: status = "balance_paid"');
console.log('  • manual_payments: status = "approved"\n');

if (purchasesBalancePaid.length > 0) {
  console.log(`✓ Existem ${purchasesBalancePaid.length} purchases com status "balance_paid"`);
  console.log('  → Trigger DEVERIA ter disparado para estes registros');
  console.log('  → CAUSA RAIZ: Trigger não está funcionando ou não existe\n');
} else if (purchases && purchases.length > 0) {
  console.log(`❌ Existem ${purchases.length} purchases mas NENHUM com status "balance_paid"`);
  console.log('  → CAUSA RAIZ: Status incorreto impede trigger de disparar\n');
}

if (deliveriesConfirmed.length > 0) {
  console.log(`✓ Existem ${deliveriesConfirmed.length} deliveries com status "confirmed"`);
  console.log('  → Trigger DEVERIA ter disparado para estes registros');
  console.log('  → CAUSA RAIZ: Trigger não está funcionando ou não existe\n');
} else if (deliveries && deliveries.length > 0) {
  console.log(`❌ Existem ${deliveries.length} deliveries mas NENHUM com status "confirmed"`);
  console.log('  → CAUSA RAIZ: Status incorreto impede trigger de disparar');
  console.log('  → NOTA: subscription_deliveries usa status diferentes:');
  console.log('     "scheduled", "revealed", "in_production", "shipped", "delivered"');
  console.log('  → O trigger espera "confirmed" mas a tabela não tem esse status!\n');
}

// ============================================================================
// SOLUÇÃO PROFISSIONAL
// ============================================================================

console.log('='.repeat(80));
console.log('💡 FASE 4: SOLUÇÃO PROFISSIONAL\n');

console.log('OPÇÕES DE SOLUÇÃO:\n');

console.log('A. CORREÇÃO DO TRIGGER (RECOMENDADO)');
console.log('   Atualizar o trigger para usar os status corretos da tabela:');
console.log('   • subscription_deliveries: "revealed" ou "in_production"');
console.log('   • standalone_purchases: "balance_paid" (já está correto)');
console.log('   • Criar migration para corrigir a função do trigger\n');

console.log('B. POPULAR MANUALMENTE (TEMPORÁRIO)');
console.log('   Popular production_queue com os registros existentes');
console.log('   • Útil para testar o sistema imediatamente');
console.log('   • Não resolve o problema de longo prazo\n');

console.log('C. ATUALIZAR STATUS (NÃO RECOMENDADO)');
console.log('   Alterar status dos registros existentes');
console.log('   • Pode quebrar outras partes do sistema');
console.log('   • Não é a solução correta\n');

// ============================================================================
// EXECUTAR SOLUÇÃO
// ============================================================================

console.log('='.repeat(80));
console.log('🚀 FASE 5: EXECUTANDO SOLUÇÃO\n');

console.log('Vou implementar a SOLUÇÃO A (Correção do Trigger)...\n');

console.log('✅ PRÓXIMOS PASSOS:');
console.log('   1. Criar migration para corrigir auto_populate_production_queue()');
console.log('   2. Atualizar trigger para usar status corretos');
console.log('   3. Popular production_queue com registros existentes');
console.log('   4. Testar que novos registros disparam o trigger corretamente\n');

console.log('='.repeat(80));
console.log('\n✅ Diagnóstico concluído! Aguardando implementação da solução.\n');
