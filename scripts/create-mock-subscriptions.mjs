#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function createUser(email, name) {
  // Check if user already exists
  const { data: existingUsers } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('email', email);

  if (existingUsers?.length > 0) {
    console.log(`  ℹ️  ${email} já existe`);
    return existingUsers[0].id;
  }

  // Create user in auth.users
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: 'Senha123!',
    email_confirm: true,
    user_metadata: { name }
  });

  if (authError) {
    console.error(`  ❌ Erro ao criar ${email}:`, authError.message);
    return null;
  }

  console.log(`  ✅ ${email} criado`);
  return authUser.user.id;
}

async function main() {
  console.log('👥 Criando usuários mock de assinatura...\n');

  // Get subscription plans
  const { data: plans } = await supabase
    .from('subscription_plans')
    .select('*');

  if (!plans?.length) {
    console.error('❌ Nenhum plano de assinatura encontrado');
    return;
  }

  const planMap = {};
  plans.forEach(p => {
    planMap[p.plan_type] = p;
  });

  // Get collections
  const { data: collections } = await supabase
    .from('collections')
    .select('id, name, slug');

  const collectionMap = {};
  collections.forEach(c => {
    collectionMap[c.slug] = c;
  });

  const users = [
    { email: 'trimestral@ordax.com.br', name: 'João Trimestral', plan: 'trimestral', coins: 600, collection: 'one-piece-mugiwara' },
    { email: 'semestral@ordax.com.br', name: 'Maria Semestral', plan: 'semestral', coins: 1300, collection: 'dragon-ball-z-warriors' },
    { email: 'anual@ordax.com.br', name: 'Pedro Anual', plan: 'anual', coins: 2800, collection: 'naruto-akatsuki' },
    { email: 'legacy@ordax.com.br', name: 'Ana Legacy', plan: 'trimestral', coins: 0, collection: 'attack-on-titan-survey-corps', isLegacy: true }
  ];

  for (const user of users) {
    console.log(`\n📝 ${user.name}:`);
    
    const userId = await createUser(user.email, user.name);
    if (!userId) continue;

    const plan = planMap[user.plan];
    if (!plan) {
      console.error(`  ❌ Plano ${user.plan} não encontrado`);
      continue;
    }

    const collection = collectionMap[user.collection];
    if (!collection) {
      console.error(`  ❌ Coleção ${user.collection} não encontrada`);
      continue;
    }

    // Check if subscription already exists
    const { data: existingSubs } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId);

    if (existingSubs?.length > 0) {
      console.log(`  ℹ️  Assinatura já existe, atualizando...`);
      
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          active_collection_id: collection.id,
          coins_balance: user.coins,
          coins_initial: user.coins
        })
        .eq('id', existingSubs[0].id);

      if (updateError) {
        console.error(`  ❌ Erro ao atualizar assinatura:`, updateError.message);
      } else {
        console.log(`  ✅ Assinatura atualizada: ${plan.plan_type} → ${collection.name}`);
      }
      continue;
    }

    // Create subscription
    const { error: subError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        plan_id: plan.id,
        plan_type: user.plan,
        status: 'active',
        active_collection_id: collection.id,
        deliveries_total: plan.deliveries_total || 3,
        deliveries_completed: 0,
        next_delivery_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        is_legacy: user.isLegacy || false,
        coins_balance: user.coins,
        coins_initial: user.coins
      });

    if (subError) {
      console.error(`  ❌ Erro ao criar assinatura:`, subError.message);
      continue;
    }

    // Update user_coins
    const { error: coinsError } = await supabase
      .from('user_coins')
      .upsert({
        user_id: userId,
        balance: user.coins,
        total_earned: user.coins,
        total_spent: 0
      }, { onConflict: 'user_id' });

    if (coinsError) {
      console.error(`  ❌ Erro ao atualizar coins:`, coinsError.message);
    }

    // Create coin transaction
    if (user.coins > 0) {
      await supabase
        .from('coin_transactions')
        .insert({
          user_id: userId,
          amount: user.coins,
          transaction_type: 'subscription_credit',
          description: `Crédito inicial - Plano ${user.plan}`,
          metadata: { plan_type: user.plan, is_mock_data: true }
        });
    }

    console.log(`  ✅ Assinatura criada: ${plan.plan_type} → ${collection.name}`);
    console.log(`  ✅ Coins: ${user.coins}`);
  }

  console.log('\n✅ Usuários mock criados!\n');
}

main().catch(console.error);
