#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  console.log('🚀 Populando fila de produção...\n');

  // Buscar usuários
  const { data: users } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .in('email', ['trimestral@ordax.com.br', 'semestral@ordax.com.br', 'anual@ordax.com.br', 'legacy@ordax.com.br', 'entrada-paga@ordax.com.br', 'completo-pago@ordax.com.br']);

  if (!users?.length) {
    console.error('❌ Nenhum usuário encontrado');
    return;
  }

  console.log(`✅ Encontrados ${users.length} usuários\n`);

  // Buscar coleções reais do banco
  const { data: collections, error: collectionsError } = await supabase
    .from('collections')
    .select('id, name, slug')
    .in('slug', ['one-piece-mugiwara', 'dragon-ball-z-warriors', 'naruto-akatsuki', 'attack-on-titan-survey-corps']);

  if (collectionsError || !collections?.length) {
    console.error('❌ Erro ao buscar coleções:', collectionsError);
    console.error('Execute a migration 20260513000007_seed_collections.sql primeiro');
    return;
  }

  console.log(`✅ Encontradas ${collections.length} coleções\n`);

  const collectionMap = {
    'one-piece-mugiwara': collections.find(c => c.slug === 'one-piece-mugiwara'),
    'dragon-ball-z-warriors': collections.find(c => c.slug === 'dragon-ball-z-warriors'),
    'naruto-akatsuki': collections.find(c => c.slug === 'naruto-akatsuki'),
    'attack-on-titan-survey-corps': collections.find(c => c.slug === 'attack-on-titan-survey-corps')
  };

  const items = [];
  const joao = users.find(u => u.email === 'trimestral@ordax.com.br');
  const maria = users.find(u => u.email === 'semestral@ordax.com.br');
  const pedro = users.find(u => u.email === 'anual@ordax.com.br');
  const ana = users.find(u => u.email === 'legacy@ordax.com.br');
  const carlos = users.find(u => u.email === 'entrada-paga@ordax.com.br');
  const roberto = users.find(u => u.email === 'completo-pago@ordax.com.br');

  if (joao) {
    items.push(
      { order_id: crypto.randomUUID(), order_type: 'subscription_delivery', customer_id: joao.id, customer_name: joao.full_name || 'João Trimestral', customer_email: joao.email, collection_id: collectionMap['one-piece-mugiwara'].id, collection_name: collectionMap['one-piece-mugiwara'].name, character_name: 'Luffy', production_status: 'completed', current_stage: 'shipped', choice_status: 'locked', choice_deadline: '2026-01-14T00:00:00Z', choice_made_at: '2026-01-10T00:00:00Z', priority: 'normal', priority_score: 50 },
      { order_id: crypto.randomUUID(), order_type: 'subscription_delivery', customer_id: joao.id, customer_name: joao.full_name || 'João Trimestral', customer_email: joao.email, collection_id: collectionMap['one-piece-mugiwara'].id, collection_name: collectionMap['one-piece-mugiwara'].name, character_name: 'Zoro', production_status: 'completed', current_stage: 'shipped', choice_status: 'locked', choice_deadline: '2026-02-14T00:00:00Z', choice_made_at: '2026-02-10T00:00:00Z', priority: 'normal', priority_score: 50 },
      { order_id: crypto.randomUUID(), order_type: 'subscription_delivery', customer_id: joao.id, customer_name: joao.full_name || 'João Trimestral', customer_email: joao.email, collection_id: collectionMap['one-piece-mugiwara'].id, collection_name: collectionMap['one-piece-mugiwara'].name, character_name: null, production_status: 'awaiting_choice', current_stage: 'awaiting_choice', choice_status: 'pending', choice_deadline: '2026-03-15T00:00:00Z', choice_made_at: null, priority: 'high', priority_score: 70 }
    );
  }

  if (maria) {
    items.push(
      { order_id: crypto.randomUUID(), order_type: 'subscription_delivery', customer_id: maria.id, customer_name: maria.full_name || 'Maria Semestral', customer_email: maria.email, collection_id: collectionMap['dragon-ball-z-warriors'].id, collection_name: collectionMap['dragon-ball-z-warriors'].name, character_name: 'Goku', production_status: 'completed', current_stage: 'shipped', choice_status: 'locked', choice_deadline: '2026-01-19T00:00:00Z', choice_made_at: '2026-01-15T00:00:00Z', priority: 'normal', priority_score: 50 },
      { order_id: crypto.randomUUID(), order_type: 'subscription_delivery', customer_id: maria.id, customer_name: maria.full_name || 'Maria Semestral', customer_email: maria.email, collection_id: collectionMap['dragon-ball-z-warriors'].id, collection_name: collectionMap['dragon-ball-z-warriors'].name, character_name: 'Vegeta', production_status: 'in_production', current_stage: 'production', choice_status: 'approved', choice_deadline: '2026-02-19T00:00:00Z', choice_made_at: '2026-02-15T00:00:00Z', priority: 'high', priority_score: 65 },
      { order_id: crypto.randomUUID(), order_type: 'subscription_delivery', customer_id: maria.id, customer_name: maria.full_name || 'Maria Semestral', customer_email: maria.email, collection_id: collectionMap['dragon-ball-z-warriors'].id, collection_name: collectionMap['dragon-ball-z-warriors'].name, character_name: 'Gohan', production_status: 'ready_for_production', current_stage: 'design', choice_status: 'submitted', choice_deadline: '2026-03-10T00:00:00Z', choice_made_at: '2026-03-02T00:00:00Z', priority: 'normal', priority_score: 55 }
    );
  }

  if (pedro) {
    items.push(
      { order_id: crypto.randomUUID(), order_type: 'subscription_delivery', customer_id: pedro.id, customer_name: pedro.full_name || 'Pedro Anual', customer_email: pedro.email, collection_id: collectionMap['naruto-akatsuki'].id, collection_name: collectionMap['naruto-akatsuki'].name, character_name: 'Itachi', production_status: 'completed', current_stage: 'shipped', choice_status: 'locked', choice_deadline: '2026-01-24T00:00:00Z', choice_made_at: '2026-01-20T00:00:00Z', priority: 'normal', priority_score: 50 },
      { order_id: crypto.randomUUID(), order_type: 'subscription_delivery', customer_id: pedro.id, customer_name: pedro.full_name || 'Pedro Anual', customer_email: pedro.email, collection_id: collectionMap['naruto-akatsuki'].id, collection_name: collectionMap['naruto-akatsuki'].name, character_name: 'Pain', production_status: 'in_production', current_stage: 'quality_check', choice_status: 'approved', choice_deadline: '2026-02-24T00:00:00Z', choice_made_at: '2026-02-20T00:00:00Z', priority: 'high', priority_score: 60 },
      { order_id: crypto.randomUUID(), order_type: 'subscription_delivery', customer_id: pedro.id, customer_name: pedro.full_name || 'Pedro Anual', customer_email: pedro.email, collection_id: collectionMap['naruto-akatsuki'].id, collection_name: collectionMap['naruto-akatsuki'].name, character_name: 'Obito', production_status: 'in_production', current_stage: 'production', choice_status: 'approved', choice_deadline: '2026-03-08T00:00:00Z', choice_made_at: '2026-03-01T00:00:00Z', priority: 'high', priority_score: 65 }
    );
  }

  if (ana) {
    items.push({ order_id: crypto.randomUUID(), order_type: 'subscription_delivery', customer_id: ana.id, customer_name: ana.full_name || 'Ana Legacy', customer_email: ana.email, collection_id: collectionMap['attack-on-titan-survey-corps'].id, collection_name: collectionMap['attack-on-titan-survey-corps'].name, character_name: null, production_status: 'awaiting_choice', current_stage: 'awaiting_choice', choice_status: 'pending', choice_deadline: '2026-03-14T00:00:00Z', choice_made_at: null, priority: 'high', priority_score: 75 });
  }

  if (carlos) {
    items.push({ order_id: crypto.randomUUID(), order_type: 'standalone_purchase', customer_id: carlos.id, customer_name: carlos.full_name || 'Carlos Entrada', customer_email: carlos.email, collection_id: collectionMap['one-piece-mugiwara'].id, collection_name: collectionMap['one-piece-mugiwara'].name, character_name: null, production_status: 'on_hold', current_stage: 'awaiting_choice', choice_status: 'pending', choice_deadline: '2026-03-20T00:00:00Z', choice_made_at: null, priority: 'normal', priority_score: 45, internal_flags: ['awaiting_payment'] });
  }

  if (roberto) {
    items.push({ order_id: crypto.randomUUID(), order_type: 'standalone_purchase', customer_id: roberto.id, customer_name: roberto.full_name || 'Roberto Completo', customer_email: roberto.email, collection_id: collectionMap['dragon-ball-z-warriors'].id, collection_name: collectionMap['dragon-ball-z-warriors'].name, character_name: 'Vegeta', production_status: 'in_production', current_stage: 'production', choice_status: 'approved', choice_deadline: '2026-03-10T00:00:00Z', choice_made_at: '2026-03-02T00:00:00Z', priority: 'normal', priority_score: 55 });
  }

  console.log(`📦 Criando ${items.length} itens...\n`);

  const { data, error } = await supabase.from('production_queue').insert(items).select();

  if (error) {
    console.error('❌ Erro:', error);
    return;
  }

  console.log(`✅ ${data.length} itens criados!\n`);

  const statusCounts = data.reduce((acc, item) => {
    acc[item.production_status] = (acc[item.production_status] || 0) + 1;
    return acc;
  }, {});

  console.log('📊 Resumo:');
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`   ${status}: ${count}`);
  });

  console.log('\n✅ Fila de produção populada!');
}

main().catch(console.error);
