#!/usr/bin/env node

/**
 * Script para verificar o status da limpeza do projeto
 * Mostra o que foi feito e o que ainda precisa ser feito
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.join(__dirname, '..');

console.log('🔍 VERIFICANDO STATUS DA LIMPEZA\n');
console.log('='.repeat(80));

// Verificar arquivos na raiz
console.log('\n📁 ARQUIVOS SQL NA RAIZ:');
const rootFiles = fs.readdirSync(ROOT).filter(f => f.endsWith('.sql'));
if (rootFiles.length === 0) {
  console.log('   ✅ Nenhum arquivo SQL temporário na raiz');
} else {
  console.log(`   ⚠️  ${rootFiles.length} arquivo(s) SQL ainda na raiz:`);
  rootFiles.forEach(f => console.log(`      - ${f}`));
}

// Verificar pasta archive
console.log('\n📦 ARQUIVOS ARQUIVADOS:');
const archivePath = path.join(ROOT, 'scripts/archive');
if (fs.existsSync(archivePath)) {
  const folders = ['fixes-406', 'temp-fixes', 'old-utilities', 'old-seeds'];
  let totalArchived = 0;
  
  folders.forEach(folder => {
    const folderPath = path.join(archivePath, folder);
    if (fs.existsSync(folderPath)) {
      const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.sql'));
      totalArchived += files.length;
      console.log(`   ✅ ${folder}: ${files.length} arquivo(s)`);
    } else {
      console.log(`   ⚠️  ${folder}: pasta não existe`);
    }
  });
  
  console.log(`\n   📊 Total arquivado: ${totalArchived} arquivo(s)`);
} else {
  console.log('   ⚠️  Pasta scripts/archive não existe');
}

// Verificar documentação
console.log('\n📚 DOCUMENTAÇÃO:');
const docs = [
  'INDICE_ANALISE_SUPABASE.md',
  'RESUMO_ANALISE.md',
  'RELATORIO_ANALISE_SUPABASE.md',
  'GUIA_ANALISE_SUPABASE.md',
  'CLEANUP_LOG.md'
];

docs.forEach(doc => {
  const exists = fs.existsSync(path.join(ROOT, doc));
  console.log(`   ${exists ? '✅' : '❌'} ${doc}`);
});

// Verificar scripts de limpeza
console.log('\n🛠️  SCRIPTS DE LIMPEZA:');
const scripts = [
  'scripts/cleanup/01_remove_backup_tables.sql',
  'scripts/cleanup/02_remove_unused_features.sql',
  'scripts/cleanup/03_organize_project_files.ps1',
  'scripts/cleanup/04_verify_empty_tables.sql',
  'scripts/cleanup/README.md'
];

scripts.forEach(script => {
  const exists = fs.existsSync(path.join(ROOT, script));
  console.log(`   ${exists ? '✅' : '❌'} ${script}`);
});

// Status das fases
console.log('\n🎯 STATUS DAS FASES:');
console.log('   ✅ FASE 1: Organização de Arquivos (CONCLUÍDA)');
console.log('   ⏳ FASE 2: Análise de Tabelas Vazias (PENDENTE)');
console.log('   ⏳ FASE 3: Remover Backup Órfão (PENDENTE)');
console.log('   ⏳ FASE 4: Remover Features Não Usadas (PENDENTE)');
console.log('   ⏳ FASE 5: Consolidar Migrações (FUTURO)');

// Próximos passos
console.log('\n📋 PRÓXIMOS PASSOS:');
console.log('   1. Fazer commit das mudanças atuais');
console.log('   2. Fazer backup do Supabase');
console.log('   3. Executar scripts/cleanup/04_verify_empty_tables.sql no Supabase');
console.log('   4. Revisar resultados e decidir próximas ações');

// Estatísticas
console.log('\n📊 ESTATÍSTICAS:');
const migrationsPath = path.join(ROOT, 'supabase/migrations');
if (fs.existsSync(migrationsPath)) {
  const migrations = fs.readdirSync(migrationsPath).filter(f => f.endsWith('.sql'));
  console.log(`   📁 Migrações: ${migrations.length} arquivo(s)`);
}

const allSqlFiles = [];
function countSqlFiles(dir) {
  if (!fs.existsSync(dir)) return;
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (item.startsWith('.') || item === 'node_modules') continue;
    
    if (stat.isDirectory()) {
      countSqlFiles(fullPath);
    } else if (item.endsWith('.sql')) {
      allSqlFiles.push(fullPath);
    }
  }
}

countSqlFiles(ROOT);
console.log(`   📄 Total de arquivos SQL: ${allSqlFiles.length}`);

console.log('\n' + '='.repeat(80));
console.log('✅ Verificação concluída!\n');
