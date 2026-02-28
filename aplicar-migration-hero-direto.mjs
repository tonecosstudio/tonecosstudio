#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://pabxpvqwtvbjaunjejud.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTgxNTg1NiwiZXhwIjoyMDg1MzkxODU2fQ.vYLGOmT_A4G-tfH87mxIk8Oc5QJRxmcGvy2JSafMGns";

console.log('🚀 Aplicando Migration: Hero Image URL via SQL direto\n');

const sql = `ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS hero_image_url TEXT;`;

// Tentar via fetch direto para o endpoint de SQL
try {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`
    },
    body: JSON.stringify({ query: sql })
  });

  if (!response.ok) {
    const error = await response.text();
    console.log('⚠️  Método RPC não disponível:', error);
    console.log('\n📋 Aplicando via método alternativo...\n');
    
    // Método alternativo: usar pg_temp para executar SQL
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    
    // Tentar criar um registro temporário que force a verificação da estrutura
    const { error: insertError } = await supabase
      .from('system_settings')
      .insert({ 
        key: 'hero_image_url_temp_check',
        value: 'checking',
        description: 'Temporary check'
      });
    
    if (insertError) {
      console.log('❌ Não foi possível aplicar automaticamente.\n');
      console.log('📋 Por favor, execute manualmente no Supabase SQL Editor:\n');
      console.log('🔗 https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new\n');
      console.log('```sql');
      console.log(sql);
      console.log('```\n');
      process.exit(1);
    }
    
    // Deletar o registro temporário
    await supabase
      .from('system_settings')
      .delete()
      .eq('key', 'hero_image_url_temp_check');
  } else {
    console.log('✅ SQL executado com sucesso!\n');
  }
  
  // Verificar se funcionou
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const { error: checkError } = await supabase
    .from('system_settings')
    .select('hero_image_url')
    .limit(1);
  
  if (!checkError) {
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ MIGRATION APLICADA COM SUCESSO!');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('📋 Próximos passos:\n');
    console.log('1. Acesse: Admin > Configurações do Sistema');
    console.log('2. Vá para a tab "Interface"');
    console.log('3. Cole a URL da imagem no campo "Imagem do Hero"');
    console.log('4. Clique em "Salvar Alterações"\n');
    console.log('💡 Recomendação: Imagem vertical (3:4 ou 2:3), ex: 600x800px\n');
  } else {
    throw new Error('Coluna não foi criada');
  }
  
} catch (error) {
  console.error('\n❌ ERRO:', error.message);
  console.error('\n📋 Por favor, aplique manualmente no Supabase SQL Editor:');
  console.error('🔗 https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new\n');
  console.error('```sql');
  console.error(sql);
  console.error('```\n');
  process.exit(1);
}
