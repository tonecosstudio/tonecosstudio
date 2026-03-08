#!/usr/bin/env node

/**
 * Script: Analyze Delivery Addresses
 * 
 * Analisa endereços de entrega para compras avulsa e assinaturas
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: Variáveis de ambiente não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  console.log('='.repeat(60));
  console.log('📍 Análise: Endereços de Entrega');
  console.log('='.repeat(60));
  console.log('');

  try {
    // 1. Verificar estrutura da tabela profiles
    console.log('1️⃣ Estrutura da tabela profiles:');
    const { data: profileSample } = await supabase
      .from('profiles')
      .select('id, delivery_address')
      .limit(1)
      .single();
    
    if (profileSample && 'delivery_address' in profileSample) {
      console.log('   ✅ Coluna delivery_address existe');
    } else {
      console.log('   ❌ Coluna delivery_address não encontrada');
    }
    console.log('');

    // 2. Verificar profiles com endereço
    console.log('2️⃣ Profiles com endereço cadastrado:');
    const { data: profilesWithAddress, count: withAddressCount } = await supabase
      .from('profiles')
      .select('id, full_name, email, delivery_address', { count: 'exact' })
      .not('delivery_address', 'is', null);

    console.log(`   Total: ${withAddressCount || 0}`);
    if (profilesWithAddress && profilesWithAddress.length > 0) {
      profilesWithAddress.forEach(p => {
        console.log(`   - ${p.full_name} (${p.email})`);
        console.log(`     Endereço:`, p.delivery_address);
      });
    }
    console.log('');

    // 3. Verificar profiles sem endereço
    console.log('3️⃣ Profiles sem endereço cadastrado:');
    const { data: profilesWithoutAddress, count: withoutAddressCount } = await supabase
      .from('profiles')
      .select('id, full_name, email, delivery_address', { count: 'exact' })
      .is('delivery_address', null);

    console.log(`   Total: ${withoutAddressCount || 0}`);
    if (profilesWithoutAddress && profilesWithoutAddress.length > 0) {
      profilesWithoutAddress.slice(0, 5).forEach(p => {
        console.log(`   - ${p.full_name} (${p.email})`);
      });
      if (profilesWithoutAddress.length > 5) {
        console.log(`   ... e mais ${profilesWithoutAddress.length - 5}`);
      }
    }
    console.log('');

    // 4. Verificar compras avulsa sem endereço
    console.log('4️⃣ Compras avulsa sem endereço de entrega:');
    const { data: standalonePurchases } = await supabase
      .from('standalone_purchases')
      .select(`
        id,
        user_id,
        status,
        profiles!inner(full_name, email, delivery_address)
      `)
      .is('profiles.delivery_address', null);

    console.log(`   Total: ${standalonePurchases?.length || 0}`);
    if (standalonePurchases && standalonePurchases.length > 0) {
      standalonePurchases.forEach(sp => {
        console.log(`   - ${sp.profiles.full_name} (${sp.profiles.email})`);
        console.log(`     Status: ${sp.status}`);
      });
    }
    console.log('');

    // 5. Verificar assinaturas
    console.log('5️⃣ Verificando estrutura de assinaturas:');
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('id, user_id, shipping_address')
      .limit(3);

    if (subscriptions && subscriptions.length > 0) {
      console.log('   Assinaturas encontradas:', subscriptions.length);
      subscriptions.forEach(sub => {
        console.log(`   - ID: ${sub.id.substring(0, 8)}`);
        console.log(`     shipping_address:`, sub.shipping_address || 'NULL');
      });
    } else {
      console.log('   Nenhuma assinatura encontrada');
    }
    console.log('');

    // 6. Resumo e recomendações
    console.log('='.repeat(60));
    console.log('📊 RESUMO');
    console.log('='.repeat(60));
    console.log('');
    console.log(`✅ Profiles com endereço: ${withAddressCount || 0}`);
    console.log(`❌ Profiles sem endereço: ${withoutAddressCount || 0}`);
    console.log(`⚠️  Compras avulsa sem endereço: ${standalonePurchases?.length || 0}`);
    console.log('');
    
    if ((withoutAddressCount || 0) > 0) {
      console.log('🔧 RECOMENDAÇÕES:');
      console.log('');
      console.log('1. Tornar endereço obrigatório no cadastro');
      console.log('2. Adicionar validação no checkout');
      console.log('3. Bloquear finalização de compra sem endereço');
      console.log('4. Adicionar modal para solicitar endereço');
      console.log('');
    }

  } catch (error) {
    console.error('');
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
