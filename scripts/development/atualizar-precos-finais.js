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

async function atualizarPrecos() {
  console.log('🔄 Atualizando preços finais dos planos...\n');

  // Atualizar Trimestral: 3 peças, R$ 1.200
  console.log('📦 Atualizando plano TRIMESTRAL...');
  const { data: trimestral, error: error1 } = await supabase
    .from('subscription_plans')
    .update({
      price: 1200,
      price_pix: 1080, // 10% desconto
      pieces_per_period: 3,
      description: 'Receba 3 peças exclusivas a cada 3 meses. Economize R$ 300!',
      updated_at: new Date().toISOString()
    })
    .eq('name', 'Trimestral')
    .select();

  if (error1) {
    console.error('❌ Erro ao atualizar Trimestral:', error1.message);
  } else {
    console.log('✅ Trimestral atualizado:', trimestral);
  }

  // Atualizar Semestral: 6 peças (SEM bônus), R$ 2.160
  console.log('\n💎 Atualizando plano SEMESTRAL...');
  const { data: semestral, error: error2 } = await supabase
    .from('subscription_plans')
    .update({
      price: 2160,
      price_pix: 1944, // 10% desconto
      pieces_per_period: 6,
      description: 'Receba 6 peças exclusivas a cada 6 meses. Economize R$ 840!',
      updated_at: new Date().toISOString()
    })
    .eq('name', 'Semestral')
    .select();

  if (error2) {
    console.error('❌ Erro ao atualizar Semestral:', error2.message);
  } else {
    console.log('✅ Semestral atualizado:', semestral);
  }

  // Atualizar Anual: 13 peças (12 + 1 bônus), R$ 4.200
  console.log('\n🏆 Atualizando plano ANUAL...');
  const { data: anual, error: error3 } = await supabase
    .from('subscription_plans')
    .update({
      price: 4200,
      price_pix: 3780, // 10% desconto
      pieces_per_period: 13,
      description: 'Receba 13 peças exclusivas por ano (12 + 1 BÔNUS!). Economize R$ 2.300!',
      updated_at: new Date().toISOString()
    })
    .eq('name', 'Anual')
    .select();

  if (error3) {
    console.error('❌ Erro ao atualizar Anual:', error3.message);
  } else {
    console.log('✅ Anual atualizado:', anual);
  }

  // Verificar resultado final
  console.log('\n📊 Verificando todos os planos...');
  const { data: allPlans, error: error4 } = await supabase
    .from('subscription_plans')
    .select('id, name, price, price_pix, pieces_per_period, description, is_active')
    .order('price', { ascending: true });

  if (error4) {
    console.error('❌ Erro ao buscar planos:', error4.message);
  } else {
    console.log('\n✅ PLANOS ATUALIZADOS:\n');
    allPlans.forEach(plan => {
      console.log(`${plan.name}:`);
      console.log(`  - Preço: R$ ${plan.price}`);
      console.log(`  - Preço PIX: R$ ${plan.price_pix}`);
      console.log(`  - Peças: ${plan.pieces_per_period}`);
      console.log(`  - Descrição: ${plan.description}`);
      console.log(`  - Ativo: ${plan.is_active ? 'Sim' : 'Não'}\n`);
    });
  }

  console.log('🎉 Atualização concluída!');
  console.log('\n📋 RESUMO:');
  console.log('- Trimestral: R$ 1.200 (3 peças)');
  console.log('- Semestral: R$ 2.160 (6 peças)');
  console.log('- Anual: R$ 4.200 (13 peças = 12 + 1 bônus)');
  console.log('\n✅ Preços finais implementados com sucesso!');
}

atualizarPrecos().catch(console.error);
