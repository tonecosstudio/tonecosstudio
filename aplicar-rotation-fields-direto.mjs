#!/usr/bin/env node

/**
 * Script para aplicar migration de rotation_type diretamente no banco
 * Executa a migration 20260317000000_add_collection_rotation_fields.sql
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

// Carregar variáveis de ambiente
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: Variáveis VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔄 Aplicando migration de rotation_type...\n');

// Ler o arquivo de migration
const migrationPath = 'supabase/migrations/20260317000000_add_collection_rotation_fields.sql';
let sql;

try {
  sql = readFileSync(migrationPath, 'utf-8');
  console.log('📋 Migration carregada com sucesso\n');
} catch (error) {
  console.error(`❌ Erro ao ler migration: ${error.message}`);
  process.exit(1);
}

// Executar comandos SQL individuais
const commands = [
  // 1. Adicionar coluna rotation_type
  `ALTER TABLE collections
   ADD COLUMN IF NOT EXISTS rotation_type TEXT DEFAULT 'fixed' 
   CHECK (rotation_type IN ('fixed', 'odd_months', 'even_months'))`,
  
  // 2. Adicionar coluna character_revelation_date
  `ALTER TABLE collections
   ADD COLUMN IF NOT EXISTS character_revelation_date TIMESTAMPTZ`,
  
  // 3. Adicionar coluna revealed
  `ALTER TABLE collections
   ADD COLUMN IF NOT EXISTS revealed BOOLEAN DEFAULT false`,
  
  // 4. Adicionar coluna character_name
  `ALTER TABLE collections
   ADD COLUMN IF NOT EXISTS character_name TEXT`,
  
  // 5. Adicionar coluna character_image_url
  `ALTER TABLE collections
   ADD COLUMN IF NOT EXISTS character_image_url TEXT`,
  
  // 6. Criar índice para rotation_type
  `CREATE INDEX IF NOT EXISTS idx_collections_rotation ON collections(rotation_type)`,
  
  // 7. Criar índice parcial para character_revelation_date
  `CREATE INDEX IF NOT EXISTS idx_collections_revelation 
   ON collections(character_revelation_date) 
   WHERE revealed = false AND character_revelation_date IS NOT NULL`,
  
  // 8. Atualizar coleções existentes para 'fixed'
  `UPDATE collections 
   SET rotation_type = 'fixed' 
   WHERE rotation_type IS NULL`,
  
  // 9. Atualizar revealed para false
  `UPDATE collections 
   SET revealed = false 
   WHERE revealed IS NULL`
];

let successCount = 0;
let errorCount = 0;

for (const command of commands) {
  const preview = command.trim().substring(0, 80).replace(/\n/g, ' ');
  console.log(`📝 Executando: ${preview}...`);
  
  try {
    const { error } = await supabase.rpc('exec_sql', { sql: command });
    
    if (error) {
      // Alguns erros são esperados (como "column already exists")
      if (error.message.includes('already exists') || error.message.includes('duplicate')) {
        console.log(`⚠️  Já existe (ignorando)\n`);
        successCount++;
      } else {
        console.error(`❌ Erro: ${error.message}\n`);
        errorCount++;
      }
    } else {
      console.log(`✅ Sucesso\n`);
      successCount++;
    }
  } catch (error) {
    console.error(`❌ Erro: ${error.message}\n`);
    errorCount++;
  }
}

console.log('\n📊 Resumo:');
console.log(`   ✅ Sucesso: ${successCount} comandos`);
console.log(`   ❌ Erros: ${errorCount} comandos`);

if (errorCount === 0) {
  console.log('\n🎉 Migration aplicada com sucesso!');
  console.log('   Agora você pode usar os campos rotation_type nas coleções');
} else {
  console.log('\n⚠️  Migration aplicada com alguns erros');
  console.log('   Verifique os erros acima');
}

process.exit(errorCount > 0 ? 1 : 0);
