#!/usr/bin/env node
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('\n');
console.log('═'.repeat(80));
console.log('  🔧 INSTRUÇÕES PARA APLICAR O FIX DO TRIGGER DE COINS');
console.log('═'.repeat(80));
console.log('');
console.log('⚠️  O SQL precisa ser aplicado manualmente no Supabase SQL Editor');
console.log('');
console.log('📋 PASSO A PASSO:');
console.log('');
console.log('1. Abra o SQL Editor do Supabase:');
console.log('   👉 https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new');
console.log('');
console.log('2. Cole o SQL abaixo no editor');
console.log('');
console.log('3. Clique em "Run" para executar');
console.log('');
console.log('4. Aguarde a confirmação "Success"');
console.log('');
console.log('5. Recarregue a página do admin para ver as mudanças');
console.log('');
console.log('═'.repeat(80));
console.log('  📄 SQL PARA COPIAR E COLAR:');
console.log('═'.repeat(80));
console.log('');

// Ler o arquivo SQL
const sqlPath = join(__dirname, '..', 'FIX_TRIGGER_COINS.sql');
const sql = readFileSync(sqlPath, 'utf-8');

console.log(sql);

console.log('');
console.log('═'.repeat(80));
console.log('  ✅ O QUE ESTE SQL FAZ:');
console.log('═'.repeat(80));
console.log('');
console.log('• Corrige o trigger que calcula o saldo de coins');
console.log('• Agora conta APENAS escolhas confirmadas (confirmed, in_production, shipped, delivered)');
console.log('• Escolhas "pending" NÃO gastam coins até serem confirmadas');
console.log('• Isso corrige o problema do João Trimestral que estava com 0 coins');
console.log('');
console.log('═'.repeat(80));
console.log('  🎯 RESULTADO ESPERADO:');
console.log('═'.repeat(80));
console.log('');
console.log('Após aplicar o SQL e recarregar a página:');
console.log('');
console.log('João Trimestral (trimestral@ordax.com.br):');
console.log('  • Coins Iniciais: 600');
console.log('  • Coins Gastos: 200 (1 escolha confirmada)');
console.log('  • Saldo Atual: 400 coins ✅');
console.log('  • Escolhas:');
console.log('    - Março 2026: Monkey D. Luffy (confirmed) - 200 coins');
console.log('    - Abril 2026: Roronoa Zoro (pending) - 0 coins');
console.log('    - Maio 2026: Nami (pending) - 0 coins');
console.log('');
console.log('═'.repeat(80));
console.log('');
