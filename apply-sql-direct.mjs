import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import pg from 'pg';

const { Client } = pg;

// Configuração do Supabase
const supabaseUrl = 'https://pabxpvqwtvbjaunjejud.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTgxNTg1NiwiZXhwIjoyMDg1MzkxODU2fQ.vYLGOmT_A4G-tfH87mxIk8Oc5QJRxmcGvy2JSafMGns';

// Construir connection string do PostgreSQL
// Formato: postgresql://postgres.[project-ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
const projectRef = 'pabxpvqwtvbjaunjejud';

console.log('⚠️  ATENÇÃO: Este script precisa da senha do banco de dados PostgreSQL');
console.log('');
console.log('Para obter a senha:');
console.log('1. Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/settings/database');
console.log('2. Copie a "Database Password" ou resete se necessário');
console.log('3. Execute: DATABASE_PASSWORD=sua_senha node apply-sql-direct.mjs');
console.log('');

const dbPassword = process.env.DATABASE_PASSWORD;

if (!dbPassword) {
  console.error('❌ Variável DATABASE_PASSWORD não definida');
  console.log('');
  console.log('Execute assim:');
  console.log('DATABASE_PASSWORD=sua_senha node apply-sql-direct.mjs');
  process.exit(1);
}

async function applyMigration() {
  const connectionString = `postgresql://postgres.${projectRef}:${dbPassword}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;
  
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Conectando ao banco de dados...');
    await client.connect();
    console.log('✅ Conectado!\n');

    console.log('Lendo arquivo SQL...');
    const sql = readFileSync('apply-character-choices-denormalization.sql', 'utf8');
    
    console.log('Executando migração...\n');
    const result = await client.query(sql);
    
    console.log('✅ Migração aplicada com sucesso!');
    console.log('');
    
    // Verificar
    console.log('Verificando colunas adicionadas...');
    const checkResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'character_choices' 
        AND column_name IN ('customer_name', 'customer_email', 'collection_name')
    `);
    
    console.log('Colunas encontradas:', checkResult.rows);
    
  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();
