#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuração do Supabase
const supabaseUrl = 'https://pabxpvqwtvbjaunjejud.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTgxNTg1NiwiZXhwIjoyMDg1MzkxODU2fQ.vYLGOmT_A4G-tfH87mxIk8Oc5QJRxmcGvy2JSafMGns';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyTriggerFix() {
  console.log('🔧 Aplicando correção do trigger de coins...\n');

  // Ler o arquivo SQL
  const sqlPath = join(__dirname, '..', 'FIX_TRIGGER_COINS.sql');
  const sql = readFileSync(sqlPath, 'utf-8');

  console.log('📄 SQL a ser executado:');
  console.log('─'.repeat(80));
  console.log(sql);
  console.log('─'.repeat(80));
  console.log('');

  try {
    // Executar o SQL usando rpc
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('❌ Erro ao executar SQL:', error);
      
      // Tentar método alternativo: executar via REST API diretamente
      console.log('\n🔄 Tentando método alternativo...\n');
      
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ sql_query: sql })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro no método alternativo:', errorText);
        console.log('\n⚠️  SOLUÇÃO MANUAL:');
        console.log('1. Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new');
        console.log('2. Cole o SQL acima');
        console.log('3. Execute manualmente');
        process.exit(1);
      }

      const result = await response.json();
      console.log('✅ SQL executado com sucesso (método alternativo)!');
      console.log('Resultado:', result);
    } else {
      console.log('✅ SQL executado com sucesso!');
      console.log('Resultado:', data);
    }

    console.log('\n🎉 Trigger corrigido!');
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

  } catch (err) {
    console.error('❌ Erro inesperado:', err);
    console.log('\n⚠️  SOLUÇÃO MANUAL:');
    console.log('1. Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new');
    console.log('2. Cole o SQL do arquivo FIX_TRIGGER_COINS.sql');
    console.log('3. Execute manualmente');
    process.exit(1);
  }
}

applyTriggerFix();
