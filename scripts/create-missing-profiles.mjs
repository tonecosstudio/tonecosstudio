#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pabxpvqwtvbjaunjejud.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTgxNTg1NiwiZXhwIjoyMDg1MzkxODU2fQ.vYLGOmT_A4G-tfH87mxIk8Oc5QJRxmcGvy2JSafMGns';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('🔧 Criando profiles faltantes...');
console.log('');

const missingUserIds = [
  '09cb0960-3c21-4277-9700-a48705d386d2',
  'a02ef55c-6dbf-4d9b-b2b6-a331c8cb7237',
  'b181ea3f-1488-4132-8db9-2222b8337b06',
  '1dde62e3-df0a-45cf-b9ab-cd14905f22c8'
];

async function createProfiles() {
  try {
    let successCount = 0;
    let errorCount = 0;

    for (const userId of missingUserIds) {
      console.log(`⚙️ Criando profile para ${userId}...`);
      
      const sql = `
        INSERT INTO profiles (id, created_at, updated_at)
        VALUES ('${userId}', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
      `;
      
      const { error } = await supabase.rpc('exec_sql', { query: sql });
      
      if (error) {
        console.error(`❌ Erro: ${error.message}`);
        errorCount++;
      } else {
        console.log(`✅ Profile criado`);
        successCount++;
      }
    }

    console.log('');
    console.log('=====================================');
    console.log('RESULTADO:');
    console.log('=====================================');
    console.log(`✅ Profiles criados: ${successCount}`);
    console.log(`❌ Erros: ${errorCount}`);
    console.log('');
    
    if (successCount > 0) {
      console.log('🎉 Profiles criados com sucesso!');
      console.log('');
      console.log('👉 Recarregue o dashboard admin (Ctrl+Shift+R)');
      console.log('👉 O erro 406 deve desaparecer');
    }

  } catch (err) {
    console.error('❌ Erro inesperado:', err.message);
  }
}

createProfiles();
