#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://pabxpvqwtvbjaunjejud.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applySql() {
  console.log('📦 Reading SQL file...');
  const sql = readFileSync('deploy-production-management-migrations.sql', 'utf8');
  
  console.log('🚀 Applying Production Management System migrations...');
  
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
  
  if (error) {
    console.error('❌ Error applying migrations:', error);
    process.exit(1);
  }
  
  console.log('✅ Migrations applied successfully!');
  console.log(data);
}

applySql();
