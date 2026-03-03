// Script para verificar se a tabela existe
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Ler variáveis do .env
const envContent = fs.readFileSync('.env', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      value = value.replace(/^["']|["']$/g, '');
      envVars[key] = value;
    }
  }
});

const supabase = createClient(envVars.VITE_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

async function verifyTable() {
  console.log('🔍 Verificando se production_queue existe...\n');

  // Tentar fazer uma query simples
  const { data, error } = await supabase
    .from('production_queue')
    .select('id')
    .limit(1);

  if (error) {
    console.error('❌ Erro ao acessar production_queue:', error.message);
    console.error('   Code:', error.code);
    console.error('   Details:', error.details);
    console.error('   Hint:', error.hint);
    
    console.log('\n💡 A tabela pode não existir ou não estar exposta via API.');
    console.log('   Verifique no Supabase Dashboard > Table Editor se a tabela existe.');
    console.log('   Se existir, verifique as políticas RLS.');
  } else {
    console.log('✅ Tabela production_queue existe e está acessível!');
    console.log('   Registros encontrados:', data?.length || 0);
  }

  // Tentar acessar outras tabelas para comparar
  console.log('\n🔍 Verificando outras tabelas...');
  
  const tables = ['manual_payments', 'subscriptions', 'profiles'];
  for (const table of tables) {
    const { error: tableError } = await supabase
      .from(table)
      .select('id')
      .limit(1);
    
    if (tableError) {
      console.log(`   ❌ ${table}: ${tableError.message}`);
    } else {
      console.log(`   ✅ ${table}: acessível`);
    }
  }
}

verifyTable();
