# Fila derivada de revisão de identidade

`character-catalog-review-queue.csv` é uma fotografia regenerável de modelos do contrato candidato da PR #26 e do gateway público canônico, reconciliada por ID em 17/11/2026. Não é catálogo da aplicação, fonte de verdade editorial nem mecanismo de publicação.

Todas as linhas começam com identidade `pending_evidence` e biografia `not_started_identity_unverified`. A coluna `identity_candidate_names` contém rótulos exatos do modelo vindos do contrato candidato da PR #26 e/ou do catálogo público. `candidate_sources` registra o campo de catálogo de origem; `supporting_labels` mantém variante, coleção e pasta separadas; `candidate_ambiguities` explica por que são apenas pistas. Para cada linha, `identity_review_required=true` e `identity_verified=false`. As colunas separadas `franchise_candidates` e `franchise_sources` preservam o contexto do catálogo, sempre com `franchise_review_required=true` e `franchise_verified=false`.

Esses valores de catálogo são proveniência dos registros de modelos, **não evidência independente de identidade**. Título, franquia, variante, coleção ou pasta não comprovam personagem ou alias. O inventário atual tem 2.609 IDs únicos reconciliados com 2.596 registros do contrato candidato e 2.575 registros públicos (2.562 compartilhados, 34 só no candidato e 13 só na publicação); esses números não representam 2.609 identidades verificadas. Não preencha decisões aprovadas nesta planilha: vínculos e texto revisados pertencem à curadoria privada existente e só podem chegar à leitura pública por uma projeção canônica autorizada.

Os campos de evidência, resumo, biografia original, fontes, idade contextual, revisor e data estão vazios para revisão futura. Idade só deve ser registrada com arco/versão e fonte confirmados. Não copiar wikis nem transformar uma sugestão de nome em vínculo aprovado.

Para regenerar, forneça o arquivo do contrato candidato desejado:

```powershell
node scripts/catalog/character-catalog-inventory.mjs --format csv --candidate-contract <arquivo-do-contrato> --output docs/review/character-catalog-review-queue.csv
```

`character-editorial-research-preparation.json` é um lote separado de pesquisa, ligado aos modelos somente por IDs da fila. Na fotografia atual de 18/11/2026, contém 94 identidades candidatas, 94 rascunhos biográficos originais, 105 URLs distintas (104 fontes oficiais e uma de editora), 371 afirmações referenciadas e 926 relações candidatas para 913 modelos distintos. Tudo segue pendente de revisão humana; Wolverine mantém a franquia ambígua. As 926 relações não têm evidência independente do render TONART e nenhuma está revisada ou aprovada. Dos 913 IDs vinculados como candidatos, 888 também aparecem publicados e 25 são apenas candidatos do contrato, preservados sem slug público. Os outros 1.696 dos 2.609 modelos continuam somente na fila `pending_evidence`, sem dossiê de pesquisa. O teste do inventário verifica IDs e slugs contra a fila sem transformar a proveniência do catálogo em prova editorial.

Wolverine permanece com franquia ambígua porque seus 30 modelos candidatos estão divididos entre duas franquias D1. Thor foi separado em duas identidades candidatas a partir da proveniência: 17 modelos no contexto de Vingadores/Marvel e um modelo no contexto de God of War Ragnarök. Nenhum vínculo foi confirmado por imagem; a distinção evita misturar personagens homônimos e segue pendente de revisão. Trunks está descrito apenas como adolescente do futuro, conforme uma fonte oficial específica; os oito rótulos genéricos não confirmam idade ou linha temporal. Daredevil usa uma fonte Marvel “On Screen” e Gambit tem múltiplas fases e formas; nenhuma continuidade ou versão visual foi atribuída aos modelos. Os candidatos adicionados por rótulo exato do inventário não passaram por validação visual; formas, dioramas, nomes localizados e cenas com vários personagens continuam ambíguos.

