# Backend canônico do catálogo TONART

O código de runtime do Worker e o contrato editorial versionado pertencem a `tonecosstudio/tonecosstudio/services/catalogo`. O destino aponta para o **mesmo** Worker `tonecos-catalogo-api`, D1 `tonecos-catalogo` e R2 `tonecos-catalogo-media`; nenhum recurso Cloudflare é recriado. A `main` original foi reconciliada com as correções #266–#269 e a funcionalidade local de capas de pastas foi preservada. Os SHA exatos e a fase são propriedade de `../../config/catalog-code-consolidation.json`.

**Estado atual: staged-offline. Não publicar antes do portão M5.** Até a desativação comprovada do workflow antigo, `washingtonmsdj/catalogo` ainda é o publicador operacional. A cópia no repositório TONART não é uma segunda instância do Worker. `wrangler.jsonc` declara os recursos existentes e não deve ser usado para recriá-los.

## Validação e publicação sem duplicação

- `npm run catalog:monorepo:check` valida todos os arquivos de origem e os dois overlays locais com SHA Git. `npm run catalog:worker:typecheck`, `npm run catalog:worker:test` e `npm run catalog:worker:search:test` validam o Worker sem consumir D1/R2 remoto.
- `node scripts/catalog/cutover-readiness.mjs --live` é o portão somente leitura: confirma identidades, `main` da origem, PR de mídia #266 já integrada, blob de mídia atual, configuração do Worker, Writer original desabilitado, ausência de runs não terminais, autorizações, credenciais e rollback. Qualquer divergência bloqueia.
- **Um único workflow alvo:** `../../.github/workflows/quality.yml` executa o job `catalog-cutover-release` apenas por disparo manual na `main`, após o portão vivo. Usa Wrangler fixado, valida o pacote, carrega uma versão sem tráfego, testa o candidato, promove 100% e recupera a versão anterior em falha. O cutover inicial **não executa migrações D1**.
- A produção é a autoridade operacional até M5 efetivo: não marcar `releaseAuthorized`, `sourceWriterDisabled` ou `targetProductionCredentialsVerified` como verdade sem evidência remota. Não executar deploy manual por fora do release gate.

## Contrato editorial

`config/catalog-production-model-contract.json` é a fonte versionada de nomes e variantes; o painel TONART envia revisões ao mesmo repositório, autenticadas pela autoridade Supabase existente. O contrato foi transferido byte a byte, sem recriação de dados. O publicador deriva as alterações desse contrato apenas após os gates de publicação. A submissão administrativa necessita de GitHub App de escopo restrito no repositório TONART e credenciais privadas na Vercel, ainda não comprovadas.

## Limites

- Não copiar dados D1, objetos R2, imagens ou frontend antigo para este diretório.
- Não ativar pipeline concorrente nem autorizar `workflow_dispatch` antigo durante a transferência.
- Não alterar Supabase, e-mails comerciais, indexação, pagamentos ou permissões de mídia como efeito colateral.
- A documentação histórica do processo M0–M6 permanece em [MIGRACAO_CATALOGO_MONOREPO.md](../../docs/MIGRACAO_CATALOGO_MONOREPO.md); o manifesto e o runtime presente são a autoridade atual.

### Writers da origem que impedem o M5

Além do deploy `cloudflare.yml`, existem quatro workflows GitHub Actions na origem com capacidade de publicar D1/R2: `external-batch-release.yml`, `exact-source-gallery-promotion.yml`, `existing-gallery-promotion.yml` e `external-media-staging.yml` (staging R2). O primeiro corte exige os cinco fluxos `disabled_manually` e sem `in_progress`, `queued`, `requested`, `waiting` ou `pending`. IDs e caminhos estão fixados no manifesto e no guard offline. Depois do corte, os releases TONART não consultam Washington.

### Edição editorial aprovada → D1 existente (após M5)

