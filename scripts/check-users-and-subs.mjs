#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  console.log('🔍 Verificando usuários e assinaturas...\n');

  // Check auth.users
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
  
  console.log(`👥 Usuários em auth.users: ${authUsers?.users?.length || 0}`);
  if (authUsers?.users?.length) {
    authUsers.users.forEach(u => {
      console.log(`  • ${u.email} (${u.id})`);
    });
  }
  console.log('');

  // Check profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*');
  
  console.log(`👤 Profiles: ${profiles?.length || 0}`);
  if (profiles?.length) {
    profiles.forEach(p => {
      console.log(`  • ${p.email} - ${p.full_name}`);
    });
  }
  console.log('');

  // Check subscriptions
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('*');
  
  console.log(`📋 Assinaturas: ${subs?.length || 0}`);
  if (subs?.length) {
    subs.forEach(s => {
      console.log(`  • User: ${s.user_id}, Plan: ${s.plan_type}, Status: ${s.status}`);
    });
  }
  console.log('');

  // Check subscription_plans
  const { data: plans } = await supabase
    .from('subscription_plans')
    .select('*');
  
  console.log(`📦 Planos disponíveis: ${plans?.length || 0}`);
  if (plans?.length) {
    plans.forEach(p => {
      console.log(`  • ${p.plan_type}: ${p.name}`);
    });
  }
}

main().catch(console.error);
