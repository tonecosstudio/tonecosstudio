#!/usr/bin/env node
/**
 * Script para aplicar correções de prazos no banco remoto
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://pabxpvqwtvbjaunjejud.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTgxNTg1NiwiZXhwIjoyMDg1MzkxODU2fQ.vYLGOmT_A4G-tfH87mxIk8Oc5QJRxmcGvy2JSafMGns';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🔧 Aplicando correções de prazos...\n');

// Ler o arquivo SQL
const sql = readFileSync('FIX_PRAZOS_OFICIAIS.sql', 'utf-8');

// Dividir em statements individuais (remover comentários e linhas vazias)
const statements = sql
  .split('\n')
  .filter(line => !line.trim().startsWith('--') && line.trim() !== '')
  .join('\n')
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.match(/^(BEGIN|COMMIT)$/i));

console.log(`📝 ${statements.length} statements para executar\n`);

// Executar cada statement
let successCount = 0;
let errorCount = 0;

for (let i = 0; i < statements.length; i++) {
  const statement = statements[i];
  
  // Pular comentários de bloco
  if (statement.includes('/*') || statement.includes('*/')) {
    continue;
  }
  
  // Pular linhas de separação
  if (statement.match(/^={3,}$/)) {
    continue;
  }
  
  try {
    console.log(`⏳ [${i + 1}/${statements.length}] Executando...`);
    
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: statement + ';' 
    });
    
    if (error) {
      // Tentar executar diretamente via REST API
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        },
        body: JSON.stringify({ sql_query: statement + ';' })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }
    }
    
    console.log(`✅ [${i + 1}/${statements.length}] Sucesso\n`);
    successCount++;
  } catch (err) {
    console.error(`❌ [${i + 1}/${statements.length}] Erro:`, err.message);
    console.error(`   Statement: ${statement.substring(0, 100)}...\n`);
    errorCount++;
  }
}

console.log('\n' + '='.repeat(60));
console.log(`✅ Sucesso: ${successCount}`);
console.log(`❌ Erros: ${errorCount}`);
console.log('='.repeat(60));

if (errorCount === 0) {
  console.log('\n🎉 Todas as correções foram aplicadas com sucesso!');
  console.log('\n📊 Execute as queries de validação:');
  console.log('   node scripts/validate-prazos.mjs');
} else {
  console.log('\n⚠️  Algumas correções falharam. Verifique os erros acima.');
  console.log('   Você pode aplicar manualmente via SQL Editor:');
  console.log('   https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new');
}
