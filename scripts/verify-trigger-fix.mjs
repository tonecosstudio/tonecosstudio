#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pabxpvqwtvbjaunjejud.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTgxNTg1NiwiZXhwIjoyMDg1MzkxODU2fQ.vYLGOmT_A4G-tfH87mxIk8Oc5QJRxmcGvy2JSafMGns';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyTrigger() {
  console.log('\n🔍 Verificando correção do trigger...\n');

  try {
    // Buscar dados do João Trimestral
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', 'trimestral@ordax.com.br')
      .single();

    if (profileError) throw profileError;

    console.log('✅ Usuário encontrado:', profile.email);
    console.log('');

    // Buscar assinatura
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select(`
        id,
        coins_initial,
        coins_balance,
        active_collection_id,
        collections:active_collection_id (
          name
        )
      `)
      .eq('user_id', profile.id)
      .single();

    if (subError) throw subError;

    console.log('📊 Dados da Assinatura:');
    console.log('─'.repeat(60));
    console.log(`  Coleção Ativa: ${subscription.collections?.name || 'N/A'}`);
    console.log(`  Coins Iniciais: ${subscription.coins_initial}`);
    console.log(`  Saldo Atual: ${subscription.coins_balance}`);
    console.log('');

    // Buscar escolhas mensais
    const { data: selections, error: selectionsError } = await supabase
      .from('subscription_monthly_selections')
      .select(`
        id,
        delivery_month,
        status,
        coins_spent,
        characters:character_id (
          name
        )
      `)
      .eq('subscription_id', subscription.id)
      .order('delivery_month', { ascending: true });

    if (selectionsError) throw selectionsError;

    console.log('📅 Escolhas Mensais:');
    console.log('─'.repeat(60));
    
    let totalGasto = 0;
    let totalConfirmado = 0;

    selections.forEach((sel, idx) => {
      const [year, month] = sel.delivery_month.split('-');
      const monthName = new Date(year, month - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      const statusEmoji = sel.status === 'confirmed' ? '🔵' : 
                         sel.status === 'pending' ? '🟡' : '🟢';
      
      console.log(`  ${idx + 1}. ${monthName} - ${sel.characters?.name || 'N/A'}`);
      console.log(`     Status: ${statusEmoji} ${sel.status}`);
      console.log(`     Coins: ${sel.coins_spent}`);
      
      if (['confirmed', 'in_production', 'shipped', 'delivered'].includes(sel.status)) {
        totalConfirmado += sel.coins_spent;
      }
      totalGasto += sel.coins_spent;
      console.log('');
    });

    console.log('─'.repeat(60));
    console.log(`  Total de Escolhas: ${selections.length}`);
    console.log(`  Total Gasto (todas): ${totalGasto} coins`);
    console.log(`  Total Gasto (confirmadas): ${totalConfirmado} coins`);
    console.log('');

    // Validação
    const saldoEsperado = subscription.coins_initial - totalConfirmado;
    const saldoCorreto = subscription.coins_balance === saldoEsperado;

    console.log('✅ VALIDAÇÃO:');
    console.log('─'.repeat(60));
    console.log(`  Saldo Esperado: ${saldoEsperado} coins`);
    console.log(`  Saldo Atual: ${subscription.coins_balance} coins`);
    console.log(`  Status: ${saldoCorreto ? '✅ CORRETO' : '❌ INCORRETO'}`);
    console.log('');

    if (saldoCorreto) {
      console.log('🎉 TRIGGER FUNCIONANDO CORRETAMENTE!');
      console.log('');
      console.log('O trigger agora:');
      console.log('  ✅ Conta apenas escolhas confirmadas');
      console.log('  ✅ Ignora escolhas "pending"');
      console.log('  ✅ Calcula o saldo corretamente');
      console.log('');
      console.log('📋 Próximos passos:');
      console.log('  1. Recarregue a página do admin');
      console.log('  2. Verifique que João Trimestral mostra 400 coins');
      console.log('  3. Verifique que as 3 escolhas aparecem na timeline');
    } else {
      console.log('⚠️  O saldo ainda não está correto.');
      console.log('');
      console.log('Possíveis causas:');
      console.log('  • O trigger foi aplicado mas o saldo não foi recalculado');
      console.log('  • Execute o script de correção do saldo novamente');
      console.log('');
      console.log('Solução:');
      console.log('  node scripts/fix-coins-balance.mjs');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }

  console.log('');
}

verifyTrigger();
