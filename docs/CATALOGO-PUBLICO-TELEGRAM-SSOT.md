# TONART — Catálogo público separado e Telegram como origem prioritária

**Estado:** catálogo público separado e integração progressiva com a Curadoria.
**Fonte única de código:** `tonecosstudio/tonecosstudio`, `main`. Sem repositório paralelo.

## 1. Dois frontends, uma autoridade de catálogo

| Superfície | Endereço planejado | Entrada de build | Acesso |
|---|---|---|---|
| Catálogo público | `catalogo.tonartstudio.com.br` | `src/PublicCatalogApp.tsx` / `src/TelegramStudioCatalog.tsx` | Anônimo, visualização de rascunhos em curadoria; indexação bloqueada, direitos ainda não aprovados |
| Site TONART principal | `tonartstudio.com.br` | landing existente | Público sem recursos incompletos |
| Comercial / administração | Ambiente interno separado | `src/TonecosCommercialApp.tsx` | Autenticado + autorização no backend, protegido também no hosting |

**Não** usar `src/App.tsx` para criar outra cópia do catálogo e **não** expor o app local da Curadoria na Internet. A vitrine de rascunhos Telegram é servida pelo Worker/D1/R2 canônicos existentes; o frontend público não pode importar módulos de conta, pagamento ou administração.

Para Vercel, o build do catálogo público deve configurar:

```env
VITE_PUBLIC_CATALOG_MVP=true
VITE_PREVIEW_READ_ONLY=true
VITE_TONECOS_COMMERCIAL_MVP=false
VITE_CATALOG_QUOTES_ENABLED=false
VITE_TONECOS_SUBSCRIPTIONS_ENABLED=false
VITE_TONECOS_COINS_ENABLED=false
```

Não reutilizar o mesmo *build* comercial na origem `catalogo.`. O projeto `tonart-studio-public` existente tem o domínio principal associado: qualquer projeto adicional precisa ser verificado antes de criar/atribuir domínio. URL e API públicos devem ser testados de ponta a ponta antes de DNS/produção. Não proteger páginas privadas apenas ocultando links, por CSS, robots.txt ou nome de subdomínio. Proteção precisa ocorrer no hosting **e** no backend (sessão/RLS/admin).

## 2. O que é SSOT

- **Telegram = origem preferencial de ativos/identidade de origem**: arquivo original, tópico, legenda, data, `message_id`, hash, vinculação do álbum e rastreabilidade. Não editar nem eliminar.
- **Curadoria = autoridade de proposta/revisão interna**: nomes sugeridos e confirmados, identidade do modelo, conjunto de imagens, provas e decisão humana. O banco local é privado.
- **Catálogo/Worker e seu armazenamento existente = autoridade da publicação**: modelos, slugs canônicos, galeria pública, propriedade de storage, versões e regras de consulta pública.
- Uma imagem importada antigamente pode continuar vinculada ao mesmo `model_id`; a preferência pelo Telegram **não cria um segundo modelo** ou uma segunda galeria.

## 3. Ciclo de vida de cada imagem

1. **Ingestão**: downloader escreve em `Downloads/telegram-2370335738-images/<tópico>/msg_ID.*` e registra checkpoint em SQLite.
2. **Identificação**: PR #45 trabalha no mesmo banco da Curadoria, com `assets`, `annotations`, `name_proposals`, `model_groups`. A UI pode mostrar imagens antes da aprovação, mas **não as publica**.
3. **Gate de curadoria**: só entra no pré-publicador se `annotations.status=aprovado` **e** `name_proposals.status=confirmado`.
4. **Gate de integridade**: ler bytes do arquivo original sem modificá-lo; SHA-256 deve coincidir com o SQLite. Arquivo faltante, caminho fora da raiz ou divergência = bloqueio.
5. **Reconciliação**: comparar com inventário canônico real. Mesmo SHA-256 = reutilizar ativo/identidade existente, preferindo proveniência Telegram; mesmo estúdio e modelo com hash diferente = revisão para vincular imagem adicional; totalmente novo = candidato a criar modelo.
6. **Staging**: `scripts/catalog/preparar-publicacao-curadoria-telegram.py` produz apenas `decisoes.csv`, `resumo.json`, `lote_elegivel.jsonl`. **Nunca sobe imagens**.
7. **Transformação e importação (fase posterior):** após revisão do lote, passar pelo pipeline WebP e pelas rotinas **existentes**:
   - `scripts/catalog/build-telegram-webp-site-import-plan.mjs`
   - `scripts/catalog/build-telegram-webp-storage-upload-plan.mjs`
   - `scripts/catalog/build-telegram-webp-db-import-plan.mjs`
   - `scripts/cloudflare/upload-catalog-webp-to-r2.mjs`
   - `scripts/cloudflare/import-r2-catalog-queue.mjs`
   Nunca fazer upload direto do app local ou criar D1/R2/Worker paralelos.
8. **Publicação comercial**: somente referências revisadas e autorizadas podem adquirir status comercial de publicadas. A vitrine Telegram em pré-lançamento atualmente expõe também rascunhos (`published=0`); isso **não comprova direitos ou revisão**. Bloquear indexação, impedir importação de diretórios privados pelo frontend e preservar rollback e IDs permanentes.

## 4. Comando de pré-publicação

Requer apenas Python 3.12+; não usa credenciais Telegram nem Cloudflare:

```powershell
python scripts/catalog/preparar-publicacao-curadoria-telegram.py `
  --db "C:\Users\ordax\Documents\TONART-Telegram-Import\espelho-telegram\curadoria-local\curadoria.sqlite3" `
  --source-root "C:\Users\ordax\Downloads\telegram-2370335738-images" `
  --existing-csv "C:\dados-privados\tonart-inventario-canonico.csv" `
  --out "C:\Users\ordax\Documents\TONART-Telegram-Import\publicacao-staging"
```

