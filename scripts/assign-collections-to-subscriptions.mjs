#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  console.log('🔗 Assigning collections to subscriptions...\n');

  // Get collections
  const { data: collections } = await supabase
    .from('collections')
    .select('id, name, slug');

  if (!collections?.length) {
    console.error('❌ No collections found');
    return;
  }

  const collectionMap = {};
  collections.forEach(c => {
    collectionMap[c.slug] = c;
  });

  // Get subscriptions with user emails
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('id, user_id, profiles(email)');

  if (!subscriptions?.length) {
    console.error('❌ No subscriptions found');
    return;
  }

  const assignments = [
    { email: 'trimestral@ordax.com.br', collection_slug: 'one-piece-mugiwara' },
    { email: 'semestral@ordax.com.br', collection_slug: 'dragon-ball-z-warriors' },
    { email: 'anual@ordax.com.br', collection_slug: 'naruto-akatsuki' },
    { email: 'legacy@ordax.com.br', collection_slug: 'attack-on-titan-survey-corps' }
  ];

  let count = 0;
  for (const assignment of assignments) {
    const subscription = subscriptions.find(s => s.profiles?.email === assignment.email);
    const collection = collectionMap[assignment.collection_slug];

    if (!subscription) {
      console.warn(`⚠️ Subscription not found for ${assignment.email}`);
      continue;
    }

    if (!collection) {
      console.warn(`⚠️ Collection not found: ${assignment.collection_slug}`);
      continue;
    }

    const { error } = await supabase
      .from('subscriptions')
      .update({ active_collection_id: collection.id })
      .eq('id', subscription.id);

    if (error) {
      console.error(`❌ Error assigning ${collection.name} to ${assignment.email}:`, error.message);
    } else {
      count++;
      console.log(`✅ ${assignment.email} → ${collection.name}`);
    }
  }

  console.log(`\n🔗 Total assignments: ${count}/4\n`);
}

main().catch(console.error);
