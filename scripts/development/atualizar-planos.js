import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Carregar variáveis de ambiente
const envContent = readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    env[key.trim()] = valueParts.join('=').replace(/^["']|["']$/g, '');
  }
});

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_PUBLISHABLE_KEY
);

async function atualizarPlanos() {
  console.log('🔄 Atualizando planos de assinatura...\n');

  // Atualizar Semestral: 6 peças (sem bônus)
  console.log('📦 Atualizando plano SEMESTRAL...');
  const { data: semestral, error: error1 } = await supabase
    .from('subscription_plans')
    .update({
      pieces_per_period: 6,
      description: 'Receba 6 peças exclusivas a cada 6 meses. Economize R$ 400!',
      updated_at: new Date().toISOString()
    })
    .eq('name', 'Semestral')
    .select();

  if (error1) {
    console.error('❌ Erro ao atualizar Semestral:', error1.message);
  } else {
    console.log('✅ Semestral atualizado:', semestral);
  }

  // Atualizar Anual: 13 peças (12 + 1 bônus)
  console.log('\n🏆 Atualizando plano ANUAL...');
  const { data: anual, error: error2 } = await supabase
    .from('subscription_plans')
    .update({
      pieces_per_period: 13,
      description: 'Receba 13 peças exclusivas por ano (12 + 1 BÔNUS!). Economize R$ 1.600!',
      updated_at: new Date().toISOString()
    })
    .eq('name', 'Anual')
    .select();

  if (error2) {
    console.error('❌ Erro ao atualizar Anual:', error2.message);
  } else {
    console.log('✅ Anual atualizado:', anual);
  }

  // Verificar resultado final
  console.log('\n📊 Verificando todos os planos...');
  const { data: allPlans, error: error3 } = await supabase
    .from('subscription_plans')
    .select('id, name, price, pieces_per_period, description, is_active')
    .order('price', { ascending: true });

  if (error3) {
    console.error('❌ Erro ao buscar planos:', error3.message);
  } else {
    console.log('\n✅ PLANOS ATUALIZADOS:\n');
    allPlans.forEach(plan => {
      console.log(`${plan.name}:`);
      console.log(`  - Preço: R$ ${plan.price}`);
      console.log(`  - Peças: ${plan.pieces_per_period}`);
      console.log(`  - Descrição: ${plan.description}`);
      console.log(`  - Ativo: ${plan.is_active ? 'Sim' : 'Não'}\n`);
    });
  }

  console.log('🎉 Atualização concluída!');
}

atualizarPlanos().catch(console.error);
