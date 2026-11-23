# Curadoria Visual TONART — aplicativo local

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

**Operação física, não apenas protótipo:** duas remessas editoriais do mesmo host TONART foram processadas sobre **24 galerias e 175 fotos originais**, com inspeção das vistas completas em pranchas coletivas privadas e notas específicas por galeria, sem reingestão nem publicação comercial. Remessa 1 (`105bec973c359099f031ce18a2de5bf4f76a3e7b94a7d4bcf08a369142931a30`): 104 fotos, 11 decisões `same_sculpture` e uma `needs_more_evidence` para **The Mummy** (personagens isolados e versões de diorama). Remessa 2 (`4dd83599cf5c97b65d9b9398520ad13725a8322974bbf9db46b7da097b7a4da8`): 71 fotos, 9 decisões `same_sculpture` e três `needs_more_evidence` para **Venomized Iron-Man** (alternativas de cabeça/corpo), **Grommash Hellscream** (imagem colorida divergente) e **Mr. Game & Watch** (peças azuis sem montagem identificável). Uma miniatura de Carnage falhou na prancha, mas foi consultada novamente (HTTP 200, 50 ms) e inspecionada **antes** da confirmação. As duas remessas tiveram recibo HTTP 200 e commit atômico (1,21 s e 2,97 s); o replay real da primeira retornou `replayed=true` sem eventos duplicados. Nenhuma decisão confere licença, identidade comercial ou publicação.

**Fila com lanes separadas, mesma SSOT:** `GET /api/legacy-album-audit?state=new` lista só galerias nunca revisadas (`audited=0 AND attention=0`), `state=attention` lista pendências já justificadas (`audited=0 AND attention=1`), `state=pending` mantém ambas para compatibilidade, além de `state=audited` e `state=all`. A interface abre em **Aguardando primeira revisão** e oferece **Exigem investigação adicional**, evitando revisar repetidamente os mesmos quatro casos ambíguos. A mesma consulta SQL `AGG`, paginação por cursor, amostragem visual e API do OrdaX MCP foram reaproveitadas; nenhuma tabela, serviço, banco ou duplicação de regra foi criada. Testes sintéticos de classificação, filtros, HTTP e HTML passaram. Após ativação física, os totais eram **371 inéditas + 4 em investigação = 375 pendentes**, **187 auditadas**, total histórico **562**.

**Diagnóstico por imagem sem logs persistidos:** `thumbnail_curadoria.py` mantém no mesmo `GET /api/performance` um array **limitado a oito** `slow_previews` na RAM, contendo ID numérico local, formato, tamanho em KiB, largura solicitada e tempos (abertura, decode/resize, WebP e total) para imagens com custo de processamento a partir de 500 ms. Não registra nomes de arquivos, caminhos completos, hashes, imagens, SQL ou arquivos de log; o cache continua limitado a 512 itens / 24 MiB e três decodificadores. O motor e `teste_thumbnail_curadoria.py` passaram regressões de JPG/WebP/GIF, ETag/304 e política de limites. Antes da melhoria, 166 miniaturas processadas registraram média 834 ms e pico 15,6 s, sem fila relevante; a biblioteca de 175 fotos revistas continha somente JPEGs pequenos (mediana ~0,12 MiB, máximo ~0,29 MiB), portanto o pico não se explica por arquivos gigantes. Após ativação, uma amostra fria controlada de 12 JPEGs com três clientes resultou em **12 HTTP 200, 0,47 s no total, máximo de processamento 123,1 ms e nenhuma amostra lenta**. Isso demonstra funcionamento da telemetria, **não** prova eliminação dos picos transitórios.

**Garantias e ownership:** todas as mudanças foram validadas em código isolado, publicadas em `tonecosstudio/tonecosstudio/main` e sincronizadas no Windows por comparação de SHA e troca atômica, reiniciando exclusivamente `TONART Curadoria Host` quando necessário. O SQLite `curadoria-local/curadoria.sqlite3` permaneceu `PRAGMA quick_check(1)=ok` com **38.598 mídias registradas**, sem mover originais e sem alterações públicas no Site/D1/R2. Nenhuma ação no OrdaX Runtime foi necessária: as capacidades existentes executaram os lotes e verificações.



## Sincronização incremental por transações curtas — 22/11/2026

A `tonart_curadoria.sync()` foi ajustada na **mesma implementação canônica**: uma sincronização grande do Telegram não mantém mais uma transação de escrita aberta até terminar todas as imagens. Depois do pré-filtro incremental, o host executa `SYNC_WRITE_BATCH = 128` alterações por transação SQLite e comita cada bloco antes de iniciar o seguinte. O processamento continua em ordem crescente de `message_id`, usa `ON CONFLICT ... WHERE` já existente para evitar sobrescritas desnecessárias, e preserva o estado editorial/annotations. Nenhuma nova tabela, fila, worker, cópia, serviço, cache persistente ou arquivo da origem é criado.

