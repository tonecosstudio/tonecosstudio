#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔧 Corrigindo saldo de coins...');
console.log('');

// Apenas a primeira escolha (confirmed) deve ser contabilizada
// As pendentes não gastam coins até serem confirmadas
const { error } = await supabase
  .from('subscriptions')
  .update({ coins_balance: 400 }) // 600 - 200 (primeira escolha)
  .eq('id', '308d0b5a-4d44-4297-bade-d8270f8c5d82');

if (error) {
  console.error('❌ Erro:', error);
} else {
  console.log('✅ Saldo corrigido para 400 coins');
  console.log('');
  console.log('Lógica:');
  console.log('  - Coins iniciais: 600');
  console.log('  - Escolha 1 (confirmed): -200 coins');
  console.log('  - Escolha 2 (pending): 0 coins (não gasta até confirmar)');
  console.log('  - Escolha 3 (pending): 0 coins (não gasta até confirmar)');
  console.log('  - Saldo final: 400 coins');
}
