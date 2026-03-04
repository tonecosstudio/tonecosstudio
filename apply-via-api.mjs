#!/usr/bin/env node

import { config } from 'dotenv';

config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🚀 Applying Production Management System cron configuration...\n');

// SQL to execute
const sql = `
-- Step 1: Add expired status
ALTER TABLE character_choices DROP CONSTRAINT IF EXISTS character_choices_status_check;
ALTER TABLE character_choices ADD CONSTRAINT character_choices_status_check 
  CHECK (status IN ('pending', 'submitted', 'approved', 'rejected', 'locked', 'expired'));

-- Step 2: Unschedule existing jobs
SELECT cron.unschedule('send-character-choice-reminders');
SELECT cron.unschedule('expire-character-choices');

-- Step 3: Schedule reminders job
SELECT cron.schedule(
  'send-character-choice-reminders',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url:='https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/cron-send-character-choice-reminders',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4MTU4NTYsImV4cCI6MjA4NTM5MTg1Nn0.W3n9h6zoLJumHNrFwG_aBB_AI6CjBt4LAP5a9alXZm4"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);

-- Step 4: Schedule expiration job
SELECT cron.schedule(
  'expire-character-choices',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url:='https://pabxpvqwtvbjaunjejud.supabase.co/functions/v1/cron-expire-character-choices',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4MTU4NTYsImV4cCI6MjA4NTM5MTg1Nn0.W3n9h6zoLJumHNrFwG_aBB_AI6CjBt4LAP5a9alXZm4"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);
`;

try {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
    },
    body: JSON.stringify({ query: sql })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('❌ Error:', error);
    process.exit(1);
  }

  console.log('✅ Production Management System deployed successfully!\n');
  console.log('📋 Summary:');
  console.log('   • Reminders job: Runs daily at 09:00 (Bahia time)');
  console.log('   • Expiration job: Runs every hour');
  console.log('   • Character choices: "expired" status added\n');

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