A estratégia de retomada continua utilizando o maior `message_id` confirmado no SQLite menos a janela de reconciliação já existente. **Teste sintético `teste_sync_write_batches.py`:** lote de 305 imagens; falha injetada antes do segundo escritor deixou 128 registros completos, uma execução seguinte importou os 177 restantes em duas transações, uma execução sem mudanças não abriu writer, e uma legenda de origem alterada resultou em exatamente uma atualização. `PRAGMA quick_check(1)=ok`. O teste não acessou nem alterou a biblioteca privada real.

**Instalação física:** atualização de `tonart_curadoria.py` e do teste correspondente via CAS/SHA, com validação do owner da tarefa e disponibilidade momentânea do writer, seguida de restart controlado **somente** da tarefa `TONART Curadoria Host`. `/health` e `/api/capabilities` continuaram funcionando. Essa alteração reduz a duração de locks gerados pela importação incremental; **não comprova que toda a contenção intermitente do SQLite foi eliminada**, pois outros caminhos de escrita continuam usando transações próprias. Monitorar a duração real antes de elevar timeouts, ampliar concorrência ou criar outro processo. Site/D1/R2 permanecem somente leitura nesse fluxo.



## Remessas editoriais atômicas e idempotentes — 22/11/2026

O host privado existente `http://127.0.0.1:8769` agora dispõe de **remessa editorial** em `Fila de revisão → Auditar galerias antigas → Revisão editorial em lote`. Cada galeria requer abertura da prancha completa, visita de todas as páginas, caixa de confirmação, decisão **individual** (`same_sculpture`, `different_sculptures` ou `needs_more_evidence`) e justificativa própria de 15–500 caracteres. A seleção visual e as anotações não são aprovadas automaticamente; o operador pode revisar, retirar ou limpar os itens **antes** de registrar.

**Contrato de UI e OrdaX MCP:** `POST /api/audit-legacy-galleries-batch` (`gallery.legacy_batch_review`, `batch_max=12`, `atomic=true`). Cada item contém `group_key`, `revision`, `decision`, `note`, `member_ids`, `sha256s`, obtidos da ficha completa `GET /api/model/{group_key}` e não das miniaturas do cartão. A escrita acontece na função **canônica** `legacy_album_audit.record_reviews_batch`, reaproveitando `_record_review_tx` do endpoint de revisão individual. `BEGIN IMMEDIATE`, revisão otimista, IDs ordenados, foto e SHA-256 exatos, estúdio autorizado e ausência de aprovação comercial são checados em uma única transação. Se qualquer grupo divergir ou estiver já auditado, **toda a remessa faz rollback**; nenhuma relação de grupo ou mídia original é alterada.

**Recuperação idempotente de resposta perdida:** a remessa recebe `batch_id` SHA-256 determinístico de decisões/revisões/notas/fotos/hashes, independente da ordem de envio dos grupos. Os eventos `curation_events` já existentes guardam `batch_id` e `batch_size`; não foram criadas tabelas nem bancos paralelos. Reenviar **exatamente a mesma remessa** retorna `replayed=true` com o recibo canônico, sem incrementar revisões ou duplicar eventos, inclusive quando o commit anterior terminou mas a resposta HTTP foi perdida. Conteúdo alterado, hashes diferentes ou uma edição posterior não são interpretados como repetição válida. Conflitos de lock do SQLite retornam **HTTP 409**, com mensagem de concorrência, não 500. O bloqueio intermitente do SQLite **não foi eliminado nesta etapa**; a proteção torna a operação mais segura, mas a causa e a duração de transações concorrentes ainda exigem diagnóstico.

**E2Es no Desktop autorizado:** `teste_legacy_batch_review.py` passou transações atômicas, tentativa com revisão e SHA desatualizados, galeria duplicada ou reservada, autenticação Origin/CSRF, respostas HTTP 200/403/409, repetição idempotente com ordem invertida, impedimento de replay para remessa diferente e prova de nenhuma publicação. `teste_legacy_album_audit.py`, `teste_legacy_gallery_split.py` e `teste_ui.py` também passaram. A versão foi sincronizada à tarefa única `TONART Curadoria Host`, mediante verificação CAS dos hashes e restart controlado.

**Primeira remessa real:** inspeção visual de **30 imagens** na prancha nativa, em três grupos de Luftmensch: `Muradin Bronzebeard` (20290–20299), `Deathwing` (20220–20229) e `Genn Greymane` (20420–20429). As três decisões `same_sculpture` foram gravadas e verificadas em leitura independente, cada galeria passou de revisão 0 para 1 e contém exatamente um `visual_gallery_audited`. A verificação final apurou **167 auditadas / 395 pendentes**, total histórico 562; **38.598 assets**, `PRAGMA quick_check(1)=ok`, tarefa `Running` e um listener local. A execução de verificação excedeu o timeout depois do commit, justificando a melhoria de recibos idempotentes para **remessas futuras**. Nenhuma imagem, licença, produto público/D1/R2 ou galeria do tópico reservado foi publicada ou modificada.



## Miniaturas escaláveis e telemetria de decodificação — 22/11/2026