**Inventário TONART CSV:** colunas de SHA (`sha256`, `original_sha256` ou `image_hash`), `model_id`, `studio` e `model`. Extrair dos dados canônicos, sem inventar correspondências.

O preparador utiliza o inventário do catálogo existente e a Curadoria. Os nomes confirmados no próprio render, com referência oficial, já podem ser encaminhados ao lote de publicação. Nomes incertos e álbuns inconsistentes permanecem para revisão.

## 5. Critérios para ativar catalogo.tonartstudio.com.br

1. Build público isolado: sem código/rotas comerciais ou administrativa nas dependências, teste de bundle e segurança aprovado.
2. Exposição somente de itens identificados e validados no Worker, com as permissões do backend.
3. Ficha, galeria, pesquisa, filtros, carregamento progressivo, SEO e mobile testados no domínio de staging; não exigir login para navegar.
4. Processo de importação idempotente (hash, IDs canônicos, staging → revisão → commit, sem duplicar modelo ou bytes), testes de amostra e rollback.
5. Este subdomínio Telegram não oferece conta, cadastro, carrinho nem orçamento (inclusive para visitantes); recursos comerciais pertencem exclusivamente ao site principal, fora da vitrine.
6. Verificar domínios e ambiente Vercel, registrar deployment exato aprovado, apontar `catalogo.` somente depois. O endereço `tonartstudio.com.br/catalogo` pode redirecionar para o subdomínio após a implantação.

**Não executar publicação de imagens privadas, alterações de DNS, fusão destrutiva ou lançamento completo como efeito automático deste plano.**

## 6. Independência entre agentes

- Chat da Curadoria / PR #45: identifica e confirma modelos, nomes, álbuns e evidências.
- Esta etapa: leitura somente dos resultados aprovados, reconciliação com catálogo existente e plano de publicação. Não editar PR #45.
- Pipeline publicado: **uma única autoridade** (`services/catalogo/` e scripts existentes), com testes e logs, sem pipelines paralelos.


## 7. Otimização de imagens enquanto a curadoria continua (implementada)

**Conversor único:** `scripts/catalog/build-telegram-webp-final.mjs` com Sharp já existente (perfil canônico: galeria até 900px e miniatura até 512px, qualidade 68). Nenhum segundo mecanismo de transcodificação foi criado. Para o Telegram atual, o adaptador `preparar-webp-curadoria-privada.py` gera um manifesto compatível com o conversor existente.

**Importante:** nomes `provavel`/sugeridos autorizam **somente otimização local privada**, não disponibilização na Internet. Manifesto tem `status=prepared_private` e `private_staging_only=true`; o conversor só aceita esse tipo com `--private-curadoria`. O plano de publicação rejeita `private_staging_only` independentemente do nome/taxonomia. O fluxo público exige identidade confirmada, integridade do acervo e reconciliação com IDs já publicados.

No Windows com Node 24, Python 3.12 e dependências canônicas instaladas:

```powershell
powershell -NoProfile -File scripts/catalog/otimizar-curadoria-privada.ps1 -Limit 85
```

Entrada: SQLite da Curadoria (`assets`, `annotations`, `name_proposals`) e imagens originais **somente leitura**. Saída privada: `%USERPROFILE%\Documents\TONART-Telegram-Import\otimizacao-privada\webp`, fora do Git, com manifesto/checkpoint e arquivos de galeria + miniatura. O mesmo lote pode ser reexecutado: os registros processados são pulados. A integridade de cada original é validada por SHA-256 antes da seleção e depois pela auditoria `verificar-webp-curadoria-privada.py`.

**Prova no Windows em 19/11/2026:** 85 imagens com nome sugerido, geradas 85 galerias WebP + 85 miniaturas (sem falhas). Originais: 10.543.860 bytes; WebP completo: 4.438.106 bytes; **57,9% de redução**, sem perda nem alteração de originais. Ensaio do importador público: 0 elegíveis, 85 rejeitadas; zero operações externas. A porcentagem varia com o conteúdo das imagens.

Upload de itens Telegram inicia depois da seleção do primeiro lote identificado e da reconciliação com o catálogo. A TONART pode continuar servindo os modelos já aprovados do catálogo atual sem reenvio desnecessário.


## 8. Reconciliação de álbuns como uma única estatueta

O pré-publicador canônico `scripts/catalog/preparar-publicacao-curadoria-telegram.py`
lê **somente** as tabelas existentes `model_groups` e `model_group_members`
da Curadoria (quando disponíveis), sem criar banco ou schema duplicado.

- Cada imagem mantém a referência Telegram e SHA-256, mas o `group_key`
  confirmado torna-se a identidade interna da galeria de uma escultura.
- Um grupo com várias fotos elegíveis gera **uma linha** em
  `lote_modelos_elegiveis.jsonl`, com todos os `message_ids`.
- `galerias_para_revisao.csv` registra o total de ângulos, status do grupo,
  nomes confirmados e fotos individualmente aprovadas.
- Grupo `provavel`/`revisar` ou com estúdio/título conflitantes bloqueia
  a importação, mesmo se alguma imagem individual estiver aprovada.
- Se um grupo mistura imagem com hash já existente e imagem nova, a
  reconciliação com o `model_id` canônico exige revisão; não dividir em
  produtos separados nem forçar fusão pela coincidência de personagem.
- Imagem não vinculada a grupo permanece individual (identidade
  `single:<message_id>`) até sua associação visual ser revisada.
- As verificações anteriores de identidade, integridade e inventário TONART **continuam obrigatórias**.

A preparação preserva os originais e não publica ou altera o catálogo diretamente.


## 9. Contrato de conciliação comercial — Missão 3

