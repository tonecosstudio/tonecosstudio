# TONART — Fichas de personagens, universos e descoberta relacionada

**Estado:** requisito de produto definido pelo proprietário em 16/11/2026; **contrato estrutural transversal preparado em 22/11/2026, publicação e integração ainda pendentes**, sem autorização implícita de deploy, indexação, alterações no Worker produtivo ou liberação comercial. Este documento é a especificação funcional de referência, **não** uma nova fonte de verdade para o catálogo.

## Objetivo e experiência do visitante

A TONART deve permitir explorar **estatuetas/renders de esculturas** a partir de personagens e dos universos de que fazem parte. A ficha de cada personagem reúne informação editorial original, revisada e verificável, seguida por modelos reais do mesmo personagem e por outros modelos do mesmo universo/franquia.

**Exemplo conceitual (dados sujeitos a revisão antes da publicação):**
- Página **Roronoa Zoro** → vínculo com **One Piece**, origem da obra, breve biografia, traços/habilidades e idade **somente com fase temporal explicitada e fonte confirmada**. Não inferir idade atual de um personagem ficcional.
- Chips navegáveis: **Anime** (categoria/meio), **One Piece** (franquia/universo), **Roronoa Zoro** (personagem), além de características aprovadas quando pertinentes.
- Seção **Mais estatuetas de Roronoa Zoro** → somente modelos diferentes que tenham **identidade de personagem confirmada**.
- Seção **Explore One Piece** → outros modelos publicados da mesma franquia, com acesso ao agrupamento completo.
- A ficha da **estatueta individual** continua independente: galeria, variante, dados do modelo e eventual orçamento/oferta legítima. Ela pode apontar para a ficha do personagem, mas a biografia não deve ser copiada para cada estatueta.
- Se houver obra do mesmo universo com vários personagens, a estatueta poderá vincular-se a **mais de um personagem**, sem escolher um arbitrariamente.

Não preencher vitrines com imagens fictícias, fotos externas não licenciadas, produtos inexistentes nem preço/estoque presumido. Renders são digitais, não peças físicas comprovadamente produzidas.

## Estado de partida e código que deve ser reutilizado

No `main` inspecionado em 16/11:
- `src/pages/catalog/CanonicalModelDetails.tsx` é a ficha pública canônica do modelo, via `src/services/catalog/public-catalog-gateway.ts`.
- `src/pages/catalog/RelatedModels.tsx` **já** exibe grupos por nome exato na franquia, coleção e franquia, com busca paginada limitada, lazy load e deduplicação. **Aprimorar/reutilizar**, não criar outro recomendador. Equivalência de nome é heurística atual, **não identidade editorial confirmada**.
- `src/pages/CatalogCharacterArcade.tsx` **redireciona** links históricos porque o Worker ainda não fornece índice público independente de personagens. Não ressuscitar consultas ao catálogo legado Supabase.
- `src/config/routes.ts` já declara `catalogUniverseCharacter` e `catalogCharacter`; a primeira rota atualmente atende navegação de catálogo. **Auditar deep links e colisões antes de definir a URL canônica**; manter redirects apenas quando houver resolução inequívoca.
- A curadoria administrativa privada incorporada na **PR #28** já tem identidades, aliases, vocabulário e tags controladas: `src/services/admin/catalog/admin-internal-collection-curation-service.ts`, `src/components/admin/collections/InternalCollectionCuration.tsx`, `supabase/migrations/20261115154500_tonart_internal_collection_curation.sql` e `20261115154600_tonart_curation_controlled_tag_creation.sql`. **Reutilizar os contratos existentes**, sem reexecutar migrations aplicadas.
- O catálogo público tem **um único owner de leitura/publicação**: Cloudflare Worker `tonecos-catalogo-api` (D1/R2); o publicador ativo do Worker segue em `washingtonmsdj/catalogo` até cutover M5 autorizado. `services/catalogo/` neste repositório é candidato offline. Nenhum frontend deve escrever diretamente no D1, buscar biografias no Supabase privativo nem publicar o Worker por conta desta especificação.

## Modelo lógico a consolidar, sem duplicação