O mecanismo canônico de miniaturas do host, `thumbnail_curadoria.py`, foi aprimorado **sem criar serviço paralelo ou alterar mídia de origem**. A interface `curadoria.js` utiliza exclusivamente `/thumb/{message_id}?w=256|480|960` para grades e pranchas. Se a miniatura não puder ser gerada, mostra um pequeno **placeholder SVG local** (CSP `img-src data:`) e não requisita automaticamente a imagem original em tamanho integral; o acesso manual à origem permanece disponível nas fichas. Cache permanece **somente RAM**, limitado a 512 itens / 24 MiB, com no máximo três decodificadores simultâneos.

Uma foto real da Kuton Sculpts (`msg_23137.gif`) tinha **60.187.954 bytes, 1.024×1.024 px e 299 quadros**, e recebia HTTP 503 pela limitação geral de 25 MiB. A política agora admite **apenas GIF realmente identificado por assinatura GIF87a/GIF89a até 64 MiB**, verificando novamente o formato Pillow, o teto de 36 milhões de pixels e decodificando **somente o primeiro quadro**. Outros tipos continuam com teto de 25 MiB. A imagem real produziu WebP de **13.902 bytes** em **168,6 ms** no teste isolado; a instalação ativa confirmou HTTP 200 e mesmo resultado em bytes, sem tocar arquivo original. Testes sintéticos cobrem extensão disfarçada, GIF inválido, GIF acima de 64 MiB, ETag/304 e ausência de escritas via GET.

Para diagnosticar carga de milhares de imagens, `GET /api/performance` mantém contadores *em memória* `active_decoders`, `queue_wait_samples`, `queue_wait_ms_total/max`, `process_samples`, `process_ms_total/max/mean`, além de hits, misses, falhas e limites. Rejeições precoces de origem também são contadas, antes da decodificação. Não há persistência de caminho privado, conteúdo de fotos, identificação pessoal, novo SQL ou polling periódico. Em verificação física de 32 miniaturas frias com 6 clientes: **32/32 HTTP 200**, **0,94 s** de tempo total, espera máxima **57,2 ms**, processamento médio **56,3 ms**, nenhuma falha, `active_decoders=0` no encerramento; `PRAGMA quick_check(1)=ok` e 38.598 assets preservados. Teste maior anterior de 96 miniaturas teve pico intermitente de 36,69 s no primeiro carregamento e 0,65 s após cache; outra medição com 48 miniaturas de 480 px levou 0,92 s. Não atribuir o pico sem evidência: os novos contadores permitem verificar contenção e custo de processamento nas próximas medições.

**SSOT:** `tonecosstudio/tonecosstudio/main`; host local existente `TONART Curadoria Host` é a única instância. O módulo e a interface foram sincronizados por hash e substituição atômica, reiniciando exclusivamente a tarefa do host. Site, D1, R2, imagens Telegram e aprovação comercial permaneceram inalterados.



## Pranchas coletivas em escala — 22/11/2026

O host local existente `http://127.0.0.1:8769` agora permite **revisão visual em larga escala** sobre o SQLite privado canônico, sem abrir cada modelo individualmente ou criar serviços, thumbnails persistentes ou bancos paralelos.

