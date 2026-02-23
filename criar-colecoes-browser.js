// Execute este script no Console do navegador (F12)
// Certifique-se de estar logado como admin

(async function() {
  const supabaseUrl = 'https://pabxpvqwtvbjaunjejud.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhYnhwdnF3dHZiamF1bmplanVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4MTU4NTYsImV4cCI6MjA4NTM5MTg1Nn0.W3n9h6zoLJumHNrFwG_aBB_AI6CjBt4LAP5a9alXZm4';
  
  // Pegar o token da sessão atual
  const session = JSON.parse(localStorage.getItem('sb-pabxpvqwtvbjaunjejud-auth-token'));
  
  if (!session || !session.access_token) {
    console.error('❌ Você não está logado. Faça login primeiro.');
    return;
  }
  
  console.log('✓ Sessão encontrada');
  
  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
  
  const colecoes = [
    {
      name: 'Batman - 6 Personagens',
      slug: 'batman-6',
      description: 'Coleção teste com 6 personagens do universo Batman',
      is_active: true,
      personagens: [
        { name: 'Batman', description: 'O Cavaleiro das Trevas', release_order: 1, status: 'released' },
        { name: 'Robin', description: 'O Menino Prodígio', release_order: 2, status: 'released' },
        { name: 'Batgirl', description: 'A Heroína de Gotham', release_order: 3, status: 'revealed' },
        { name: 'Coringa', description: 'O Palhaço do Crime', release_order: 4, status: 'upcoming' },
        { name: 'Mulher-Gato', description: 'A Ladra de Gotham', release_order: 5, status: 'upcoming' },
        { name: 'Pinguim', description: 'O Cavalheiro do Crime', release_order: 6, status: 'upcoming' }
      ]
    },
    {
      name: 'Star Wars - 12 Personagens',
      slug: 'star-wars-12',
      description: 'Coleção teste com 12 personagens do universo Star Wars',
      is_active: true,
      personagens: [
        { name: 'Luke Skywalker', description: 'O último Jedi', release_order: 1, status: 'released' },
        { name: 'Leia Organa', description: 'Princesa de Alderaan', release_order: 2, status: 'released' },
        { name: 'Han Solo', description: 'O contrabandista', release_order: 3, status: 'released' },
        { name: 'Darth Vader', description: 'O Lorde Sith', release_order: 4, status: 'revealed' },
        { name: 'Yoda', description: 'Mestre Jedi', release_order: 5, status: 'upcoming' },
        { name: 'Obi-Wan Kenobi', description: 'Mestre Jedi', release_order: 6, status: 'upcoming' },
        { name: 'Chewbacca', description: 'O Wookiee', release_order: 7, status: 'upcoming' },
        { name: 'R2-D2', description: 'Droide astromecânico', release_order: 8, status: 'upcoming' },
        { name: 'C-3PO', description: 'Droide de protocolo', release_order: 9, status: 'upcoming' },
        { name: 'Boba Fett', description: 'Caçador de recompensas', release_order: 10, status: 'upcoming' },
        { name: 'Stormtrooper', description: 'Soldado Imperial', release_order: 11, status: 'upcoming' },
        { name: 'Imperador Palpatine', description: 'Lorde Sith', release_order: 12, status: 'upcoming' }
      ]
    },
    {
      name: 'Marvel Heroes - 12 Personagens',
      slug: 'marvel-heroes-12',
      description: 'Coleção teste com 12 personagens da Marvel',
      is_active: true,
      personagens: [
        { name: 'Homem de Ferro', description: 'Tony Stark', release_order: 1, status: 'released' },
        { name: 'Capitão América', description: 'Steve Rogers', release_order: 2, status: 'released' },
        { name: 'Thor', description: 'Deus do Trovão', release_order: 3, status: 'revealed' },
        { name: 'Hulk', description: 'Bruce Banner', release_order: 4, status: 'upcoming' },
        { name: 'Viúva Negra', description: 'Natasha Romanoff', release_order: 5, status: 'upcoming' },
        { name: 'Gavião Arqueiro', description: 'Clint Barton', release_order: 6, status: 'upcoming' },
        { name: 'Homem-Aranha', description: 'Peter Parker', release_order: 7, status: 'upcoming' },
        { name: 'Pantera Negra', description: 'T\'Challa', release_order: 8, status: 'upcoming' },
        { name: 'Doutor Estranho', description: 'Stephen Strange', release_order: 9, status: 'upcoming' },
        { name: 'Feiticeira Escarlate', description: 'Wanda Maximoff', release_order: 10, status: 'upcoming' },
        { name: 'Visão', description: 'Androide sintético', release_order: 11, status: 'upcoming' },
        { name: 'Falcão', description: 'Sam Wilson', release_order: 12, status: 'upcoming' }
      ]
    }
  ];
  
  console.log('\n=== CRIANDO COLEÇÕES DE TESTE ===\n');
  
  for (const colecao of colecoes) {
    console.log(`\n📦 ${colecao.name}...`);
    
    // Verificar se já existe
    const checkResponse = await fetch(
      `${supabaseUrl}/rest/v1/collections?slug=eq.${colecao.slug}&select=id`,
      { headers }
    );
    const existing = await checkResponse.json();
    
    let collectionId;
    
    if (existing.length > 0) {
      console.log(`  ✓ Coleção já existe (ID: ${existing[0].id})`);
      collectionId = existing[0].id;
    } else {
      // Criar coleção
      const createResponse = await fetch(
        `${supabaseUrl}/rest/v1/collections`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: colecao.name,
            slug: colecao.slug,
            description: colecao.description,
            is_active: colecao.is_active
          })
        }
      );
      
      if (!createResponse.ok) {
        const error = await createResponse.json();
        console.error(`  ✗ Erro ao criar coleção:`, error);
        continue;
      }
      
      const created = await createResponse.json();
      collectionId = created[0].id;
      console.log(`  ✓ Coleção criada (ID: ${collectionId})`);
    }
    
    // Criar personagens
    console.log(`  Criando ${colecao.personagens.length} personagens...`);
    
    for (const char of colecao.personagens) {
      // Verificar se já existe
      const checkCharResponse = await fetch(
        `${supabaseUrl}/rest/v1/collection_characters?collection_id=eq.${collectionId}&name=eq.${encodeURIComponent(char.name)}&select=id`,
        { headers }
      );
      const existingChar = await checkCharResponse.json();
      
      if (existingChar.length > 0) {
        console.log(`    ✓ ${char.name} já existe`);
        continue;
      }
      
      // Criar personagem
      const createCharResponse = await fetch(
        `${supabaseUrl}/rest/v1/collection_characters`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            collection_id: collectionId,
            name: char.name,
            description: char.description,
            release_order: char.release_order,
            status: char.status
          })
        }
      );
      
      if (!createCharResponse.ok) {
        const error = await createCharResponse.json();
        console.error(`    ✗ Erro ao criar ${char.name}:`, error);
      } else {
        console.log(`    ✓ ${char.name} criado`);
      }
    }
  }
  
  console.log('\n\n=== ✅ CONCLUÍDO! ===\n');
  console.log('Teste as páginas:\n');
  console.log('🔗 http://localhost:5173/colecoes/batman-6');
  console.log('🔗 http://localhost:5173/colecoes/star-wars-12');
  console.log('🔗 http://localhost:5173/colecoes/marvel-heroes-12');
  console.log('\n');
})();