A comparação utiliza o **mesmo pré-publicador canônico** em
scripts/catalog/preparar-publicacao-curadoria-telegram.py; não há outro importador,
backend, armazenamento ou tabela. As PRs #45 e #53 continuam como autoridades das
galerias e evidências Telegram. Os dados originais não são modificados.

O inventário CSV deve ser exportado em modo **SELECT somente leitura** do D1
comercial ativo, incluir todas as fichas, inclusive as não publicadas, e ter
model_id, model, variant e sha256 (uma linha por imagem, com model_id repetido).
A consulta de referência para o schema comercial atual é:

~~~sql
SELECT m.id AS model_id, '' AS studio, m.name AS model,
       m.variant_name AS variant, s.source_sha256 AS sha256
FROM models m
LEFT JOIN model_image_sources s ON s.model_id = m.id
 AND s.gallery_version = m.gallery_version
ORDER BY m.id, s.image_id;
~~~

A ausência do campo studio no D1 não é prova de correspondência por nome.
Nomes iguais geram somente candidatos; variantes explicitamente contraditórias e
um mesmo SHA pertencente a mais de um modelo comercial geram conflito.

Execute o preflight com --existing-csv apontando para o CSV **privado fora do Git**
e --expected-model-count igual ao total de modelos distintos medido nesse snapshot.
Inventário sem model_id, contraditório ou com contagem divergente é bloqueado.

As saídas privadas resumo.json, decisoes.csv, galerias_para_revisao.csv,
lote_modelos_elegiveis.jsonl e operacoes_conciliadas.jsonl não publicam nada.
Cada operação de galeria contém operation_id estável, hashes, IDs de mensagens,
identidade e modelo existente (quando comprovado). Reexecuções e retomadas
reutilizam a mesma identidade; fotos idênticas no grupo não geram transferência
duplicada. O plano marca produção e direitos como **não autorizados** até a
integração pelos serviços comerciais existentes.

## 10. Auditoria de integridade e revisão — 20/11/2026 (Bahia)

**Fontes verificadas:** D1 `tonecos-catalogo` (consultas SELECT), catálogo público existente e SQLite local de Curadoria somente leitura; nenhum upload ou alteração de D1/R2/curadoria neste diagnóstico.

- `catalogo.tonartstudio.com.br` funciona como **vitrine Telegram anônima, estritamente visual**, sem login, cadastro, carrinho ou orçamento. O domínio já redireciona essas rotas comerciais para 404; mantém `X-Robots-Tag: noindex` e `robots.txt` restritivo. **Noindex não é controle de acesso**.
- Vitrine atual: **1.228 modelos de 5 estúdios** (Ydeval 444, Wicked 379, 3DXM 271, Abe3D 72, Luftmensch 62). Todos têm `telegram_name_provisional=1`, `telegram_review_status='pending'`, `telegram_rights_status='not_reviewed'` e `published=0`. São rascunhos **tecnicamente exibidos**, não imagens editorialmente/licencialmente aprovadas. Não tratar o site como lançamento autorizado nem abrir indexação sem decisão editorial.
- Integridade D1: nenhuma galeria vazia, divergência de `image_count`, duplicata de SHA entre fichas Telegram ou posição de mídia inconsistente. Fonte comum atual: `telegram_origin_id='2370335738'`.
- Base comercial canônica: **3.837 modelos e 4.639 imagens com SHA-256 válido**. O CSV privado de conciliação foi reconstruído no local já usado pelo pré-publicador, não versionado no Git.
- Curadoria local: **27.202 imagens** e **4.431 grupos**. O pré-publicador existente `scripts/catalog/preparar-publicacao-curadoria-telegram.py` foi executado com `--expected-model-count 3837`: **5 candidatos Sekai 3D Models** tecnicamente aptos ao staging, **27.197 imagens retidas**. Os cinco têm `rights_verified=false` e `production_write_authorized=false`; nenhum foi publicado.
- A ordem da galeria e a capa editadas no workbench privado ficam em `telegram_gallery_order` e `cover_storage_key`. O Worker público deve ler **esses mesmos campos**, sem segundo inventário ou cópia da galeria; quando a ordem armazenada é inválida, usar a ordem original de `model_image_sources.position`. A auditoria encontrou zero galerias reordenadas até este checkpoint; a proteção deve cobrir as próximas curadorias.

**Critério para novos lotes:** confirmação da identidade do grupo, integridade do arquivo original, conciliação por hash/ID com todos os modelos comerciais, evidência de direitos e autorização editorial explícita. Candidatos locais não devem ser inseridos automaticamente na vitrine. Não alterar estados de revisão/direitos em massa para obter números maiores.

## 11. VX-Labs e visibilidade de rascunhos — 21/11/2026 (Bahia)

**Fatos verificados diretamente (não são autorização de publicação):**

