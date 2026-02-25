import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Connection string do Supabase
const connectionString = 'postgresql://postgres.pabxpvqwtvbjaunjejud:[YOUR_DB_PASSWORD]@db.pabxpvqwtvbjaunjejud.supabase.co:5432/postgres';

async function applyMigration() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Conectando ao banco de dados...');
    await client.connect();
    console.log('✅ Conectado!\n');

    // Ler o arquivo de migration
    const migrationPath = join(__dirname, 'supabase', 'migrations', '20260228100000_create_admin_notifications_system.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration carregada');
    console.log('📏 Tamanho:', migrationSQL.length, 'caracteres\n');

    console.log('⏳ Executando migration...');
    
    // Executar a migration completa
    await client.query(migrationSQL);
    
    console.log('✅ Migration aplicada com sucesso!\n');

    // Verificar tabelas criadas
    console.log('🔍 Verificando tabelas criadas...');
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'admin_%'
      ORDER BY table_name;
    `);

    console.log('✅ Tabelas encontradas:', result.rows.length);
    result.rows.forEach(row => {
      console.log('   -', row.table_name);
    });

    // Criar notificação de teste
    console.log('\n🧪 Criando notificação de teste...');
    const testResult = await client.query(`
      SELECT create_admin_notification(
        'system_error',
        '🎉 Sistema de Notificações Ativo!',
        'A migration foi aplicada com sucesso via CLI. Tudo funcionando!',
        'medium',
        'Bell'
      );
    `);

    console.log('✅ Notificação de teste criada!');
    console.log('   ID:', testResult.rows[0].create_admin_notification);

    console.log('\n📊 Próximos passos:');
    console.log('1. Abra o painel admin: http://localhost:5173/admin');
    console.log('2. Clique no ícone de sino (🔔) no header');
    console.log('3. Você deve ver a notificação de teste!');

  } catch (error) {
    console.error('\n❌ Erro:', error.message);
    if (error.code) {
      console.error('Código:', error.code);
    }
    if (error.detail) {
      console.error('Detalhe:', error.detail);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();
