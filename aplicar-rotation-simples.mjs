#!/usr/bin/env node

/**
 * Script simplificado para aplicar migration de rotation_type
 * Sem dependências externas - usa apenas fetch nativo
 */

import { readFileSync } from 'fs';

// Ler .env manualmente
const envContent = readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  line = line.trim();
  if (line && !line.startsWith('#')) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      // Remover aspas se existirem
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      env[key] = value;
    }
  }
});

console.log('Variáveis encontradas:', Object.keys(env));

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log('URL:', supabaseUrl ? 'OK' : 'MISSING');
console.log('Key:', supabaseKey ? 'OK' : 'MISSING');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erro: Variáveis VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontradas');
  process.exit(1);
}

console.log('🔄 Aplicando migration de rotation_type...\n');

// Comandos SQL a executar
const commands = [
  {
    name: 'Adicionar coluna rotation_type',
    sql: `ALTER TABLE collections ADD COLUMN IF NOT EXISTS rotation_type TEXT DEFAULT 'fixed' CHECK (rotation_type IN ('fixed', 'odd_months', 'even_months'))`
  },
  {
    name: 'Adicionar coluna character_revelation_date',
    sql: `ALTER TABLE collections ADD COLUMN IF NOT EXISTS character_revelation_date TIMESTAMPTZ`
  },
  {
    name: 'Adicionar coluna revealed',
    sql: `ALTER TABLE collections ADD COLUMN IF NOT EXISTS revealed BOOLEAN DEFAULT false`
  },
  {
    name: 'Adicionar coluna character_name',
    sql: `ALTER TABLE collections ADD COLUMN IF NOT EXISTS character_name TEXT`
  },
  {
    name: 'Adicionar coluna character_image_url',
    sql: `ALTER TABLE collections ADD COLUMN IF NOT EXISTS character_image_url TEXT`
  },
  {
    name: 'Criar índice rotation_type',
    sql: `CREATE INDEX IF NOT EXISTS idx_collections_rotation ON collections(rotation_type)`
  },
  {
    name: 'Criar índice character_revelation_date',
    sql: `CREATE INDEX IF NOT EXISTS idx_collections_revelation ON collections(character_revelation_date) WHERE revealed = false AND character_revelation_date IS NOT NULL`
  },
  {
    name: 'Atualizar rotation_type para fixed',
    sql: `UPDATE collections SET rotation_type = 'fixed' WHERE rotation_type IS NULL`
  },
  {
    name: 'Atualizar revealed para false',
    sql: `UPDATE collections SET revealed = false WHERE revealed IS NULL`
  }
];

let successCount = 0;
let errorCount = 0;

// Executar cada comando
for (const { name, sql } of commands) {
  console.log(`📝 ${name}...`);
  
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql })
    });
    
    if (response.ok) {
      console.log(`✅ Sucesso\n`);
      successCount++;
    } else {
      const error = await response.text();
      if (error.includes('already exists') || error.includes('duplicate')) {
        console.log(`⚠️  Já existe (ignorando)\n`);
        successCount++;
      } else {
        console.error(`❌ Erro: ${error}\n`);
        errorCount++;
      }
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
  console.log('   Recarregue a página no navegador para ver as mudanças');
} else {
  console.log('\n⚠️  Migration aplicada com alguns erros');
}

process.exit(errorCount > 0 ? 1 : 0);