- **Mural geral dos 4.433 modelos:** aba **Galerias de modelos → Catálogo geral — prancha coletiva**, com lotes de **24, 48 ou 96 modelos** e **1, 4 ou 6 fotografias distintas por cartão**. O mesmo mecanismo alimenta **Fila de revisão → Auditar galerias antigas** com até 96 galerias por lote. Os filtros por estúdio, busca, estado e quantidade de fotos permanecem funcionais; os modelos excluídos de outra missão não são reprocessados pela auditoria.
- **Uma amostragem SQL canônica:** `smart_curadoria.gallery_preview_ids` escolhe vistas do começo e do fim de cada grupo em **uma única consulta bounded**, eliminando mensagens com **SHA-256 idêntico** no mesmo grupo. `smart.list_models` e `legacy_album_audit.list_groups` usam esse mesmo helper (SSOT), sem N+1, sem tocar originais e sem agrupar esculturas automaticamente. Os endpoints são `GET /api/models?limit=96&previews=6` e `GET /api/legacy-album-audit?state=pending&limit=96&previews=4`, com capacidades documentadas em `GET /api/capabilities`.
- **Prancha e navegação rápida:** painel com modo **Expandir catálogo visual** ou **Expandir prancha coletiva**, cards com até seis ângulos carregados sob demanda (`loading=lazy`, WebP 256 px) e modal com **24/48/96 fotos por página**. Um clique na ficha abre editor + prancha, e **Modelo anterior / Próximo modelo** percorre o lote mantendo a mesma janela e sem requisitar a mesma ficha duas vezes. A seleção de separação ainda não salva bloqueia a troca de grupo. Originais continuam acessíveis sob demanda e não são alterados.
- **Menos polling e menor custo:** durante a revisão ou prancha, o browser não atualiza a fila automaticamente; as outras telas têm atualização limitada a 60 s e as estatísticas de modelos são reutilizadas por 60 s ao paginar. O cache WebP em RAM continua limitado e sem materializar milhares de arquivos. Em amostra real Windows: **96 modelos/384 imagens de referência: 34,4 ms**; **96 modelos/576 referências: 36,2 ms** antes da deduplicação; após deduplicar SHA, a mesma página precisava de **556 miniaturas** em **36,5 ms**. Exemplo concreto: Daenerys Targaryen mantém 10 mensagens, mas mostra **uma** foto única.
- **Site alinhado sem vazamento de dados:** `GET /api/catalog-sync-summary` usa o mesmo inventário canônico, armazenamento e comparação `catalog_sync_status.compare`, devolvendo só os totais e a data, sem carregar listas completas. A resposta completa tinha **157.322 bytes**, enquanto o resumo real teve **607 bytes**. A busca remota é explicitamente solicitada pelo operador e cacheada por **6 horas**, para proteger D1/Worker. Na verificação de 22/11/2026 às 10:07 UTC: **4.262 fichas públicas**, **4.433 grupos locais**, **3.772 identidades correspondentes**, **661 somente host** (`393 provavel`, `268 revisar`), **490 somente site**, **23 diferenças** de campos. Essas diferenças **não** autorizam publicação ou deleção: host é autoridade privada; site/D1 é autoridade da vitrine. Apenas modelos com identidade/direitos explicitamente liberados podem seguir para publicação por fluxo editorial próprio.
- **Homologação profissional:** regressões `teste_ui.py`, `teste_smart_curadoria.py`, `teste_legacy_album_audit.py`, `teste_legacy_gallery_split.py`, `teste_model_gallery.py` e `teste_catalog_sync_status.py` aprovadas no Desktop autorizado; testes HTTP sintéticos preservam 200/403/409, concorrência e rollback. Prova em SQLite real `PRAGMA quick_check(1)=ok`; host/GUI ativados pela **mesma** tarefa `TONART Curadoria Host`. Renderização visual inspecionada em Chrome headless **com perfil isolado**, sem afetar o Chrome do usuário; isso revelou cópias repetidas e motivou a deduplicação por SHA. Sem operações públicas de escrita ou reprocessamento global.



## Proteção das galerias auditadas e revisão visual de lote — 22/11/2026

- **Proteção do trabalho humano:** `smart_curadoria.process_batch` mantém intactos os membros de qualquer grupo com evento `visual_gallery_audited`, mesmo quando `model_group_members.match_reason='telegram_album'` (grupos legados). Se o downloader mudar legendas ou metadados, o índice `curation_seen` é atualizado com `outcome='visual_gallery_audited'` sem refazer associação de fotos ou nomes. O custo extra de consultar o evento só ocorre para imagens cuja origem realmente mudou, após o fingerprint incremental. `model_gallery.register_visual_gallery` também impede que um novo agrupamento roube fotografias de um grupo auditado, preservando revisão explícita e evitando merges silenciosos.
- **Regressão real no Windows:** todos os cinco testes `teste_legacy_gallery_split.py`, `teste_legacy_album_audit.py`, `teste_smart_curadoria.py`, `teste_model_gallery.py`, `teste_ui.py` passaram com SQLite sintético, incluindo o caso de foto de galeria antiga auditada com legenda alterada e tentativa de reagrupar manualmente essa foto. Dois módulos foram trocados na instância existente após comparação de SHA e liberação da porta. Nenhuma segunda instância ou rebuild da biblioteca foi criado.
- **Curadoria visual efetiva desta rodada, utilizando imagens servidas pelo host**: B3DSERK/Catwoman, mensagens `21175–21184`, busto único com capuz felino e base; B3DSERK/Cogliostro, `21161–21170`, chapéu/barba/animal/base idênticos em diversos ângulos; 3DXM/Magneto, `18847–18856`, diorama com vigas em X, parede rochosa e destroços idênticos. Cada grupo teve **10 imagens revisadas** e decisão explícita `same_sculpture` registrada pelo endpoint `/api/audit-legacy-gallery`, revisão `0→1`, sem mover membros, sem conferir direito comercial.
- **Estado verificado depois das três decisões:** **164 galerias auditadas e 398 pendentes**, somando 562 grupos legados; 17 eventos históricos de separação preservados; `PRAGMA quick_check(1)=ok`, nove GETs simultâneos HTTP 200, `TONART Curadoria Host` Running e apenas um listener 8769. Valores medidos diretamente no computador autorizado, sem inferir resultados para outros lotes.



## Separação visual segura de esculturas misturadas — 22/11/2026

O host agora oferece uma **operação editorial de separação real**, mas somente quando a auditoria visual imediatamente anterior do grupo concluiu `different_sculptures`. O objetivo é produzir galerias coerentes sem reconstrução global do catálogo, sem nomes inventados nem aprovação comercial automática.

