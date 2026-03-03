// Script para popular a production_queue via Node.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Ler variáveis do .env manualmente
const envContent = fs.readFileSync('.env', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      // Remove aspas
      value = value.replace(/^["']|["']$/g, '');
      envVars[key] = value;
    }
  }
});

console.log('Variáveis carregadas:', Object.keys(envVars));

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erro: VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontrados no .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function populateQueue() {
  console.log('🔄 Populando production_queue...\n');

  try {
    // 1. Verificar se tabela existe
    const { data: tables, error: tableError } = await supabase
      .from('production_queue')
      .select('id')
      .limit(1);

    if (tableError && tableError.code === '42P01') {
      console.error('❌ Tabela production_queue não existe!');
      console.error('Execute as migrations primeiro: npx supabase db push --include-all');
      process.exit(1);
    }

    // 2. Buscar deliveries confirmados
    const { data: deliveries, error: deliveriesError } = await supabase
      .from('subscription_deliveries')
      .select('*')
      .eq('status', 'confirmed');

    if (deliveriesError) {
      console.error('❌ Erro ao buscar deliveries:', deliveriesError.message);
      process.exit(1);
    }

    console.log(`📦 Encontrados ${deliveries?.length || 0} deliveries confirmados`);

    // 3. Buscar purchases pagos
    const { data: purchases, error: purchasesError } = await supabase
      .from('standalone_purchases')
      .select('*')
      .eq('status', 'balance_paid');

    if (purchasesError) {
      console.error('❌ Erro ao buscar purchases:', purchasesError.message);
      process.exit(1);
    }

    console.log(`🛒 Encontrados ${purchases?.length || 0} purchases pagos\n`);

    let inserted = 0;
    let skipped = 0;

    // 4. Processar deliveries
    for (const delivery of deliveries || []) {
      // Verificar se já existe
      const { data: existing } = await supabase
        .from('production_queue')
        .select('id')
        .eq('order_id', delivery.id)
        .eq('order_type', 'subscription_delivery')
        .single();

      if (existing) {
        skipped++;
        continue;
      }

      // Buscar dados do cliente
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', delivery.user_id)
        .single();

      // Buscar dados da coleção
      const { data: collection } = await supabase
        .from('collections')
        .select('id, name')
        .eq('id', delivery.collection_id)
        .single();

      // Verificar se precisa de escolha
      const { data: characters } = await supabase
        .from('collection_characters')
        .select('id')
        .eq('collection_id', delivery.collection_id);

      const requiresChoice = (characters?.length || 0) > 1;
      const choiceDeadline = requiresChoice 
        ? new Date(new Date(delivery.created_at).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
        : null;

      // Inserir na fila
      const { error: insertError } = await supabase
        .from('production_queue')
        .insert({
          order_id: delivery.id,
          order_type: 'subscription_delivery',
          customer_id: delivery.user_id,
          customer_name: profile?.full_name || profile?.email || 'Cliente Desconhecido',
          customer_email: profile?.email || '',
          collection_id: collection?.id,
          collection_name: collection?.name || 'Coleção Desconhecida',
          character_id: null,
          character_name: null,
          production_status: requiresChoice ? 'awaiting_choice' : 'ready_for_production',
          current_stage: requiresChoice ? 'awaiting_choice' : 'design',
          choice_status: requiresChoice ? 'pending' : 'approved',
          choice_deadline: choiceDeadline,
          scheduled_production_date: requiresChoice ? null : new Date(new Date(delivery.created_at).getTime() + 24 * 60 * 60 * 1000).toISOString(),
          created_at: delivery.created_at
        });

      if (insertError) {
        console.error(`❌ Erro ao inserir delivery ${delivery.id}:`, insertError.message);
      } else {
        inserted++;
        console.log(`  ✓ Adicionado delivery ${delivery.id} (${collection?.name})`);

        // Criar character_choice se necessário
        if (requiresChoice) {
          await supabase
            .from('character_choices')
            .insert({
              order_id: delivery.id,
              order_type: 'subscription_delivery',
              user_id: delivery.user_id,
              collection_id: collection?.id,
              status: 'pending',
              deadline: choiceDeadline,
              created_at: delivery.created_at
            });
        }
      }
    }

    // 5. Processar purchases
    for (const purchase of purchases || []) {
      // Verificar se já existe
      const { data: existing } = await supabase
        .from('production_queue')
        .select('id')
        .eq('order_id', purchase.id)
        .eq('order_type', 'standalone_purchase')
        .single();

      if (existing) {
        skipped++;
        continue;
      }

      // Buscar dados do cliente
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', purchase.user_id)
        .single();

      // Buscar dados da coleção
      const { data: collection } = await supabase
        .from('collections')
        .select('id, name')
        .eq('id', purchase.collection_id)
        .single();

      // Verificar se precisa de escolha
      const { data: characters } = await supabase
        .from('collection_characters')
        .select('id')
        .eq('collection_id', purchase.collection_id);

      const requiresChoice = (characters?.length || 0) > 1;
      const choiceDeadline = requiresChoice 
        ? new Date(new Date(purchase.created_at).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
        : null;

      // Inserir na fila
      const { error: insertError } = await supabase
        .from('production_queue')
        .insert({
          order_id: purchase.id,
          order_type: 'standalone_purchase',
          customer_id: purchase.user_id,
          customer_name: profile?.full_name || profile?.email || 'Cliente Desconhecido',
          customer_email: profile?.email || '',
          collection_id: collection?.id,
          collection_name: collection?.name || 'Coleção Desconhecida',
          character_id: null,
          character_name: null,
          production_status: requiresChoice ? 'awaiting_choice' : 'ready_for_production',
          current_stage: requiresChoice ? 'awaiting_choice' : 'design',
          choice_status: requiresChoice ? 'pending' : 'approved',
          choice_deadline: choiceDeadline,
          scheduled_production_date: requiresChoice ? null : new Date(new Date(purchase.created_at).getTime() + 24 * 60 * 60 * 1000).toISOString(),
          created_at: purchase.created_at
        });

      if (insertError) {
        console.error(`❌ Erro ao inserir purchase ${purchase.id}:`, insertError.message);
      } else {
        inserted++;
        console.log(`  ✓ Adicionado purchase ${purchase.id} (${collection?.name})`);

        // Criar character_choice se necessário
        if (requiresChoice) {
          await supabase
            .from('character_choices')
            .insert({
              order_id: purchase.id,
              order_type: 'standalone_purchase',
              user_id: purchase.user_id,
              collection_id: collection?.id,
              status: 'pending',
              deadline: choiceDeadline,
              created_at: purchase.created_at
            });
        }
      }
    }

    // 6. Resumo
    console.log('\n=== Resumo ===');
    console.log(`✅ Registros inseridos: ${inserted}`);
    console.log(`⏭️  Registros ignorados (já existiam): ${skipped}`);

    if (inserted > 0) {
      console.log('\n✓ production_queue populada com sucesso!');
      console.log('Agora o dashboard de produção deve mostrar os itens.');
    } else {
      console.log('\nNenhum registro novo foi inserido.');
      if (skipped > 0) {
        console.log('Todos os pedidos aprovados já estavam na fila.');
      } else {
        console.log('Não há pedidos aprovados para adicionar.');
      }
    }

    // 7. Verificar resultado
    const { data: queueData, count } = await supabase
      .from('production_queue')
      .select('*', { count: 'exact', head: true });

    console.log(`\n📊 Total de itens na production_queue: ${count || 0}`);

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

populateQueue();
