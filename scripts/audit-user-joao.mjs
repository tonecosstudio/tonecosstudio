#!/usr/bin/env node
/**
 * Auditoria completa do usuário João Trimestral
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const USER_EMAIL = 'trimestral@ordax.com.br';

console.log('🔍 AUDITORIA COMPLETA - João Trimestral');
console.log('═══════════════════════════════════════════════════════════');
console.log('');

try {
  // 1. Buscar usuário
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', USER_EMAIL)
    .single();

  if (!profile) {
    console.error('❌ Usuário não encontrado');
    process.exit(1);
  }

  console.log('👤 USUÁRIO');
  console.log('  ID:', profile.id);
  console.log('  Nome:', profile.full_name);
  console.log('  Email:', profile.email);
  console.log('');

  // 2. Buscar assinatura
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select(`
      *,
      collection:active_collection_id (
        id,
        name,
        slug
      )
    `)
    .eq('user_id', profile.id)
    .eq('status', 'active')
    .single();

  if (!subscription) {
    console.error('❌ Assinatura não encontrada');
    process.exit(1);
  }

  console.log('📋 ASSINATURA');
  console.log('  ID:', subscription.id);
  console.log('  Plano:', subscription.plan_type);
  console.log('  Status:', subscription.status);
  console.log('  Coleção Ativa:', subscription.collection?.name || 'Não definida');
  console.log('  Coins Iniciais:', subscription.coins_initial);
  console.log('  Coins Saldo:', subscription.coins_balance);
  console.log('  Criada em:', new Date(subscription.created_at).toLocaleString('pt-BR'));
  console.log('');

  // 3. Buscar escolhas mensais
  const { data: selections } = await supabase
    .from('subscription_monthly_selections')
    .select(`
      *,
      character:character_id (
        name,
        rarity
      ),
      collection:collection_id (
        name
      )
    `)
    .eq('subscription_id', subscription.id)
    .order('delivery_month', { ascending: true });

  console.log('🎯 ESCOLHAS MENSAIS');
  if (!selections || selections.length === 0) {
    console.log('  ❌ NENHUMA ESCOLHA REGISTRADA!');
    console.log('');
    console.log('  PROBLEMA IDENTIFICADO:');
    console.log('  - Usuário assinou mas não tem escolhas');
    console.log('  - Deveria ter 3 escolhas (trimestral)');
    console.log('  - Primeira escolha deveria gastar 200 coins');
  } else {
    console.log(`  Total: ${selections.length} escolhas`);
    console.log('');
    selections.forEach((sel, idx) => {
      console.log(`  ${idx + 1}. ${sel.character?.name || 'Sem personagem'}`);
      console.log(`     Coleção: ${sel.collection?.name || 'N/A'}`);
      console.log(`     Mês: ${sel.delivery_month}`);
      console.log(`     Coins: ${sel.coins_spent}`);
      console.log(`     Status: ${sel.status}`);
      console.log(`     Auto: ${sel.is_auto_selected ? 'Sim' : 'Não'}`);
      console.log('');
    });
  }

  // 4. Buscar personagens disponíveis da coleção
  if (subscription.collection) {
    const { data: characters } = await supabase
      .from('collection_characters')
      .select('*')
      .eq('collection_id', subscription.collection.id)
      .order('release_order', { ascending: true });

    console.log('📦 PERSONAGENS DA COLEÇÃO');
    console.log(`  Coleção: ${subscription.collection.name}`);
    console.log(`  Total: ${characters?.length || 0} personagens`);
    console.log('');
    if (characters && characters.length > 0) {
      characters.slice(0, 5).forEach((char, idx) => {
        console.log(`  ${idx + 1}. ${char.name} (${char.character_type})`);
      });
    }
    console.log('');
  }

  // 5. Análise
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📊 ANÁLISE');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  const expectedCoins = subscription.plan_type === 'trimestral' ? 600 : 
                       subscription.plan_type === 'semestral' ? 1300 : 2800;
  const expectedMonths = subscription.plan_type === 'trimestral' ? 3 : 
                        subscription.plan_type === 'semestral' ? 6 : 12;
  const expectedSelections = expectedMonths;
  const actualSelections = selections?.length || 0;

  console.log('✅ CORRETO:');
  if (subscription.coins_initial === expectedCoins) {
    console.log(`  - Coins iniciais: ${subscription.coins_initial} (esperado: ${expectedCoins})`);
  }
  if (subscription.collection) {
    console.log(`  - Coleção ativa definida: ${subscription.collection.name}`);
  }
  console.log('');

  console.log('❌ PROBLEMAS:');
  if (actualSelections === 0) {
    console.log(`  - Nenhuma escolha registrada (esperado: ${expectedSelections})`);
    console.log('  - Saldo não foi debitado (deveria estar em 400 coins)');
    console.log('  - Primeiro personagem não foi selecionado automaticamente');
  }
  if (subscription.coins_balance === subscription.coins_initial) {
    console.log(`  - Saldo não foi atualizado: ${subscription.coins_balance} coins`);
    console.log(`  - Deveria estar em ${subscription.coins_initial - 200} coins`);
  }
  console.log('');

  console.log('🔧 AÇÕES NECESSÁRIAS:');
  console.log('  1. Criar escolhas mensais automáticas (3 meses)');
  console.log('  2. Atualizar saldo de coins para 400');
  console.log('  3. Marcar primeira escolha como confirmada');
  console.log('');

} catch (error) {
  console.error('❌ Erro:', error.message);
  process.exit(1);
}
