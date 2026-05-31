-- Normalizes public metadata for the ThunderCats collection characters.

WITH thundercats AS (
  SELECT id
    FROM public.collections
   WHERE slug = 'thundercats'
   LIMIT 1
),
character_metadata AS (
  SELECT *
    FROM (
      VALUES
        (
          'Cheetara',
          'Cheetara',
          'Agil como o vento e leal aos ThunderCats, Cheetara representa velocidade, coragem e precisao em combate.',
          'Herois ThunderCats',
          'Guerreira velocista',
          1,
          1
        ),
        (
          'Lion-O',
          'Lion-O',
          'O lider dos ThunderCats empunha a Espada Justiceira e carrega o simbolo da esperanca de Thundera.',
          'Herois ThunderCats',
          'Lider da equipe',
          2,
          2
        ),
        (
          'Mumm-Ra - Forma Poderosa',
          'Mumm-Ra - Forma Poderosa',
          'A forma poderosa de Mumm-Ra traz o antigo feiticeiro em sua versao mais ameacadora e imponente.',
          'Viloes ThunderCats',
          'Forma poderosa',
          3,
          3
        ),
        (
          'Mumm-Ra - Mumificado',
          'Mumm-Ra - Forma Mumificada',
          'A versao mumificada mostra Mumm-Ra em seu estado ancestral, sombrio e ligado aos espiritos antigos.',
          'Viloes ThunderCats',
          'Forma mumificada',
          4,
          4
        ),
        (
          'Panthro',
          'Panthro',
          'Estrategista e engenheiro da equipe, Panthro combina forca fisica, tecnica e experiencia de batalha.',
          'Herois ThunderCats',
          'Guerreiro estrategista',
          5,
          5
        ),
        (
          'Snarf',
          'Snarf',
          'Companheiro fiel de Lion-O, Snarf adiciona carisma, lealdade e memoria afetiva a colecao.',
          'Aliados ThunderCats',
          'Companheiro classico',
          6,
          6
        ),
        (
          'Tygra',
          'Tygra',
          'Tygra une inteligencia, disciplina e ilusao em uma peca voltada ao lado estrategico dos ThunderCats.',
          'Herois ThunderCats',
          'Arquiteto e guerreiro',
          7,
          7
        ),
        (
          'WilyKit & WilyKat',
          'WilyKit & WilyKat',
          'A dupla jovem dos ThunderCats representa energia, aventura e o espirito explorador da equipe.',
          'Herois ThunderCats',
          'Dupla aventureira',
          8,
          8
        )
    ) AS metadata(
      current_name,
      canonical_name,
      description,
      product_line,
      theme_category,
      release_order,
      display_order
    )
)
UPDATE public.collection_characters AS cc
   SET name = metadata.canonical_name,
       description = metadata.description,
       franchise = 'ThunderCats',
       product_line = metadata.product_line,
       theme_category = metadata.theme_category,
       release_order = metadata.release_order,
       display_order = metadata.display_order,
       stock_quantity = 0,
       image_urls = CASE
         WHEN cc.image_url IS NOT NULL
           THEN ARRAY[cc.image_url]
         ELSE cc.image_urls
       END,
       updated_at = now()
  FROM thundercats, character_metadata AS metadata
 WHERE cc.collection_id = thundercats.id
   AND cc.name = metadata.current_name;

UPDATE public.collections
   SET name = 'ThunderCats',
       total_characters = 8,
       updated_at = now()
 WHERE slug = 'thundercats';

NOTIFY pgrst, 'reload schema';