1. Na aba **Fila de revisão → Auditar galerias antigas**, escolha uma galeria, abra a **prancha nativa** e verifique todos os ângulos. Registre `Esculturas diferentes` com justificativa baseada na geometria real.
2. Abra a prancha novamente e marque as imagens que mostram **uma única escultura diferente**. A interface mantém a seleção entre páginas e marca, em conjunto, mensagens cujo **SHA-256 é idêntico**. Não é necessário digitar IDs em outro aplicativo.
3. Insira nome e variante **provisórios** (opcionais) e uma justificativa visual de 15 a 500 caracteres. Clique **Separar seleção revisada**. A nova galeria permanece em `revisar`, e o grupo original também permanece em revisão; nenhum dos dois é publicado.

**Disponibilidade na interface:** `GET /api/legacy-album-audit` retorna `split_eligible=true` somente quando o último evento de atenção do grupo classifica `different_sculptures` e ainda não existe auditoria conclusiva conflitante. Uma anotação `needs_more_evidence` mantém o formulário oculto. A API de escrita revalida a decisão, a revisão e os hashes sob transação, inclusive se o painel estiver desatualizado.

**Contrato canônico UI/MCP:** `POST /api/split-legacy-gallery`, declarado como `gallery.legacy_split` em `GET /api/capabilities`. Corpo: `{group_key, revision, message_ids, title?, variant?, note}`. A operação é recusada quando faltam auditoria `different_sculptures`, revisão otimista atual, seleção própria (não vazia e não total), integridade dos IDs/SHA-256 do evento, origem única ou justificativa. Grupos já confirmados, previamente revisados em `reviewed_angles` ou do tópico reservado ficam bloqueados. O controle CSRF/Origin do host continua obrigatório.

**Transação e integridade:** `legacy_album_audit.split_reviewed_gallery` grava uma nova `model_groups` provisória, move apenas as relações selecionadas dentro de `model_group_members`, transfere evidências automáticas correspondentes à fotografia e registra `visual_gallery_split_source` na origem e `visual_gallery_split` no destino. Ambos os eventos contêm os membros originais, hashes, seleção, membros restantes, auditoria de origem e `publication_approved=false`. Nenhuma mídia física, nome da proposta, site, arquivo Telegram ou registro D1/R2 é modificado. Erros provocam rollback da mesma transação SQLite.

**Antirreagrupamento:** `smart_curadoria.process_batch` respeita `curation_seen.outcome='visual_split_review'` para **todos** os membros envolvidos, mesmo que legenda/metadata Telegram mude, e respeita membros `match_reason='reviewed_split'`. `model_gallery.register_visual_gallery` não rouba automaticamente membros separados por revisão. Uma segunda divisão requer nova auditoria explícita sobre o conjunto de membros atual. Os 17 eventos `visual_gallery_split` históricos identificados no SQLite são preservados.

**Prova no Desktop autorizado:** `teste_legacy_gallery_split.py`, `teste_legacy_album_audit.py` e `teste_ui.py` passaram com SQLite isolado, incluindo HTTP 200, 403 e 409, CSRF, concorrência, validação de auditoria, seleção conjunta de arquivos repetidos, reimportação com legenda alterada, eventos e integridade. A versão foi instalada na **mesma** tarefa `TONART Curadoria Host` (8 arquivos CAS-verificados, porta 8769 liberada antes do start). A API e os controles da prancha estão disponíveis; **nenhum grupo do catálogo real foi dividido nesta implantação**, pois ainda não há uma auditoria de divergência atual que autorize tal operação.



## Auditoria visual de grupos legados — 22/11/2026

A **Fila de revisão → Auditar galerias antigas** opera **por galeria**, e não por cada imagem. Ela usa exclusivamente `model_group_members`, `model_groups`, `name_proposals` e `curation_events` do mesmo SQLite da Curadoria. Nenhum banco de auditoria, serviço, worker, duplicação de arquivo ou tarefa paralela é criado.

