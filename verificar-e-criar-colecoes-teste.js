import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pabxpvqwtvbjaunjejud.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4MTU4NTYsImV4cCI6MjA4NTM5MTg1Nn0.W3n9h6zoLJumHNrFwG_aBB_AI6CjBt4LAP5a9alXZm4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verificarColecoes() {
  console.log('\n=== VERIFICANDO COLEÇÕES EXISTENTES ===\n');
  
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Erro ao buscar coleções:', error);
    return;
  }
  
  console.log(`Total de coleções: ${data.length}\n`);
  data.forEach(col => {
    console.log(`- ${col.name} (slug: ${col.slug}, ativa: ${col.is_active})`);
  });
}

async function criarColecoesTeste() {
  console.log('\n=== CRIANDO COLEÇÕES DE TESTE ===\n');
  
  const colecoes = [
    {
      name: 'Batman - 6 Personagens',
      slug: 'batman-6',
      description: 'Coleção teste com 6 personagens do universo Batman',
      is_active: true
    },
    {
      name: 'Star Wars - 12 Personagens',
      slug: 'star-wars-12',
      description: 'Coleção teste com 12 personagens do universo Star Wars',
      is_active: true
    },
    {
      name: 'Marvel Heroes - 12 Personagens',
      slug: 'marvel-heroes-12',
      description: 'Coleção teste com 12 personagens da Marvel',
      is_active: true
    }
  ];
  
  for (const colecao of colecoes) {
    // Verificar se já existe
    const { data: existing } = await supabase
      .from('collections')
      .select('id')
      .eq('slug', colecao.slug)
      .maybeSingle();
    
    if (existing) {
      console.log(`✓ Coleção "${colecao.name}" já existe (slug: ${colecao.slug})`);
      continue;
    }
    
    // Criar nova coleção
    const { data, error } = await supabase
      .from('collections')
      .insert(colecao)
      .select()
      .single();
    
    if (error) {
      console.error(`✗ Erro ao criar "${colecao.name}":`, error.message);
    } else {
      console.log(`✓ Coleção "${colecao.name}" criada com sucesso (ID: ${data.id})`);
    }
  }
}

async function criarPersonagensTeste() {
  console.log('\n=== CRIANDO PERSONAGENS DE TESTE ===\n');
  
  // Buscar IDs das coleções
  const { data: collections } = await supabase
    .from('collections')
    .select('id, slug, name')
    .in('slug', ['batman-6', 'star-wars-12', 'marvel-heroes-12']);
  
  if (!collections || collections.length === 0) {
    console.log('Nenhuma coleção de teste encontrada. Execute criarColecoesTeste() primeiro.');
    return;
  }
  
  const personagens = {
    'batman-6': [
      { name: 'Batman', release_order: 1, status: 'released' },
      { name: 'Robin', release_order: 2, status: 'released' },
      { name: 'Batgirl', release_order: 3, status: 'revealed' },
      { name: 'Coringa', release_order: 4, status: 'upcoming' },
      { name: 'Mulher-Gato', release_order: 5, status: 'upcoming' },
      { name: 'Pinguim', release_order: 6, status: 'upcoming' }
    ],
    'star-wars-12': [
      { name: 'Luke Skywalker', release_order: 1, status: 'released' },
      { name: 'Leia Organa', release_order: 2, status: 'released' },
      { name: 'Han Solo', release_order: 3, status: 'released' },
      { name: 'Darth Vader', release_order: 4, status: 'revealed' },
      { name: 'Yoda', release_order: 5, status: 'upcoming' },
      { name: 'Obi-Wan Kenobi', release_order: 6, status: 'upcoming' },
      { name: 'Chewbacca', release_order: 7, status: 'upcoming' },
      { name: 'R2-D2', release_order: 8, status: 'upcoming' },
      { name: 'C-3PO', release_order: 9, status: 'upcoming' },
      { name: 'Boba Fett', release_order: 10, status: 'upcoming' },
      { name: 'Stormtrooper', release_order: 11, status: 'upcoming' },
      { name: 'Imperador Palpatine', release_order: 12, status: 'upcoming' }
    ],
    'marvel-heroes-12': [
      { name: 'Homem de Ferro', release_order: 1, status: 'released' },
      { name: 'Capitão América', release_order: 2, status: 'released' },
      { name: 'Thor', release_order: 3, status: 'revealed' },
      { name: 'Hulk', release_order: 4, status: 'upcoming' },
      { name: 'Viúva Negra', release_order: 5, status: 'upcoming' },
      { name: 'Gavião Arqueiro', release_order: 6, status: 'upcoming' },
      { name: 'Homem-Aranha', release_order: 7, status: 'upcoming' },
      { name: 'Pantera Negra', release_order: 8, status: 'upcoming' },
      { name: 'Doutor Estranho', release_order: 9, status: 'upcoming' },
      { name: 'Feiticeira Escarlate', release_order: 10, status: 'upcoming' },
      { name: 'Visão', release_order: 11, status: 'upcoming' },
      { name: 'Falcão', release_order: 12, status: 'upcoming' }
    ]
  };
  
  for (const collection of collections) {
    const chars = personagens[collection.slug];
    if (!chars) continue;
    
    console.log(`\nProcessando ${collection.name}...`);
    
    for (const char of chars) {
      const { data: existing } = await supabase
        .from('collection_characters')
        .select('id')
        .eq('collection_id', collection.id)
        .eq('name', char.name)
        .maybeSingle();
      
      if (existing) {
        console.log(`  ✓ ${char.name} já existe`);
        continue;
      }
      
      const { error } = await supabase
        .from('collection_characters')
        .insert({
          collection_id: collection.id,
          name: char.name,
          release_order: char.release_order,
          status: char.status,
          description: `Personagem ${char.name} da coleção ${collection.name}`
        });
      
      if (error) {
        console.log(`  ✗ Erro ao criar ${char.name}: ${error.message}`);
      } else {
        console.log(`  ✓ ${char.name} criado (ordem: ${char.release_order}, status: ${char.status})`);
      }
    }
  }
}

async function main() {
  await verificarColecoes();
  await criarColecoesTeste();
  await criarPersonagensTeste();
  
  console.log('\n=== VERIFICAÇÃO FINAL ===\n');
  await verificarColecoes();
  
  console.log('\n✅ Processo concluído!\n');
  console.log('Teste as páginas:');
  console.log('- http://localhost:5173/colecoes/batman-6');
  console.log('- http://localhost:5173/colecoes/star-wars-12');
  console.log('- http://localhost:5173/colecoes/marvel-heroes-12');
}

main().catch(console.error);
