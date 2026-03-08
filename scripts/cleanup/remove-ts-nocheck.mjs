#!/usr/bin/env node

/**
 * Script para remover @ts-nocheck de todos os arquivos TypeScript
 * Correção profissional na raiz do problema
 */

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

const files = glob.sync('src/**/*.{ts,tsx}', {
  ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
});

let totalFixed = 0;
let totalFiles = 0;

for (const file of files) {
  try {
    const content = readFileSync(file, 'utf-8');
    
    // Remover @ts-nocheck no início do arquivo
    const newContent = content.replace(/^\/\/ @ts-nocheck\n+/m, '');
    
    if (content !== newContent) {
      writeFileSync(file, newContent, 'utf-8');
      console.log(`✅ Fixed: ${file}`);
      totalFixed++;
    }
    
    totalFiles++;
  } catch (error) {
    console.error(`❌ Error processing ${file}:`, error.message);
  }
}

console.log(`\n📊 Summary:`);
console.log(`   Total files processed: ${totalFiles}`);
console.log(`   Files fixed: ${totalFixed}`);
console.log(`   Files unchanged: ${totalFiles - totalFixed}`);