Este quadro define *responsabilidades*, **não nomes finais de tabelas ou migrations**. Antes de criar schema, mapear campos e identidades que a curadoria e o Worker já oferecem.

| Conceito | Identidade e atributos necessários | Relações |
| --- | --- | --- |
| **Franquia/universo** | ID canônico estável, nome exibido, slug, aliases e classificação da obra quando verificada | Agrega personagens e estatuetas publicadas; reutilizar `franchise`/`franchiseSlug` existentes e reconciliar IDs |
| **Personagem** | ID estável, nome canônico, slug contextual, aliases, sinopse original curta, biografia opcional, idade contextual opcional, obra de origem, fontes/revisão e estado editorial | Vinculado a uma franquia; avaliar casos compartilhados/crossovers sem criar duplicatas |
| **Estatueta/modelo** | ID e slug já publicados pelo Worker; variante, galeria e status de mídia | Relacionar um ou muitos personagens sem alterar a identidade de cada escultura |
| **Classificações** | Vocabulário controlado de categorias/meios (anime, mangá, game, filme etc.), temas/atributos e aliases de busca | Chips e filtros derivam de vínculos confirmados, nunca de palavras soltas no título |

**Separar `mediaType`/categoria de `franchise` e de `character`**. One Piece não é um tipo de mídia; Zoro não é franquia; anime/game não é a identidade do personagem. A mesma obra pode existir em mais de um meio sem duplicar o personagem. As dimensões privadas `theme_genre`, `characteristic` e `narrative_role` não devem ser sobrescritas por tags livres.

**Identidade/aliases:** normalizar acentos, grafia e nomes alternativos apenas para descoberta; preservar nome exibido e chave estável. Homônimos entre franquias são distintos. Um vínculo não verificado não deve ser publicado como fato. Modelos não podem desaparecer do catálogo só porque ainda não possuem personagem identificado.

**Metadados editoriais:** biografia e idade são opcionais, com `source/reference`, estado `draft/reviewed/published`, revisor e data de revisão quando pertinente. Idade exige contexto de arco/temporada/versão, não apenas número. Distinguir fato da obra, adaptação, jogos derivados e interpretação. Usar escrita própria curta, sem copiar wikis; usar apenas imagens/mídias com direitos comprovados. Conteúdo ausente deve ser omitido elegantemente, sem inventar.

**Autoridade de publicação:** a curadoria privada pode organizar rascunhos e decisões editoriais com o mecanismo já existente; a leitura pública deve vir de **uma projeção publicada e versionada por owner autorizado**, exposta no catálogo/gateway canônico quando o contrato for implementado. Não manter JSON do frontend, tabela Supabase pública e índice D1 como três editores concorrentes. Determinar e documentar o owner final dos novos campos antes da migration/endpoint. Nunca permitir publicação automática de texto gerado por IA sem revisão.

## Contrato de interface e navegação

1. **Página do personagem:** nome, franquia clicável, resumo/biografia curta, dados verificados opcionais (obra de origem, meios, idade contextual, apelidos quando úteis), fontes editoriais discretas e tags navegáveis. Sem campo vazio como “idade desconhecida” repetido desnecessariamente.
2. **Recomendações por identidade:** “Mais estatuetas de {personagem}” (excluir modelo atual, IDs repetidos, itens sem mídia elegível); depois “Explore {franquia}” (excluir duplicatas e dar acesso ao agrupamento completo). Preservar layout Arcade/HUD, responsividade, foco por teclado e retorno à busca/filtros.
3. **Ficha de modelo:** adicionar vínculo claro com a ficha de personagem, quando confirmado; manter `RelatedModels` como experiência existente até a integração dos IDs editoriais. Não transformar coleção editorial privada em oferta comercial.
4. **Busca/tags:** gerar chips a partir da taxonomia/vínculos; pesquisa por “Zoro”, “Roronoa Zoro”, “One Piece” e “anime” deve recuperar entidades e modelos associados de modo coerente. Ordenar correspondência exata acima de alias e termo genérico. Evitar indexar tags não aprovadas.
5. **Estados:** carregamento, erro explícito com recuperação, personagem sem biografia, nenhum modelo elegível e link antigo/ambíguo. Não mostrar resultados de outra obra como substitutos. Preferir paginação limitada e cache do gateway existente, sem varrer toda a D1/R2.
6. **SEO e compartilhamento:** URL canônica estável e títulos descritivos após resolução de rotas; manter **noindex/robots bloqueados** enquanto não houver GO editorial explícito. Descrições e eventuais dados estruturados só com informação publicada e verificada.

