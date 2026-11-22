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

### Reconciliação de IDs históricos e triagem de evidências — 22/11/2026

**Prioridade: vocabulário primeiro, vínculos depois.** A mesma rotina de inventário foi ampliada, sem novo sistema, para confrontar a classificação local com o manifesto histórico de importação e gerar filas ordenadas de revisão. Não há importação, deploy ou criação de entidades no D1/Supabase nesta etapa.

Resultado verificado no desktop autorizado:

- **527** nomes candidatos a universo/franquia; **91 nomes** possuem pistas de **88 IDs históricos distintos**. Os restantes **436** ainda não têm ID histórico identificado. Os IDs do plano de importação são pistas, não validação do D1 atual.
- **3 grupos** reutilizam o mesmo ID em duas grafias: Honkai: Star Rail / Honkai Star Rail (176), Scooby-Doo / Scooby Doo (66) e Cyberpunk: Edgerunners / Cyberpunk Edgerunners (19). Há **7 grupos de slugs conflitantes** (incluindo esses três); não somar números como se fossem dez universos distintos.
- **25 nomes** parecem combinar múltiplas franquias, como Pokémon/Dragon Ball; podem ser crossovers e não devem virar uma franquia artificial.
- **2.813 títulos candidatos a personagem**, **183 com sinalizadores de revisão** por variante, diorama, múltiplos personagens ou evidência fraca. **26 P1** são candidatos com evidência de nome sem sinalizadores e **468 P2** aparecem em vários estúdios. Nenhum está aprovado como identidade canônica. Confirmar o nome da escultura não equivale a confirmar o personagem.
- Encontrados títulos comerciais confirmados como nomes de esculturas que não devem criar automaticamente personagens: Cancelled, Double Force, Frosty (URLs com nomes adicionais) e variantes como Chun-Li Bikini. Links genéricos e legendas herdadas recebem avisos; o nome do personagem não é inferido automaticamente a partir do URL. URLs com números finais usam o segmento significativo anterior para evitar falsos negativos, como Cammy.
- O snapshot do catálogo antigo contém **3.837 IDs históricos**, **2.278 coincidências nominais**, das quais **538** são ambíguas por múltiplos universos; nenhuma foi associada aos modelos.

Os arquivos privados estão na mesma pasta C:/Users/ordax/Documents/TONART-Telegram-Import/reconciliacao-taxonomia-20261122/: fila-reconciliacao-franquias.csv, conflitos-universos.jsonl e fila-revisao-personagens.csv (agora ordenada P1/P2/P3 com tipos e URLs de evidência), além dos inventários já existentes. São filas derivadas, não outra SSOT. O catalogador público continua sendo o Worker/D1 canônico.

**Próximo gate:** quando a cota D1 permitir, reconciliar os 88 IDs históricos e os 436 candidatos restantes com as tabelas atuais categories/franchises, resolver colisões, revisar identidades editoriais e só então promover tags e vínculos por lote idempotente, com owner autorizado. A migration 0029 permanece preparada somente em código, sem autorização M5/cutover.

### Pré-validação de identidades contra o D1 atual — 22/11/2026

A rotina **única** `scripts/catalog/prepare-canonical-taxonomy.py` agora aceita opcionalmente `--d1-taxonomy-snapshot <arquivo.json>` para reconciliar a fila já gerada com uma exportação **completa e recente** das tabelas canônicas D1. Não há segundo cadastro, aplicação de migration, inserção de tags ou alteração de modelos.

**Bloqueio observado:** a consulta real a `sqlite_master` no Cloudflare D1 falhou com código **7500**, por esgotamento da quota diária de leituras. `SELECT 1` ter sucesso não indica que há quota (não lê linhas). Portanto, **nenhum resultado de matching no D1 atual foi afirmado** nesta etapa.

