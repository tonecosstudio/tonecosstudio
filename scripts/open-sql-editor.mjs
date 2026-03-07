#!/usr/bin/env node
import { exec } from 'child_process';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const projectRef = 'pabxpvqwtvbjaunjejud';
const sqlEditorUrl = `https://supabase.com/dashboard/project/${projectRef}/sql/new`;

console.log('\n');
console.log('═'.repeat(80));
console.log('  🔧 APLICAR FIX DO TRIGGER DE COINS');
console.log('═'.repeat(80));
console.log('');
console.log('📋 INSTRUÇÕES:');
console.log('');
console.log('1. O navegador abrirá o SQL Editor do Supabase');
console.log('2. Cole o SQL que será copiado para sua área de transferência');
console.log('3. Clique em "Run" para executar');
console.log('4. Aguarde "Success. No rows returned"');
console.log('5. Recarregue a página do admin');
console.log('');
console.log('═'.repeat(80));
console.log('');

// Ler o SQL
const sqlPath = join(__dirname, '..', 'FIX_TRIGGER_COINS.sql');
const sql = readFileSync(sqlPath, 'utf-8');

console.log('📄 SQL a ser aplicado:');
console.log('');
console.log('─'.repeat(80));
console.log(sql);
console.log('─'.repeat(80));
console.log('');

// Tentar copiar para área de transferência (Windows)
try {
  const clipboardCmd = process.platform === 'win32' 
    ? `echo ${sql.replace(/"/g, '\\"')} | clip`
    : process.platform === 'darwin'
    ? `echo "${sql}" | pbcopy`
    : `echo "${sql}" | xclip -selection clipboard`;

  exec(clipboardCmd, (error) => {
    if (!error) {
      console.log('✅ SQL copiado para área de transferência!');
      console.log('');
    }
  });
} catch (e) {
  console.log('⚠️  Não foi possível copiar automaticamente. Copie manualmente o SQL acima.');
  console.log('');
}

// Abrir navegador
console.log('🌐 Abrindo SQL Editor no navegador...');
console.log('');

const openCmd = process.platform === 'win32' 
  ? `start ${sqlEditorUrl}`
  : process.platform === 'darwin'
  ? `open ${sqlEditorUrl}`
  : `xdg-open ${sqlEditorUrl}`;

exec(openCmd, (error) => {
  if (error) {
    console.log('❌ Não foi possível abrir o navegador automaticamente.');
    console.log('');
    console.log('Por favor, abra manualmente:');
    console.log(`👉 ${sqlEditorUrl}`);
  } else {
    console.log('✅ Navegador aberto!');
  }
  
  console.log('');
  console.log('═'.repeat(80));
  console.log('  🎯 RESULTADO ESPERADO');
  console.log('═'.repeat(80));
  console.log('');
  console.log('Após aplicar o SQL:');
  console.log('');
  console.log('João Trimestral (trimestral@ordax.com.br):');
  console.log('  • Coins Iniciais: 600');
  console.log('  • Saldo Atual: 400 coins ✅');
  console.log('  • 3 escolhas mensais visíveis');
  console.log('  • Apenas a escolha confirmada gasta coins');
  console.log('');
  console.log('═'.repeat(80));
  console.log('');
});
