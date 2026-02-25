import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Usar a connection string direta do Supabase
// Formato: postgresql://postgres:[YOUR-PASSWORD]@db.pabxpvqwtvbjaunjejud.supabase.co:5432/postgres
const SUPABASE_URL = 'https://pabxpvqwtvbjaunjejud.supabase.co';
const PROJECT_REF = 'pabxpvqwtvbjaunjejud';

// Tentar via pooler (porta 6543) com service role key como senha
const connectionString = `postgresql://postgres.${PROJECT_REF}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;

async function applyMigration() {
  console.log('🚀 Aplicando migration do sistema de notificações...\n');
  
  // Ler o arquivo de migration
  const migrationPath = join(__dirname, 'supabase', 'migrations', '20260228100000_create_admin_notifications_system.sql');
  const migrationSQL = readFileSync(migrationPath, 'utf8');

  console.log('📄 Migration carregada');
  console.log('📏 Tamanho:', migrationSQL.length, 'caracteres\n');

  console.log('⚠️  ATENÇÃO: Para aplicar a migration via CLI, você precisa da senha do banco de dados.\n');
  console.log('📝 Opções:');
  console.log('1. Obter a senha em: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/settings/database');
  console.log('2. Ou aplicar manualmente via Dashboard (mais fácil)\n');
  
  console.log('💡 RECOMENDAÇÃO: Use o Dashboard');
  console.log('   Link: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new');
  console.log('   1. Copie o conteúdo de: supabase/migrations/20260228100000_create_admin_notifications_system.sql');
  console.log('   2. Cole no SQL Editor');
  console.log('   3. Clique em "Run"');
  console.log('   4. Pronto! ✅\n');

  console.log('📚 Guias disponíveis:');
  console.log('   - APLICAR_AGORA_DASHBOARD.md (mais simples)');
  console.log('   - GUIA_APLICAR_MIGRATION_VISUAL.md (detalhado)');
  console.log('   - README_APLICAR_MIGRATION.md (resumo)');
}

applyMigration();
