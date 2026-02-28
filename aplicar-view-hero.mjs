#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = "https://pabxpvqwtvbjaunjejud.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTgxNTg1NiwiZXhwIjoyMDg1MzkxODU2fQ.vYLGOmT_A4G-tfH87mxIk8Oc5QJRxmcGvy2JSafMGns";

console.log('🔧 Atualizando view system_settings_grouped...\n');

const sql = readFileSync('supabase/migrations/20260228000004_add_hero_image_to_view.sql', 'utf-8');

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

try {
  // Executar SQL
  const { error } = await supabase.rpc('exec', { sql });
  
  if (error) {
    console.log('⚠️  Método RPC falhou, tentando alternativo...\n');
  }
  
  // Verificar se funcionou
  const { data, error: checkError } = await supabase
    .from('system_settings_grouped')
    .select('hero_image_url')
    .single();
  
  if (!checkError) {
    console.log('✅ View atualizada com sucesso!');
    console.log('   hero_image_url:', data.hero_image_url || '(vazio)');
    console.log('');
    console.log('Agora:');
    console.log('1. Faça upload da imagem no Admin');
    console.log('2. Clique em "Salvar Alterações"');
    console.log('3. Recarregue /colecoes');
  } else {
    throw new Error('View não foi atualizada: ' + checkError.message);
  }
  
} catch (error) {
  console.error('❌ Erro:', error.message);
  console.log('\n📋 Aplique manualmente no SQL Editor:');
  console.log('https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new\n');
  console.log(sql);
  process.exit(1);
}