## Sequência de execução para outro chat/agente

- **Fase A — conciliação curta:** ler `AGENTS.md`, `docs/README.md`, este documento e apenas os arquivos citados; inspecionar HEAD, PRs ativas e contratos da curadoria/Worker. Confirmar que não existe implementação posterior equivalente. Registrar os campos e rotas já atendidos. **Não repetir auditoria ampla**.
- **Fase B — identidade editorial/publicação:** aproveitar identidades e aliases da curadoria; desenhar a menor extensão necessária para ligar modelos por ID aos personagens e publicar atributos revisados no catálogo canônico. Se isso exigir alteração de Worker produtivo, limitar-se a preparar código/contrato no owner correto e obter a autorização de publicação apropriada; não fazer cutover ou criar serviço paralelo.
- **Fase C — UI incremental:** estender as fichas/agrupamentos existentes; criar página de personagem somente quando houver endpoint canônico estável; preservar antigas URLs sem reativar catálogo legado.
- **Fase D — pesquisa e validação:** vincular chips e busca aos mesmos IDs, testar variantes, homônimos, multicaracteres, mídia restrita, vazio, falhas e navegação mobile/teclado; validar proporcionalmente sem build ou deploy desnecessário.
- **Fase E — habilitação controlada:** publicar somente após contrato, direitos de mídia/texto, revisão editorial, testes e aprovações de deploy/indexação cabíveis. Não abrir pagamento, Coins, ofertas ou SEO por consequência desta entrega.

## Critérios de aceite verificáveis

- [ ] Um personagem revisado possui uma ficha acessível por URL estável, com obra e biografia opcional corretamente atribuídas.
- [ ] Duas estatuetas do mesmo personagem compartilham **uma** biografia, mas mantêm IDs, variantes e galerias independentes.
- [ ] Uma estatueta com dois personagens aparece em ambos os vínculos confirmados sem duplicar registro.
- [ ] “Mais estatuetas de…” apresenta só modelos elegíveis do mesmo personagem; “Explore…” apresenta modelos publicados da franquia, sem duplicação.
- [ ] Tags “Anime”, “One Piece” e “Roronoa Zoro” representam três dimensões diferentes e levam a filtros/páginas corretos.
- [ ] Grafias alternativas e homônimos não geram vínculo incorreto; idade e dados ausentes não são inventados.
- [ ] O fluxo público lê somente o catálogo/gateway autorizado; a curadoria privada continua privada, sem segundo catálogo ou fallback legado.
- [ ] Capas/galleries respeitam a quarentena SpecialSTL e o crédito/rights gate já existentes; nenhum placeholder é apresentado como estatueta à venda.
- [ ] Testes direcionados cobrem sucesso, erro, vazio, responsividade, teclado, retorno aos filtros e links antigos; noindex, ofertas e deploy permanecem fechados até GO explícito.

**Próxima ação recomendada:** executar a **Fase A** e entregar o menor contrato/PR necessário para a **Fase B**, sem começar por um novo banco ou por um redesign. Ao concluir etapas, registrar progresso no checkpoint `URGENTE.md`; este documento mantém a definição de produto, não uma lista paralela de status.


## SSOT transversal: Telegram e catálogo antigo (contrato preparado em 22/11/2026)

**Não criar outro catálogo ou outra fonte de autoridade.** O D1 canônico `tonecos-catalogo` é a autoridade das identidades classificadas que podem ser servidas publicamente. A curadoria privada no Supabase/SQLite continua sendo a origem de **propostas, evidências e decisões editoriais**, e não outra API de tags pública. Somente o publicador autorizado transforma decisões confirmadas em vínculos do D1; o frontend nunca publica ou grava tags.

### Reutilização, não substituição

