#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  console.log('🏭 Populando fila de produção com dados realistas...\n');

  // Get deliveries with subscription and profile info
  const { data: deliveries } = await supabase
    .from('subscription_deliveries')
    .select('id, subscription_id, delivery_number, status, expected_delivery_date');

  if (!deliveries?.length) {
    console.error('❌ Nenhum delivery encontrado');
    return;
  }

  console.log(`✅ Encontrados ${deliveries.length} deliveries\n`);

  // Get subscriptions
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('id, user_id, active_collection_id');

  const subMap = {};
  subscriptions?.forEach(s => {
    subMap[s.id] = s;
  });

  // Get profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, full_name');

  const profileMap = {};
  profiles?.forEach(p => {
    profileMap[p.id] = p;
  });

  // Get collections
  const { data: collections } = await supabase
    .from('collections')
    .select('id, name');

  const collectionMap = {};
  collections?.forEach(c => {
    collectionMap[c.id] = c;
  });

  // Get characters
  const { data: characters } = await supabase
    .from('collection_characters')
    .select('id, collection_id, name, status')
    .eq('status', 'revealed');

  const charactersByCollection = {};
  characters?.forEach(c => {
    if (!charactersByCollection[c.collection_id]) {
      charactersByCollection[c.collection_id] = [];
    }
    charactersByCollection[c.collection_id].push(c);
  });

  let created = 0;
  const queueItems = [];

  // Create production queue items for deliveries
  for (const delivery of deliveries) {
    const sub = subMap[delivery.subscription_id];
    if (!sub) continue;

    const profile = profileMap[sub.user_id];
    const collection = collectionMap[sub.active_collection_id];
    
    if (!profile || !collection) continue;

    const collectionChars = charactersByCollection[sub.active_collection_id] || [];
    
    // Assign character based on delivery status
    let characterName = null;
    let productionStatus = 'awaiting_choice';
    let currentStage = 'awaiting_choice';
    let choiceStatus = 'pending';
    let choiceMadeAt = null;
    let priority = 'normal';
    let priorityScore = 50;

    if (delivery.status === 'delivered') {
      // Already delivered - completed
      const char = collectionChars[delivery.delivery_number - 1];
      characterName = char?.name || 'Personagem ' + delivery.delivery_number;
      productionStatus = 'completed';
      currentStage = 'shipped';
      choiceStatus = 'locked';
      choiceMadeAt = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ago
      priority = 'normal';
      priorityScore = 50;
    } else if (delivery.status === 'in_production') {
      // In production
      const char = collectionChars[delivery.delivery_number - 1];
      characterName = char?.name || 'Personagem ' + delivery.delivery_number;
      productionStatus = 'in_production';
      currentStage = delivery.delivery_number % 2 === 0 ? 'production' : 'quality_check';
      choiceStatus = 'approved';
      choiceMadeAt = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(); // 10 days ago
      priority = 'high';
      priorityScore = 65;
    } else if (delivery.status === 'scheduled') {
      // Awaiting choice
      productionStatus = 'awaiting_choice';
      currentStage = 'awaiting_choice';
      choiceStatus = 'pending';
      priority = 'high';
      priorityScore = 70;
    }

    const item = {
      order_id: delivery.id,
      order_type: 'subscription_delivery',
      customer_id: profile.id,
      customer_name: profile.full_name || profile.email,
      customer_email: profile.email,
      collection_id: collection.id,
      collection_name: collection.name,
      character_name: characterName,
      production_status: productionStatus,
      current_stage: currentStage,
      choice_status: choiceStatus,
      choice_deadline: delivery.expected_delivery_date,
      choice_made_at: choiceMadeAt,
      priority: priority,
      priority_score: priorityScore
    };

    queueItems.push(item);
  }

  console.log(`📦 Criando ${queueItems.length} itens na fila...\n`);

  // Insert in batches
  for (const item of queueItems) {
    const { error } = await supabase
      .from('production_queue')
      .insert(item);

    if (error) {
      console.error(`❌ Erro ao criar item para ${item.customer_name}:`, error.message);
    } else {
      created++;
      console.log(`✅ ${item.customer_name} - ${item.character_name || 'Aguardando escolha'} (${item.production_status})`);
    }
  }

  console.log(`\n✅ Total criado: ${created}/${queueItems.length}\n`);

  // Show summary
  const statusCounts = queueItems.reduce((acc, item) => {
    acc[item.production_status] = (acc[item.production_status] || 0) + 1;
    return acc;
  }, {});

  console.log('📊 Resumo por status:');
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`   ${status}: ${count}`);
  });
  console.log('');
}

main().catch(console.error);