- **Leitura e priorização:** `GET /api/legacy-album-audit?state=pending&risk=all&topic=&q=&cursor=&limit=24` retorna até 48 grupos por página, com cursor `priority:photos:group_key`. `state=pending|audited|all`; `risk=all|variants|albums|large`; busca textual por modelo/variante. A posição reflete divergências de título/variante, mistura de álbuns, tamanho e chave estável. O tópico `Geral + 50k` está excluído deste fluxo.
- **Revisão anterior respeitada:** qualquer evento `visual_gallery_audited` existente sinaliza galeria já revista. Evitar refazer o trabalho de outros agentes. No diagnóstico inicial havia **562 grupos contendo ao menos um vínculo `telegram_album`**, com **160 históricos de revisão visual** e **402 sem esse evento**. Nove apresentavam variantes diferentes e onze abrangiam vários álbuns; todos estes conflitos detectáveis já estavam entre os auditados.
- **Prancha e controle editorial:** um clique no cartão abre `openBoard(group_key)`, a **prancha nativa** paginada do host. A decisão explícita seleciona `same_sculpture`, `different_sculptures` ou `needs_more_evidence`, com justificativa de 15–500 caracteres. O endpoint `POST /api/audit-legacy-gallery` exige CSRF/Origin locais e `revision` otimista; grava no **`curation_events` existente** o tipo `visual_gallery_audited` (escultura visualmente consistente) ou `visual_gallery_audit_attention` (precisa de separação/mais evidência). É registrada uma cópia dos IDs e SHA-256 dos membros no evento, sem criar nova tabela.
- **Fail-closed:** a função `legacy_album_audit.record_review` bloqueia grupos já auditados, versões concorrentes, grupos confirmados, tópico reservado, grupos de múltiplas origens e decisões sem justificativa. Apenas incrementa a revisão e grava o evento. **Não altera `model_group_members`, não destaca fotos, não renomeia arquivos e não aprova identidade, direitos ou publicação.** Corrigir grupos misturados é uma etapa editorial distinta.
- **Contrato MCP:** `gallery.legacy_audit` (GET) e `gallery.legacy_audit_review` (POST) estão documentados em `/api/capabilities`; a UI usa exatamente os mesmos endpoints do host.
- **Provas físicas:** `teste_legacy_album_audit.py` passou em SQLite sintético, com cursor e ordenação, casos concorrentes, HTTP 200/400/409, histórico, proteção do tópico excluído e comparação dos SHA-256. `teste_ui.py` passou sintaxe, existência dos controles e exercício JavaScript de seleção de cartão, abertura da prancha e gravação explícita. No Desktop autorizado a lista de 402 pendências respondeu em cerca de **71 ms** (amostra, não SLA); a mesma instância foi recarregada com arquivos validados por SHA.
- **Primeira inspeção efetiva:** Luftmensch **Garrosh**, grupo `0520e7ecdbd0f24125cb9379`, mídias `20231–20240`, revisado visualmente usando as imagens fornecidas por `/thumb/<id>` do host. O machado, estandarte, armadura e base rochosa coincidem em dez vistas; `20233` apresenta alternativas de escala da mesma geometria. A gravação via endpoint canônico foi HTTP 200, `revision 0→1`, dez vínculos preservados e `publication_approved=false`. Após a ação: **401 pendentes / 161 com registro de auditoria**, salvo trabalhos concorrentes posteriores. A escala comercial e a licença continuam sem comprovação.



## Fila priorizada de revisão — 22/11/2026

A tela **Fila de revisão**, na interface privada em `http://127.0.0.1:8769`, usa o **mesmo SQLite e a mesma revisão otimista de `name_proposals`**. Não existe worker, banco de tarefas, serviço de claims ou cópia de mídia. A fila é derivada em consultas SQL somente leitura; o clique abre o formulário de revisão já existente.

- **Prioridades operacionais:** sem nome (0), grupo herdado da antiga regra por álbum (1), nome marcado para revisão (2), proposta sem fonte oficial vinculada (3) e outros registros (4). São riscos/pendências de curadoria; **nenhum estado certifica direitos comerciais**.
- **Filtros:** estúdio/tópico, pendência, variante presente/ausente e busca por identidade/franquia/legenda/ID. O tópico `Geral + 50k` é deliberadamente excluído e rejeitado nesta fila para não colidir com a missão independente desse lote.
- **Paginação por cursor:** `priority:message_id` com ordenação por prioridade ascendente e mensagem descendente. Limite **1–48** por chamada. Evita varredura profunda via `OFFSET`, funciona com revisões paralelas e impede resultados duplicados enquanto as prioridades não são alteradas. Uma revisão pode mudar a prioridade; o painel reinicia a navegação após salvar. Escritas são protegidas pela revisão otimista existente, não por bloqueios permanentes.
- **Contrato único UI/MCP:** `GET /api/review-queue?topic=<estúdio>&kind=attention&variant=all&q=&cursor=&limit=48`, operação `review.queue` em `GET /api/capabilities`. Tipos de filtro: `attention`, `unlabeled`, `legacy_album`, `manual_review`, `missing_source`, `confirmed`, `all`. Variantes: `all`, `with`, `without`. Não é um endpoint de escrita; inputs inválidos retornam HTTP 400.
- **Provas Windows reais:** SQLite com **38.598 imagens** e **7.409 pendências na fila**, excluindo `Geral + 50k`; primeira página de 48 em aproximadamente **51 ms** e filtro manual de Pokerus Studio com **4 imagens** em **24 ms** durante o pré-deploy. A API após ativação retornou exatamente os IDs `6884, 6883, 6882, 6881`. Duas páginas consecutivas com 12 itens não repetiram IDs; oito GETs concorrentes terminaram em HTTP 200; filtros proibidos retornaram HTTP 400; `PRAGMA quick_check(1)=ok`. Esses tempos são amostras do computador autorizado, não SLAs.
- **Testes:** `python teste_review_queue.py` exercita prioridades, filtros, isolamento, cursores e endpoint HTTP com base temporária; `python teste_ui.py` valida a integração de controles e sintaxe JS. Nenhum arquivo de origem Telegram, bucket, D1 ou cadastro público é modificado.

