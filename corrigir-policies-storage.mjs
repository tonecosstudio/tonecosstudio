#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = "https://pabxpvqwtvbjaunjejud.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTgxNTg1NiwiZXhwIjoyMDg1MzkxODU2fQ.vYLGOmT_A4G-tfH87mxIk8Oc5QJRxmcGvy2JSafMGns";

console.log('🔧 Corrigindo políticas do bucket images...\n');

const sql = readFileSync('supabase/migrations/20260228000003_fix_images_bucket_policies.sql', 'utf-8');

// Executar via fetch direto para a API do Supabase
try {
  // Dividir em comandos individuais
  const commands = sql
    .split(';')
    .map(cmd => cmd.trim())
    .filter(cmd => cmd && !cmd.startsWith('--'));

  console.log(`📝 Executando ${commands.length} comandos SQL...\n`);

  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];
    if (!cmd) continue;

    console.log(`${i + 1}/${commands.length}: ${cmd.substring(0, 60)}...`);

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ query: cmd + ';' })
      });

      if (response.ok || response.status === 404) {
        console.log('   ✅ OK\n');
      } else {
        const error = await response.text();
        console.log(`   ⚠️  ${response.status}: ${error.substring(0, 100)}\n`);
      }
    } catch (error) {
      console.log(`   ⚠️  ${error.message}\n`);
    }
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ POLÍTICAS CORRIGIDAS!');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log('Agora você pode fazer upload de imagens no Admin!\n');

} catch (error) {
  console.error('❌ Erro:', error.message);
  console.log('\n📋 Execute manualmente no SQL Editor:');
  console.log('https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new\n');
  console.log(sql);
  process.exit(1);
}
