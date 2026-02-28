#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://pabxpvqwtvbjaunjejud.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTgxNTg1NiwiZXhwIjoyMDg1MzkxODU2fQ.vYLGOmT_A4G-tfH87mxIk8Oc5QJRxmcGvy2JSafMGns";

console.log('🚀 Aplicando Migration: Hero Image URL\n');
console.log(`📍 Supabase URL: ${SUPABASE_URL}\n`);

// Criar cliente Supabase com service role key
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// SQL da migration
const sql = `ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS hero_image_url TEXT;`;

console.log('📝 SQL a ser executado:');
console.log(sql);
console.log('\n⏳ Verificando se a coluna já existe...\n');

try {
  // Verificar se a coluna já existe
  const { data: testData, error: testError } = await supabase
    .from('system_settings')
    .select('hero_image_url')
    .limit(1);
  
  if (!testError) {
    console.log('✅ Coluna hero_image_url já existe!\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ MIGRATION JÁ APLICADA!');
    console.log('═══════════════════════════════════════════════════════\n');
  } else if (testError.message.includes('column') && testError.message.includes('does not exist')) {
    console.log('⚠️  Coluna não existe. Precisa ser criada manualmente.\n');
    console.log('📋 Execute o SQL abaixo no Supabase SQL Editor:\n');
    console.log('🔗 https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new\n');
    console.log('```sql');
    console.log(sql);
    console.log('```\n');
    process.exit(1);
  } else {
    throw testError;
  }
  
  console.log('📋 Próximos passos:\n');
  console.log('1. Acesse: Admin > Configurações do Sistema');
  console.log('2. Vá para a tab "Interface"');
  console.log('3. Cole a URL da imagem no campo "Imagem do Hero"');
  console.log('4. Clique em "Salvar Alterações"\n');
  console.log('💡 Recomendação: Imagem vertical (3:4 ou 2:3), ex: 600x800px\n');
  
} catch (error) {
  console.error('\n❌ ERRO ao verificar migration:');
  console.error(error.message);
  console.error('\n📋 Por favor, aplique manualmente no Supabase SQL Editor:');
  console.error('🔗 https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new\n');
  console.error('```sql');
  console.error(sql);
  console.error('```\n');
  process.exit(1);
}
