#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://pabxpvqwtvbjaunjejud.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTgxNTg1NiwiZXhwIjoyMDg1MzkxODU2fQ.vYLGOmT_A4G-tfH87mxIk8Oc5QJRxmcGvy2JSafMGns";

console.log('🔍 Verificando hero_image_url no banco...\n');

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

try {
  // Verificar se o registro existe
  const { data: setting, error } = await supabase
    .from('system_settings')
    .select('*')
    .eq('key', 'hero_image_url')
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  if (setting) {
    console.log('✅ Registro encontrado:');
    console.log('   Key:', setting.key);
    console.log('   Value:', setting.value || '(vazio)');
    console.log('   Description:', setting.description);
    console.log('');
    
    if (!setting.value) {
      console.log('⚠️  O valor está vazio!');
      console.log('   Você precisa:');
      console.log('   1. Fazer upload da imagem no Admin');
      console.log('   2. Clicar em "Salvar Alterações"');
    } else {
      console.log('✅ URL configurada corretamente!');
      console.log('   Verifique se a view system_settings_grouped está retornando esse campo.');
    }
  } else {
    console.log('❌ Registro não encontrado!');
    console.log('   Criando registro...\n');
    
    const { error: insertError } = await supabase
      .from('system_settings')
      .insert({
        key: 'hero_image_url',
        value: '',
        description: 'URL da imagem do hero (guerreiro) na página de coleções'
      });
    
    if (insertError) {
      throw insertError;
    }
    
    console.log('✅ Registro criado!');
    console.log('   Agora faça upload da imagem no Admin e salve.');
  }

  // Verificar a view system_settings_grouped
  console.log('\n🔍 Verificando view system_settings_grouped...\n');
  
  const { data: grouped, error: groupedError } = await supabase
    .from('system_settings_grouped')
    .select('hero_image_url')
    .single();

  if (groupedError) {
    console.log('❌ Erro ao buscar da view:', groupedError.message);
    console.log('   A view pode precisar ser recriada para incluir hero_image_url');
  } else {
    console.log('✅ View retornou:');
    console.log('   hero_image_url:', grouped.hero_image_url || '(vazio)');
  }

} catch (error) {
  console.error('❌ Erro:', error.message);
}