| Dimensão | Fonte e identidade | Regra |
| --- | --- | --- |
| Categoria | D1 `categories.id` e `slug` existentes | Uma categoria, sem duplicar textos por modelo |
| Franquia/universo | D1 `franchises.id`, categoria e slug existentes | Mesmo universo compartilhado entre Telegram e modelos antigos; colisões de slug são verificadas com o ID |
| Personagem | D1 `catalog_characters.id` na projeção revisada; `editorial_identity_id` associa a identidade privada já existente | Uma identidade estável, com franquia, nome canônico, versão e evidência; nunca derivar ID da grafia de um título |
| Sinônimos | D1 `catalog_character_aliases` na projeção revisada, originados de aliases editoriais aprovados | Encontram a mesma identidade; não criam novo personagem |
| Associação a modelos | D1 `catalog_model_characters` por `models.id` + `character_id` | Suporta `tg_*` e `mdl_*`, muitos modelos por personagem e vários personagens por modelo, sem juntar galerias |
| Temas e atributos | `catalog_curation_tags` e `catalog_curation_model_tags` privados já existentes | `theme_genre`, `characteristic` e `narrative_role` não se confundem com franquia ou personagem |

**Implementação de base preparada, ainda não aplicada:** `services/catalogo/migrations/0029_canonical_characters_across_sources.sql` acrescenta somente a projeção de personagens, aliases e associações no **mesmo D1**. Nenhum dado é copiado ou aprovado automaticamente pela migration. O mapeamento é versionado e restrito a entradas confirmadas, com vínculos cruzados de franquias permitidos somente com evidência explícita de crossover. A representação privada de um candidato não é um segundo cadastro canônico: ela é descartável/reconciliável depois da publicação aprovada.

**Idempotência:** o importador canônico deve buscar primeiro `editorial_identity_id` já mapeado e, em seguida, fazer uma conciliação determinística por franquia e identidade verificada. Não gerar novos personagens com base apenas em `lower(name)`, `telegram_character`, similaridade visual ou IA. Aliases e renomeações preservam IDs; divergências são retidas para revisão. Revisão ou revogação precisa atualizar o vínculo publicado sem alterar fotos, modelo, slug, estúdio, versão de galeria ou direitos.

### Sequência de integração sem reimportar imagens

1. **Inventário somente leitura:** aproveitar o snapshot já existente dos modelos D1 e as decisões editoriais da curadoria (sem repetir SELECTs de todo o acervo enquanto a quota D1 estiver esgotada). Comparar categorias/franquias e identidades já confirmadas; produzir lote privado com `confirmed`, `candidate`, `conflict`, `unknown`. A duplicação de uma escultura e a coincidência de personagem são problemas diferentes.
2. **Reconciliação por evidência:** vincular à mesma identidade os modelos antigos e do Telegram comprovadamente correspondentes. Reaproveitar os IDs aprovados e registrar a revisão da fonte; não publicar automaticamente rascunhos ou direitos não avaliados. Casos ambíguos, como `Ace` versus `Ace McCloud`, nunca são unidos por substring.
3. **Único owner de escrita:** depois de autorizado o cutover M5, adaptar **o publicador existente** para aplicar somente links revisados, por lotes idempotentes e com comparação de revisão; não criar um sincronizador público autônomo ou uma segunda API Supabase. O D1 continua sendo a única autoridade pública.
4. **Contrato público compartilhado:** estender a API do Worker/gateway existente para retornar chips `{kind, id, label, slug}` e buscar modelos por **ID** de categoria, franquia ou personagem. A seleção deve percorrer a mesma tabela `models`, respeitando a regra de visibilidade **de cada origem**: `published=1` para catálogo comercial e o gate da vitrine Telegram para `published=0`. As duas origens só devem aparecer juntas na experiência unificada depois de preservados esses gates.
5. **Interface única:** tags visíveis uma vez, em ordem categoria → franquia → personagem → variante editorial; variante não é identidade. Clique em personagem filtra pelo ID, não por `LIKE`. Estúdio é crédito/coleção independente, não substitui a categoria. Páginas de personagens e relações `RelatedModels` reutilizam a mesma consulta paginada, sem índice paralelo nem varredura global a cada acesso.
6. **Auditoria incremental:** alterações de nome, alias ou classificação confirmadas impactam todos os modelos vinculados por ID; conflitos permanecem em curadoria. Publicar a revisão somente pelos gates já definidos, sem ativar SEO, contas, orçamentos ou direitos automaticamente.