Deadpool preserva como categorias de navegação os rótulos Equipes e Grupos e Heróis Individuais; Thanos tem categoria Vilões; nenhum desses rótulos é aceito como franquia ou prova de vínculo. Kratos é pesquisado na fase nórdica indicada pelas fontes da PlayStation; as fases grega e nórdica não são unificadas. Chun-Li e Cammy usam fontes oficiais da Capcom, mas continuidade e aparência de cada estátua ainda exigem revisão. Capitão América permanece ambíguo entre Steve Rogers e Sam Wilson; Hulk, Ciclope e Magneto também mantêm pendentes as versões e os arcos específicos dos renders. Juggernaut é um manto com outros portadores; Justiceiro, Juri e Ryu mantêm pendentes a continuidade e a conferência visual de cada ID. Jean Grey, Tempestade e Vampira continuam sujeitas à revisão de uniformes e arcos; Venom pode referir-se ao simbionte ou a diferentes hospedeiros e não foi atribuído a Eddie Brock automaticamente. O pacote não cria identidades no banco, não alimenta a projeção pública e não altera a fila regenerável. A curadoria privada existente continua sendo a autoridade para revisar e aprovar qualquer dado.


## Rodada 96 — candidatos Marvel de Apocalipse, Homem de Ferro, Dentes de Sabre e Fera (18/11/2026)

- Preparei quatro dossiês com páginas oficiais da Marvel: Beast/Hank McCoy, Iron Man/Tony Stark, Sabretooth/Victor Creed e Apocalypse/En Sabah Nur. Os rascunhos distinguem identidade de manto e variantes quando as próprias fontes documentam mais de um portador ou continuidade.
- Selecionei **27 relações candidatas** por rótulo exato e IDs da fila: 7 Apocalipse, 7 Homem de Ferro, 7 Dentes de Sabre e 6 Fera. “Fera” permanece especialmente ambíguo; nenhum vínculo foi conferido contra imagens e nenhuma categoria de navegação conta como evidência.
- O pacote passa a **49 candidatos, 60 URLs oficiais únicas, 49 rascunhos e 666 relações candidatas**. Claims permanecem pendentes de revisão humana; **0 identidades revisadas/aprovadas, 0 vínculos revisados/aprovados e 0 vínculos com evidência independente por modelo**.
- Validação desta rodada: node --test scripts/catalog/character-catalog-inventory.test.mjs passou 11/11; git diff --check passou.

**NEXT_ACTION:** encaminhar a pesquisa preparada para revisão na curadoria privada da PR #31; registrar evidência independente de cada modelo e aprovação humana antes da exportação autorizada.

**DO_NOT_REPEAT:** não inferir Tony Stark como portador de todo modelo Iron Man; não presumir que “Fera” representa Hank McCoy; não usar uma biografia Marvel como prova de identidade de um render.


## Rodada 97 — quatro candidatos de outros universos (18/11/2026)

- Preparei dossiês para **Ada Wong**, **Sonya Blade**, **Guts** e **Ciri**, usando materiais oficiais da CAPCOM, Warner Bros. Games/NetherRealm, Dark Horse Comics e CD PROJEKT RED. As biografias se limitam à fonte e versão consultadas.
- Associei **27 modelos candidatos** por IDs exatos da fila: 6 Ada Wong, 6 Sonya Blade, 9 Guts e 6 Ciri. As variantes de roupa, timeline e arco continuam explícitas; nenhum modelo foi conferido visualmente.
- O pacote passa a **53 candidatos, 64 URLs oficiais únicas, 53 rascunhos e 693 relações candidatas**. Todos permanecem pendentes, sem evidência independente por modelo e sem aprovações.
- Validação: node --test scripts/catalog/character-catalog-inventory.test.mjs passou 11/11; git diff --check passou.

**NEXT_ACTION:** encaminhar os candidatos à curadoria privada #31 e documentar evidências independentes por render antes de aprovar qualquer relação.

**DO_NOT_REPEAT:** não universalizar a timeline de Sonya, o volume 41 de Berserk ou a fase de The Witcher 3; não tratar nomes ou figurinos do catálogo como prova de correspondência.


## Rodada 98 — Cable e He-Man com fontes oficiais (18/11/2026)

