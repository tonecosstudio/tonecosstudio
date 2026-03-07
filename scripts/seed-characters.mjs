#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  console.log('👤 Seeding characters...\n');

  // Get collections
  const { data: collections } = await supabase
    .from('collections')
    .select('id, name, slug');

  if (!collections?.length) {
    console.error('❌ No collections found. Run seed-collections-with-type.mjs first');
    return;
  }

  const collectionMap = {};
  collections.forEach(c => {
    collectionMap[c.slug] = c;
  });

  const characters = [
    // One Piece
    { collection_slug: 'one-piece-mugiwara', name: 'Monkey D. Luffy', description: 'Capitão dos Piratas do Chapéu de Palha', release_order: 1, status: 'revealed' },
    { collection_slug: 'one-piece-mugiwara', name: 'Roronoa Zoro', description: 'Espadachim dos Três Estilos', release_order: 2, status: 'revealed' },
    { collection_slug: 'one-piece-mugiwara', name: 'Nami', description: 'Navegadora e Ladra de Gatos', release_order: 3, status: 'revealed' },
    { collection_slug: 'one-piece-mugiwara', name: 'Sanji', description: 'Cozinheiro de Perna Negra', release_order: 4, status: 'upcoming' },
    { collection_slug: 'one-piece-mugiwara', name: 'Tony Tony Chopper', description: 'Médico Rena', release_order: 5, status: 'upcoming' },
    
    // Dragon Ball Z
    { collection_slug: 'dragon-ball-z-warriors', name: 'Son Goku', description: 'Guerreiro Saiyajin, protetor da Terra', release_order: 1, status: 'revealed' },
    { collection_slug: 'dragon-ball-z-warriors', name: 'Vegeta', description: 'Príncipe dos Saiyajins', release_order: 2, status: 'revealed' },
    { collection_slug: 'dragon-ball-z-warriors', name: 'Son Gohan', description: 'Filho de Goku, meio Saiyajin', release_order: 3, status: 'revealed' },
    { collection_slug: 'dragon-ball-z-warriors', name: 'Piccolo', description: 'Namekuseijin, mentor de Gohan', release_order: 4, status: 'upcoming' },
    { collection_slug: 'dragon-ball-z-warriors', name: 'Trunks', description: 'Filho de Vegeta do futuro', release_order: 5, status: 'upcoming' },
    
    // Naruto
    { collection_slug: 'naruto-akatsuki', name: 'Itachi Uchiha', description: 'Gênio do clã Uchiha', release_order: 1, status: 'revealed' },
    { collection_slug: 'naruto-akatsuki', name: 'Pain (Nagato)', description: 'Líder da Akatsuki', release_order: 2, status: 'revealed' },
    { collection_slug: 'naruto-akatsuki', name: 'Obito Uchiha', description: 'Tobi, o mascarado', release_order: 3, status: 'revealed' },
    { collection_slug: 'naruto-akatsuki', name: 'Kisame Hoshigaki', description: 'Monstro da Névoa Oculta', release_order: 4, status: 'upcoming' },
    { collection_slug: 'naruto-akatsuki', name: 'Deidara', description: 'Artista explosivo', release_order: 5, status: 'upcoming' },
    
    // Attack on Titan
    { collection_slug: 'attack-on-titan-survey-corps', name: 'Eren Yeager', description: 'Titã de Ataque', release_order: 1, status: 'revealed' },
    { collection_slug: 'attack-on-titan-survey-corps', name: 'Mikasa Ackerman', description: 'Soldado mais forte', release_order: 2, status: 'revealed' },
    { collection_slug: 'attack-on-titan-survey-corps', name: 'Levi Ackerman', description: 'Capitão, soldado mais habilidoso', release_order: 3, status: 'revealed' },
    { collection_slug: 'attack-on-titan-survey-corps', name: 'Armin Arlert', description: 'Titã Colossal', release_order: 4, status: 'upcoming' },
    { collection_slug: 'attack-on-titan-survey-corps', name: 'Erwin Smith', description: 'Comandante do Corpo de Exploração', release_order: 5, status: 'upcoming' }
  ];

  let count = 0;
  for (const char of characters) {
    const collection = collectionMap[char.collection_slug];
    if (!collection) {
      console.warn(`⚠️ Collection not found: ${char.collection_slug}`);
      continue;
    }

    const { error } = await supabase
      .from('collection_characters')
      .insert({
        collection_id: collection.id,
        name: char.name,
        description: char.description,
        release_order: char.release_order,
        status: char.status
      });

    if (error) {
      console.error(`❌ Error creating ${char.name}:`, error.message);
    } else {
      count++;
      console.log(`✅ ${char.name} (${collection.name})`);
    }
  }

  console.log(`\n👤 Total characters created: ${count}/20\n`);
}

main().catch(console.error);