A fila evoluirá como **produto de revisão visual**, incluindo categorias confiáveis, fontes e observabilidade; não deve ser substituída por scripts independentes de nomeação em massa.

---


Aplicativo **privado e local** para identificar imagens durante o download do Telegram. Não é um novo backend do catálogo público e não altera a importação existente.

## Separação dos dados

- **Origem imutável:** `%USERPROFILE%\Downloads\telegram-2370335738-images\<TÓPICO>\msg_<ID>.jpg` e seu `progresso.sqlite3`, de propriedade do downloader.
- **Curadoria:** `curadoria-local/curadoria.sqlite3` ao lado do script executado, com identificações, revisão otimista e versões.
- **Saída revisada:** `curadoria-local/modelos-revisados/<estúdio>/<modelo>/<nome>-msg<ID>.jpg`. Gerada somente a pedido, para modelos aprovados. Usa hardlinks e não move os originais.
- **TONART:** a comparação opcional exige inventário CSV com `sha256` e `source` ou `filename`. Duplicata exata prefere o Telegram na proposta de reconciliação, sem apagar ou publicar nada.

Os nomes são **metadados editáveis** até a aprovação; não são atribuídos automaticamente por reconhecimento visual. O aplicativo mantém estúdio, modelo, personagem, universo, legenda original e ID da mensagem.

## Execução local

Requisitos: Python 3.12+, com Pillow 13.0.0 para miniaturas WebP (`python -m pip install -r requirements-curadoria.txt` no venv do host). A interface e os endpoints de dados permanecem locais e não precisam de sessão Telegram. Não instalar um segundo host.

```powershell
cd scripts/catalog/curadoria-local
python tonart_curadoria.py
```

Abra `http://127.0.0.1:8769`. A importação incremental é de responsabilidade exclusiva do worker existente, não dos endpoints GET; navegação, paginação e filtros fazem somente consultas. O servidor vincula apenas `127.0.0.1`.

## Segurança

**Não versionar nem sincronizar:** arquivos de sessão Telegram, `*.dpapi`, tokens, bancos SQLite, fotos de grupos privados, logs com dados pessoais ou o inventário preenchido de curadoria. Toda publicação comercial e escolha de imagem exigem revisão e direitos de uso.

API de leitura: `/api/stats`, `/api/items`, `/media/<id>`, `/thumb/<id>?w=256|480|960`, `/api/performance`, `/api/capabilities`, `/api/telegram-findings/<id>`, `/api/telegram-album/<id>`. API de edição: `/api/annotate`, `/api/materialize`, `/api/export`, `/api/import-tonart-csv`, exigindo origem local e token gerado localmente. Nunca expor a porta ou o token à rede.

Este diretório é apenas a **implementação versionada**. A instalação Windows já existente usa uma cópia local e uma pasta de dados separada. Evite executar dois servidores na mesma porta.

## Testes

```powershell
python teste_curadoria.py
python teste_ui.py
```

O E2E usa um diretório temporário e uma imagem fictícia. Verifica edição, conflito de revisão, exportação por hardlink sem modificar a origem e preferência do Telegram para o mesmo SHA-256. `teste_thumbnail_curadoria.py` valida WebP, cache, ETag e preservação dos arquivos; `teste_ui.py` verifica a prancha paginada e uso de miniaturas.

## Nomeação e agrupamento em paralelo

A etapa de **nomeação** foi implementada em `name_curadoria.py` e usa o **mesmo SQLite local** da Curadoria Visual, sem criar outro banco. Ela examina cada imagem independentemente, extrai estúdio, título, universo e variante das legendas estruturadas do Telegram e sugere nomes únicos como `deadpool-diorama-msg13588.jpg`. Uma imagem sem legenda pode receber evidência contextual **para revisão**, mas título e álbum compartilhados não comprovam ser a mesma escultura. A identificação exige o Telegram original e evidências independentes.

Os nomes são preservados em `name_proposals` com evidência, confiança, estado, revisão e histórico em `name_proposal_events`. A nomeação participa do ciclo incremental, mas não impede que uma galeria reúna imagens ainda sem nome. A revisão visual e a identificação podem avançar em paralelo no mesmo SQLite. As propostas não são nomes oficiais comprovados, nem aprovações comerciais.

Abra a interface e use **1. Nomes propostos** para buscar, conferir a imagem, a legenda e a origem, corrigir o nome e registrar uma revisão. O estado **confirmado** exige nome, estúdio e um link HTTPS da publicação oficial conferida pelo revisor; nenhuma identificação textual recebe automaticamente esse estado.

Use **Exportar nomes propostos** para gerar exclusivamente no computador o arquivo privado `curadoria-local/manifesto-nomes-propostos.csv`, com referências ao Telegram. O botão **Gerar nomes confirmados** materializa somente as imagens confirmadas sob `curadoria-local/modelos-revisados/<estúdio>/<modelo>/<nome>-msg<ID>.<ext>`, por hardlink, sem mover ou alterar a origem. Conflitos de SHA interrompem a operação; não sobrescreve arquivos existentes.