O endpoint administrativo cria uma PR no **único repositório** TONART. A integração da PR não altera o D1 automaticamente. O mesmo workflow `.github/workflows/quality.yml` executa `catalog-editorial-apply` automaticamente apenas quando a PR editorial canônica é integrada à `main`, sob o ambiente protegido `production`, com uma fila única e não cancelável compartilhada com a publicação do Worker. O job verifica o corte M5, a PR integrada na `main`, uma aprovação independente no SHA da revisão, a alteração **exclusiva** do contrato editorial e um máximo de 12 modelos publicados com identidade intacta. Compara a versão revisada com o estado real do D1 e executa um único `UPDATE` parametrizado, transacional e condicionado à igualdade integral dos estados anteriores; concorrência ou divergência bloqueiam todas as atualizações. Confirma as linhas resultantes e relê o banco. Reexecução do mesmo PR já aplicado é idempotente.

A verificação offline é `npm run catalog:editorial:d1:test`. **Não executar `editorial-apply` antes de `cutover-complete` e de ter um único writer TONART.** Não há nova API administrativa de escrita D1, segundo Worker ou duplicação de nomes em Supabase.

### Proteção da identidade em galerias já publicadas

O D1 existente contém o trigger `trg_gallery_member_scope_immutable`: a alteração de `models.name` é proibida para modelos presentes em `model_gallery_members` (como canônico ou origem). Em 12/11/2026 havia **22 modelos publicados** com essa restrição. O publicador consulta essa associação no banco vivo antes de editar, retorna `editorial_gallery_name_protected` para uma renomeação protegida e recusa **todo o lote**. A própria SQL atômica repete a proteção para impedir uma corrida entre leitura e gravação. Alterações apenas em `variant_name`, mantendo o nome, continuam permitidas. O teste local reproduz o trigger vigente e confirma ausência de alterações parciais. Não enfraquecer o trigger nem aplicar migração D1 silenciosa durante o corte.

### Ferramentas D1/R2 de publicação migradas (candidato, sem ativação)

Em 12/11/2026 foram adicionados ao `services/catalogo` **25 módulos Python, um manifesto de dependências Python e seis arquivos canônicos de configuração** para publicação de lotes, validação de identidade, galerias e staging de mídia, importados byte a byte da `main` do catálogo original. Todos os **43 Git blobs**, incluindo oito testes de regressão da origem e três evidências do lote atual, estão fixados em `config/catalog-code-consolidation.json` e verificados pelo guard existente, além de uma checagem estática de importação Python no CI.

Estes arquivos **não publicam automaticamente**: ainda não há um segundo workflow ativo de escrita de dados. Não habilitar as ferramentas até que os fluxos de publicação únicos sejam integrados ao workflow TONART, credenciais e preflight sejam aprovados, os cinco workflows Washington estejam comprovadamente desativados e o M5 esteja concluído. Recursos `tonecos-catalogo-api`, D1 `tonecos-catalogo` e R2 `tonecos-catalogo-media` continuam únicos e existentes. Os descritores históricos de lotes não foram copiados em massa; somente o lote atual foi transferido como referência para validação e futuros lotes pertencem ao owner TONART.

### CORS de produção

O Worker atual serve a lista histórica de origens; a configuração candidata acrescenta **somente** `https://tonartstudio.com.br`. O primeiro deploy exige que as origens remotas antigas sejam subconjunto exato da lista candidata (`--allow-cors-expansion`) e, após a promoção, exige igualdade exata. O overlay SHA em `config/catalog-code-consolidation.json` registra esta diferença sem forçar atualização em produção durante `staged-offline`.

### Publicação de lotes com um único writer preparado (inativo até M5)

O **mesmo** workflow `.github/workflows/quality.yml` recebeu a operação manual `data-batch-release` com dois jobs canônicos: `catalog-batch-preflight` (avaliação/dry-run) e `catalog-batch-apply` (reapresenta e valida os bytes da staging, publica R2 e faz a inclusão atômica no D1 existente). A sequência preserva a lógica e os testes do antigo `external-batch-release.yml`, usa somente ferramentas do `services/catalogo` e mantém a aprovação do ambiente `production` para o job de escrita. O descritor é limitado a `config/external-batches/*.json`, com staging e produção R2 atestadas. Não há migrações D1, novos buckets, Workers ou repositórios.

**Bloqueio intencional:** os jobs abortam antes de qualquer acesso aos dados se `cutover-readiness --live` não comprovar `cutover-complete` e o único owner TONART. A origem ainda é publicadora ativa; não disparar `apply` antes do corte e da validação das credenciais. Restam portar as rotas especializadas de promoção de galerias e staging de mídia antes de poder desativar todos os cinco writers Washington.
