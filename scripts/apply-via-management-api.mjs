#!/usr/bin/env node
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuração
const projectRef = 'pabxpvqwtvbjaunjejud';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTgxNTg1NiwiZXhwIjoyMDg1MzkxODU2fQ.vYLGOmT_A4G-tfH87mxIk8Oc5QJRxmcGvy2JSafMGns';

async function applySql() {
  console.log('🔧 Tentando aplicar SQL via Supabase Management API...\n');

  // Ler o arquivo SQL
  const sqlPath = join(__dirname, '..', 'FIX_TRIGGER_COINS.sql');
  const sql = readFileSync(sqlPath, 'utf-8');

  try {
    // Tentar executar via REST API com query direta
    const response = await fetch(`https://${projectRef}.supabase.co/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Método 1 falhou:', response.status, errorText);
      
      // Tentar método 2: executar statements individuais
      console.log('\n🔄 Tentando método alternativo...\n');
      
      // Dividir o SQL em statements
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--'));

      console.log(`📝 Encontrados ${statements.length} statements para executar\n`);

      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i] + ';';
        console.log(`Executando statement ${i + 1}/${statements.length}...`);
        
        // Aqui precisaríamos de uma função RPC no banco que execute SQL
        // Como não temos, vamos mostrar as instruções manuais
      }

      throw new Error('Não foi possível executar via API');
    }

    const result = await response.json();
    console.log('✅ SQL executado com sucesso!');
    console.log('Resultado:', result);

  } catch (error) {
    console.error('\n❌ Não foi possível aplicar automaticamente\n');
    console.log('═'.repeat(80));
    console.log('  📋 APLICAÇÃO MANUAL NECESSÁRIA');
    console.log('═'.repeat(80));
    console.log('');
    console.log('Por favor, siga estas instruções:');
    console.log('');
    console.log('1. Abra o SQL Editor do Supabase:');
    console.log(`   👉 https://supabase.com/dashboard/project/${projectRef}/sql/new`);
    console.log('');
    console.log('2. Cole o SQL abaixo:');
    console.log('');
    console.log('─'.repeat(80));
    console.log(sql);
    console.log('─'.repeat(80));
    console.log('');
    console.log('3. Clique em "Run" para executar');
    console.log('');
    console.log('4. Aguarde a mensagem "Success"');
    console.log('');
    console.log('5. Recarregue a página do admin');
    console.log('');
    console.log('═'.repeat(80));
    console.log('');
    console.log('✅ Resultado esperado após aplicar:');
    console.log('  • João Trimestral terá 400 coins (600 iniciais - 200 gastos)');
    console.log('  • 3 escolhas mensais aparecerão na timeline');
    console.log('  • Apenas a escolha confirmada gasta coins');
    console.log('');
  }
}

applySql();
