#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  console.log('🌱 Seeding collections with type...\n');

  // First, check if collection_types exist
  const { data: types } = await supabase
    .from('collection_types')
    .select('*');

  console.log(`📋 Collection types found: ${types?.length || 0}`);

  let typeId;
  if (!types || types.length === 0) {
    // Create a default type
    console.log('Creating default collection type...');
    const { data: newType, error: typeError } = await supabase
      .from('collection_types')
      .insert({
        name: 'Standard',
        description: 'Coleção padrão',
        base_price_coins: 500
      })
      .select()
      .single();

    if (typeError) {
      console.error('❌ Erro ao criar tipo:', typeError);
      return;
    }

    typeId = newType.id;
    console.log(`✅ Tipo criado: ${typeId}\n`);
  } else {
    typeId = types[0].id;
    console.log(`✅ Usando tipo existente: ${typeId}\n`);
  }

  // Insert collections
  const collections = [
    {
      name: 'One Piece - Tripulação Mugiwara',
      slug: 'one-piece-mugiwara',
      description: 'Coleção dos piratas do Chapéu de Palha, liderados por Monkey D. Luffy em sua jornada para se tornar o Rei dos Piratas.',
      image_url: '/images/collections/one-piece-mugiwara.jpg',
      is_active: true,
      display_order: 1,
      collection_type_id: typeId
    },
    {
      name: 'Dragon Ball Z - Guerreiros Z',
      slug: 'dragon-ball-z-warriors',
      description: 'Coleção dos poderosos guerreiros que protegem a Terra das ameaças mais perigosas do universo.',
      image_url: '/images/collections/dragon-ball-z-warriors.jpg',
      is_active: true,
      display_order: 2,
      collection_type_id: typeId
    },
    {
      name: 'Naruto - Akatsuki',
      slug: 'naruto-akatsuki',
      description: 'Coleção da organização criminosa mais temida do mundo ninja, formada por ninjas renegados de poder extraordinário.',
      image_url: '/images/collections/naruto-akatsuki.jpg',
      is_active: true,
      display_order: 3,
      collection_type_id: typeId
    },
    {
      name: 'Attack on Titan - Survey Corps',
      slug: 'attack-on-titan-survey-corps',
      description: 'Coleção dos bravos soldados do Corpo de Exploração que arriscam suas vidas para proteger a humanidade dos Titãs.',
      image_url: '/images/collections/attack-on-titan-survey-corps.jpg',
      is_active: true,
      display_order: 4,
      collection_type_id: typeId
    }
  ];

  for (const collection of collections) {
    const { data, error } = await supabase
      .from('collections')
      .upsert(collection, { onConflict: 'slug' })
      .select();

    if (error) {
      console.error(`❌ Erro ao criar ${collection.name}:`, error.message);
    } else {
      console.log(`✅ ${collection.name}`);
    }
  }

  // Verify
  const { data: allCollections } = await supabase
    .from('collections')
    .select('*');

  console.log(`\n📦 Total de coleções: ${allCollections?.length || 0}\n`);

  if (allCollections?.length) {
    allCollections.forEach(c => {
      console.log(`  • ${c.name} (${c.slug})`);
    });
  }
}

main().catch(console.error);
