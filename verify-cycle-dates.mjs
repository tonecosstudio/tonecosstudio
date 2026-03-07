#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

console.log('🔍 Verificando datas reais dos ciclos...\n');

const { data: cycles, error } = await supabase
  .from('cycles')
  .select('*')
  .eq('month', 3)
  .eq('year', 2026)
  .single();

if (error) {
  console.error('❌ Erro:', error);
  process.exit(1);
}

console.log('📅 Ciclo de Março/2026:\n');
console.log('open_start (timestamp completo):', cycles.open_start);
console.log('open_end (timestamp completo):', cycles.open_end);
console.log('production_start (timestamp completo):', cycles.production_start);
console.log('production_end (timestamp completo):', cycles.production_end);
console.log('shipping_date:', cycles.shipping_date);

console.log('\n📊 Convertendo para datas:');
const openStart = new Date(cycles.open_start);
const openEnd = new Date(cycles.open_end);
const prodStart = new Date(cycles.production_start);
const prodEnd = new Date(cycles.production_end);

console.log('Vendas início:', openStart.toLocaleString('pt-BR'));
console.log('Vendas fim:', openEnd.toLocaleString('pt-BR'));
console.log('Produção início:', prodStart.toLocaleString('pt-BR'));
console.log('Produção fim:', prodEnd.toLocaleString('pt-BR'));

const salesDays = Math.ceil((openEnd - openStart) / (1000 * 60 * 60 * 24));
const prodDays = Math.ceil((prodEnd - prodStart) / (1000 * 60 * 60 * 24));

console.log('\n⏱️  Duração:');
console.log('Vendas:', salesDays, 'dias');
console.log('Produção:', prodDays, 'dias');
