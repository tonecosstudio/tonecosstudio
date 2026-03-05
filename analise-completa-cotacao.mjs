#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('========================================');
console.log('  ANÁLISE COMPLETA: Cotação do Coin');
console.log('========================================\n');

// 1. Verificar estrutura da tabela
console.log('1. ESTRUTURA DA TABELA\n');
const { data: columns } = await supabase.rpc('exec_sql', {
  query: `
    SELECT 
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_name = 'coin_exchange_rate'
    ORDER BY ordinal_position;
  `
});

if (columns) {
  console.table(columns);
}

// 2. Verificar dados atuais
console.log('\n2. DADOS ATUAIS\n');
const { data: rates } = await supabase
  .from('coin_exchange_rate')
  .select('*');

if (rates) {
  console.table(rates);
}

// 3. Verificar RLS
console.log('\n3. ROW LEVEL SECURITY (RLS)\n');
const { data: rlsStatus } = await supabase.rpc('exec_sql', {
  query: `
    SELECT 
      relname as table_name,
      relrowsecurity as rls_enabled,
      relforcerowsecurity as rls_forced
    FROM pg_class
    WHERE relname = 'coin_exchange_rate';
  `
});

if (rlsStatus) {
  console.table(rlsStatus);
}

// 4. Verificar policies
console.log('\n4. POLICIES RLS\n');
const { data: policies } = await supabase.rpc('exec_sql', {
  query: `
    SELECT 
      polname as policy_name,
      polcmd as command,
      polroles::regrole[] as roles,
      pg_get_expr(polqual, polrelid) as using_clause,
      pg_get_expr(polwithcheck, polrelid) as with_check_clause
    FROM pg_policy
    WHERE polrelid = 'coin_exchange_rate'::regclass
    ORDER BY polname;
  `
});

if (policies && policies.length > 0) {
  policies.forEach(p => {
    console.log(`\nPolicy: ${p.policy_name}`);
    console.log(`  Command: ${p.command}`);
    console.log(`  Roles: ${p.roles}`);
    console.log(`  USING: ${p.using_clause || 'N/A'}`);
    console.log(`  WITH CHECK: ${p.with_check_clause || 'N/A'}`);
  });
} else {
  console.log('⚠️  Nenhuma policy encontrada!');
}

// 5. Verificar grants
console.log('\n5. GRANTS (Permissões)\n');
const { data: grants } = await supabase.rpc('exec_sql', {
  query: `
    SELECT 
      grantee,
      privilege_type
    FROM information_schema.table_privileges
    WHERE table_name = 'coin_exchange_rate'
    AND grantee IN ('authenticated', 'anon', 'public')
    ORDER BY grantee, privilege_type;
  `
});

if (grants) {
  console.table(grants);
}

// 6. Testar UPDATE com service role
console.log('\n6. TESTE DE UPDATE (Service Role)\n');
const { data: testRate } = await supabase
  .from('coin_exchange_rate')
  .select('id, reais_amount, coins_amount')
  .eq('is_active', true)
  .single();

if (testRate) {
  console.log('Valores atuais:', testRate);
  
  const { data: updated, error } = await supabase
    .from('coin_exchange_rate')
    .update({
      reais_amount: 500,
      coins_amount: 100
    })
    .eq('id', testRate.id)
    .select()
    .single();
  
  if (error) {
    console.error('❌ Erro no UPDATE:', error);
  } else {
    console.log('✅ UPDATE funcionou:', updated);
  }
}

// 7. Verificar user_roles
console.log('\n7. VERIFICAR USER_ROLES (Admin)\n');
const { data: adminRoles } = await supabase
  .from('user_roles')
  .select('*')
  .eq('role', 'admin');

if (adminRoles) {
  console.table(adminRoles);
}

console.log('\n========================================');
console.log('  ANÁLISE CONCLUÍDA');
console.log('========================================');
