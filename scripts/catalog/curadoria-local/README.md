Warning: truncated output (original token count: 22176)
Total output lines: 659

# Curadoria Visual TONART — aplicativo local

## Separar esculturas distintas em galeria já auditada — Wicked

O `POST /api/split-audited-variant` corrige uma galeria *já auditada* de **exatamente duas fotos** que na verdade são variantes/esculturas diferentes (ex.: uma imagem de Busto e outra de Full Size). Não modifica o endpoint legado nem cria outro banco/serviço. Corpo: `group_key`, `revision`, `selected_message_id`, `proofs` (todos os dois `message_id`/`sha256`/`revision`), `corrected_variant`, `official_url` individual `https://3dwicked.gumroad.com/l/...` e `note` com descrição de ambas as esculturas.

A operação é **fail-closed**: somente Wicked em estado não confirmado, auditoria prévia, dois membros com metadados consistentes, duas provas CAS/SHA, originais físicos de até 30 MiB íntegros, ausência de SHA em outra galeria, variantes diferentes e justificativa visual longa. Uma única transação move o membro selecionado para nova galeria revisável, atualiza a proposta de nome/variante somente da foto movida, mantém a outra foto com a variante original, marca `curation_seen` para impedir regressão por reingestão e registra auditorias antes/depois sem apagar eventos anteriores. As novas galerias continuam **não confirmadas** até o POST canônico `/api/confirm-gallery-identity`; nada publica ou aprova direitos comerciais.

Teste `teste_post_audit_variant_split.py`: E2E com SQLite e fotos sintéticos, CAS, SHA físico, fonte oficial, idempotência por falha de CAS, auditoria e confirmação posterior das duas galerias. Nunca usar para mover qualquer mídia confirmada, reescrever acervo original ou misturar variantes de impressão.

## Correção de variante na confirmação editorial do host

O `POST /api/confirm-gallery-identity` suporta o campo **opcional** `corrected_variant`, além de `group_key`, `group_revision`, `proofs`, `title`, `universe`, `official_url` e `note`. Na missão Wicked, esse campo corrige uma variante equivocada (ex.: Spock cadastrado como Busto, mas a imagem oficial prova Full Size) **na mesma transação** que confirma a identidade de todas as fotografias da galeria.

Regras: o host requer auditoria visual prévia, fonte HTTPS individual `https://3dwicked.gumroad.com/l/...`, revisão CAS, SHA-256 e revisão de **todos** os originais da galeria, mesmo título/franquia/variante anteriores em todos os membros e ausência de identidade já confirmada ou mídia duplicada conflitante. A variante corrigida modifica simultaneamente `model_groups.variant`, `name_proposals.variant` e os nomes de arquivo propostos; registra evento `gallery_variant_corrected_editorial`. Continua sem mudar estado da galeria, direitos, licença, mídia original, STL, R2, site ou publicação. Omissão de `corrected_variant` preserva integralmente a variante anterior e o contrato original do endpoint.

Teste isolado: `teste_name_curadoria.py` comprova variante corrigida, idempotência por CAS, rejeição de origem incorreta, auditoria e contrato antigo.

## Cache WebP persistente, sem pranchas JPG — 23/11/2026

A rota única `/thumb/{message_id}?w=256|480|960` continua sob o mesmo host. Após abrir e verificar o original físico, a prévia convertida é reutilizada da RAM ou, entre reinicializações, do diretório derivado `curadoria-local/preview-webp-cache`. O cache guarda **apenas previews WebP** indexados por SHA-256 do contrato de origem (inclui caminho, SHA da mídia, mtime, tamanho e largura), sem nomes, originais, links comerciais, pranchas JPG, nova base ou outro processo. **Até 2048 slots de 64 KiB por prévia** (limite físico aproximado de 128 MiB + 32 B por entrada), colisão rejeitada por SHA completo, escrita temporária e troca atômica. Saída maior não persiste e continua na RAM. Erro de disco não impede o preview — a renderização original continua como fallback. O cache pode ser apagado sem perda de dados editoriais ou originais.

Testes sintéticos validam reuso após limpeza da RAM, rejeição de corrupção, invalidação por mtime, WebP/ETag/304, GIF limitado e não modificação do original. *Ganho operacional precisa ser medido no host real, não inferido apenas dos testes.*

## Pranchas vivas de esculturas no MESMO host — 23/11/2026

**Visão editorial por modelo, não por JPEG:** GET /api/studio-missions/galleries?studio=Wicked&page=1&limit=12 oferece páginas com uma ficha por grupo canônico, quatro vistas distintas por SHA, contagem física e acesso aos mesmos editores e originais. Só lê SQLite mode=ro/query_only; jamais cria galeria, confirma nome, funde escultura ou altera direitos. O painel de missões agrega estes cards por estúdio; use http://127.0.0.1:8769/?studio=Wicked no computador do host para abrir diretamente Wicked. As pranchas JPG históricas podem ser exportadas manualmente, mas não são necessárias no fluxo principal. Porta e banco são os existentes; backlog de conexões do MESMO servidor ampliado para 64 para suportar miniaturas sob demanda, sem processo extra.

## Missões visuais em escala por estúdio — 23/11/2026

**Gargalo corrigido:** não escalar por revisões pontuais de poucos modelos. O mesmo TONART Curadoria Host passa a mostrar pranchas paginadas por estúdio, permitindo duas missões com a MESMA foto e os MESMOS IDs: (1) decidir quais fotografias representam a mesma escultura e variantes, (2) identificar nome, personagem e franquia com fontes editoriais. A consulta visual nunca funde esculturas nem aprova nomes automaticamente.

**Escopo real atual:** 92 estúdios com model_groups; 4.433 grupos e 8.443 fotos de studio em name_proposals, sendo 7.586 já vinculadas a grupos e 857 sem grupo. A divisão de 24 imagens por página dá 406 pranchas, não cinco fixas por estúdio. Geral +50k fica excluído. Os números são leitura do SQLite vivo e mudam conforme revisões reais.

