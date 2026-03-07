#!/usr/bin/env node
/**
 * Script para validar que as correções de prazos foram aplicadas
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pabxpvqwtvbjaunjejud.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTgxNTg1NiwiZXhwIjoyMDg1MzkxODU2fQ.vYLGOmT_A4G-tfH87mxIk8Oc5QJRxmcGvy2JSafMGns';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🔍 Validando correções de prazos...\n');

// 1. Verificar que shipping_days foi removido
console.log('1️⃣  Verificando remoção de duplicata (shipping_days)...');
const { data: duplicata, error: err1 } = await supabase
  .from('system_settings')
  .select('*')
  .eq('key', 'shipping_days');

if (err1) {
  console.error('❌ Erro:', err1.message);
} else if (duplicata && duplicata.length > 0) {
  console.error('❌ FALHOU: shipping_days ainda existe!');
} else {
  console.log('✅ SUCESSO: shipping_days foi removido\n');
}

// 2. Verificar novos valores
console.log('2️⃣  Verificando novos valores de configuração...');
const { data: settings, error: err2 } = await supabase
  .from('system_settings')
  .select('key, value, description')
  .in('key', [
    'production_days_min',
    'production_days_max',
    'shipping_business_days',
    'sales_duration_days',
    'delivery_interval_days',
    'character_choice_days',
    'balance_payment_days'
  ])
  .order('key');

if (err2) {
  console.error('❌ Erro:', err2.message);
} else {
  console.table(settings);
  
  // Validar valores esperados
  const expected = {
    'production_days_min': '30',
    'production_days_max': '30',
    'shipping_business_days': '15',
    'sales_duration_days': '30',
    'delivery_interval_days': '90',
    'character_choice_days': '7',
    'balance_payment_days': '5'
  };
  
  let allCorrect = true;
  for (const setting of settings) {
    if (expected[setting.key] && setting.value !== expected[setting.key]) {
      console.error(`❌ ${setting.key}: esperado ${expected[setting.key]}, obtido ${setting.value}`);
      allCorrect = false;
    }
  }
  
  if (allCorrect) {
    console.log('✅ SUCESSO: Todos os valores estão corretos\n');
  }
}

// 3. Verificar estágios de produção
console.log('3️⃣  Verificando estágios de produção...');
const { data: stages, error: err3 } = await supabase
  .from('production_stages')
  .select('stage_name, estimated_duration, stage_order')
  .order('stage_order')
  .limit(6);

if (err3) {
  console.error('❌ Erro:', err3.message);
  console.log('   Pode não haver registros ainda. Isso é normal se não houver pedidos em produção.');
} else if (!stages || stages.length === 0) {
  console.log('⚠️  Nenhum estágio encontrado (normal se não houver pedidos em produção)');
  console.log('   Os valores padrão serão aplicados quando novos pedidos forem criados.\n');
} else {
  const stagesWithDays = stages.map(s => ({
    ...s,
    dias: (s.estimated_duration / 24).toFixed(1)
  }));
  console.table(stagesWithDays);
  
  const totalHoras = stages.reduce((sum, s) => sum + s.estimated_duration, 0);
  const totalDias = (totalHoras / 24).toFixed(1);
  
  console.log(`\n📊 Total: ${totalHoras} horas = ${totalDias} dias`);
  
  if (totalHoras === 720) {
    console.log('✅ SUCESSO: Estágios somam exatamente 30 dias\n');
  } else {
    console.error(`❌ FALHOU: Esperado 720 horas (30 dias), obtido ${totalHoras} horas\n`);
  }
}

// 4. Testar função de cálculo de datas
console.log('4️⃣  Testando função calculate_delivery_dates...');
const { data: dates, error: err4 } = await supabase
  .rpc('calculate_delivery_dates', { p_sales_start_date: '2026-03-01' });

if (err4) {
  console.error('❌ Erro:', err4.message);
  console.log('   A função pode não ter sido criada. Execute manualmente no SQL Editor.');
} else {
  console.table(dates);
  
  // Validar datas esperadas
  const expected = {
    sales_start: '2026-03-01',
    sales_end: '2026-03-31',
    production_start: '2026-04-01',
    production_end: '2026-04-30',
    shipping_start: '2026-05-15',
    shipping_end: '2026-05-31'
  };
  
  let allCorrect = true;
  if (dates && dates.length > 0) {
    const result = dates[0];
    for (const [key, expectedValue] of Object.entries(expected)) {
      if (result[key] !== expectedValue) {
        console.error(`❌ ${key}: esperado ${expectedValue}, obtido ${result[key]}`);
        allCorrect = false;
      }
    }
  }
  
  if (allCorrect) {
    console.log('✅ SUCESSO: Função calcula datas corretamente\n');
  }
}

console.log('\n' + '='.repeat(60));
console.log('🎉 Validação concluída!');
console.log('='.repeat(60));
