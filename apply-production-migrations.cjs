const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const migrations = [
  '20260428000000_create_production_queue.sql',
  '20260428000001_create_character_choices.sql',
  '20260428000002_create_production_stages.sql',
  '20260428000003_create_production_views.sql',
  '20260428000004_create_production_functions.sql'
];

async function applyMigrations() {
  console.log('Starting production migrations...\n');
  
  for (const migration of migrations) {
    const migrationPath = path.join('supabase', 'migrations', migration);
    console.log(`Applying ${migration}...`);
    
    try {
      const sql = fs.readFileSync(migrationPath, 'utf8');
      
      const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(async () => {
        // If exec_sql doesn't exist, try direct query
        return await supabase.from('_').select('*').limit(0).then(() => {
          // Use the REST API to execute SQL
          return fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`
            },
            body: JSON.stringify({ sql_query: sql })
          }).then(r => r.json());
        });
      });
      
      if (error) {
        console.error(`❌ Error applying ${migration}:`, error.message);
        console.error('Details:', error);
        process.exit(1);
      }
      
      console.log(`✅ Successfully applied ${migration}\n`);
    } catch (err) {
      console.error(`❌ Error reading or applying ${migration}:`, err.message);
      process.exit(1);
    }
  }
  
  console.log('✅ All production migrations applied successfully!');
}

applyMigrations();