**Contrato HTTP no MESMO host e MCP:**
- GET /api/studio-missions: lista de estúdios, fotos, grupos, nomes confirmados, páginas, duas missões.
- GET /api/studio-missions/board?studio=...&mission=grouping|naming&page=1&limit=24: lista somente leitura de fotos, SHA, estado do grupo/nome e os mesmos previews /thumb/{id}?w=256. Estúdio deve existir entre os 92, páginas e tamanho são limitados. O mecanismo usa SQLite mode=ro + query_only e não retorna caminhos de arquivos.
- A interface Curadoria dispõe de Missões visuais por estúdio. Ao selecionar uma foto, abre os editores existentes de nome ou galeria. Escritas continuam exclusivamente nos endpoints e eventos canônicos com controle otimista de revisão. Nenhum banco, Worker, servidor ou publicador novo foi criado.
- CLI studio_missions.py gera pranchas JPEG **derivadas e privadas**, reutilizando thumbnail_curadoria.thumbnail e seu cache/limites existentes. Um manifesto por estúdio registra SHA e páginas para retomar sem recalcular JPEGs idênticos. Falhas de prévia são listadas explicitamente; não há alteração de originais, galerias, nomes ou direitos.

**Execução no desktop:** apontar CLI studio_missions.py com --sqlite para espelho-telegram/curadoria-local/curadoria.sqlite3, --media-root para Downloads/telegram-2370335738-images e --out para o diretório privado reconciliacao-taxonomia-20261122/studio-missions-boards. --studio ou --max-studios servem ao smoke; sem filtro gera todos. Usar o OrdaX MCP para iniciar/monitorar o processo, não outro serviço.

**Regras obrigatórias:** mesmos nomes e álbuns não bastam para fundir esculturas. Misturas de autoria e versões exigem evidência específica. Nome confirmado não autoriza direitos, venda, publicação de tags, M5, Worker, D1, R2, Supabase nem Site. O SQLite e seus eventos são a SSOT; JPEGs e manifestos são descartáveis. Os testes test_studio_missions.py validam paginação, duas missões, modo somente leitura, proibição do Geral, caminhos seguros, retomada, SHA e invalidação após alteração editorial.


## Duas missões independentes por estúdio, sem repetir nomes por foto

A missão 1 mantém cada escultura e variante em sua galeria original; a missão
2 usa GET /api/studio-missions/identities?studio=Wicked&cursor=0&limit=24
para agrupar SOMENTE propostas textuais iguais de nome+franquia, mostrando
quantas fotos, galerias e evidências editoriais existem. O painel visual
**Nomes candidatos** foi incluído na missão 2 e permite navegar às pranchas.
Título textual não significa identidade canônica, personagem único, modelo
idêntico ou liberação comercial; acessórios, dioramas e pacotes recebem alerta
de classificação. O índice é somente leitura e não cria nova tabela,
identidade no Supabase, outra fila ou serviços; toda confirmação de nome
continua pelo cliente canônico de lote, com SHA físico e URL oficial do modelo.
Paginação 12/24/48; refazer consulta após uma alteração de nome.

A fila read-only GET /api/gallery-merge-candidates?studio=Wicked&limit=12
e a secao "Mesma estatueta? Comparar duas galerias" na UI mostram pares
com titulo, franquia e variante compativeis e mensagens proximas. Isso
**apenas prioriza inspeção de geometria**, nao indica que seja realmente
a mesma estatueta; so o endpoint de merge com prova fisica altera grupos.
A fila nao escreve no SQLite, nao cria novas tabelas nem duplica SSOT.
Decisões humanas "não é a mesma escultura" são registradas no evento
gallery_pair_distinct_sculptures pelo endpoint canônico
POST /api/reject-gallery-pair, com nota visual e CAS de AMBAS as fichas.
A fila ignora estes pares apenas enquanto as revisões permanecerem iguais;
se uma galeria mudar, o par volta para inspeção. A interface oferece
dois botões explícitos com nota obrigatória: fusão física verificada
e manutenção separada. Nenhuma decisão é automática.


## Galeria legítima de foto única, com nome JÁ confirmado

A mesma operação gallery.create (POST /api/create-gallery) permite agora
UMA foto isolada, apenas quando a identidade editorial da mensagem
está previamente confirmada com fonte HTTPS, o arquivo físico é
conferido pelo SHA-256 apresentado, a revisão CAS coincide, existe
nota visual com 65-600 caracteres e NÃO há imagem do mesmo SHA
já agrupada em outra galeria. O grupo singular fica REVISAR, mesmo
que o nome esteja confirmado: são aprovações independentes.
Registra eventos visual_singleton_reviewed e visual_gallery_audited,
fonte original Telegram e fonte de identidade (não de direitos).
Repetição da mesma operação retorna o grupo sem mudar evidências.
Sem tabelas novas, serviços adicionais, nomes/liberações automáticas
ou publicação de modelos. Para SHA igual já agrupado e variante
diferente, usar a operação específica de vínculo de variante acima.
O fluxo anterior para duas ou mais fotos permanece idêntico.

## Confirmação editorial atômica para uma galeria inteira

GET /api/gallery-identity-proof devolve grupo e provas individuais
SHA-256 + revisões de TODAS as fotos no SQLite único.
POST /api/confirm-gallery-identity exige auditoria visual histórica,
publicação HTTPS do próprio criador verificada editorialmente, descrição
de 65–700 caracteres, CAS da galeria e de cada proposta, integridade
física de TODOS os originais e variante igual entre as vistas.
Atualiza título e universo coerentemente em model_groups e
name_proposals, confirma identidade SOMENTE das imagens dessa galeria
e registra eventos e origem. Tudo é uma transação única, fail-closed.
Se foto pertença a outra variante com SHA idêntico, impede confirmação
em lote até revisão específica. Não confirma modelo comercialmente,
não muda estado da galeria, não publica arquivos, não altera media,
STL ou direitos. O editor de modelos inclui formulário para executar
a operação pela mesma API do OrdaX MCP; nada é confirmado em silêncio.

