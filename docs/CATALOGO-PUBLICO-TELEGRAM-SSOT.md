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
- Curadoria VX-Labs no SQLite canônico do desktop autorizado: **237 registros nomeados como propostas, 40 galerias, 207 hashes distintos nas galerias**; os **414 WebP** correspondentes (`display`/`thumb`) foram verificados no R2 privado de staging. A curadoria tem **40 eventos `private_import_preflight_checked`** e **16 candidatos de correspondência a IDs de franquias já existentes no D1**, com evidência em `curation_events`, **sem tocar nos outros estúdios**. As demais 24 galerias exigem categoria apropriada/revisão; nomes iguais não autorizam reuso de `model_id`.
- As fichas de personagem e vínculos ficam em `annotations` e `name_proposal_events` como **rascunhos de revisão**, não no catálogo público e não equivalem a licenciamento. Não marcar `aprovado` nem `confirmado` em massa; o pré-publicador comercial ainda exige os gates de revisão e direitos.

**Sequência de implantação sem duplicação:** (1) reconciliar e comprovar publicador único a partir do cutover M5, dos bindings e da versão ativa; (2) homologar migration 0025 e aplicar a mesma no D1 canônico pelo pipeline autorizado, validando ledger/trigger/coluna; (3) publicar a versão compatível do único Worker existente e verificar que os 1.228 modelos anteriores continuam visíveis; (4) importar o VX-Labs **apenas como rascunhos privados** por `/api/admin/telegram-drafts/import`, usando os grupos e hashes existentes, após resolver taxonomia e conflitos de identidade; (5) expor somente as fichas especificamente aprovadas. Sem criar pipeline, D1, R2 ou catálogo concorrente como atalho.
