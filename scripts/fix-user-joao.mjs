#!/usr/bin/env node
/**
 * Corrige a assinatura do usuário João Trimestral
 * Cria escolhas mensais automáticas e atualiza saldo
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const USER_EMAIL = 'trimestral@ordax.com.br';

console.log('🔧 CORRIGINDO ASSINATURA - João Trimestral');
console.log('═══════════════════════════════════════════════════════════');
console.log('');

try {
  // 1. Buscar usuário e assinatura
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', USER_EMAIL)
    .single();

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*, collection:active_collection_id(*)')
    .eq('user_id', profile.id)
    .eq('status', 'active')
    .single();

  console.log('📋 Assinatura encontrada');
  console.log('  Plano:', subscription.plan_type);
  console.log('  Coleção:', subscription.collection.name);
  console.log('');

  // 2. Buscar personagens da coleção
  const { data: characters } = await supabase
    .from('collection_characters')
    .select('*')
    .eq('collection_id', subscription.active_collection_id)
    .order('release_order', { ascending: true })
    .limit(3); // Trimestral = 3 meses

  if (!characters || characters.length < 3) {
    console.error('❌ Não há personagens suficientes na coleção');
    process.exit(1);
  }

  console.log('📦 Personagens selecionados:');
  characters.forEach((char, idx) => {
    console.log(`  ${idx + 1}. ${char.name}`);
  });
  console.log('');

  // 3. Calcular meses de entrega
  const startDate = new Date(subscription.created_at);
  const months = [];
  for (let i = 0; i < 3; i++) {
    const deliveryDate = new Date(startDate);
    deliveryDate.setMonth(deliveryDate.getMonth() + i);
    const monthStr = deliveryDate.toISOString().slice(0, 7); // YYYY-MM
    months.push(monthStr);
  }

  console.log('📅 Meses de entrega:');
  months.forEach((month, idx) => {
    console.log(`  ${idx + 1}. ${month}`);
  });
  console.log('');

  // 4. Criar escolhas mensais
  console.log('✨ Criando escolhas mensais...');
  const selections = [];
  
  for (let i = 0; i < 3; i++) {
    const selection = {
      subscription_id: subscription.id,
      user_id: profile.id,
      character_id: characters[i].id,
      collection_id: subscription.active_collection_id,
      delivery_month: months[i],
      coins_spent: 200, // Preço da coleção ativa
      is_auto_selected: true,
      status: i === 0 ? 'confirmed' : 'pending', // Primeira confirmada, resto pendente
      selected_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('subscription_monthly_selections')
      .insert(selection)
      .select()
      .single();

    if (error) {
      console.error(`  ❌ Erro ao criar escolha ${i + 1}:`, error.message);
    } else {
      console.log(`  ✅ Escolha ${i + 1} criada: ${characters[i].name} (${months[i]})`);
      selections.push(data);
    }
  }
  console.log('');

  // 5. Atualizar saldo de coins
  // O trigger deve fazer isso automaticamente, mas vamos garantir
  const totalSpent = selections.reduce((sum, sel) => sum + 200, 0);
  const newBalance = subscription.coins_initial - totalSpent;

  console.log('💰 Atualizando saldo de coins...');
  console.log(`  Inicial: ${subscription.coins_initial} coins`);
  console.log(`  Gasto: ${totalSpent} coins`);
  console.log(`  Novo saldo: ${newBalance} coins`);

  const { error: updateError } = await supabase
    .from('subscriptions')
    .update({ 
      coins_balance: newBalance,
      updated_at: new Date().toISOString()
    })
    .eq('id', subscription.id);

  if (updateError) {
    console.error('  ❌ Erro ao atualizar saldo:', updateError.message);
  } else {
    console.log('  ✅ Saldo atualizado');
  }
  console.log('');

  // 6. Verificar resultado
  const { data: updatedSub } = await supabase
    .from('subscriptions')
    .select('coins_balance')
    .eq('id', subscription.id)
    .single();

  const { data: createdSelections } = await supabase
    .from('subscription_monthly_selections')
    .select('*')
    .eq('subscription_id', subscription.id);

  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ CORREÇÃO CONCLUÍDA');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('📊 Resultado:');
  console.log(`  - Escolhas criadas: ${createdSelections?.length || 0}/3`);
  console.log(`  - Saldo atual: ${updatedSub?.coins_balance} coins`);
  console.log(`  - Status: ${createdSelections?.length === 3 && updatedSub?.coins_balance === 400 ? '✅ OK' : '⚠️  Verificar'}`);
  console.log('');

} catch (error) {
  console.error('❌ Erro:', error.message);
  console.error(error);
  process.exit(1);
}
