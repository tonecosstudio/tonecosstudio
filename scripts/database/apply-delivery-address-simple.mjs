#!/usr/bin/env node

/**
 * Script: Apply Delivery Address Migration (Simple)
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('='.repeat(60));
console.log('🚀 Aplicando: Migration de Endereço de Entrega');
console.log('='.repeat(60));
console.log('');

console.log('⚠️  ATENÇÃO: Execute manualmente no Supabase Dashboard');
console.log('');
console.log('📄 Arquivo: scripts/database/APPLY_DELIVERY_ADDRESS.sql');
console.log('');
console.log('📋 Passos:');
console.log('1. Abra o Supabase Dashboard');
console.log('2. Vá em SQL Editor');
console.log('3. Clique em "New Query"');
console.log('4. Cole o conteúdo do arquivo APPLY_DELIVERY_ADDRESS.sql');
console.log('5. Clique em "Run"');
console.log('');

// Verificar estado atual
const { data: profiles } = await supabase
  .from('profiles')
  .select('id, full_name, email')
  .limit(5);

console.log('📊 Estado Atual:');
console.log(`   Total de usuários: ${profiles?.length || 0}`);
console.log('');

console.log('🎯 O que será criado:');
console.log('   ✅ Coluna delivery_address (JSONB)');
console.log('   ✅ Função validate_delivery_address()');
console.log('   ✅ Função can_place_order()');
console.log('   ✅ View profiles_with_delivery_info');
console.log('   ✅ Índice para busca por CEP');
console.log('');
