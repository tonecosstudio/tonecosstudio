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