## Galeria provisória de foto única — agrupamento sem confirmar nome

POST /api/create-gallery (capacidade gallery.create) admite review_only=true
para uma fotografia avulsa com título legível no render, proposta
provavel/revisar e sem legenda Telegram estruturada. A mesma
implementação existente exige mensagem, estúdio e revisão CAS,
justificativa visual de 65–600 caracteres, SHA256 completo e conferência
física do arquivo original. Render SHA já agrupado é bloqueado,
evitando duplicar vistas de variantes. A nova ficha fica em revisar,
sem confirmar nome, franquia, pacote STL, direitos ou publicação.
A operação antiga com nome confirmado e fonte oficial HTTPS permanece
inalterada quando review_only=false. A aprovação de identidade segue
exclusivamente na segunda missão.

GET /api/gallery-singleton-candidates consulta somente fotos sem
galeria do estúdio selecionado, com limite e paginação. O aplicativo
da Curadoria apresenta fotos e pede justificativa antes de salvar
no mesmo endpoint/catálogo. Nada roda automaticamente.
Nenhuma tabela nova, daemon, índice ou writer paralelo.

## Foto Telegram avulsa que reutiliza a MESMA imagem de outra variante

A capacidade MCP gallery.relate_orphan_variant usa o MESMO host em
POST /api/relate-orphan-variant. Só pode ser usada quando uma foto ainda
sem galeria e uma foto de galeria visualmente auditada têm SHA-256
original idêntico e título/franquia compatíveis, mas variantes
de impressão explicitamente diferentes (Pre-Supported vs Unsupported).
Exige CAS da proposta avulsa e da galeria de referência, nota
editorial e verificação SHA física de ambas. Cria uma galeria
singular de VARIANTE (estado revisar), com ID determinístico e
eventos de auditoria canônicos, e relaciona ambas no próprio
curation_events (sem tabela nova). O app mostra as variantes
relacionadas. NUNCA junta os pacotes ou originais fisicamente
distintos, não aprova publicação. Repetir retorna o mesmo grupo
sem nova gravação. Não aplicar a imagens meramente parecidas.

## Cobertura incremental das impressões visuais por estúdio

GET /api/visual-fingerprint-coverage?studio=Wicked retorna total,
válidas, ausentes, falhas e política atual. O MESMO host autoriza
POST /api/scan-studio-fingerprints com {studio,limit}, lote de 1 a 128;
consulta SOMENTE o estúdio selecionado e reutiliza o scanner existente
visual_name_suggestions.scan, a mesma tabela visual_fingerprints e a
mesma política de hashing. Confere o SHA-256 físico de TODOS os
originais do lote antes de escrever. Falha fechada se uma foto ou hash
divergir. Serializa chamadas simultâneas pelo lock do próprio host;
não confirma nomes, une galerias ou publica. A UI traz controle
de cobertura/ação na missão de agrupamento. Sem daemon, fila, banco,
índice ou dependência externa novos. Teste E2E inclui HTTP,
token, limites, repetição e original adulterado.

## Impressões visuais já existentes — legendas inconsistentes

GET /api/gallery-visual-cross-caption reutiliza visual_fingerprints
dhash-ahash-v1, que JA existe no mesmo SQLite. Compara galerias do
mesmo estúdio com título ou franquia divergentes; pré-filtra por
distância Hamming e proporção, depois compara pixels físicos decodificados.
Somente renders praticamente idênticos (MAE menor ou igual a 1,5)
são candidatos de revisão humana. Não implica mesmo pacote STL.

POST /api/correct-gallery-caption exige revisão humana específica,
CAS das duas galerias, SHA-256 físico de ambos os originais e nota
editorial com no mínimo 60 caracteres. Corrige título/franquia de UMA
galeria de foto única cujo render replica a referência. Preserva
variantes, IDs, mídia e direitos. Nome/grupo ficam em estado revisar,
não confirmados. Eventos existentes registram correção e relação
visual entre as galerias; GET /api/model mostra as versões relacionadas.
Nenhum banco, daemon, mecanismo de atualização ou índice duplicado.

## Reunir fotos da MESMA estatueta entre galerias revisadas

O host canonico expoe gallery.merge_reviewed em
POST /api/merge-reviewed-galleries. A fusao nao usa nome/personagem como
prova automatica. Exige justificativa visual de 45 a 500 caracteres,
revisao CAS de AMBAS as galerias, SHA-256 fisico de TODAS as mensagens
e auditoria visual anterior. Somente mesma escultura, variante e origem.
O movimento de membros, evidencias e eventos ocorre em uma transacao
SQLite, ate 48 fotos. A galeria de origem registra alias historico no
proprio curation_events e o link antigo /api/model/{key} e resolvido.
A original permanece intocada. O novo grupo fica revisar; nomes,
franquias, licencas e publicacao NAO sao aprovados. Esculturas de poses
diferentes, armas e pecas de kits nao podem ser fundidas so pelo titulo.

## Lotes de nomes por galeria revisada (OrdaX MCP + Curadoria Host)

O cliente canônico EXISTENTE review_verified_names_batch.py também aceita
--gallery-proofs como alternativa ao modo --plan por foto. O arquivo
privado JSONL precisa de UMA linha de evidência editorial para cada galeria:
{"group_key":"24hex","studio":"Wicked","title":"Black Cat","universe":"Marvel","official_url":"https://www.patreon.com/posts/...","visual_evidence_note":"Todas as fotos originais conferidas..."}.
**Não é autoconfirmador nem ferramenta paralela:** expande a galeria em provas
SHA individuais consultando SQLite SSOT somente leitura; exige evento
visual_gallery_audited, título/estúdio/franquia/variante consistentes,
origem única, TODAS as mensagens e URL de domínio oficial do estúdio.
Reconfere cada arquivo físico SHA-256, revision CAS e o snapshot do host
com UM GET por galeria, não por foto. O mesmo --report registra progresso;
--apply envia pelo /api/review-name canônico (escrita CAS por foto), e
retomada só pula confirmadas com a mesma fonte. Limites 24 galerias/96 fotos.
Falha fechada se faltar prova ou variante; identidade editorial não concede
direitos, tags ou publicação. Nenhum outro banco, fila ou serviço.

