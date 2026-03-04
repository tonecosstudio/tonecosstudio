import { readFileSync } from 'fs';
import { join } from 'path';

const supabaseUrl = 'https://pabxpvqwtvbjaunjejud.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTgxNTg1NiwiZXhwIjoyMDg1MzkxODU2fQ.vYLGOmT_A4G-tfH87mxIk8Oc5QJRxmcGvy2JSafMGns';

async function applyMigration() {
  console.log('Aplicando migração de desnormalização do character_choices...\n');
  
  try {
    const migrationPath = join('supabase', 'migrations', '20260506000000_add_denormalized_fields_to_character_choices.sql');
    const sql = readFileSync(migrationPath, 'utf8');
    
    console.log('Executando SQL via Management API...');
    
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ query: sql })
    });
    
    const result = await response.text();
    
    if (!response.ok) {
      console.error('Erro na resposta:', response.status, response.statusText);
      console.error('Detalhes:', result);
      
      // Tentar abordagem alternativa: executar statement por statement
      console.log('\nTentando abordagem alternativa (statement por statement)...\n');
      await applyStatementByStatement(sql);
      return;
    }
    
    console.log('✅ Migração aplicada com sucesso!\n');
    console.log('Resultado:', result);
    
  } catch (err) {
    console.error('❌ Erro ao aplicar migração:', err.message);
    process.exit(1);
  }
}

async function applyStatementByStatement(sql) {
  // Dividir SQL em statements individuais
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.match(/^\/\*/));
  
  console.log(`Encontrados ${statements.length} statements para executar\n`);
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    
    // Pular comentários e statements vazios
    if (!statement || statement.startsWith('COMMENT ON')) {
      continue;
    }
    
    console.log(`Executando statement ${i + 1}/${statements.length}...`);
    
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`
        },
        body: JSON.stringify({ query: statement + ';' })
      });
      
      if (!response.ok) {
        const error = await response.text();
        // Ignorar erros de "already exists"
        if (error.includes('already exists') || error.includes('duplicate')) {
          console.log('  ⚠️  Já existe, pulando...');
          continue;
        }
        throw new Error(`HTTP ${response.status}: ${error}`);
      }
      
      console.log('  ✅ OK');
    } catch (err) {
      console.error(`  ❌ Erro: ${err.message}`);
      // Continuar com próximo statement
    }
  }
  
  console.log('\n✅ Processo concluído!');
}

applyMigration();
