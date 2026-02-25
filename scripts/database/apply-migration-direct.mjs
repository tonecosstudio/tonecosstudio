import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = 'https://pabxpvqwtvbjaunjejud.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTgxNTg1NiwiZXhwIjoyMDg1MzkxODU2fQ.vYLGOmT_A4G-tfH87mxIk8Oc5QJRxmcGvy2JSafMGns';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  console.log('🚀 Aplicando migration do sistema de notificações...\n');

  try {
    // Ler o arquivo de migration
    const migrationPath = join(__dirname, 'supabase', 'migrations', '20260228100000_create_admin_notifications_system.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration carregada');
    console.log('📏 Tamanho:', migrationSQL.length, 'caracteres\n');

    // Dividir em statements individuais
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && s !== '');

    console.log('📝 Total de statements:', statements.length, '\n');

    let successCount = 0;
    let errorCount = 0;

    // Executar cada statement via query direto
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      
      // Identificar o tipo de statement
      let type = 'SQL';
      if (statement.toUpperCase().includes('CREATE TABLE')) type = 'CREATE TABLE';
      else if (statement.toUpperCase().includes('CREATE TYPE')) type = 'CREATE TYPE';
      else if (statement.toUpperCase().includes('CREATE FUNCTION')) type = 'CREATE FUNCTION';
      else if (statement.toUpperCase().includes('CREATE TRIGGER')) type = 'CREATE TRIGGER';
      else if (statement.toUpperCase().includes('CREATE POLICY')) type = 'CREATE POLICY';
      else if (statement.toUpperCase().includes('ALTER TABLE')) type = 'ALTER TABLE';
      else if (statement.toUpperCase().includes('CREATE INDEX')) type = 'CREATE INDEX';
      else if (statement.toUpperCase().includes('ALTER PUBLICATION')) type = 'ALTER PUBLICATION';

      process.stdout.write(`[${i + 1}/${statements.length}] ${type}... `);

      try {
        // Usar rpc para executar SQL bruto
        const { error } = await supabase.rpc('exec_sql', { sql: statement });

        if (error) {
          // Se exec_sql não existir, tentar via query direto (não funciona para DDL)
          console.log('⚠️  (exec_sql não disponível)');
          errorCount++;
        } else {
          console.log('✅');
          successCount++;
        }
      } catch (err) {
        console.log('❌', err.message.substring(0, 50));
        errorCount++;
      }
    }

    console.log(`\n📊 Resultado: ${successCount} sucesso, ${errorCount} erros\n`);

    if (errorCount > 0) {
      console.log('⚠️  Alguns statements falharam.');
      console.log('💡 Recomendação: Aplique manualmente via Supabase Dashboard\n');
      console.log('📝 Passos:');
      console.log('1. Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new');
      console.log('2. Copie o conteúdo de: supabase/migrations/20260228100000_create_admin_notifications_system.sql');
      console.log('3. Cole no SQL Editor e clique em "Run"\n');
    }

    // Verificar tabelas criadas
    console.log('🔍 Verificando tabelas criadas...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .like('table_name', 'admin_%');

    if (!tablesError && tables) {
      console.log('✅ Tabelas encontradas:', tables.length);
      tables.forEach(t => console.log('   -', t.table_name));
    } else {
      console.log('⚠️  Não foi possível verificar tabelas');
    }

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    console.log('\n💡 Aplique manualmente via Supabase Dashboard:');
    console.log('   https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new');
  }
}

applyMigration();