**Contrato de exportação aceito:** JSON privado com `schema: "tonart.catalog.d1-taxonomy-snapshot/1"`, `database: "tonecos-catalogo"`, `exported_at_utc` em UTC, `export_completed: true`, arrays completos `categories` (`id,name,slug`) e `franchises` (`id,name,slug,category_id`), acompanhados por `categories_total` e `franchises_total` iguais ao comprimento real de cada array. A exportação deve vir da autoridade Cloudflare D1 já existente — **não sintetizar dados de staging como se fossem produção**. As consultas necessárias quando a quota permitir são limitadas às duas tabelas de taxonomia, ordenadas por ID. Nenhum SELECT de fotos, `models` ou R2 é necessário para esse preflight.

A validação recusa exportação truncada, banco incorreto, IDs repetidos, slug malformado, categoria ausente, timestamp fora de UTC, exportação mais antiga que 24 horas ou com data futura. O processamento dessas validações ocorre **antes de substituir relatórios**. Se não houver arquivo atual, remove apenas os arquivos derivados de pré-validação D1 para impedir exibição de resultados velhos como atuais, preservando os inventários e as evidências originais.

**Arquivos opcionais gerados na mesma pasta de trabalho (somente com snapshot válido):** `franquias-preflight-d1.jsonl`, `personagens-preflight-d1.jsonl` e `fila-validacao-d1-franquias.csv`. Resultado separa candidatos a IDs existentes, colisões/aliases para revisão, homônimos em diferentes categorias, ID histórico divergente, potencial crossover e franquia ainda sem equivalente. Nenhum ID de personagem é criado; P1 apenas encaminha nomes para revisão editorial humana. Nunca ligar modelos por substring, nome genérico ou variante.

**Provas locais:** `python -B scripts/catalog/test_prepare_canonical_taxonomy.py -q`: **8/8** incluindo CLI com exportação completa de teste, bloqueio de exportação vencida sem corromper relatórios, exclusão de pré-validação antiga, colisões de IDs, homônimos e títulos comerciais. O teste usa somente SQLite/JSON sintéticos e não comprova publicação em D1.

**Gate:** após retornar a disponibilidade da quota, o owner do D1 prepara uma exportação completa em operação de leitura econômica e executa o preflight. Os casos sem conflito seguem para revisão; só o publicador autorizado pode gravar identities/links no D1 após M5, sem mudar status, licença ou galeria.

### Primeiras identidades editoriais efetivas — 22/11/2026

**Execução real no Supabase TONART privado** (`tonecosstudio-site`, projeto `icmtmaakjucmuzxnofkd`): 21 identidades cadastradas em `public.catalog_character_identities` com `evidence_origin = 'official_source_checked:2026-11-22'` e URL da fonte oficial registrada individualmente em `evidence_note`. A operação usou a chave estável **já existente** na curadoria (`length(franchise) || ':' || lower(franchise) || ':' || lower(character_name)`) e `ON CONFLICT DO NOTHING`, sem substituição de registros preexistentes.

Consulta de auditoria após as duas cargas: **21 linhas**, **21 chaves distintas**, **zero linhas** em `catalog_curation_model_profiles` e **zero associações** em `catalog_curation_model_tags`. Exemplos revisados: Portgas D. Ace/One Piece, Abra e Pikachu/Pokémon, Cammy/Chun-Li/Laura Matsuda/Street Fighter, Jill Valentine/Resident Evil, Karlach/Baldur's Gate 3, Ivy Valentine/Soulcalibur, Rogue/Magik/Selene Gallio/X-Men, Kitana/Sonya Blade/Mortal Kombat, Tatsumaki/Fubuki/One Punch Man, Lady Death/Coffin Comics, Sue Storm/Fantastic Four, Red Sonja/Red Sonja, Squirrel Girl/Yelena Belova/Marvel Comics.

**Essas linhas são privadas, não são registros no D1 e não geram tags públicas ou associações automáticas.** Chaves de franquia editoriais em texto ainda precisam ser reconciliadas com `franchises.id` do D1. As grafias `Ace` versus `Portgas D. Ace` e `Sue Storm` versus `Susan Storm Richards` serão tratadas como aliases após revisão, nunca criando uma segunda identidade por conveniência. Personagens fan-made e títulos de esculturas (Bowsette, Steampunk Poison Ivy, Cancelled, Double Force, Frosty) não foram cadastrados automaticamente.