**2. Agrupar depois** permanece disponível para verificar álbuns e duplicatas, porém nomes iguais não são prova suficiente de uma única estatueta. O agrupamento automático considera somente mídia de SHA-256 idêntico; fotos diferentes são vinculadas à mesma escultura somente após comparação visual explícita, preservando variantes. Nenhuma das etapas publica no catálogo de produção. A execução após reinício reutiliza os checkpoints persistidos no SQLite local.

### APIs e testes desta etapa

- Leitura: `GET /api/names`, `GET /api/stats` (inclui `naming`).
- Revisão protegida pelo token e origem local: `POST /api/review-name`, `POST /api/export-names`, `POST /api/materialize-confirmed-names`.
- Teste isolado: `python teste_name_curadoria.py` (nomes únicos, versões, álbum, retomada, fonte oficial, conflito otimista, manifesto, materialização e integridade dos originais).
- Testes de regressão: `python teste_curadoria.py`, `python teste_smart_curadoria.py`, `python teste_ui.py`.

As cópias privadas de imagens, mensagens, manifestos preenchidos, arquivos de sessão e bancos locais **não entram no GitHub**. O ambiente local Windows deve sincronizar o código da PR #45 sem substituir a pasta privada `curadoria-local`.

## Nomes sem legenda: cartaz, fontes oficiais e similaridade local

Para imagens sem metadados textuais, a Curadoria **não inventa um personagem**. O fluxo de revisão prioritário é:

1. Conferir se o **próprio render** contém nome/versão (por exemplo, um cartaz do criador). O aplicativo pode registrar a proposta por `suggest_name_from_embedded_text`; a proposta não vira `confirmado` automaticamente.
2. Abrir **Referências do próprio estúdio** diretamente na tela **Nomes propostos**. A seleção por tópico em `official_sources` fornece os perfis verificados no Patreon, Cults3D ou ArtStation. Em tópicos que misturam vários criadores, um perfil de estúdio é apenas referência — **não comprova** autoria de uma imagem individual.
3. Examinar **Imagens locais semelhantes**, que usa dHash, aHash e proporção, exibindo até três candidatos e opção **Usar como rascunho**. Isso não escreve um nome automaticamente e nunca o confirma. A revisão precisa verificar a imagem correspondente na publicação oficial.
4. Somente após cruzar título/arte e a página do lançamento, registrar `confirmado` com link oficial e gerar hardlinks, se necessário.

A pesquisa encontrou perfis oficiais para Merge Project Figures, Uel Winner, Sekai 3D Models, Nomnom Figures, Kaidan 3D e 3Dmoonn. Os perfis e links são públicos; **nenhuma imagem privada do Telegram foi enviada** aos sites para pesquisa reversa. Algumas páginas bloqueiam requisições automatizadas: o aplicativo somente oferece links de consulta e não tenta contornar desafios de acesso.

Para gerar as assinaturas visuais em **lotes com checkpoint no SQLite local** (Pillow instalado somente na máquina de trabalho):

```powershell
python visual_name_suggestions.py --limit 6000
```

A rotina opcional roda **fora** do servidor web para não bloquear a interface. Endpoints locais de consulta: `GET /api/official-sources?topic=...` e `GET /api/visual-candidates/<ID>`. O arquivo `teste_visual_name_suggestions.py` contém E2E com imagens artificiais; o teste confirma que possíveis semelhanças **não alteram automaticamente** `name_proposals`.

A curadoria permanece privada até a homologação do catálogo comercial e dos direitos de uso. Resultados de rastreamento, nomes capturados de cartazes e bancos de imagens locais não são versionados.

## Localizar nomes no próprio catálogo do estúdio (Abe3D / Uel Winner)

Foi acrescentado o perfil oficial Abe3D (Cults3D, Patreon e ArtStation) à lista de referências da Curadoria; Uel Winner já tinha seus canais oficiais associados. Na tela **1. Nomes propostos**, o link de publicação individual agora também pode ser aberto diretamente, sem sair da revisão.

A função `suggest_name_from_studio_catalog(...)` registra somente uma **proposta** quando uma imagem local sem legenda parece corresponder visualmente a um título do catálogo oficial. Ela:

- exige fonte HTTPS de um provedor homologado, ID presente e coincidência exata com o tópico de origem;
- preserva título, universo, estúdio e URL da fonte no SQLite local com trilha de evento;
- atribui `status=provavel`, `evidence_type=studio_catalog_visual_candidate` e `confidence=0.60`, sem confirmar a identidade nem criar pastas ou hardlinks;
- rejeita sobrescrita de identificações existentes;
- permanece preservada se o Telegram alterar os metadados do arquivo. Revisões manuais e nomes com título impresso no render também são protegidos contra reprocessamento.

As aplicações em lote de títulos e IDs específicos estão em scripts de diagnóstico **locais privados**, não versionados no GitHub, porque contêm referências à biblioteca privada do Telegram. Não existe uma segunda base canônica.

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

