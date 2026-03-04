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

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

console.log('🚀 Applying Production Management System cron configuration...\n');

// Step 1: Add expired status to character_choices
console.log('1️⃣ Adding "expired" status to character_choices...');
const { error: error1 } = await supabase.rpc('exec_sql', {
  query: `
    ALTER TABLE character_choices DROP CONSTRAINT IF EXISTS character_choices_status_check;
    ALTER TABLE character_choices ADD CONSTRAINT character_choices_status_check 
      CHECK (status IN ('pending', 'submitted', 'approved', 'rejected', 'locked', 'expired'));
  `
});

if (error1) {
  console.log('   ❌ Error:', error1.message);
} else {
  console.log('   ✅ Added "expired" status');
}

// Step 2: Schedule reminders job
console.log('\n2️⃣ Scheduling character choice reminders job...');
const { error: error2 } = await supabase.rpc('exec_sql', {
  query: `
    SELECT cron.unschedule('send-character-choice-reminders');
    SELECT cron.schedule(
      'send-character-choice-reminders',
      '0 9 * * *',
      $$
      SELECT net.http_post(
        url:='${SUPABASE_URL}/functions/v1/cron-send-character-choice-reminders',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer ${process.env.VITE_SUPABASE_PUBLISHABLE_KEY}"}'::jsonb,
        body:='{}'::jsonb
      ) as request_id;
      $$
    );
  `
});

if (error2) {
  console.log('   ❌ Error:', error2.message);
} else {
  console.log('   ✅ Scheduled reminders job (daily at 09:00)');
}

// Step 3: Schedule expiration job
console.log('\n3️⃣ Scheduling character choice expiration job...');
const { error: error3 } = await supabase.rpc('exec_sql', {
  query: `
    SELECT cron.unschedule('expire-character-choices');
    SELECT cron.schedule(
      'expire-character-choices',
      '0 * * * *',
      $$
      SELECT net.http_post(
        url:='${SUPABASE_URL}/functions/v1/cron-expire-character-choices',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer ${process.env.VITE_SUPABASE_PUBLISHABLE_KEY}"}'::jsonb,
        body:='{}'::jsonb
      ) as request_id;
      $$
    );
  `
});

if (error3) {
  console.log('   ❌ Error:', error3.message);
} else {
  console.log('   ✅ Scheduled expiration job (hourly)');
}

console.log('\n✅ Configuration completed!\n');