**Lacuna de produto eliminada em código:** a curadoria existente só tinha `admin_verify_catalog_model_identity`, que exigia indicar um modelo. A migration gerada com Supabase CLI `20261122213621_private_character_vocabulary.sql` adiciona `admin_register_catalog_character_identity`, método **privado service-role/admin** para registrar identidade revisada *antes* de conectar modelos, preservando o `identity_key` antigo, rejeitando prova automática e evitando sobrescrever evidência em duplicidade. Cliente administrativo `registerReviewedCatalogCharacterIdentity` e allowlist do gateway existente foram atualizados; não foi criado outro catálogo, tabela ou processo. **26 testes de serviço e gateway passaram** no ambiente de desenvolvimento.

**Estado de publicação:** a migration e o gateway ainda não foram aplicados/implantados no Supabase de produção; apenas as 21 linhas editoriais efetivas foram inseridas na estrutura que já existia. O D1 continua com bloqueio diário de leitura `7500` no último teste; migration D1 `0029` segue não aplicada; M5 segue sem GO. Nenhuma galeria, mídia, nome de escultura ou orçamento foi alterado. Ativar RPC é uma implantação independente, exigindo validar a permissão service-role antes de liberar o fluxo administrativo para novos cadastramentos.

### Execução contínua e lote Pokémon — 22/11/2026

**Prioridade expressa do proprietário:** trabalhar continuamente até que os personagens identificáveis do acervo antigo e Telegram estejam cadastrados com identidade única, e manter o código, o processo e os checkpoints atualizados. A tarefa horária já existente **TONART — concluir MVP** recebeu essa prioridade; não foi criada uma sexta automação porque o plano possui cinco vagas ativas, nem foi interrompido o monitor de R2/Telegram. A execução é incremental e não equivale a afirmar que 2.813 títulos de esculturas são 2.813 personagens.

**Gravação real na autoridade privada editorial existente:** após os 21 registros iniciais, uma nova carga idempotente de **13 personagens Pokémon** foi cadastrada em `public.catalog_character_identities`, com `ON CONFLICT (identity_key) DO NOTHING`, `evidence_origin='primary_pokemon_site_confirmed:2026-11-22'` e **URL primária individual** no `evidence_note`. Nomes: Bulbasaur, Charmander, Charizard, Blastoise, Venusaur, Squirtle, Gengar, Eevee, Meowth, Dragonite, Mew, Mewtwo e Gyarados. Fontes foram selecionadas de páginas do Pokédex e catálogo oficial de cartas Pokémon (links armazenados por registro); não inferir que qualquer variante/forma de escultura do mesmo Pokémon tem a mesma ficha.

**Auditoria via SQL após a carga:** `identities=34`, `unique_keys=34`, `franchises=13`, `pokemon=15` (incluindo os prévios Abra/Pikachu), `new_official_refs=13`, `model_profiles=0` e `model_tags=0`. Nenhum `catalog_model_id`, galeria, mídia, venda, direito ou tag pública foi alterado. As identidades estão **privadas no Supabase**, não são uma nova base canônica do D1: a correspondência com os IDs de `franchises` do D1 continua pendente do preflight já integrado à main na PR #81.

**Continuidade:** em cada ciclo da tarefa existente, comparar a contagem e os IDs atuais antes de selecionar o próximo lote; priorizar candidatos com fonte primária confiável e separar homônimos, aliases, variantes, crossovers, personagens originais/fan-made e rótulos comerciais. Registrar apenas entidades confirmáveis por evidências sem inventar URLs nem repetir cadastro. Usar o relatório privado `C:/Users/ordax/Documents/TONART-Telegram-Import/reconciliacao-taxonomia-20261122/` como fila derivada, não como SSOT, e a `main` como autoridade de código. As migrations Supabase `20261122213621` e D1 `0029` ainda não foram implantadas; a publicação pública permanece sujeita ao M5 e aos gates existentes. Quando a quota D1 voltar, reconciliar franquias atuais por ID sem varreduras de mídia. Medir conclusão por candidatos efetivamente resolvidos, aliases e exceções documentadas, não por uma contagem alvo artificial.

