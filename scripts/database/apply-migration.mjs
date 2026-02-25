import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = 'https://pabxpvqwtvbjaunjejud.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTgxNTg1NiwiZXhwIjoyMDg1MzkxODU2fQ.vYLGOmT_A4G-tfH87mxIk8Oc5QJRxmcGvy2JSafMGns';

async function executeSql(sql) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: sql })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error}`);
  }

  return response.json();
}

async function applyMigration() {
  try {
    console.log('🚀 Aplicando migration do sistema de notificações...\n');

    // Ler o arquivo de migration
    const migrationPath = join(__dirname, 'supabase', 'migrations', '20260228100000_create_admin_notifications_system.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration carregada');
    console.log('📏 Tamanho:', migrationSQL.length, 'caracteres\n');

    // Tentar executar a migration completa
    console.log('⏳ Executando migration...');
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ query: migrationSQL })
    });

    if (response.ok) {
      console.log('✅ Migration aplicada com sucesso!\n');
    } else {
      const errorText = await response.text();
      console.log('⚠️  Resposta:', response.status, errorText);
      console.log('\n📝 A migration pode ter sido aplicada parcialmente.');
      console.log('Vamos verificar as tabelas criadas...\n');
    }

    // Verificar tabelas criadas
    console.log('🔍 Verificando tabelas criadas...');
    const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({ 
        query: `
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name LIKE 'admin_%'
          ORDER BY table_name;
        `
      })
    });

    if (checkResponse.ok) {
      const tables = await checkResponse.json();
      console.log('✅ Tabelas encontradas:', tables.length > 0 ? tables.map(t => t.table_name).join(', ') : 'Nenhuma');
    }

    console.log('\n📊 Próximos passos:');
    console.log('1. Verifique as tabelas no Supabase Dashboard');
    console.log('2. Teste o NotificationCenter no painel admin');
    console.log('3. Configure as preferências de notificação');

  } catch (error) {
    console.error('\n❌ Erro ao aplicar migration:', error.message);
    console.log('\n💡 Tente aplicar manualmente via Supabase Dashboard:');
    console.log('   https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new');
    process.exit(1);
  }
}

applyMigration();
