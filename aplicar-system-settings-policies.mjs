#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ler .env manualmente
const envPath = join(__dirname, '.env');
const envContent = readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim().replace(/^["']|["']$/g, '');
    envVars[key] = value;
  }
});

// Carregar variáveis de ambiente
const SUPABASE_URL = envVars.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Erro: VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar definidos no .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function aplicarMigration() {
  try {
    console.log('🔧 Aplicando migration de policies para system_settings...\n');

    // Ler o arquivo SQL
    const sqlPath = join(__dirname, 'supabase/migrations/20260228000005_fix_system_settings_policies.sql');
    const sql = readFileSync(sqlPath, 'utf8');

    // Executar o SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('❌ Erro ao executar migration:', error);
      
      // Tentar executar diretamente via REST API
      console.log('\n🔄 Tentando executar via REST API...\n');
      
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        },
        body: JSON.stringify({ sql_query: sql })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro na REST API:', errorText);
        console.log('\n⚠️  Execute manualmente no SQL Editor do Supabase:\n');
        console.log(sql);
        process.exit(1);
      }

      console.log('✅ Migration aplicada via REST API!');
    } else {
      console.log('✅ Migration aplicada com sucesso!');
    }

    console.log('\n📋 Políticas RLS criadas:');
    console.log('  ✓ Anyone can read system_settings');
    console.log('  ✓ Admins can insert system_settings');
    console.log('  ✓ Admins can update system_settings');
    console.log('  ✓ Admins can delete system_settings');

  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

aplicarMigration();