### Lote supervisionado de taxonomia Pokémon — 22/11/2026

**Execução física real:** o OrdaX MCP `computer_process_start` iniciou o processo supervisionado `f257d6fe-2cf0-45ef-8a40-db5fe47aa0fe` no `DESKTOP-4UFL03B`. O processo concluiu **5/5 checkpoints**, código de saída **0**, com logs e retomada por referência de commit da fonte. Não executa consulta D1, manipulação de imagens nem sessão Telegram.

**Fonte independente, explicitamente não oficial:** PokeAPI/pokeapi, commit imutável `cd5f6c6232f23430aa6089896d96230f5f7ecef4`, CSV `pokemon_species.csv` e `pokemon_species_names.csv`, 1.025 espécies indexadas em inglês. O script `scripts/catalog/validate-existing-pokemon-taxonomy.py` compara **igualdade exata normalizada** com o inventário PRIVADO já produzido por `prepare-canonical-taxonomy.py`. Não procura Pokémon ausentes do catálogo e não aprova modelos por nome.

**Resultado do lote:** 564 títulos da fila sob universo Pokémon, 445 espécies distintas com correspondência exata comprovada na referência, 119 títulos retidos (variants, crossovers, ambiguidade ou ausência no índice), e 413 coincidências **nominais históricas** com modelos antigos — nenhuma associação aplicada. Arquivos privados na pasta de inventário já existente: `pokemon-especies-exatas-privado.jsonl`, `pokemon-ambiguos-revisao-privado.jsonl`, `pokemon-verified-manifest.json` e `pokemon-verified-mission.json`. Manter esses artefatos FORA do GitHub público.

**Gravação na SSOT editorial privada já existente:** via Supabase do projeto `icmtmaakjucmuzxnofkd`, 5 lotes idempotentes processaram as 445 espécies presentes no catálogo. **430 novas identidades foram inseridas**, 15 existentes preservadas, sem sobrescrever evidência; origem dos novos registros: `external_species_pokeapi_pinned_exact:2026-11-22`, nota contendo número nacional da espécie, commit fixado, endereço exato do CSV e indicação clara de que é **fonte estruturada independente, não fonte oficial Pokémon Company nem validação da representação na escultura**. Contagem antes: 34 identidades. Contagem auditada após: **464 identidades, 464 chaves distintas, 445 Pokémon, 13 franquias editoriais**. Ainda **zero** perfis de modelos e **zero** associações de tags de modelos.

**Segurança e distinção de autoridade:** registro de espécie na tabela privada não libera qualquer modelo Telegram ou antigo, não atribui direitos, não equivale a publicação de tag no D1 e não comprova identidade visual da escultura. Todos os 119 títulos não idênticos permanecem pendentes. Manter a distinção entre referência independente e fonte oficial no cadastro. Não inserir automaticamente todas as 1.025 espécies: apenas as 445 encontradas na fila, após confirmação de correspondência exata.

**Próximos lotes:** reutilizar a execução supervisionada e o mesmo inventário para outras franquias com bases independentes verificáveis; não criar outro catálogo ou sincronizador, não repetir o lote concluído se os hashes de entrada e da fonte permanecerem iguais. Conciliar aliases e IDs do D1 somente após disponibilidade da quota e GO M5, sem migrar dados ou publicar prematuramente.

**Prova de testes e código:** executar `python -B scripts/catalog/test_validate_existing_pokemon_taxonomy.py -v`. Testes offline verificam fonte estruturada, igualdade exata, retenção de variantes/crossovers, deduplicação e ausência de vínculos. O script não contém credenciais do Supabase e **não realiza escrita em sistemas canônicos**; o único write privado comprovado foi pelo conector autorizado e em lotes idempotentes.
