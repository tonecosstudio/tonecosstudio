#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY || !SUPABASE_URL) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function verifyCronConfiguration() {
  console.log('🔍 Verifying Production Management System configuration...\n');

  // Check cron jobs
  console.log('1️⃣ Checking cron jobs...');
  const { data: jobs, error: jobsError } = await supabase
    .from('cron.job')
    .select('jobname, schedule, active, command')
    .in('jobname', ['send-character-choice-reminders', 'expire-character-choices']);

  if (jobsError) {
    console.log('   ⚠️  Could not query cron jobs (pg_cron may not be accessible via RPC)');
  } else if (jobs && jobs.length > 0) {
    jobs.forEach(job => {
      console.log(`   ✅ ${job.jobname}`);
      console.log(`      Schedule: ${job.schedule}`);
      console.log(`      Active: ${job.active}`);
    });
  } else {
    console.log('   ⚠️  No cron jobs found');
  }

  // Check character_choices table
  console.log('\n2️⃣ Checking character_choices table...');
  const { data: tables, error: tablesError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_name', 'character_choices');

  if (tablesError) {
    console.log('   ❌ Error checking table:', tablesError.message);
  } else if (tables && tables.length > 0) {
    console.log('   ✅ character_choices table exists');
  } else {
    console.log('   ❌ character_choices table not found');
  }

  // Check production_queue table
  console.log('\n3️⃣ Checking production_queue table...');
  const { data: pqTables, error: pqError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_name', 'production_queue');

  if (pqError) {
    console.log('   ❌ Error checking table:', pqError.message);
  } else if (pqTables && pqTables.length > 0) {
    console.log('   ✅ production_queue table exists');
  } else {
    console.log('   ❌ production_queue table not found');
  }

  // Check Edge Functions
  console.log('\n4️⃣ Checking Edge Functions...');
  console.log('   ℹ️  Edge Functions must be verified via Supabase Dashboard');
  console.log('   📍 https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/functions');

  console.log('\n✅ Verification complete!\n');
}

verifyCronConfiguration().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});
