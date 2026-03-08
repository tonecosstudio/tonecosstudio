#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const { data: collections, error } = await supabase
    .from('collections')
    .select('id, name, slug, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }

  console.log(`\n📚 Total de coleções: ${collections?.length || 0}\n`);
  
  if (collections && collections.length > 0) {
    collections.forEach(c => {
      console.log(`ID: ${c.id}`);
      console.log(`Nome: ${c.name}`);
      console.log(`Slug: ${c.slug}`);
      console.log(`Criado em: ${c.created_at}`);
      console.log('');
    });
  } else {
    console.log('⚠️  Nenhuma coleção encontrada no banco');
  }
}

main();
