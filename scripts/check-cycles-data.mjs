#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

console.log('🔍 Verificando dados da tabela cycles...\n');

const { data: cycles, error } = await supabase
  .from('cycles')
  .select('*')
  .order('year', { ascending: false })
  .order('month', { ascending: false })
  .order('cycle_number', { ascending: false })
  .limit(5);

if (error) {
  console.error('❌ Erro:', error);
  process.exit(1);
}

if (!cycles || cycles.length === 0) {
  console.log('⚠️  Nenhum ciclo encontrado na tabela cycles');
  process.exit(0);
}

console.log(`✅ Encontrados ${cycles.length} ciclos:\n`);

cycles.forEach((cycle, index) => {
  console.log(`${index + 1}. Ciclo ${cycle.cycle_number} - ${cycle.month}/${cycle.year}`);
  console.log(`   Status: ${cycle.status}`);
  console.log(`   Período de Escolha: ${cycle.open_start} → ${cycle.open_end}`);
  console.log(`   Produção: ${cycle.production_start} → ${cycle.production_end}`);
  console.log(`   Data de Envio: ${cycle.shipping_date}`);
  console.log(`   Capacidade: ${cycle.capacity_current} / ${cycle.capacity_max}`);
  console.log('');
});

console.log('\n📊 ANÁLISE DOS PRAZOS:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const currentCycle = cycles[0];
const openStart = new Date(currentCycle.open_start);
const openEnd = new Date(currentCycle.open_end);
const prodStart = new Date(currentCycle.production_start);
const prodEnd = new Date(currentCycle.production_end);
const shippingDate = new Date(currentCycle.shipping_date);

const openDays = Math.ceil((openEnd - openStart) / (1000 * 60 * 60 * 24));
const prodDays = Math.ceil((prodEnd - prodStart) / (1000 * 60 * 60 * 24));
const totalDays = Math.ceil((shippingDate - openStart) / (1000 * 60 * 60 * 24));

console.log(`\nCiclo Atual: ${currentCycle.cycle_number} - ${currentCycle.month}/${currentCycle.year}`);
console.log(`Período de Escolha: ${openDays} dias`);
console.log(`Período de Produção: ${prodDays} dias`);
console.log(`Total até Envio: ${totalDays} dias`);

console.log('\n⚠️  PRAZOS OFICIAIS DO SISTEMA:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Vendas/Escolha: 30 dias (mês completo)');
console.log('Produção: 30 dias (mês completo)');
console.log('Envio: 15 dias (segunda quinzena do mês)');
console.log('Total: 90 dias (3 meses)');
console.log('\nFluxo: MARÇO (vendas) → ABRIL (produção) → MAIO (envio)');
