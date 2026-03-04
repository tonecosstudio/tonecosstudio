#!/usr/bin/env node

import { readFileSync } from 'fs';
import { config } from 'dotenv';

config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY || !SUPABASE_URL) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

async function executeSQL(sql) {
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
    throw new Error(`HTTP ${response.status}: ${error}`);
  }

  return await response.json();
}

async function main() {
  console.log('📦 Reading SQL file...');
  const sql = readFileSync('deploy-production-management-migrations.sql', 'utf8');
  
  console.log('🚀 Applying Production Management System migrations...\n');
  
  try {
    const result = await executeSQL(sql);
    console.log('✅ Migrations applied successfully!');
    console.log(result);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
