#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔧 Aplicando correção de prazos na tabela cycles...\n');

const sql = readFileSync('FIX_CYCLES_PRAZOS_OFICIAIS.sql', 'utf-8');

const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

if (error) {
  console.error('❌ Erro ao aplicar SQL:', error);
  process.exit(1);
}

console.log('✅ SQL aplicado com sucesso!\n');

// Verificar resultado
console.log('📊 Verificando ciclos criados...\n');

const { data: cycles, error: cyclesError } = await supabase
  .from('cycles')
  .select('*')
  .order('year', { ascending: true })
  .order('month', { ascending: true });

if (cyclesError) {
  console.error('❌ Erro ao buscar ciclos:', cyclesError);
  process.exit(1);
}

console.log(`✅ ${cycles.length} ciclos criados:\n`);

cycles.forEach((cycle) => {
  const monthName = new Date(cycle.year, cycle.month - 1).toLocaleDateString('pt-BR', { month: 'long' });
  console.log(`${monthName}/${cycle.year}:`);
  console.log(`  Vendas: ${new Date(cycle.open_start).toLocaleDateString('pt-BR')} - ${new Date(cycle.open_end).toLocaleDateString('pt-BR')}`);
  console.log(`  Produção: ${new Date(cycle.production_start).toLocaleDateString('pt-BR')} - ${new Date(cycle.production_end).toLocaleDateString('pt-BR')}`);
  console.log(`  Envio: ${new Date(cycle.shipping_date).toLocaleDateString('pt-BR')}`);
  console.log('');
});

console.log('✅ Correção aplicada com sucesso!');