## Histórico de auditorias não equivale a confirmação de nomes

O índice de estúdios registra groups_with_visual_audit_event como número
de galerias distintas com evento visual_gallery_audited; informa também
groups_single_photo e groups_multiple_photos. Os nomes confirmados são
contados separadamente por names_confirmed, sem aprovar automaticamente
outra identidade, variante, licença ou publicação. Wicked possui 500
eventos associados a 500 grupos (incluindo 376 com uma só foto) enquanto
a missão editorial ainda exige fontes específicas para confirmar nomes.
O painel exibe essa distinção explicitamente, sem criar outro serviço,
fila persistente ou SSOT.

## Fila de evidências das duas missões — sem segundo serviço

O mesmo host expõe GET /api/studio-missions/candidates?kind=albums|reposts&studio=<opcional>&cursor=0&limit=24. A operação fica cadastrada em /api/capabilities para o OrdaX MCP e na seção **Fila de evidências** da interface atual. Modo albums seleciona **somente álbuns com pelo menos dois SHA físicos distintos ainda livres**; retorna origem, IDs e página de acesso na prancha. Modo reposts encontra um SHA registrado idêntico a foto já presente em grupo e classifica **physical_sha_recheck_required**, **metadata_or_variant_mismatch**, **confirmed_gallery_locked**, **ambiguous_multiple_gallery_anchors** ou **source_topic_mismatch**. Qualquer retorno é somente hipótese de vinculação: uma postagem pode mudar, e SHA cadastrado não substitui verificação SHA-256 dos bytes físicos antes de usar o endpoint canônico /api/append-gallery. As duas missões compartilham IDs, não geram segundo banco, worker, fila de escrita, auto-nomeação, auto-confirmação ou aprovação de direitos. Paginação usa cursor estável por message_id, com limite 12/24/48; não retorna caminhos privados.

## Manifesto atômico por estúdio — recuperação Windows sem legado

O manifesto final manifest.json **não pode ser sobrescrito por uma lista parcial de páginas** durante regeneração de um estúdio. A Curadoria mantém manifest.progress.json (somente checkpoint descartável) enquanto processa cada prancha, e publica o manifest.json definitivo **uma única vez depois da última página**. Se o Windows bloquear a substituição final, o manifesto anterior fica intacto e o checkpoint permite retomar com SHA sem reconstruir imagens já válidas. A gravação atômica possui tentativas limitadas apenas para WinError 5/32, sem mascarar erros de permissão persistentes. O finalizador global continua lendo **somente** manifest.json e confronta cada página com a revisão SQLite atual, recusando conclusão durante mudanças em andamento. Teste simula falha de substituição e comprova recuperação sem manifesto parcial publicado.

## Cobertura completa dos tópicos Telegram — 23/11/2026

A primeira rodada de 406 pranchas cobriu os **92 estúdios com model_groups** (8.443 imagens). Auditoria posterior do SQLite mostrou **mais 21 rótulos com fotos sem model_groups (204 fotografias)**, alguns deles tópicos Topico_*, e não estúdios comprovados. O mesmo studio_missions.py agora inclui o conjunto de labels de name_proposals cujo original_topic difere de Geral + 50k, mantendo collection_type=topic_without_groups para **não inferir autoria por rótulo**. A API studio_index informa separadamente registered_studio_count, unclassified_collection_count, ungrouped_unique_media, identical_media_reposts e album_review_candidates (apenas álbuns livres com 2+ SHA diferentes). A interface não trata foto avulsa como erro: uma foto única pode representar um modelo legítimo. **Nenhuma fusão ou renomeação ocorre automaticamente.**

A ampliação é incremental: preservar os JPEGs e manifestos dos 92 estúdios, gerar **somente as 21 coleções adicionais** via opção existente --studio repetida na CLI, e executar --finalize-only para validar a cobertura expandida contra SQLite vivo. Teste dedicado garante que os SHA/JPEG anteriores não são reescritos, que as duplicatas físicas não inflam a contagem de imagens únicas e que Geral + 50k permanece explicitamente fora da missão.

## Geração paralela segura das pranchas — 23/11/2026

Para evitar que um estúdio com centenas de fotos atrase os demais, a mesma CLI studio_missions.py agora permite **até 8 shards** com atribuição estável de cada estúdio por SHA-256 do seu nome: por exemplo, quatro processos supervisionados OrdaX MCP usam --shards 4 e --shard-index 0, 1, 2 e 3, respectivamente. Cada processo recebe estúdios distintos, usa o mesmo destino privado, atualiza somente seus próprios manifestos e retoma pranchas pelo fingerprint/sha. Não rodar o gerador serial junto com shards; não iniciar o mesmo shard duas vezes.

Nenhum processo parcial pode publicar o índice de conclusão. Quando os shards terminarem, executar a mesma CLI com --finalize-only para **conferir novamente 92 estúdios, 406 arquivos JPEG, hashes e totais**, sem criar outro catálogo nem tocar o SQLite. Se faltarem pranchas, SHA não coincidir, o SQLite tiver nova revisão de grupo/nome ou houver previews com falha, a finalização permanece bloqueada (exit 2), informando exatamente os estúdios incompletos. O finalizador recalcula a assinatura de cada página contra o SQLite VIVO, pois um JPEG antigo pode continuar fisicamente íntegro enquanto a curadoria mudou. No modo serial completo, a mesma checagem é feita ao final; testes filtrados não sobrescrevem o índice global.

## Curadoria visual produtiva: 24 galerias, filas independentes e diagnóstico por imagem — 22/11/2026

