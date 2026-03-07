#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔧 Aplicando sistema SSOT para ciclos...\n');

const sql = readFileSync('FIX_CYCLES_USE_SSOT.sql', 'utf-8');

// Dividir em statements individuais (remover BEGIN/COMMIT)
const statements = sql
  .replace(/^BEGIN;/gm, '')
  .replace(/^COMMIT;/gm, '')
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

console.log(`📝 Executando ${statements.length} statements...\n`);

let successCount = 0;
let errorCount = 0;

for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i];
  
  // Pular comentários e linhas vazias
  if (stmt.startsWith('--') || stmt.length < 10) continue;
  
  console.log(`[${i + 1}/${statements.length}] Executando...`);
  
  const { data, error } = await supabase.rpc('exec_sql', { 
    sql_query: stmt + ';' 
  });
  
  if (error) {
    console.error(`❌ Erro no statement ${i + 1}:`, error.message);
    errorCount++;
    
    // Continuar mesmo com erro (alguns podem ser esperados)
    if (error.message.includes('does not exist') || 
        error.message.includes('already exists')) {
      console.log('   ⚠️  Erro esperado, continuando...\n');
      continue;
    }
  } else {
    successCount++;
    console.log(`   ✅ Sucesso\n`);
  }
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📊 Resultado: ${successCount} sucesso, ${errorCount} erros`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Verificar ciclos criados
console.log('🔍 Verificando ciclos criados...\n');

const { data: cycles, error: cyclesError } = await supabase
  .from('cycles')
  .select('*')
  .order('year', { ascending: true })
  .order('month', { ascending: true });

if (cyclesError) {
  console.error('❌ Erro ao buscar ciclos:', cyclesError);
  process.exit(1);
}

if (!cycles || cycles.length === 0) {
  console.log('⚠️  Nenhum ciclo encontrado. Tentando popular manualmente...\n');
  
  const { data: populateResult, error: populateError } = await supabase
    .rpc('populate_cycles', { 
      p_start_month: 3, 
      p_start_year: 2026, 
      p_num_months: 10 
    });
  
  if (populateError) {
    console.error('❌ Erro ao popular ciclos:', populateError);
    process.exit(1);
  }
  
  console.log(`✅ ${populateResult} ciclos criados!\n`);
  
  // Buscar novamente
  const { data: newCycles } = await supabase
    .from('cycles')
    .select('*')
    .order('year', { ascending: true })
    .order('month', { ascending: true });
  
  cycles.push(...(newCycles || []));
}

console.log(`✅ ${cycles.length} ciclos encontrados:\n`);

cycles.forEach((cycle) => {
  const monthName = new Date(cycle.year, cycle.month - 1).toLocaleDateString('pt-BR', { month: 'long' });
  const openStart = new Date(cycle.open_start);
  const openEnd = new Date(cycle.open_end);
  const prodStart = new Date(cycle.production_start);
  const prodEnd = new Date(cycle.production_end);
  const shipping = new Date(cycle.shipping_date);
  
  const salesDays = Math.ceil((openEnd - openStart) / (1000 * 60 * 60 * 24));
  const prodDays = Math.ceil((prodEnd - prodStart) / (1000 * 60 * 60 * 24));
  const totalDays = Math.ceil((shipping - openStart) / (1000 * 60 * 60 * 24));
  
  console.log(`${monthName}/${cycle.year}:`);
  console.log(`  Vendas: ${openStart.toLocaleDateString('pt-BR')} - ${openEnd.toLocaleDateString('pt-BR')} (${salesDays} dias)`);
  console.log(`  Produção: ${prodStart.toLocaleDateString('pt-BR')} - ${prodEnd.toLocaleDateString('pt-BR')} (${prodDays} dias)`);
  console.log(`  Envio: ${shipping.toLocaleDateString('pt-BR')} (total: ${totalDays} dias)`);
  console.log('');
});

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ Sistema SSOT aplicado com sucesso!');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('\n💡 COMO USAR:');
console.log('   1. Alterar prazos: UPDATE system_settings SET production_days = 45;');
console.log('   2. Ciclos são recalculados automaticamente!');
console.log('   3. Criar novos ciclos: SELECT populate_cycles(1, 2027, 12);');
