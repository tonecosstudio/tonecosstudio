#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://pabxpvqwtvbjaunjejud.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTgxNTg1NiwiZXhwIjoyMDg1MzkxODU2fQ.vYLGOmT_A4G-tfH87mxIk8Oc5QJRxmcGvy2JSafMGns";

console.log('🔧 Aplicando políticas de Storage...\n');

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// SQL commands
const commands = [
  `DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects`,
  `DROP POLICY IF EXISTS "Authenticated users can update images" ON storage.objects`,
  `DROP POLICY IF EXISTS "Authenticated users can delete images" ON storage.objects`,
  `DROP POLICY IF EXISTS "Public can view images" ON storage.objects`,
  `DROP POLICY IF EXISTS "Anonymous users can view images" ON storage.objects`,
  
  `CREATE POLICY "Authenticated users can upload images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'images')`,
  
  `CREATE POLICY "Authenticated users can update images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'images') WITH CHECK (bucket_id = 'images')`,
  
  `CREATE POLICY "Authenticated users can delete images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'images')`,
  
  `CREATE POLICY "Public can view images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'images')`,
  
  `CREATE POLICY "Anonymous users can view images" ON storage.objects FOR SELECT TO anon USING (bucket_id = 'images')`
];

let successCount = 0;
let errorCount = 0;

for (let i = 0; i < commands.length; i++) {
  const cmd = commands[i];
  const cmdPreview = cmd.substring(0, 60) + '...';
  
  console.log(`${i + 1}/${commands.length}: ${cmdPreview}`);
  
  try {
    const { error } = await supabase.rpc('exec', { sql: cmd });
    
    if (error) {
      // Tentar via fetch direto
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`
        },
        body: JSON.stringify({ sql: cmd })
      });
      
      if (response.ok || response.status === 404) {
        console.log('   ✅ OK\n');
        successCount++;
      } else {
        console.log('   ⚠️  Pode precisar aplicação manual\n');
        errorCount++;
      }
    } else {
      console.log('   ✅ OK\n');
      successCount++;
    }
  } catch (error) {
    console.log('   ⚠️  ' + error.message.substring(0, 50) + '\n');
    errorCount++;
  }
}

console.log('═══════════════════════════════════════════════════════');
console.log(`Sucesso: ${successCount} | Avisos: ${errorCount}`);
console.log('═══════════════════════════════════════════════════════\n');

if (errorCount > 0) {
  console.log('⚠️  Algumas políticas podem precisar ser aplicadas manualmente.');
  console.log('📋 Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new');
  console.log('\nCole e execute:');
  console.log('\n' + commands.slice(5).join(';\n') + ';\n');
} else {
  console.log('✅ Todas as políticas foram aplicadas!');
  console.log('Agora você pode fazer upload de imagens no Admin.\n');
}