**Operação física, não apenas protótipo:** duas remessas editoriais do mesmo host TONART foram processadas sobre **24 galerias e 175 fotos originais**, com inspeção das vistas completas em pranchas coletivas privadas e notas específicas por …10176 tokens truncated…plicações em lote de títulos e IDs específicos estão em scripts de diagnóstico **locais privados**, não versionados no GitHub, porque contêm referências à biblioteca privada do Telegram. Não existe uma segunda base canônica.

`teste_catalogo_oficial.py` cobre ID/estúdio, fonte HTTPS, idempotência, conservação após alteração de origem, preservação de edição manual, nenhuma confirmação ou cópia automática e limpeza do banco temporário no Windows.

**Licenciamento de uso comercial:** a existência do modelo no Cults3D/Patreon e a identificação da imagem não autorizam a TONART a reproduzir renders ou vender impressões. O plano pessoal do Abe3D informa uso pessoal, enquanto há opção específica para comercialização física; direitos de uso e limites devem ser verificados antes de publicar qualquer imagem ou produto. O manifesto permanece com `aprovado_para_publicacao=false` em todas as entradas.

## Títulos legíveis nos renders e páginas específicas dos criadores

A etapa de nomeação aceita transcrever **nomes impressos no próprio cartaz** por meio de `suggest_name_from_embedded_text`; não confundir com OCR automático nem com identidade confirmada. O tópico compartilhado `Merge Project Figures _ Nostalgic Studios` contém imagens de mais de uma marca. Por isso, o estúdio deve ser atribuído pela evidência da imagem e não por herança indiscriminada do nome do tópico.

A operação `attach_catalog_reference(db_path, message_id, expected_title, source_url, note)` associa à proposta `provavel` uma página **específica** do produto no catálogo do estúdio, sem promover seu status. Aceita apenas HTTPS, título esperado idêntico, provedor associado ao estúdio nesse tópico e nenhuma referência preexistente conflitante. URLs iguais são idempotentes; links divergentes exigem revisão explícita. Atualiza revisão e auditoria no **mesmo SQLite local**. O teste `teste_catalogo_oficial.py` cobre vínculo, conflitos, idempotência e ausência de aprovação/materialização automática.

Na inspeção privada de 19/11/2026, foram transcritos 17 títulos claros do lote Merge Project/Nostalgic e ligadas cinco páginas específicas do criador no Cults3D (Gallantmon, Obelisk the Tormentor, Matt and MetalGarurumon, Peppercat e Rokusho). As correspondências **permanecem propostas**, não se tornando automaticamente catálogos públicos, arquivos aprovados ou licenças de comercialização. Os IDs locais, as fotos do Telegram e os scripts de ingestão de dados privados permanecem fora do GitHub.

As regras de lançamento são invariantes: não alterar as fotos originais nem o downloader, não enviar o SQLite/manifesto privado para o repositório, não agrupar imagens apenas porque exibem o mesmo personagem, e não marcar `aprovado_para_publicacao=true` sem revisão de direitos de imagem e autorização comercial.

### Selecionar álbuns pendentes sem digitar IDs

Em **Galerias de modelos**, escolha um estúdio e use **Álbuns com fotos ainda livres**. A interface consulta `GET /api/album-candidates?topic=...`, apresenta álbuns com pelo menos duas imagens livres (até 40 fotos no total), incluindo álbuns parcialmente agrupados, e permite pré-visualizar todas as fotos. Nessas situações, as fotografias já vinculadas aparecem apenas como contexto, com indicação da variante existente; **somente IDs ainda livres são preenchidos**. **Pré-visualizar e preencher IDs** mostra uma caixa de seleção para cada foto livre. Desmarcar uma vista retira somente seu ID do formulário (sem alterar SQLite ou fotos); imagens já agrupadas ficam visíveis, mas não selecionáveis. Assim, busto, corpo completo e poses distintas podem ser separados sem copiar ou apagar IDs manualmente. Depois da conferência, o usuário ainda precisa clicar em **Criar galeria revisada**. Nenhuma fusão acontece na leitura ou por proximidade/mesmo personagem. Fotos de variantes ou escalas diferentes previamente agrupadas nunca são reatribuídas pela pré-visualização. A escolha de uma escultura comum continua exigindo revisão visual explícita.

Legendas livres com títulos legíveis, mesmo sem os marcadores estruturados, podem gerar proposta auditável por `suggest_name_from_telegram_caption(...)`. O título, a versão e o universo informados devem aparecer na legenda original e o estúdio deve corresponder ao tópico. Essa função não sobrescreve nomes anteriores, registra a mensagem como evidência e mantém `status=provavel`; nunca confirma identidade ou autorização de venda. Uma proposta segura em imagem de galeria revisada pode ser herdada pelas demais vistas e atualizar o rótulo da ficha.

O teste `teste_model_gallery.py` cobre os candidatos, a preservação de membros em álbuns parcialmente agrupados e a ausência de agrupamento implícito. `teste_name_curadoria.py` cobre legendas livres, conflitos e proteção contra reprocessamento. Se as legendas de um mesmo álbum concordarem em estúdio, título e universo, mas apresentarem variantes/escala diferentes, `name_curadoria.extract_candidates` propõe somente a **identidade comum** para as fotos sem legenda (`telegram_album_shared_identity`, confiança 0,55). O campo `variant` permanece vazio nessas fotos; grupos distintos já existentes não são fundidos, e propostas revisadas/confirmadas não são sobrescritas. A sincronização reconhece dados já indexados sem exigir novo download.

O conteúdo privado de álbuns e nomes permanece exclusivamente no SQLite/manifesto local.

**Arquivos repetidos e proveniência.** Várias mensagens podem apontar para o mesmo `sha256` e o mesmo arquivo físico (inclusive com legendas/versões divergentes). O painel preserva todas as mensagens no SQLite e no manifesto, mas mostra **um único preview para cada arquivo SHA-256 por galeria** e distingue `unique_photo_count` de `image_count`. O total `photos_in_galleries` da API legada representa **mensagens vinculadas**, não fotos visuais distintas. Uma identidade conflitante para o mesmo arquivo não deve ser confirmada sem evidência adicional; não unir diferentes produtos apenas pelo hash. O detalhe da galeria agora apresenta um aviso quando o mesmo SHA-256 aparece com títulos diferentes em mensagens do SQLite, e destaca galerias cujas várias mensagens correspondem a apenas um arquivo físico. Isso é apenas um alerta de revisão; não muda propostas, vínculos ou estados comerciais.