- Preparei dossiês para **Cable (Nathan Summers)** e **He-Man (Prince Adam)**. Reutilizei a fonte Marvel de Cable já registrada para Apocalypse, evitando URL duplicada; acrescentei uma fonte oficial da Mattel Creations para He-Man.
- Associei **13 modelos candidatos** por IDs da fila: 6 Cable e 7 He-Man. O perfil Marvel de Cable tem variantes de época e idade; a página Mattel consultada trata do filme de 2026. Nenhuma dessas versões foi atribuída a um modelo sem revisão visual.
- O pacote chega a **55 candidatos, 65 URLs oficiais únicas, 55 rascunhos e 706 relações candidatas**, todos sem revisão ou aprovação.
- Validação desta rodada: teste da fila 11/11 e git diff --check passaram.

**NEXT_ACTION:** encaminhar os candidatos a #31 e associar evidência visual independente por modelo antes da revisão e exportação.

**DO_NOT_REPEAT:** não presumir que modelos Cable mostram Nathan adulto ou que modelos He-Man seguem o filme de 2026.


## Rodada 99 — Zarbon, Akuma e Michelangelo (18/11/2026)

- Preparei três dossiês a partir do site oficial Dragon Ball, da base de dados oficial da CAPCOM e de material oficial da Nickelodeon. As biografias citam transformações, técnicas e aparência apenas no contexto das fontes.
- Associei **18 relações candidatas** por IDs da fila: 6 Zarbon, 6 Akuma e 6 Michelangelo. As transformações de Zarbon, as versões de Street Fighter e os designs de TMNT permanecem ambíguos até revisão visual.
- O lote tem agora **58 candidatos, 68 URLs oficiais únicas, 58 rascunhos e 724 relações candidatas**. Nenhuma relação possui evidência independente por modelo ou aprovação.
- Validação desta rodada: teste da fila 11/11 e git diff --check passaram.

**NEXT_ACTION:** conduzir revisão humana em #31 e adicionar evidência de cada render antes de publicar qualquer vínculo.

**DO_NOT_REPEAT:** não mapear automaticamente a forma transformada de Zarbon, um design específico de Akuma ou a máscara laranja de uma versão TMNT aos modelos.


## Rodada 100 — identidades e mantos Marvel com ambiguidades preservadas (18/11/2026)

- Preparei dossiês para **Colossus**, **Psylocke** e **Ghost Rider**, apoiados por páginas oficiais da Marvel. As fontes documentam Piotr Rasputin, a relação Betsy Braddock/Kwannon e múltiplos portadores dos Espíritos da Vingança.
- Relacionei como candidatos **18 modelos** por ID da fila, seis para cada rótulo. Psylocke continua sem portadora definida e Ghost Rider permanece como manto; nenhum render foi analisado.
- O pacote tem agora **61 candidatos, 71 URLs oficiais únicas, 61 rascunhos e 742 relações candidatas**. Tudo permanece pendente de revisão humana; não há relação com evidência independente.
- Validação desta rodada: node --test scripts/catalog/character-catalog-inventory.test.mjs passou 11/11; git diff --check passou.

**NEXT_ACTION:** encaminhar as ambiguidades à curadoria privada e revisar visualmente cada um dos 18 IDs antes de decidir relações.

**DO_NOT_REPEAT:** não escolher Betsy, Kwannon, Johnny Blaze, Daniel Ketch, Robbie Reyes ou outro portador apenas pelo título localizado do modelo.


## Rodada 101 — Raphael com fonte Nickelodeon reutilizada (18/11/2026)

- Acrescentei o candidato revisável de **Raphael** usando o mesmo material oficial da Nickelodeon já registrado para Michelangelo; nenhuma URL ou fonte duplicada foi criada.
- Relacionei seis modelos por IDs exatos da fila. A fonte descreve uma versão específica; a máscara vermelha nela não foi usada como prova de que os modelos tenham esse visual.
- O pacote chega a **62 candidatos, 71 URLs oficiais únicas, 62 rascunhos e 748 relações candidatas**. A identidade e os seis vínculos continuam pendentes de revisão e evidência visual independente.
- Validação local: node --test scripts/catalog/character-catalog-inventory.test.mjs passou 11/11; git diff --check passou.

