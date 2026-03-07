#!/usr/bin/env node
/**
 * Script para criar usuários mock no Supabase
 * Uso: node scripts/create-mock-users.mjs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar definidos em .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const mockUsers = [
  {
    email: 'trimestral@ordax.com.br',
    password: 'Senha123!',
    name: 'João Trimestral',
    coins: 600,
    planType: 'trimestral',
    isLegacy: false
  },
  {
    email: 'semestral@ordax.com.br',
    password: 'Senha123!',
    name: 'Maria Semestral',
    coins: 1300,
    planType: 'semestral',
    isLegacy: false
  },
  {
    email: 'anual@ordax.com.br',
    password: 'Senha123!',
    name: 'Pedro Anual',
    coins: 2800,
    planType: 'anual',
    isLegacy: false
  },
  {
    email: 'legacy@ordax.com.br',
    password: 'Senha123!',
    name: 'Ana Legacy',
    coins: 0,
    planType: 'trimestral',
    isLegacy: true
  },
  {
    email: 'avulso@ordax.com.br',
    password: 'Senha123!',
    name: 'Carlos Avulso',
    coins: 2500,
    planType: null,
    isLegacy: false
  }
];

async function createMockUser(userData) {
  console.log(`\n📝 Criando usuário: ${userData.email}...`);
  
  try {
    // 1. Criar usuário via Admin API
    const { data: user, error: userError } = await supabase.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true,
      user_metadata: {
        name: userData.name
      }
    });

    if (userError) {
      if (userError.message.includes('already registered')) {
        console.log(`⚠️  Usuário ${userData.email} já existe`);
        return { success: false, exists: true };
      }
      throw userError;
    }

    console.log(`✅ Usuário criado: ${user.user.id}`);

    // 2. Aguardar triggers automáticos
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 3. Atualizar saldo de coins
    const { error: coinsError } = await supabase
      .from('user_coins')
      .update({
        balance: userData.coins,
        total_earned: userData.coins,
        total_spent: 0
      })
      .eq('user_id', user.user.id);

    if (coinsError) {
      console.warn(`⚠️  Erro ao atualizar coins: ${coinsError.message}`);
    } else {
      console.log(`✅ Coins atualizados: ${userData.coins}`);
    }

    // 4. Criar transação de coins
    if (userData.coins > 0) {
      const { error: txError } = await supabase
        .from('coin_transactions')
        .insert({
          user_id: user.user.id,
          amount: userData.coins,
          transaction_type: userData.planType ? 'subscription_credit' : 'purchase',
          description: userData.planType 
            ? `Crédito inicial - Plano ${userData.planType}`
            : 'Compra de pacote de coins',
          metadata: {
            plan_type: userData.planType,
            is_mock_data: true,
            created_by: 'script'
          }
        });

      if (txError) {
        console.warn(`⚠️  Erro ao criar transação: ${txError.message}`);
      } else {
        console.log(`✅ Transação criada`);
      }
    }

    // 5. Criar assinatura (se aplicável)
    if (userData.planType) {
      // Buscar plan_id
      const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('id, deliveries_total')
        .eq('plan_type', userData.planType)
        .single();

      if (planError || !plan) {
        console.warn(`⚠️  Plano ${userData.planType} não encontrado`);
      } else {
        const { error: subError } = await supabase
          .from('subscriptions')
          .insert({
            user_id: user.user.id,
            plan_id: plan.id,
            plan_type: userData.planType,
            status: 'active',
            deliveries_total: plan.deliveries_total,
            deliveries_completed: 0,
            next_delivery_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            is_legacy: userData.isLegacy,
            coins_balance: userData.coins,
            coins_initial: userData.coins
          });

        if (subError) {
          console.warn(`⚠️  Erro ao criar assinatura: ${subError.message}`);
        } else {
          console.log(`✅ Assinatura criada: ${userData.planType}`);
        }
      }
    }

    return { success: true, userId: user.user.id };

  } catch (error) {
    console.error(`❌ Erro ao criar usuário ${userData.email}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('========================================');
  console.log('CRIANDO USUÁRIOS MOCK');
  console.log('========================================');

  let successCount = 0;
  let existsCount = 0;
  let errorCount = 0;

  for (const userData of mockUsers) {
    const result = await createMockUser(userData);
    if (result.success) {
      successCount++;
    } else if (result.exists) {
      existsCount++;
    } else {
      errorCount++;
    }
  }

  console.log('\n========================================');
  console.log('RESUMO');
  console.log('========================================');
  console.log(`✅ Criados com sucesso: ${successCount}`);
  console.log(`⚠️  Já existiam: ${existsCount}`);
  console.log(`❌ Erros: ${errorCount}`);
  console.log('\nCREDENCIAIS (senha para todos: Senha123!):');
  mockUsers.forEach(u => {
    const type = u.planType ? `Plano ${u.planType}` : 'Sem assinatura';
    console.log(`  • ${u.email} - ${type} (${u.coins} coins)`);
  });
  console.log('========================================\n');
}

main().catch(console.error);