## Galerias: reunir diferentes vistas da MESMA escultura (sem duplicar o produto)

A curadoria possui **três etapas integradas**, que podem avançar ao mesmo tempo no **mesmo banco SQLite local**:

1. **Nomeação pelas legendas e álbuns do Telegram**; nunca presumir nome por proximidade de mensagem.
2. **Pesquisa dos sem nome nos sites do escultor**, incluindo títulos impressos nos cartazes e publicações específicas; registros não verificados continuam `provavel` ou `revisar`.
3. **Consolidação de imagens por escultura e base, incluindo ângulos e fotos promocionais**, independentemente de o título já estar identificado. Uma escultura/kit corresponde a **uma ficha de galeria com várias imagens**, não a várias fichas de produto.

A implementação `model_gallery.py` **reutiliza** `model_groups`, `model_group_members`, `model_group_evidence` e `curation_events` de `smart_curadoria.py`: nenhum segundo banco ou SSOT. A operação `register_visual_gallery(db_path, message_ids, topic, note)` permite 2–40 IDs visualmente revisados. Impõe um único tópico, nomes/versões não contraditórios, rejeita mover imagens de outros grupos já revisados ou confirmados, registra evidência por mensagem e é idempotente. O estado do grupo é **`revisar`**, nunca `confirmado` automaticamente. Uma imagem ainda não nomeada pode fazer parte de uma galeria. A sincronização Telegram não desfaz revisões de ângulos; títulos de grupos provisórios são atualizados quando chega um nome consistente, sem alterar os membros.

Na interface local, a aba **Galerias de modelos** apresenta por padrão **apenas fichas com pelo menos duas imagens** (`GET /api/models?min_images=2`), com a galeria de fotos completa ao abrir a ficha. A aba **Nomes propostos** indica quando uma mensagem já pertence a uma galeria, permitindo navegar até ela. A ação **Criar galeria revisada** usa `POST /api/create-gallery` com validação local de Origin e token CSRF existente, sendo necessário informar o tópico e os IDs das fotos que comprovadamente pertencem à mesma escultura.

**Prova inicial no Windows, 19/11/2026:** revisão visual de 24 conjuntos de fotos do tópico Abe3D (4 vistas cada, 96 imagens), incluindo exemplos de Psylocke, Rogue, Chun-Li Bikini, Bowsette, Emma Frost e também fichas ainda sem nome. Nenhuma identidade editorial adicional foi aprovada, nenhuma foto original foi movida e nenhum produto foi publicado. As fotos particulares e listas de IDs locais não são enviadas ao GitHub; somente o código e os testes.

O teste `teste_model_gallery.py` usa imagens fictícias para cobrir criação, repetição idempotente, duas vistas numa mesma ficha, recusa de tópicos e nomes conflitantes, proteção contra reprocessamento por legenda, atualização posterior de título, ausência de liberação comercial e bytes originais intactos. `teste_smart_curadoria.py` continua cobrindo os agrupamentos conservadores existentes por álbum ou hash exato.

**Atenção:** a mesma personagem em duas esculturas diferentes gera **fichas diferentes**; `modelo`, `versão` e `pose` não são deduzidos apenas pela aparência. Uma galeria é organização visual local e não certificação de autorização comercial.

### Manifesto com ID de galeria para importação futura

O CSV privado `manifesto-nomes-propostos.csv` continua preservando uma linha por imagem original (rastreabilidade), mas agora exporta `galeria_id`, `galeria_nome`, `fotos_na_galeria` e `prova_agrupamento`. **Várias linhas com o mesmo `galeria_id` representam uma única estatueta e suas imagens/ângulos**, não produtos independentes. Imagens sem galeria mantêm esses campos vazios. Isso prepara a futura reconciliação do catálogo comercial sem modificar as fontes de produção.

No lote de teste real, `msg17712`, `msg17713`, `msg17714`, `msg17715` compartilham o mesmo `galeria_id`, com `fotos_na_galeria=4` e nome pendente. O grupo Psylocke também exporta quatro vistas com uma identidade de galeria. **Todas as linhas permanecem `aprovado_para_publicacao=false`**. A exportação, incluindo os dados privados, é feita somente no desktop do usuário e nunca enviada ao GitHub.

Os novos endpoints e a interface foram verificados no serviço local: `GET /api/stats` inclui `galleries`, `GET /api/models?min_images=2` lista apenas fichas com várias imagens, `GET /api/names` fornece `gallery_key`/`gallery_image_count`, e `POST /api/create-gallery` conserva idempotência com token CSRF e `Origin` locais.

## Continuidade entre nomeação e galeria revisada

A rotina **`propagate_reviewed_gallery_names`** permite que uma proposta de nome presente em uma foto seja herdada pelas outras vistas **da mesma galeria já revisada visualmente**. Essa operação:

- só considera grupos em `revisar` cujos membros têm `match_reason='reviewed_angles'`, nunca agrupamentos automáticos baseados apenas em personagem ou proximidade;
- exige que todos os membros já nomeados concordem em estúdio, título, universo e variante; qualquer conflito suspende a propagação;
- preenche somente membros sem título e ainda em revisão, preservando edições manuais, fontes oficiais preexistentes e nomes confirmados;
- grava `status=provavel`, evidência `gallery_name_inherited` e mensagem de origem rastreável; **nunca confirma, licencia, publica ou materializa arquivos**;
- preserva a proposta herdada quando o downloader sincroniza novas legendas e é idempotente em novas execuções.

O serviço local chama a rotina no mesmo ciclo incremental que processa os nomes e atualiza os rótulos das galerias. `teste_model_gallery.py` foi ampliado para comprovar a herança de nome, idempotência, rastreabilidade, preservação após mudança na legenda Telegram e inexistência de aprovação automática.