- A [PR #71](https://github.com/tonecosstudio/tonecosstudio/pull/71) foi integrada à `main` no commit `215455f60386ae3ed6e8099b4a71d79c94b2ba06`, após Quality Gate offline aprovado. Seu contrato introduz `models.telegram_showcase_visible` na migration `0025_telegram_showcase_private_visibility.sql`, com default privado, preservação inicial da vitrine existente e triggers que impedem **nova** visibilidade sem `telegram_review_status='confirmed'` e `telegram_rights_status='approved'`.
- **Produção não migrou junto com o merge:** D1 observado ainda com última migration `0024_telegram_draft_gallery_order.sql`; coluna `telegram_showcase_visible` ausente. O Worker `tonecos-catalogo-api` teve implantação Wrangler às `2026-11-21T02:59:33Z`, versão `7db9b4ff-c711-44ee-9f49-a0aaae51c923` (100%), mas a correspondência dessa versão ao commit da PR #71 **não foi comprovada**. NÃO implantar um Worker que exige a coluna antes da migration.
- O monorepositório `tonecosstudio/tonecosstudio` contém somente os workflows de Quality Gate e remediação de dependências, não um release de Worker autorizado. O manifesto `config/catalog-code-consolidation.json` ainda declara `phase='staged-offline'`, `activeWorkerPublisher='washingtonmsdj/catalogo'`, `releaseAuthorized=false`, `targetWorkerReleaseEnabled=false` e `targetD1MigrationEnabled=false`. A PR de corte #26 permanece aberta em draft. O antigo workflow de deploy no repositório origem tem jobs explicitamente suspensos, porém implantações recentes em Cloudflare exigem identificar o **writer efetivo**, sem presumir que o corte foi finalizado.
- O D1 permaneceu com **3.837 modelos**, sendo **1.228 referências Telegram** já na vitrine e **0 do VX-Labs**; as referências exibidas permanecem rascunhos sem aprovação editorial/licencial. A migração 0025 preserva a vitrine histórica, não aprova retroativamente direitos; novos imports serão privados quando Worker e schema compatíveis estiverem ativos.
- Curadoria VX-Labs no SQLite canônico do desktop autorizado: **237 registros nomeados como propostas, 40 galerias, 207 hashes distintos nas galerias**; os **414 WebP** correspondentes (`display`/`thumb`) foram verificados no R2 privado de staging. A curadoria tem **40 eventos `private_import_preflight_checked`** e **16 candidatos de correspondência a IDs de franquias já existentes no D1**, com evidência em `curation_events`, **sem tocar nos outros estúdios**. As demais 24 galerias exigem categoria apropriada/revisão; nomes iguais não autorizam reuso de `model_id`. A revisão editorial foi estendida **aos 237 registros do VX-Labs** em `annotations.status='revisar'`: 210 referências pertencentes às 40 galerias reutilizam a ficha-âncora por referência, sem duplicar biografias; das 27 referências fora das galerias, 13 possuem SHA idêntico a um arquivo já agrupado, 13 são fotos independentes para inspeção visual e uma (Mantis) já estava em revisão. **Nenhum registro foi marcado `aprovado`** nem `name_proposals.status='confirmado'` por esse processo. A identidade das galerias e dos arquivos originais permaneceu inalterada; `PRAGMA quick_check(1)='ok'`.
- As fichas de personagem e vínculos ficam em `annotations` e `name_proposal_events` como **rascunhos de revisão**, não no catálogo público e não equivalem a licenciamento. Não marcar `aprovado` nem `confirmado` em massa; o pré-publicador comercial ainda exige os gates de revisão e direitos.

**Sequência de implantação sem duplicação:** (1) reconciliar e comprovar publicador único a partir do cutover M5, dos bindings e da versão ativa; (2) homologar migration 0025 e aplicar a mesma no D1 canônico pelo pipeline autorizado, validando ledger/trigger/coluna; (3) publicar a versão compatível do único Worker existente e verificar que os 1.228 modelos anteriores continuam visíveis; (4) importar o VX-Labs **apenas como rascunhos privados** por `/api/admin/telegram-drafts/import`, usando os grupos e hashes existentes, após resolver taxonomia e conflitos de identidade; (5) expor somente as fichas especificamente aprovadas. Sem criar pipeline, D1, R2 ou catálogo concorrente como atalho.

## 12. Incidente real de implantação incompatível — 21/11/2026 UTC

**Evidência de produção e recuperação, distinta de aprovação de M5:**

- Em `2026-11-21T03:52:48Z`, Wrangler implantou `tonecos-catalogo-api` versão `d4d2a1af-ce83-4b90-bf4a-396f75bdd5e1` (100%). Auditoria da conta Cloudflare registra ator `tonecosstudio@gmail.com` (não atesta qual chat, rotina ou computador iniciou o comando). O lançamento substituiu o rollback de `03:13:05Z` e voltou a expor um Worker com **contrato de schema v9** enquanto o D1 estava em `0024`, sem `models.telegram_showcase_visible`.
- Prova direta na rota de origem: `GET /api/categories` retornou HTTP **503** `schema_not_ready`, com `contractVersion:9`, e `GET /api/telegram-studios/studios` retornou HTTP **503** `catalog_studios_unavailable`. As configurações da versão tinham os bindings `DB` e `PRIVATE_TELEGRAM`; **não** atribuir a falha à ausência de configuração desses bindings sem prova adicional. O site estático respondeu HTTP 200, mas a listagem Telegram ficou indisponível.
- **Recuperação executada pela própria API oficial de Workers Deployments:** em `2026-11-21T04:12:18Z`, criada implantação `5a38d350-5097-4476-91cd-240318ca1ff2`, restaurando `81d141df-b4e6-4f3f-8548-eb6a6dcaf4a0` a 100%, versão anteriormente marcada como recuperação compatível. Nenhum arquivo R2, registro D1 ou migration foi alterado pelo rollback.
- **Smoke posterior:** origem Worker `/api/categories` HTTP 200; origem e proxy `/api/telegram-studios/studios` HTTP 200, com **5 estúdios, 1.228 modelos Telegram existentes e zero VX-Labs**. A rota de categorias via proxy do domínio do catálogo devolveu 404 nesta checagem e não deve ser confundida com a indisponibilidade da origem; o site expõe principalmente o catálogo por estúdios.
- **Causa operacional que continua aberta:** a conta ainda permite publicação Wrangler fora da sequência M5, embora `releaseAuthorized=false` no manifesto. O incidente ocorreu mesmo após rollback anterior. **Não afirmar que o risco de reincidência foi removido apenas com rollback.** Investigar o publicador efetivo da implantação de 03:52 e vincular seu preflight ao ledger D1 e à autoridade única; nunca publicar a versão v9 antes de aplicar/atestar a migration `0025` no D1 canônico, nem reativar um pipeline paralelo para contornar o bloqueio.

**Regra de release obrigatória:** verificar imediatamente antes da publicação `latestMigration>=0025_telegram_showcase_private_visibility.sql`, coluna `telegram_showcase_visible` presente, testes de 1.228 modelos preservados e publicador único autorizado em M5; se qualquer condição faltar, **bloquear deploy**, mantendo `81d141df` ativa. Só migrar e publicar pelo fluxo canônico após testes, sem recriar Worker/D1/R2. As PRs #31/#33 são editoriais e não concedem essa autorização.

## 13. Estado transversal de todos os estúdios e sincronização — 21/11/2026

> **Checkpoint operacional datado.** Esta seção registra observações reais do SQLite em `DESKTOP-4UFL03B`, do Cloudflare D1 e do catálogo HTTP. Não equivale a autorização de publicação nem substitui uma auditoria fresca antes de executar writes. A cópia operacional local é `C:\Users\ordax\Documents\TONART-Telegram-Import\espelho-telegram\CURADORIA-DIVISAO-POR-ESTUDIO.md` (inventário de tópicos, não segunda base).

### Escopo, números e terminologia

| Medida | Observação de 21/11/2026 |
|---|---:|
| Telegram no SQLite, **todos os tópicos** | 27.202 imagens |
| Tópico separado `Geral + 50k` | 18.556 imagens; fora do lote de estúdios |
| Demais tópicos (podem incluir tópicos numéricos sem estúdio designado) | 106 tópicos, 8.646 imagens |
| Imagens desses tópicos com título local preenchido | 8.183 (94,6%); 463 ainda sem título |
| Status das propostas: `confirmado` / `provavel` / `revisar` | 627 / 7.435 / 584 |
| `annotations.status='aprovado'` nesses tópicos | **0** |
| Grupos locais / imagens individuais não agrupadas | 4.431 grupos / 1.064 imagens |
| Identidades candidatas (grupo + individual; **não** número de modelos aprovados) | 5.495 |
| D1: todos os modelos / publicados no **catálogo comercial** | 3.837 / 2.575 |
| D1: rascunhos Telegram na **vitrine visual**, de cinco estúdios | 1.228 fichas, 1.960 imagens ligadas |

**Não misturar unidades:** 8.183 são *imagens com nome no SQLite*, não 8.183 modelos distintos nem 8.183 fichas publicadas. Os 106 são *tópicos fora do Geral*, não 106 estúdios validados para exibição. `published=0` das fichas Telegram refere-se ao catálogo comercial; a vitrine visual existente tem consulta separada. Nome preenchido ou `confirmado` não é aprovação de licença/direitos.

**Composição D1 Telegram observada:** Ydeval 444 modelos/508 imagens; Wicked 379/623; 3DXM 271/296; Abe3D 72/267; Luftmensch 62/266. Todas as 1.228 fichas mantinham `telegram_review_status='pending'`, `telegram_name_provisional=1`, `telegram_rights_status='not_reviewed'` no levantamento, não importando aprovação editorial.

**Diferença comprovada por `message_id` na origem Telegram** (apenas os cinco já presentes): Wicked 197 imagens locais ainda não ligadas ao D1; 3DXM 149; Abe3D 64; Luftmensch 21; Ydeval 18: **449 no total**. São mídias, *não* 449 modelos novos; exigir reconciliação com as galerias existentes. Os demais tópicos, inclusive Kuton, C27, Momoji e Merge/Nostalgic, não possuíam fichas Telegram em D1 nesse checkpoint. As 85 mídias Merge/Nostalgic têm backup privado de curadoria e pares WebP verificados no R2 de staging; isso **não comprova** cobertura R2 para todos os 8.646 itens.

### Diagnóstico: por que os nomes locais não chegam ao site

1. O SQLite `curadoria-local/curadoria.sqlite3` recebe `name_proposals`, `annotations`, grupos e eventos, mas **não há propagação contínua completa** destas revisões para o D1. O pré-publicador `scripts/catalog/preparar-publicacao-curadoria-telegram.py` é **somente leitura**, gera plano e exige revisão; ele não faz writes de catálogo, e não deve ser confundido com um sincronizador operacional.
2. Correções de texto numa **ficha que já existe** devem ser reconciliadas pelo `message_id`, SHA-256, estúdio, `model_id`, versão da galeria e comparação otimista de `telegram_revision`. O nome do personagem, sozinho, **nunca** justifica merge. Preservar nomes já editados no site. Alterar texto **não** deve marcar `review_status='confirmed'`, `rights_status='approved'`, `published=1` nem abrir visibilidade automaticamente.
3. Itens sem ficha D1 seguem o **importador canônico existente** `services/catalogo/worker/telegramDraftImport.ts` como rascunhos privados, somente após verificar franquia, identidade de galeria, hash, escopo e ausência de duplicações. Identidade local `single:<message_id>` foi suportada na `main@a2760e1f` com derivação determinística do grupo; grupos existentes de 24 hex mantêm o contrato anterior. Não criar segundo importador, D1, bucket, catálogo ou reprocessar WebP já válido.
4. Propostas `provavel`/`revisar` podem ser guardadas e exibidas no painel **privado** como candidatos, mas não recebem confirmação nem exposição pública implícita. A decisão do proprietário de tornar comuns renders visualizáveis deve ser implementada no controle editorial/licencial correto, sem usar `noindex` como substituto de autorização e preservando a quarentena SpecialSTL.

### Incidente operacional e correção comprovada

- D1 permaneceu na migration `0024_telegram_draft_gallery_order.sql`, sem `models.telegram_showcase_visible` da `0025`. Implantar o Worker v9 antes da migração produziu **HTTP 503** (`schema_not_ready` e `catalog_studios_unavailable`). Houve **reimplantações Wrangler após rollbacks**: recuperação momentânea não equivale a impedir reincidência. Antes de cada deploy, verificar novamente o Worker ativo, D1, ledger, coluna/triggers e autorização M5; não fixar como 'versão atual' uma versão vista em um instante.
- A versão Cloudflare `81d141df-b4e6-4f3f-8548-eb6a6dcaf4a0` foi comprovada como **recuperação temporária compatível**: `/api/categories` e `/api/telegram-studios/studios` voltaram a HTTP 200 após rollback, preservando D1/R2. Não é versão destinada a substituir permanentemente o release canônico.
- **44 fichas Abe3D existentes**, antes intituladas `Modelo sem nome #<message_id>`, foram corrigidas **no próprio D1** por correspondência de estúdio, `message_id` e SHA-256 dos arquivos da galeria, preservando IDs e `pending/provisional`. Conferência posterior: 44/44 com nome atualizado; endpoint público da ficha `tg_0f67f617ac379ae7a1e1ddf7` respondeu HTTP 200 exibindo **Selene Gallio**. Uma ficha Luftmensch `#20483` permaneceu sem novo título no SQLite, portanto **não** deve receber nome inventado. Isto foi **reconciliação manual pontual**, não automação de sincronização pronta.
- A Quality Gate de `main@ce4eeb47` terminou **SUCCESS** ([run 44891849278](https://github.com/tonecosstudio/tonecosstudio/actions/runs/44891849278)). Os commits `ce312e82` e `ce4eeb47` corrigiram lint e pin/overlay de arquitetura, sem aprovar deploy. Este sucesso da CI **não** valida a migração D1 ausente nem autoriza cutover M5.
- Fonte histórica `washingtonmsdj/catalogo`: cinco workflows com metadados GitHub `active` (`cloudflare.yml`, `external-batch-release.yml`, `exact-source-gallery-promotion.yml`, `existing-gallery-promotion.yml`, `external-media-staging.yml`). O `AGENTS.md` registra jobs de escrita inibidos no código, mas **não** administrativamente desativados. Tentativa de desativação pela credencial disponível retornou HTTP 403 (`Must have admin rights to Repository`). O bloqueio administrativo e a identificação do writer real ainda precisam ser resolvidos pelo proprietário/conta autorizada; não chamar isso de concluído.

### Ordem canônica de execução — sem microtarefas e sem duplicação

1. **Estabilidade e ownership:** manter API pública compatível e operacional (testar origem Worker e proxy GET do domínio); impedir writers concorrentes no repositório legado, completar autoridade única/cutover M5. Revalidar o estado em cada execução, porque outros agentes podem implantar. **Não** aplicar `0025` nem implantar v9 antes dos gates canônicos.
2. **Reconciliação dos cinco estúdios existentes:** comparar todas as imagens por `message_id` + hash + ID + revisão, corrigir nomes já identificados sem reclassificar direitos; anexar somente mídias adicionais da mesma escultura quando a identidade for comprovada. Preservar os 44 nomes Abe3D já corrigidos; não sobrescrever revisões feitas no site.
3. **Importação restante:** percorrer os 106 tópicos (validar quais são de fato estúdios), agrupar os 4.431 álbuns e as 1.064 imagens individuais, confrontar com o inventário completo de 3.837 modelos e o R2 já existente; criar somente rascunhos privados quando não houver identidade correspondente. Manter `Geral +50k` e tópicos não designados fora de lotes de estúdio.
4. **Sincronização persistente:** evoluir o fluxo **existente** para consumir revisões/eventos da Curadoria com checkpoint/recibo por estúdio, CAS de revisão, deduplicação e retry idempotente; preservar backup privado dos dados, sem rebaixar o D1 a uma cópia desconectada e sem mover/modificar mídia original. Publicar visivelmente apenas itens elegíveis depois de autorização editorial/licencial específica.
5. **Aceite por métricas reais:** consultar contagens e títulos no SQLite e D1, testar amostra por estúdio via `/api/telegram-studios`, testar travessia de imagens/galerias e direitos, comprovar nenhuma duplicação por hash/ID e **zero divergências não explicadas** para os itens sincronizados. HTTP 200 da página HTML sozinho **não** prova a API ou os nomes.

### Como outro agente deve retomar

**Ler, nesta ordem:** `AGENTS.md`, `URGENTE.md`, este documento, `config/catalog-code-consolidation.json` e o SQLite existente no desktop autorizado via OrdaX MCP. Observar `main`/D1/Worker atuais, não confiar exclusivamente neste snapshot. Usar OrdaX MCP para o desktop; Remote Desktop Commander somente para recuperar o próprio MCP indisponível. Não duplicar banco, arquivo, mecanismo de sincronização, Worker, bucket, importador nem reprocessar imagens sem necessidade. Trabalhar apenas no estúdio atribuído quando estiver fazendo curadoria; coordenação de catálogo é transversal, respeitando revisões concorrentes.

**Consultas de observação úteis:**

```sql
-- D1, somente leitura; a publicação comercial não é a visibilidade da vitrine Telegram
SELECT telegram_studio, COUNT(*) AS modelos, SUM(published) AS publicados_comerciais,
       SUM(telegram_name_provisional) AS nomes_provisorios
  FROM models WHERE telegram_group_key IS NOT NULL GROUP BY telegram_studio;
SELECT name FROM d1_migrations ORDER BY id DESC LIMIT 1;
SELECT name FROM pragma_table_info('models') WHERE name='telegram_showcase_visible';
```

**Regras de conclusão:** atualizar esta seção e o inventário local com novo checkpoint apenas após provas; documentar commit exato/CI/versão ativa, contagens, o que entrou ou não no D1 e qualquer bloqueio. Não declarar os 106 tópicos alinhados antes de comprovar conciliação e visibilidade modelo a modelo.

### Reconciliação preparada de nomes de fichas existentes

**Modo operacional de nomes sem recarregar imagens:** `python scripts/catalog/preparar-publicacao-curadoria-telegram.py --names-only --db <sqlite> --existing-drafts-csv <export-d1.csv> --expected-draft-count <contagem-D1-do-escopo> --out <staging-privado>`. O export de D1 agora **deve** conter `image_count` e `gallery_version` de `models` para impedir uma galeria truncada. `--names-only` não visita as imagens originais nem requer `--existing-csv` comercial; gera apenas as duas saídas de planejamento já existentes. A pré-validação exige quantidade integral de fichas no escopo e quantidade de imagens por ficha; toda aplicação posterior ainda exige revalidar provas, autorização e revisão da D1 ao vivo.



O pré-publicador canônico `scripts/catalog/preparar-publicacao-curadoria-telegram.py` aceita o argumento opcional `--existing-drafts-csv`. Com um snapshot **completo e somente leitura** das fichas Telegram já existentes no D1, ele produz `correcoes_fichas_existentes.jsonl` e `resumo_correcoes_fichas_existentes.json` na mesma pasta de saída do preflight. Estes arquivos **não** aplicam PATCH, alteram direitos ou publicam imagens. Correspondem às mesmas fichas por todos os pares `tg:message_id` + SHA-256 da galeria, estúdio e grupo; somente nomes genéricos intocados (`telegram_revision=0`, status `pending`, direitos `not_reviewed`, provisório) são planejados. Títulos divergentes, revisões concorrentes, variantes contraditórias, mídias faltantes ou sem título permanecem retidos.

Colunas exigidas no CSV de rascunhos (uma por **imagem** vinculada à versão corrente de cada ficha): `model_id,studio,model,variant,sha256,image_id,telegram_group_key,telegram_revision,telegram_review_status,telegram_name_provisional,telegram_rights_status,published`. Gerar por SELECT somente leitura de `models` JOIN `model_image_sources` filtrando `s.gallery_version=m.gallery_version` e `m.telegram_group_key IS NOT NULL` e `m.telegram_origin_id='2370335738'`. Usar `--existing-csv` para o inventário comercial completo já exigido pelo preflight e `--existing-drafts-csv` para este snapshot Telegram; não substituir um pelo outro. A aplicação futura usa a rota administrativa PATCH existente, após GET/rechecagem dos hashes e revisão **atuais**, com identidade Supabase autorizada; a geração local do plano não implica aplicação automática.

### Prova real de nomes existentes — 21/11/2026

- O pré-publicador na `main@ffbbc4c` passou E2E no Windows via OrdaX MCP: planificação completa, duplicação por SHA, revisão concorrente, proteção contra export D1 truncado e modo `--names-only` sem leitura dos originais. A Quality Gate geral ainda precisa ter seu resultado final conferido; não confundir teste direcionado com release.
- Export D1 de produção conferido somente leitura: **1.228 fichas Telegram e 1.960 imagens vinculadas** nos cinco estúdios existentes. `name LIKE 'Modelo sem nome #%` revelou **uma** ficha ainda genérica: Luftmensch `tg_b61f7aaf4ced8a417d8cf192`, `#20483`. A execução real do pré-publicador com export completo **dessa galeria**, `--expected-draft-count 1`, gerou `ready=0`, `held.ambiguous_local_identity=1`; não alterou o D1.
- Para export global via `--names-only`, usar `--expected-draft-count 1228` apenas se o D1 ao vivo ainda confirmar esse número; o export por imagem requer `image_count`/`gallery_version` e *todos os membros* da galeria. Uma tentativa de transferir o snapshot grande ao computador falhou em transporte e foi abortada; não existe auditoria global concluída pelo novo script nem CSV permanente resultante dela.
- O Worker de recuperação `81d141df-b4e6-4f3f-8548-eb6a6dcaf4a0` estava ativo na última observação e o D1 ainda em `0024`, sem coluna `telegram_showcase_visible`; a autorização M5 continua ausente. **Não** ativar o Worker v9 nem aplicar `0025` fora dos gates canônicos; deployments concorrentes já geraram 503 e precisam cessar na autoridade de origem.
**Desbloqueio do importador por identidade de escultura:** uma busca global por `lower(name)` impedia importar personagens homônimos de outros artistas. O importador atual exige coincidência do mesmo estúdio + mesmo nome + mesma variante apenas como motivo de revisão, e já rejeita colisões reais de `originId + groupKey`, SHA-256 e mídias. Assim, esculturas independentes em estúdios diferentes não são proibidas só pelo nome; esculturas possivelmente duplicadas no mesmo estúdio continuam retidas, com visibilidade privada e sem promover direitos. Nenhuma importação de produção foi feita por esta mudança.


### Incidente de deploy concorrente reproduzido (21/11/2026 10:35–10:37Z)

Cloudflare deployments: Wrangler reativou versões `95f77f36-7f96-4a5c-a3f5-709e7e66f580` às 10:35:56Z e `d2f5333c-6285-47c5-a917-746f79cab4b0` às 10:37:36Z, com fonte `wrangler`. O audit log atribui a publicação à conta `tonecosstudio@gmail.com`, **não identifica qual chat/processo**. Entre os eventos houve restauração da versão compatível `81d141df-b4e6-4f3f-8548-eb6a6dcaf4a0` via API às 10:36:35Z; o deploy seguinte a substituiu, voltando ao HTTP 503. Não executar rollbacks em loop como solução permanente. Suspender o publicador concorrente por seu owner/credencial autorizada, e usar `scripts/catalog/cutover-readiness.mjs --live` antes de M5/0025; consultar os cinco workflows legados e não declarar nenhum estágio liberado só pela existência do SQL em Git.


### Planejamento privado por estúdio sem duplicar importador

O mesmo pré-publicador `scripts/catalog/preparar-publicacao-curadoria-telegram.py` agora pode usar `--private-drafts-only --db <SQLite> --existing-drafts-csv <snapshot-D1-model_id-studio-telegram_group_key> --expected-draft-count <fichas-D1> --franchises-csv <snapshot-D1-id-name> --expected-franchise-count <franquias-D1> --out <staging-privado>`. É **somente planejamento**, sem transferir imagens, tocar D1/R2, abrir visibilidade, aprovar direitos ou executar a rota administrativa. Reutiliza o importador atual `POST /api/admin/telegram-drafts/import` para a etapa autorizada.

Esse modo agrupa fotos por `model_group_key` ou `single:<message_id>`, valida estúdio, SHA-256, nome, universo e variante por galeria, rejeita colisões e grupos em revisão, retém grupos já existentes no D1, exige snapshots completos do D1 e aceita **somente correspondência única de franquia existente** (NFKD). Não cria franquias nem usa categoria genérica como paliativo. Saídas são `rascunhos_telegram_importacao_privada.jsonl`, `rascunhos_telegram_retidos.jsonl` e `resumo_rascunhos_telegram.json` na mesma pasta de staging, sem incluir dados ou credenciais em Git. A implantação de importação depende dos gates M5 e migration 0025; o importador deve repetir verificações no D1 real, conferir os dois objetos WebP por hash no R2 privado e autenticar a sessão admin.

A pré-auditoria local de 21/11 contou 5.495 identidades candidatas em 106 tópicos (incluindo não atribuídos), das quais 4.124 passaram pela triagem estrutural inicial; 1.575 tinham franquia única por nome normalizado, 2.546 não tinham correspondência exata e 3 tinham duplicidade de franquia. Esses números são **pré-triagem, não contagem de lotes finais**, pois ainda exigem comparação D1 e a identificação efetiva do estúdio. Permanecer em staging sem aprovação de direitos não autoriza apresentação pública.


### Checkpoint de importação privada e cobertura R2 — 21/11/2026

- **Entrega testada:** pré-publicador canônico com `--private-drafts-only`, snapshots D1 completos (1.228 grupos/fichas Telegram + 253 franquias), SHA e grupo por escultura, exclusão de `Geral +50k`/tópicos não atribuídos e correspondência de franquia única. Código em `main@f689eeef73aaed0c455493ca8f768bcd37930477`; E2E local aprovado e [Quality Gate #44896343569](https://github.com/tonecosstudio/tonecosstudio/actions/runs/44896343569) **SUCCESS**.
- **Resultado REAL somente leitura:** 5.434 identidades locais examinadas após exclusão de tópicos não designados; **1.038 novas galerias candidatas a rascunho privado** (1.288 imagens/SHAs distintos), **1.129 grupos já presentes em D1**, **3.267 galerias retidas**. Retidas por: 1.833 franquias ausentes/sem correspondência exata; 553 conflitos de identidade do estúdio; 387 nomes pendentes/rejeitados; 269 grupos sob revisão; 213 duplicações/ambiguidades de mídia; 11 conflitos de metadados; 1 franquia duplicada no D1. Estes números somam 5.434 e são da execução realizada, não previsão.
- **Prova no R2 PRIVADO:** inventário paginado da conta Cloudflare, bucket existente `tonecos-catalogo-staging`, prefixo `telegram-studios/v1/2370335738/telegram-webp-final-v1/`: **17 páginas / 16.794 objetos**, dos quais as **1.288 mídias** dos candidatos apresentaram ambos `display.webp` + `thumb.webp`, tamanho positivo, SHA original e metadados de perfil/derivação corretos; 0 ausentes, 0 parcialmente presentes, 0 metadados inválidos. A auditoria também cruzou os 1.288 `message_id`/SHA com o manifesto local de 8.646 imagens. Isso comprova inventário, não download byte a byte do R2 nem direitos/visibilidade.
- **Arquivos de staging preservados no desktop, não versionados no Git:** `C:\Users\ordax\Documents\TONART-Telegram-Import\publicacao-staging\rascunhos_telegram_importacao_privada.jsonl` (742.007 bytes, SHA-256 `0f5b7d0a40496f54f0bb1044d6e51a545564d39c360aff6038a9950ed0b837c7`), `rascunhos_telegram_retidos.jsonl` (508.587 bytes, SHA `7cca60656bbb8dc72abd7afab9f397c21d718db2be715d03319ca63a5debd59b`) e `resumo_rascunhos_telegram.json` (696 bytes, SHA `c02fbc342f64ec5d98d737201fc694a9ece7df88cc88d5e123393b57b1f6d763`). O plano é **regerável** a partir do SQLite e snapshots de D1/Franquias atuais; não constitui nova SSOT. **A cópia integral do SQLite não foi enviada ao remoto nesta execução**; um backup de teste comprimido de 13,6 MB foi criado só em diretório temporário e descartado. Não declarar backup remoto completo.
- **IMPORTAÇÃO NÃO EXECUTADA:** D1 ainda em `0024`, coluna `telegram_showcase_visible` ausente, Writer M5 não liberado. Não enviar essas operações até o gate canônico homologar migration `0025`, publicador único e a rota admin. O importador validará de novo, ao vivo, direitos/visibilidade privados, SHA proprietários e dois HEAD por mídia; não usar esse relatório para burlar aprovação. O Worker em versão compatível manteve cinco estúdios existentes. A futura vitrine pública só exibirá itens aprovados.

