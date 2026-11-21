# Curadoria Visual TONART — aplicativo local

Aplicativo **privado e local** para identificar imagens durante o download do Telegram. Não é um novo backend do catálogo público e não altera a importação existente.

## Separação dos dados

- **Origem imutável:** `%USERPROFILE%\Downloads\telegram-2370335738-images\<TÓPICO>\msg_<ID>.jpg` e seu `progresso.sqlite3`, de propriedade do downloader.
- **Curadoria:** `curadoria-local/curadoria.sqlite3` ao lado do script executado, com identificações, revisão otimista e versões.
- **Saída revisada:** `curadoria-local/modelos-revisados/<estúdio>/<modelo>/<nome>-msg<ID>.jpg`. Gerada somente a pedido, para modelos aprovados. Usa hardlinks e não move os originais.
- **TONART:** a comparação opcional exige inventário CSV com `sha256` e `source` ou `filename`. Duplicata exata prefere o Telegram na proposta de reconciliação, sem apagar ou publicar nada.

Os nomes são **metadados editáveis** até a aprovação; não são atribuídos automaticamente por reconhecimento visual. O aplicativo mantém estúdio, modelo, personagem, universo, legenda original e ID da mensagem.

## Execução local

Requisitos: Python 3.12+ com biblioteca padrão. Não precisa de Telethon nem da sessão do Telegram para a interface.

```powershell
cd scripts/catalog/curadoria-local
python tonart_curadoria.py
```

Abra `http://127.0.0.1:8769`. O navegador sincroniza a listagem a cada 10 segundos. O servidor vincula apenas `127.0.0.1`.

## Segurança

**Não versionar nem sincronizar:** arquivos de sessão Telegram, `*.dpapi`, tokens, bancos SQLite, fotos de grupos privados, logs com dados pessoais ou o inventário preenchido de curadoria. Toda publicação comercial e escolha de imagem exigem revisão e direitos de uso.

API de leitura: `/api/stats`, `/api/items`, `/media/<id>`. API de edição: `/api/annotate`, `/api/materialize`, `/api/export`, `/api/import-tonart-csv`, exigindo origem local e token gerado localmente. Nunca expor a porta ou o token à rede.

Este diretório é apenas a **implementação versionada**. A instalação Windows já existente usa uma cópia local e uma pasta de dados separada. Evite executar dois servidores na mesma porta.

## Testes

```powershell
python teste_curadoria.py
python teste_ui.py
```

O E2E usa um diretório temporário e uma imagem fictícia. Verifica edição, conflito de revisão, exportação por hardlink sem modificar a origem e preferência do Telegram para o mesmo SHA-256.

## Nomeação e agrupamento em paralelo

A etapa de **nomeação** foi implementada em `name_curadoria.py` e usa o **mesmo SQLite local** da Curadoria Visual, sem criar outro banco. Ela examina cada imagem independentemente, extrai estúdio, título, universo e variante das legendas estruturadas do Telegram e sugere nomes únicos como `deadpool-diorama-msg13588.jpg`. Caso uma imagem não tenha legenda, pode herdar o nome de um álbum somente quando todas as legendas válidas desse álbum concordam.

Os nomes são preservados em `name_proposals` com evidência, confiança, estado, revisão e histórico em `name_proposal_events`. A nomeação participa do ciclo incremental, mas não impede que uma galeria reúna imagens ainda sem nome. A revisão visual e a identificação podem avançar em paralelo no mesmo SQLite. As propostas não são nomes oficiais comprovados, nem aprovações comerciais.

Abra a interface e use **1. Nomes propostos** para buscar, conferir a imagem, a legenda e a origem, corrigir o nome e registrar uma revisão. O estado **confirmado** exige nome, estúdio e um link HTTPS da publicação oficial conferida pelo revisor; nenhuma identificação textual recebe automaticamente esse estado.

Use **Exportar nomes propostos** para gerar exclusivamente no computador o arquivo privado `curadoria-local/manifesto-nomes-propostos.csv`, com referências ao Telegram. O botão **Gerar nomes confirmados** materializa somente as imagens confirmadas sob `curadoria-local/modelos-revisados/<estúdio>/<modelo>/<nome>-msg<ID>.<ext>`, por hardlink, sem mover ou alterar a origem. Conflitos de SHA interrompem a operação; não sobrescreve arquivos existentes.

**2. Agrupar depois** permanece disponível para verificar álbuns e duplicatas, porém nomes iguais não são prova suficiente de uma única estatueta. O agrupamento exige álbum compartilhado ou identidade exata de conteúdo. Nenhuma das etapas publica no catálogo de produção. A execução após reinício reutiliza os checkpoints persistidos no SQLite local.

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
