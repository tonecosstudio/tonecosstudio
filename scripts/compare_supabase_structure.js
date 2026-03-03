#!/usr/bin/env node

/**
 * Script para comparar estrutura do Supabase com arquivos do projeto
 * 
 * Uso:
 * 1. Execute o SQL analyze_supabase_structure.sql no Supabase Dashboard
 * 2. Salve os resultados em um arquivo JSON
 * 3. Execute: node scripts/compare_supabase_structure.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurações
const MIGRATIONS_DIR = path.join(__dirname, '../supabase/migrations');
const SQL_FILES_ROOT = path.join(__dirname, '..');

// Função para ler todos os arquivos SQL de migração
function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log('⚠️  Diretório de migrações não encontrado:', MIGRATIONS_DIR);
    return [];
  }

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort()
    .map(file => ({
      name: file,
      path: path.join(MIGRATIONS_DIR, file),
      content: fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8')
    }));

  return files;
}

// Função para encontrar todos os arquivos SQL no projeto
function getAllSqlFiles() {
  const sqlFiles = [];
  
  function scanDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      // Ignorar node_modules, .git, etc
      if (item.startsWith('.') || item === 'node_modules') continue;
      
      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (item.endsWith('.sql')) {
        sqlFiles.push({
          name: item,
          path: fullPath,
          relativePath: path.relative(SQL_FILES_ROOT, fullPath),
          content: fs.readFileSync(fullPath, 'utf8')
        });
      }
    }
  }
  
  scanDirectory(SQL_FILES_ROOT);
  return sqlFiles;
}

// Função para extrair tabelas mencionadas em SQL
function extractTablesFromSql(content) {
  const tables = new Set();
  
  // CREATE TABLE
  const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["']?(\w+)["']?/gi;
  let match;
  while ((match = createTableRegex.exec(content)) !== null) {
    tables.add(match[1].toLowerCase());
  }
  
  // ALTER TABLE
  const alterTableRegex = /ALTER\s+TABLE\s+["']?(\w+)["']?/gi;
  while ((match = alterTableRegex.exec(content)) !== null) {
    tables.add(match[1].toLowerCase());
  }
  
  // DROP TABLE
  const dropTableRegex = /DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?["']?(\w+)["']?/gi;
  while ((match = dropTableRegex.exec(content)) !== null) {
    tables.add(match[1].toLowerCase());
  }
  
  return Array.from(tables);
}

// Função para extrair funções mencionadas em SQL
function extractFunctionsFromSql(content) {
  const functions = new Set();
  
  // CREATE FUNCTION
  const createFuncRegex = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+["']?(\w+)["']?/gi;
  let match;
  while ((match = createFuncRegex.exec(content)) !== null) {
    functions.add(match[1].toLowerCase());
  }
  
  return Array.from(functions);
}

// Função para extrair políticas RLS
function extractPoliciesFromSql(content) {
  const policies = new Set();
  
  const policyRegex = /CREATE\s+POLICY\s+["']?(\w+)["']?\s+ON\s+["']?(\w+)["']?/gi;
  let match;
  while ((match = policyRegex.exec(content)) !== null) {
    policies.add(`${match[2]}.${match[1]}`.toLowerCase());
  }
  
  return Array.from(policies);
}

// Análise principal
function analyzeProject() {
  console.log('🔍 ANÁLISE DA ESTRUTURA DO PROJETO\n');
  console.log('='.repeat(80));
  
  // 1. Migrações
  console.log('\n📁 MIGRAÇÕES ENCONTRADAS:\n');
  const migrations = getMigrationFiles();
  
  if (migrations.length === 0) {
    console.log('⚠️  Nenhuma migração encontrada em:', MIGRATIONS_DIR);
  } else {
    migrations.forEach((migration, index) => {
      console.log(`${index + 1}. ${migration.name}`);
      const tables = extractTablesFromSql(migration.content);
      const functions = extractFunctionsFromSql(migration.content);
      const policies = extractPoliciesFromSql(migration.content);
      
      if (tables.length > 0) {
        console.log(`   📊 Tabelas: ${tables.join(', ')}`);
      }
      if (functions.length > 0) {
        console.log(`   ⚙️  Funções: ${functions.join(', ')}`);
      }
      if (policies.length > 0) {
        console.log(`   🔒 Políticas: ${policies.join(', ')}`);
      }
      console.log('');
    });
  }
  
  // 2. Todos os arquivos SQL
  console.log('\n📄 TODOS OS ARQUIVOS SQL NO PROJETO:\n');
  const allSqlFiles = getAllSqlFiles();
  
  const sqlByCategory = {
    migrations: [],
    analysis: [],
    scripts: [],
    other: []
  };
  
  allSqlFiles.forEach(file => {
    if (file.relativePath.includes('migrations')) {
      sqlByCategory.migrations.push(file);
    } else if (file.name.toUpperCase().includes('ANALYZE') || file.name.toUpperCase().includes('ANALISE')) {
      sqlByCategory.analysis.push(file);
    } else if (file.relativePath.includes('scripts')) {
      sqlByCategory.scripts.push(file);
    } else {
      sqlByCategory.other.push(file);
    }
  });
  
  console.log('📂 Migrações:', sqlByCategory.migrations.length);
  sqlByCategory.migrations.forEach(f => console.log(`   - ${f.relativePath}`));
  
  console.log('\n📊 Análises:', sqlByCategory.analysis.length);
  sqlByCategory.analysis.forEach(f => console.log(`   - ${f.relativePath}`));
  
  console.log('\n⚙️  Scripts:', sqlByCategory.scripts.length);
  sqlByCategory.scripts.forEach(f => console.log(`   - ${f.relativePath}`));
  
  console.log('\n📝 Outros:', sqlByCategory.other.length);
  sqlByCategory.other.forEach(f => console.log(`   - ${f.relativePath}`));
  
  // 3. Resumo de tabelas mencionadas
  console.log('\n\n📊 RESUMO DE TABELAS MENCIONADAS:\n');
  const allTables = new Set();
  const tableFiles = new Map();
  
  allSqlFiles.forEach(file => {
    const tables = extractTablesFromSql(file.content);
    tables.forEach(table => {
      allTables.add(table);
      if (!tableFiles.has(table)) {
        tableFiles.set(table, []);
      }
      tableFiles.set(table, [...tableFiles.get(table), file.relativePath]);
    });
  });
  
  const sortedTables = Array.from(allTables).sort();
  sortedTables.forEach(table => {
    console.log(`\n📋 ${table}`);
    const files = tableFiles.get(table);
    files.forEach(file => console.log(`   - ${file}`));
  });
  
  // 4. Estatísticas
  console.log('\n\n📈 ESTATÍSTICAS:\n');
  console.log(`Total de arquivos SQL: ${allSqlFiles.length}`);
  console.log(`Total de migrações: ${migrations.length}`);
  console.log(`Total de tabelas únicas: ${allTables.size}`);
  console.log(`Tabelas: ${sortedTables.join(', ')}`);
  
  console.log('\n' + '='.repeat(80));
  console.log('\n✅ Análise concluída!\n');
  console.log('📋 PRÓXIMOS PASSOS:\n');
  console.log('1. Execute o SQL em scripts/analyze_supabase_structure.sql no Supabase Dashboard');
  console.log('2. Compare os resultados com as tabelas listadas acima');
  console.log('3. Identifique discrepâncias entre o código e o banco');
  console.log('4. Crie migrações para sincronizar ou limpar o que não é usado\n');
}

// Executar análise
try {
  analyzeProject();
} catch (error) {
  console.error('❌ Erro ao analisar projeto:', error.message);
  process.exit(1);
}