**Rodada de 19/11/2026**: oito novas galerias do Abe3D foram revisadas e criadas localmente, com quatro vistas cada: Morrigan, Polaris, Power Girl, Elektra, Ada Wong, Claire Redfield, Tatsumaki e Darth Talon. O lote acrescentou **8 galerias e 32 fotos**, sem conflitos; são agora **32 galerias visualmente revisadas** acumuladas no banco local. Essas associações com IDs privados do Telegram não são versionadas.

O serviço reiniciou pelo **OrdaX MCP nativo**, com `computer.process_start` supervisionado, e foi verificado com `GET /health` e `GET /api/stats` retornando **HTTP 200**. No snapshot de verificação, `6101` imagens indexadas e `470` galerias com duas ou mais imagens, das quais `32` visualmente revisadas. Os números podem aumentar quando o downloader adiciona imagens; **nenhuma imagem ou catálogo comercial foi publicado**.

### Nomear uma foto diretamente pela galeria

Ao abrir uma ficha em **Galerias de modelos**, cada vista exibe o botão **Nomear esta foto**. Ele abre a mesma imagem na aba **Nomes propostos**, reutilizando os campos e a revisão existentes — nenhuma segunda tela de cadastro, tabela ou API de edição foi criada. Depois que o nome dessa vista for salvo, a rotina de herança acima oferece a mesma proposta às outras fotos **somente se a galeria tiver sido revisada visualmente**. A galeria continua não aprovada para publicação até a verificação de fonte e direitos.

`teste_ui.py` e `node --check` foram aprovados no Windows após a atualização.

## Redução de duplicatas e pesquisa por galeria — rodada de 19/11/2026

A Curadoria agora oferece **Exibir apenas galerias sem nome** na aba **Galerias de modelos**, consumindo `GET /api/models?min_images=2&unnamed=1`. O filtro não altera dados, imagens ou fontes de produção; utiliza as próprias fichas existentes em `model_groups` e identifica as que ainda têm o título provisório `Modelo sem nome #...`. Ao nomear uma vista de uma galeria já revisada visualmente, o nome pode ser herdado como **proposta** pelas demais imagens da mesma escultura.

**Execução real no Windows:** os painéis privados de imagens não agrupadas do Abe3D foram inspecionados visualmente; **43 conjuntos adicionais de quatro fotos (172 imagens)** foram associados às tabelas canônicas pelo mesmo `model_gallery.register_visual_gallery`. Uma imagem sem evidência de outras vistas foi mantida solta. O acumulado aumentou para **75 galerias revisadas visualmente / 300 fotos**. O script privado com a seleção de IDs não é versionado e os originais permanecem intocados.

A segunda etapa utilizou páginas específicas no catálogo oficial do Abe3D (Cults3D) para **seis novas identidades candidatas**: Chun-Li, Harley Quinn, Rogue, Scarlet Witch, Emma Frost e Storm. Uma proposta foi gravada por galeria, com `status=provavel`, `evidence_type=studio_catalog_visual_candidate` e URL da publicação; a rotina de herança sugeriu o mesmo nome às outras vistas, sem aprovação automática. O título/personagem publicado pelo criador é evidência de pesquisa, não prova definitiva da mesma escultura nem licença comercial.

**Verificações realizadas**:

- `teste_model_gallery.py`, `teste_ui.py`, `teste_smart_curadoria.py`, `node --check` e `py_compile` aprovados.
- O serviço foi reiniciado pelo OrdaX MCP supervisionado e os endpoints `/health`, `/api/models`, `/api/stats` e a interface responderam HTTP 200.
- Filtro testado no Abe3D: 78 galerias com múltiplas fotos, sendo 45 provisoriamente sem nome no checkpoint.
- O manifesto CSV **privado** foi reexportado com 6.703 registros no último checkpoint, todos com `aprovado_para_publicacao=false`. As cinco imagens anteriormente confirmadas passaram novamente no cotejo SHA-256 entre original e hardlink.
- Nenhuma imagem, dado sensível do Telegram, SQLite, lista privada de IDs ou CSV preenchido foi enviado ao GitHub; nenhuma foto foi publicada ou produto da TONART modificado.

Os totais variam porque o downloader continua acrescentando imagens e galerias de outras fontes ao banco. A validação de identidade exata e dos direitos comerciais segue como etapa distinta da organização visual.



### Contrato dinâmico host ↔ OrdaX MCP

O host anuncia `GET /api/capabilities` (versão `tonart.curadoria.host/2`)
com os mesmos caminhos semânticos que sua interface utiliza. Isso permite
que clientes autorizados (inclusive o OrdaX MCP, via acesso local existente)
descubram operações e seus efeitos sem espelhar regras de curadoria no Runtime.

- `GET /api/gallery-candidates?group_key=...&page=...&q=...` oferece fotos
  ainda livres do mesmo álbum, ou busca textual explícita no tópico.
- `POST /api/append-gallery` recebe `group_key`, `revision` e
  `message_ids`, faz inclusão atômica e não cria outra ficha. Se ultrapassar
  500 itens por requisição, repetir em lotes usando a nova revisão retornada.
- A interface usa `gallery_ui.js` e as mesmas rotas, com seleção de fotos,
  paginação e inclusão na prancha existente. A criação inicial de álbuns
  também usa lotes de 500 e continua incrementalmente.

A limitação de lote é de transporte/transação, não um limite de tamanho
de galeria. Nomes contraditórios, tópicos diferentes, revisão concorrente,
grupo confirmado e imagens já pertencentes a outras galerias bloqueiam
a operação. Não sincronizar imagens ou fichas com D1/R2 automaticamente.

## Host MCP-first: pranchas e conciliacao de catalogo

O **host local da Curadoria** e a unica interface de operacao de nomes, fotos,
pranchas e agrupamento do Telegram. Nao criar outro aplicativo ou SQLite para
essa funcao. A API e vinculada a `127.0.0.1:8769` e continua privada.