**NEXT_ACTION:** revisar visualmente os seis IDs na curadoria privada antes de decidir identidade e versão.

**DO_NOT_REPEAT:** não atribuir a máscara ou os detalhes da fonte Nickelodeon a nenhum modelo sem evidência do próprio render.


## Rodada 102 — Sub-Zero e Lara Croft (18/11/2026)

- Preparei fontes e rascunhos para **Sub-Zero** e **Lara Croft** com material oficial da Warner Bros. Games/NetherRealm e do site Tomb Raider.
- Associei **10 modelos candidatos** por IDs da fila. A página de Sub-Zero confirma dois portadores do manto; Lara Croft reúne fases e adaptações. Não atribuí um portador ou versão a cada render.
- O conjunto passa a **64 candidatos, 73 URLs oficiais únicas, 64 rascunhos e 758 relações candidatas**. Nenhum item está aprovado ou tem evidência visual por modelo.
- Validação local: node --test scripts/catalog/character-catalog-inventory.test.mjs passou 11/11; git diff --check passou.

**NEXT_ACTION:** encaminhar as relações para revisão privada e anexar evidência específica por modelo.

**DO_NOT_REPEAT:** não presumir Bi-Han ou Kuai Liang pelo nome Sub-Zero nem escolher uma fase de Lara Croft pelo rótulo do catálogo.


## Rodada 103 — personagens Marvel frequentes da fila (18/11/2026)

- Preparei dossiês para **Emma Frost**, **Loki**, **Doctor Doom** e **Nightcrawler/Kurt Wagner**, a partir de páginas e material oficial Marvel.
- Associei **21 modelos candidatos** por IDs: 5 Emma Frost, 5 Loki, 5 Doctor Doom e 6 Nightcrawler. Nightcrawler é descrito pela fonte X-Men ’97; versões visuais e continuidades não foram atribuídas aos modelos.
- A preparação soma **68 candidatos, 77 URLs oficiais únicas, 68 rascunhos e 779 relações candidatas**. Todos permanecem pendentes, sem evidência visual independente ou aprovação.
- Validação local: node --test scripts/catalog/character-catalog-inventory.test.mjs passou 11/11; git diff --check passou.

**NEXT_ACTION:** revisar cada candidato e relação na curadoria privada #31 antes de qualquer projeção pública.

**DO_NOT_REPEAT:** não generalizar a versão X-Men ’97 para Nightcrawler nem escolher fases de Emma, Loki ou Doom pelo nome do catálogo.


## Rodada 18/11 — quatro dossiês adicionais por rótulo canônico exato

- **Broly**: fonte do Dragon Ball Official Site sobre a fase do mangá Dragon Ball Super; quatro modelos relacionados somente como candidatos. Formas de Broly e continuidades antigas não foram identificadas nos renders.
- **Kakashi Hatake**: artigo oficial de Naruto sobre sua função na Equipe Sete, Sharingan e Chidori; quatro modelos candidatos, sem atribuição de roupa, época ou versão.
- **Jill Valentine**: retrospecto oficial da Capcom; quatro modelos candidatos. O endereço foi encontrado na busca, mas a consulta automatizada da página retornou HTTP 403; revisão direta é necessária.
- **Miles Morales**: perfil oficial Marvel *In Comics*; quatro modelos candidatos. A leitura automatizada do conteúdo integral retornou HTTP 403; a etiqueta “Heróis Individuais” é agrupamento do catálogo, não prova de franquia ou de representação.

Os quatro dossiês usam exclusivamente IDs e slugs presentes no contrato de modelos da PR #26. Nenhuma prova visual independente da escultura foi inserida; todas as 16 relações continuam `candidate_pending_visual_and_editorial_review`. O lote inclui 4 novas URLs oficiais, 16 afirmações com referências e 4 biografias próprias, **sem nenhuma aprovação, escrita em Supabase/D1 ou liberação pública**. A revisão humana e a confirmação individual de cada estatueta permanecem obrigatórias.
