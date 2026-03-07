#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

console.log('🔍 Verificando estrutura de system_settings...\n');

const { data, error } = await supabase
  .from('system_settings')
  .select('*')
  .limit(10);

if (error) {
  console.error('❌ Erro:', error);
  process.exit(1);
}

console.log('✅ Colunas encontradas:');
if (data && data.length > 0) {
  console.log(Object.keys(data[0]));
  console.log('\n📊 Dados:');
  data.forEach(row => {
    console.log(`  ${row.key || row.setting_key}: ${row.value || row.setting_value}`);
  });
} else {
  console.log('⚠️  Nenhum dado encontrado');
}