- `GET /api/models?limit=48&min_images=1` lista grupos, inclusive os de uma
  unica foto. O checkbox da interface permite restringir a multiplos angulos.
- `GET /api/model/<group_key>` retorna o mesmo grupo com imagens, legendas,
  vinculos de album e provas, usado pelo botao **Abrir prancha ampliada**.
  A prancha deduplica apenas a visualizacao por SHA; mensagens permanecem
  no SQLite original e podem ser abertas individualmente.
- `GET /api/album-candidates?topic=<estudio>` mostra albuns parcialmente
  agrupados; a revisao interativa existente decide os IDs de fotos livres.
- `GET /api/catalog-sync` compara **somente leitura** com a vitrine
  `catalogo.tonartstudio.com.br`, usando IDs de galeria em vez de nome
  aproximado. Rejeita paginas incompletas/duplicadas e faz no maximo uma
  coleta publica por host a cada 30 minutos. Responde `local_only`,
  `site_only`, `differences` e totais por estudio; nunca escreve D1/R2.

O **OrdaX MCP** usa as capacidades existentes de terminal, observacao de
tela e navegador para chamar estas rotas locais e revisar as pranchas. Nao
adicionar um segundo Runtime/Worker, servidor publico, nem expor o SQLite via
rede. A acao POST /api/propagate-gallery-name reaproveita a funcao canonica
de heranca de nome apenas para vistas reviewed_angles, recusa identidades
conflitantes e so escreve propostas provavel em fotos ainda sem nome.
Edicoes continuam nas rotas ja existentes `/api/review-name`,
`/api/review-model`, `/api/create-gallery`, com token de origem local,
revisoes otimistas, evidencia e proibicao de mesclar esculturas diferentes.

**Sincronizar nao e publicar automaticamente:** diferencas ficam na fila
de revisao. Correcao de fichas existentes utiliza o pre-publicador e os
fluxos can?nicos de D1/R2 com prova de SHA, grupo, variante, gallery_version,
revisao e grant de previa quando necessario. Modelos `revisar` ou
`provavel` nao se tornam confirmados; `published=0`, direitos e gate
de licenca permanecem preservados. Nenhuma alteracao do site, D1 ou R2
acontece por uma chamada de leitura do host.

Teste offline:
`python -m unittest -v teste_catalog_sync_status teste_ui
teste_smart_curadoria teste_model_gallery teste_name_curadoria`

## Host Windows persistente (independente do OrdaX MCP)

Copie `INICIAR_CURADORIA.ps1` junto com `tonart_curadoria.py` para a pasta de curadoria
existente (onde fica `.venv`) e execute uma vez:
`powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\INICIAR_CURADORIA.ps1 -NoBrowser`.

O comando registra a única tarefa do Windows **TONART Curadoria Host**,
iniciada no logon e com restart em falha, executando diretamente
`.venv\Scripts\pythonw.exe tonart_curadoria.py`. O menu e o
`INICIAR_LOCAL.cmd` acionam a mesma tarefa; não criam outro servidor.

O Agendador mantém o processo independente do ciclo de vida do OrdaX MCP.
O host segue na porta loopback 8769 e reutiliza o mesmo SQLite,
token local, imagens e galerias, sem duplicar serviços e sem publicação
automática. Tarefas homônimas com outro owner/comando são recusadas.
Para desinstalação intencional: `INICIAR_CURADORIA.ps1 -Uninstall`.

## Conciliação pública com limite de leituras

A comparação host/site é somente leitura e deve ser solicitada explicitamente pelo operador. Uma varredura paginada da API pública consome leituras do D1; o inventário íntegro verificado é reutilizado em memória por seis horas, com horário da observação visível na interface.

Se a origem retornar erro ou dados incompletos, o host responde HTTP 503 e o código catalog_upstream_unavailable com retry_after_seconds, sem inferir que o catálogo está vazio ou divergente. O cooldown de 30 minutos impede novas varreduras enquanto a origem estiver indisponível. Nenhuma ficha é aprovada, publicada ou replicada no D1/R2 por esta operação. O cooldown reside apenas na memória do único processo supervisionado do host.


## Escala e operação do host — 22/11/2026

- **Miniaturas sem escrever novas imagens no disco:** o endpoint `/thumb/<id>?w=256|480|960` reduz sob demanda os originais a WebP. A cache é LRU em RAM, limitada a 512 entradas / 24 MiB, com até 3 decodificações simultâneas. ETag, HTTP 304 e cache privado por 600 segundos reduzem tráfego repetido; clique na imagem continua abrindo `/media/<id>` com resolução original.
- **Prancha escalável:** galeria agrupada abre a prancha nativa, deduplica imagens por SHA-256 e exibe no máximo 24 por página, com navegação. **Abrir prancha do álbum** na tela de nomes usa `GET /api/telegram-album/<id>` e mostra a coleção de mídia original com correspondência exata de chat, tópico e álbum, mesmo quando não existe galeria aprovada. Limite de 100 mídias por consulta; **álbum não prova uma só escultura**, portanto leitura da prancha não cria grupos nem revisões. Clique na foto abre o original em resolução integral.
- **Consultas puras:** `/api/stats`, `/api/items`, `/api/names`, `/api/models`, `/api/gallery-candidates`, `/api/album-candidates` e sugestões visuais leem SQLite em modo somente leitura. Apenas o ciclo de ingestão incremental e as operações de revisão explícitas podem modificar o SQLite local.
- **MCP com contrato comum:** `/api/capabilities` declara a operação `images.thumbnail` e `system.performance`; `/api/performance` mostra acertos, falhas, bytes e evicções da cache. O MCP deve usar esses contratos de host sem serviços, pastas, banco ou indexadores paralelos.
- **Fonte e limites:** o download Telegram e a publicação do catálogo pertencem aos owners existentes; manter `Geral +50k` e outros estúdios fora de intervenções concorrentes; jamais publicar propostas como direitos verificados. Os controles funcionam mesmo com dezenas de milhares de mensagens porque não varrem/reexportam a coleção por clique.

