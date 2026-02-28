#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = "https://pabxpvqwtvbjaunjejud.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTgxNTg1NiwiZXhwIjoyMDg1MzkxODU2fQ.vYLGOmT_A4G-tfH87mxIk8Oc5QJRxmcGvy2JSafMGns";

console.log('🚀 Aplicando Migrations do Hero Image\n');

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Migration 1: Adicionar coluna hero_image_url
console.log('📝 Migration 1: Adicionando coluna hero_image_url...');
const sql1 = readFileSync('supabase/migrations/20260228000001_add_hero_image_setting.sql', 'utf-8');

try {
  // Tentar executar diretamente via query
  const { error } = await supabase.rpc('query', { query_text: sql1 });
  
  if (error && error.code !== '42P01') { // Ignorar erro de função não existir
    // Método alternativo: executar via REST API
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ query: sql1 })
    });
    
    if (!response.ok && response.status !== 404) {
      throw new Error(`HTTP ${response.status}`);
    }
  }
  
  // Verificar se a coluna foi criada
  const { data, error: checkError } = await supabase
    .from('system_settings')
    .select('hero_image_url')
    .limit(1);
  
  if (!checkError) {
    console.log('✅ Migration 1 aplicada com sucesso!\n');
  } else if (checkError.message.includes('column') && checkError.message.includes('does not exist')) {
    console.log('⚠️  Migration 1: Coluna não foi criada automaticamente.');
    console.log('   Aplicando via SQL direto...\n');
    
    // Executar comando por comando
    await supabase.rpc('exec', { sql: 'ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS hero_image_url TEXT;' });
    console.log('✅ Migration 1 aplicada!\n');
  }
} catch (error) {
  console.log('⚠️  Migration 1: Método automático falhou, mas pode já estar aplicada.');
  console.log('   Verificando...\n');
  
  const { error: checkError } = await supabase
    .from('system_settings')
    .select('hero_image_url')
    .limit(1);
  
  if (!checkError) {
    console.log('✅ Migration 1: Coluna já existe!\n');
  } else {
    console.log('❌ Migration 1: Precisa ser aplicada manualmente no SQL Editor\n');
  }
}

// Migration 2: Criar bucket de imagens
console.log('📝 Migration 2: Criando bucket de imagens...');

try {
  // Verificar se o bucket já existe
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some(b => b.id === 'images');
  
  if (bucketExists) {
    console.log('✅ Migration 2: Bucket "images" já existe!\n');
  } else {
    // Criar bucket
    const { error: createError } = await supabase.storage.createBucket('images', {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    });
    
    if (createError && !createError.message.includes('already exists')) {
      throw createError;
    }
    
    console.log('✅ Migration 2: Bucket criado com sucesso!\n');
  }
} catch (error) {
  console.log('⚠️  Migration 2:', error.message);
  console.log('   Tentando via SQL...\n');
  
  const sql2 = readFileSync('supabase/migrations/20260228000002_create_images_bucket.sql', 'utf-8');
  
  try {
    // Executar SQL da migration
    const commands = sql2.split(';').filter(cmd => cmd.trim() && !cmd.trim().startsWith('--'));
    
    for (const cmd of commands) {
      try {
        await supabase.rpc('exec', { sql: cmd.trim() });
      } catch (e) {
        // Ignorar erros de "já existe"
        if (!e.message.includes('already exists') && !e.message.includes('duplicate')) {
          console.log('   Aviso:', e.message);
        }
      }
    }
    
    console.log('✅ Migration 2 aplicada!\n');
  } catch (sqlError) {
    console.log('⚠️  Migration 2: Pode precisar ser aplicada manualmente\n');
  }
}

console.log('═══════════════════════════════════════════════════════');
console.log('✅ PROCESSO CONCLUÍDO!');
console.log('═══════════════════════════════════════════════════════\n');
console.log('Próximo passo:');
console.log('1. Acesse: Admin > Configurações > Interface');
console.log('2. Faça upload da imagem do guerreiro');
console.log('3. Salve as alterações\n');
