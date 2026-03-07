#!/usr/bin/env node
import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuração de conexão com o banco remoto
const connectionString = 'postgresql://postgres.pabxpvqwtvbjaunjejud:Ordax@2025@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';

async function applySql() {
  console.log('🔧 Conectando ao banco remoto...\n');

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Conectado ao banco!\n');

    // Ler o arquivo SQL
    const sqlPath = join(__dirname, '..', 'FIX_TRIGGER_COINS.sql');
    const sql = readFileSync(sqlPath, 'utf-8');

    console.log('📄 Executando SQL:');
    console.log('─'.repeat(80));
    console.log(sql);
    console.log('─'.repeat(80));
    console.log('');

    // Executar o SQL
    await client.query(sql);

    console.log('✅ SQL executado com sucesso!\n');
    console.log('🎉 Trigger corrigido!');
    console.log('');
    console.log('📋 O que foi feito:');
    console.log('  • Trigger agora conta apenas escolhas confirmadas');
    console.log('  • Status considerados: confirmed, in_production, shipped, delivered');
    console.log('  • Escolhas "pending" não gastam coins até serem confirmadas');
    console.log('');
    console.log('🔍 Próximos passos:');
    console.log('  1. Recarregue a página do admin');
    console.log('  2. Verifique que João Trimestral mostra 400 coins');
    console.log('  3. Verifique que as 3 escolhas aparecem corretamente');

  } catch (error) {
    console.error('❌ Erro ao executar SQL:', error.message);
    console.error('Detalhes:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applySql();