**Exemplos de aceite após a reconciliação:** Ace (One Piece) em estúdios diferentes e `Portgas D. Ace` no acervo antigo podem compartilhar um `character_id` **se a evidência confirmar que representam o mesmo personagem**; Abra de quatro estúdios pode compartilhar a identidade Pokémon; Ace McCloud deve continuar outro personagem. Os 1.093 modelos Telegram com categoria/franquia pendente mantêm essa condição até revisão — não fabricar tags para completar a interface.

**Estado verificável deste contrato:** migration aditiva e testes SQLite locais preparados, sem escrita no D1/R2 e sem alteração do Worker produtivo. A PR #77 já melhorou os chips do Telegram, mas o filtro textual `telegram_character` é uma solução transitória de apresentação: não é ainda a identidade canônica compartilhada com os modelos antigos. A implementação do publicador, a conciliação real e a API unificada são etapas pendentes. A habilitação em produção depende da autoridade de deploy/cutover M5 existente, além da disponibilidade do D1.


### Primeiro inventário transversal executado em 22/11/2026

**Prioridade do proprietário:** consolidar o vocabulário canônico primeiro; vincular modelos por ID somente após identificar e revisar cada entidade. Esta etapa **não** é criação automática de personagens no D1: títulos de esculturas e candidatos de nome não comprovam identidades. A fonte pública continua tonecos-catalogo D1, a fonte de mídia continua R2, e a curadoria privada mantém propostas/evidências.

Execução real, somente leitura, em DESKTOP-4UFL03B com scripts/catalog/prepare-canonical-taxonomy.py:

- SQLite vivo C:/Users/ordax/Documents/TONART-Telegram-Import/espelho-telegram/curadoria-local/curadoria.sqlite3, acessado via mode=ro com transação de leitura;
- CSV **histórico**, não atual, C:/Users/ordax/Documents/TONART-Telegram-Import/publicacao-staging/inventario-catalogo-publico.csv para avaliar nomes já observados do catálogo antigo;
- rascunhos_telegram_importacao_privada.jsonl de staging como **pistas históricas** de IDs de franquia, nunca autoridade de escrita;
- saída privada: C:/Users/ordax/Documents/TONART-Telegram-Import/reconciliacao-taxonomia-20261122/ (resumo.json, universos-candidatos.jsonl, personagens-candidatos.jsonl, aliases-para-revisao.jsonl, catalogo-antigo-sem-vinculos.jsonl, fila-revisao-personagens.csv).

**Resultados da rodada:** 527 universos/franquias candidatos (de todos os grupos e propostas nomeados, incluindo 11 grupos de variações de grafia), 2.813 candidatos a títulos de personagens (**não identidades aprovadas**), 138 títulos que exigem atenção adicional como variantes/dioramas/múltiplos personagens e 76 títulos com pelo menos uma proposta de **nome** confirmada (o que não confirma o personagem). O snapshot antigo contém 3.837 IDs distintos, dos quais 2.278 têm coincidência nominal com títulos candidatos; 538 têm nomes que apontam a mais de um universo. Essas coincidências **não são vínculos**. O número do snapshot não representa o total atual publicado no D1.

**Validação:** executar python scripts/catalog/test_prepare_canonical_taxonomy.py (somente biblioteca padrão). O teste inclui homônimos em universos distintos, acentos, aliases, títulos compostos, IDs históricos repetidos e garantia de que o SQLite de origem não é alterado.

**Próximo gate:** obter um inventário **atual** de categories, franchises e catalog_characters no D1 quando a quota permitir, reconciliar cada candidato ao ID preexistente, revisar conflitos e somente então registrar novas identidades pelo publicador autorizado. A migration 0029 segue preparada e **não implantada**. Nem este script nem o resultado local criam uma segunda SSOT ou autorizam publicar tags provisórias.
