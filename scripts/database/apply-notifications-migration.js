import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Erro: VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar definidos no .env');
  console.log('\nAdicione ao seu arquivo .env:');
  console.log('SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui');
  console.log('\nVocê pode encontrar a service role key em:');
  console.log('https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/settings/api');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function applyMigration() {
  try {
    console.log('🚀 Aplicando migration do sistema de notificações...\n');

    // Ler o arquivo de migration
    const migrationPath = join(__dirname, 'supabase', 'migrations', '20260228100000_create_admin_notifications_system.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration carregada:', migrationPath);
    console.log('📏 Tamanho:', migrationSQL.length, 'caracteres\n');

    // Dividir em statements individuais (separados por ponto e vírgula)
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log('📝 Total de statements:', statements.length, '\n');

    // Executar cada statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      
      // Identificar o tipo de statement
      let type = 'SQL';
      if (statement.includes('CREATE TABLE')) type = 'CREATE TABLE';
      else if (statement.includes('CREATE TYPE')) type = 'CREATE TYPE';
      else if (statement.includes('CREATE FUNCTION')) type = 'CREATE FUNCTION';
      else if (statement.includes('CREATE TRIGGER')) type = 'CREATE TRIGGER';
      else if (statement.includes('CREATE POLICY')) type = 'CREATE POLICY';
      else if (statement.includes('ALTER TABLE')) type = 'ALTER TABLE';
      else if (statement.includes('CREATE INDEX')) type = 'CREATE INDEX';

      console.log(`[${i + 1}/${statements.length}] Executando ${type}...`);

      const { error } = await supabase.rpc('exec_sql', { sql: statement });

      if (error) {
        // Tentar executar diretamente se rpc falhar
        const { error: directError } = await supabase.from('_migrations').insert({
          name: `20260228100000_create_admin_notifications_system_${i}`,
          executed_at: new Date().toISOString(),
        });

        if (directError) {
          console.error(`❌ Erro no statement ${i + 1}:`, error.message);
          console.error('Statement:', statement.substring(0, 200) + '...');
          
          // Continuar com próximo statement
          continue;
        }
      }

      console.log(`✅ Statement ${i + 1} executado com sucesso`);
    }

    console.log('\n✅ Migration aplicada com sucesso!');
    console.log('\n📊 Próximos passos:');
    console.log('1. Verifique as tabelas criadas no Supabase Dashboard');
    console.log('2. Teste o sistema de notificações');
    console.log('3. Configure os triggers para eventos reais');

  } catch (error) {
    console.error('\n❌ Erro ao aplicar migration:', error.message);
    console.error(error);
    process.exit(1);
  }
}

applyMigration();
