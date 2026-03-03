// Script para verificar status dos pedidos
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Ler variáveis do .env
const envContent = fs.readFileSync('.env', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      value = value.replace(/^["']|["']$/g, '');
      envVars[key] = value;
    }
  }
});

const supabase = createClient(envVars.VITE_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

async function checkOrders() {
  console.log('🔍 Verificando status dos pedidos...\n');

  // Verificar subscription_deliveries
  const { data: deliveries, error: deliveriesError } = await supabase
    .from('subscription_deliveries')
    .select('status');

  if (!deliveriesError && deliveries) {
    const statusCount = {};
    deliveries.forEach(d => {
      statusCount[d.status] = (statusCount[d.status] || 0) + 1;
    });

    console.log('📦 subscription_deliveries:');
    console.log(`   Total: ${deliveries.length}`);
    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`   - ${status}: ${count}`);
    });
  }

  // Verificar standalone_purchases
  const { data: purchases, error: purchasesError } = await supabase
    .from('standalone_purchases')
    .select('status');

  if (!purchasesError && purchases) {
    const statusCount = {};
    purchases.forEach(p => {
      statusCount[p.status] = (statusCount[p.status] || 0) + 1;
    });

    console.log('\n🛒 standalone_purchases:');
    console.log(`   Total: ${purchases.length}`);
    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`   - ${status}: ${count}`);
    });
  }

  // Verificar production_queue
  const { count } = await supabase
    .from('production_queue')
    .select('*', { count: 'exact', head: true });

  console.log(`\n📊 production_queue: ${count || 0} itens`);

  console.log('\n💡 Para que itens apareçam na fila de produção:');
  console.log('   - subscription_deliveries devem ter status="confirmed"');
  console.log('   - standalone_purchases devem ter status="balance_paid"');
}

checkOrders();
