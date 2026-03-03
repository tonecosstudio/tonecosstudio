// Script para verificar pagamentos manuais
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

async function checkManualPayments() {
  console.log('🔍 Verificando pagamentos manuais...\n');

  // Buscar o pedido específico
  const { data: payment, error } = await supabase
    .from('manual_payments')
    .select('*')
    .eq('id', '9c6bec6d-af56-407d-89c7-6126456f4bff')
    .single();

  if (error) {
    console.error('❌ Erro ao buscar pagamento:', error.message);
    return;
  }

  if (!payment) {
    console.log('❌ Pagamento não encontrado');
    return;
  }

  console.log('📋 Pagamento encontrado:');
  console.log('   ID:', payment.id);
  console.log('   Status:', payment.status);
  console.log('   User ID:', payment.user_id);
  console.log('   Collection ID:', payment.collection_id);
  console.log('   Created:', payment.created_at);
  console.log('   Todos os campos:', JSON.stringify(payment, null, 2));

  // Verificar se está na production_queue
  const { data: queueItem } = await supabase
    .from('production_queue')
    .select('*')
    .eq('order_id', payment.id)
    .eq('order_type', 'manual_payment')
    .single();

  if (queueItem) {
    console.log('\n✅ Este pagamento JÁ está na production_queue');
  } else {
    console.log('\n❌ Este pagamento NÃO está na production_queue');
    console.log('   Será adicionado agora...');

    // Buscar dados do cliente
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', payment.user_id)
      .single();

    // Buscar dados da coleção
    const { data: collection } = await supabase
      .from('collections')
      .select('id, name')
      .eq('id', payment.collection_id)
      .single();

    // Verificar se precisa de escolha
    const { data: characters } = await supabase
      .from('collection_characters')
      .select('id')
      .eq('collection_id', payment.collection_id);

    const requiresChoice = (characters?.length || 0) > 1;
    const choiceDeadline = requiresChoice 
      ? new Date(new Date(payment.created_at).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // Inserir na fila
    const { data: inserted, error: insertError } = await supabase
      .from('production_queue')
      .insert({
        order_id: payment.id,
        order_type: 'manual_payment',
        customer_id: payment.user_id,
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
        scheduled_production_date: requiresChoice ? null : new Date(new Date(payment.created_at).getTime() + 24 * 60 * 60 * 1000).toISOString(),
        created_at: payment.created_at
      })
      .select()
      .single();

    if (insertError) {
      console.error('   ❌ Erro ao inserir:', insertError.message);
    } else {
      console.log('   ✅ Adicionado à production_queue com sucesso!');
      console.log('   ID na fila:', inserted.id);

      // Criar character_choice se necessário
      if (requiresChoice) {
        await supabase
          .from('character_choices')
          .insert({
            order_id: payment.id,
            order_type: 'manual_payment',
            user_id: payment.user_id,
            collection_id: collection?.id,
            status: 'pending',
            deadline: choiceDeadline,
            created_at: payment.created_at
          });
        console.log('   ✅ character_choice criado');
      }
    }
  }

  // Verificar total na fila
  const { count } = await supabase
    .from('production_queue')
    .select('*', { count: 'exact', head: true });

  console.log(`\n📊 Total de itens na production_queue: ${count || 0}`);
}

checkManualPayments();
