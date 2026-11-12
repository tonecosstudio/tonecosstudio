# Catálogo público — transporte first-party canônico

**Atualizado em 12/11/2026.** Frontend oficial: **Vercel `tonart-studio-public` → https://tonartstudio.com.br**. O Cloudflare Pages `tonecosstudio` permanece **prévia protegida**. O **único backend de modelos/mídia** continua sendo o Worker `tonecos-catalogo-api` com D1 e R2 existentes; o publicador ativo está em `washingtonmsdj/catalogo`.

## Caminhos existentes (sem duplicação)

- **Site oficial Vercel:** navegador → endpoint first-party `/catalogo-api/...` → adaptador restrito `api/catalogo-proxy.js` (via reescrita do site) → **Worker original**. O código de transporte da Vercel é diferente do transportador Pages, mas ambos respeitam a mesma API pública.
- **Prévia Pages:** navegador → `functions/catalogo-api/[[path]].js` → Service Binding `env.CATALOG_WORKER.fetch` → mesmo Worker original. Sem binding, falha fechada; sem fallback para outro domínio, Worker ou inventário.
- **Resolver único do frontend:** `src/config/canonical-catalog-endpoint.ts` e cliente `src/services/catalog/public-catalog-gateway.ts`. Navegação, ficha, pastas, filtros e galeria não consultam Supabase nem criam outra base.
- **Rota de mídia:** somente chaves `media/...` verificadas; Range, ETag, HEAD e GET preservados. Chaves inválidas, traversal, Unicode malformado e segmentos indevidos são rejeitados.

## Escopo e controle de custo

Leituras públicas aceitas: `/api/catalog`, `/api/categories`, `/api/franchises`, `/api/folders`, `/api/recent`, `/api/models/:slug`, `/api/models/:slug/images` e `/media/:key`, através do prefixo first-party. Os métodos e cabeçalhos são filtrados; não encaminhar credenciais/cookies ou reescrever cabeçalhos privilegiados do Worker. Erros não devem ser cacheados.

- Catálogo da administração: primeira página limitada a **12 modelos** automaticamente; demais páginas/buscas, capas e galerias completas somente quando solicitadas.
- Cache no Worker: usa os próprios `Cache-Control` públicos; nenhuma varredura D1 ou leitura de acervo R2 apenas para validar o cache.
- Cache CDN Vercel: `Vercel-CDN-Cache-Control: public, s-maxage=300` para JSON público 200 de catálogo, `recent`, fichas e galeria (somente se o Worker autorizou cache público). Não estender a erros, cookies, dados de contas, tokens, pedidos privados, Range ou mídia R2.
- Proteção de parâmetros: [TONART PR #24](https://github.com/tonecosstudio/tonecosstudio/pull/24) rejeita parâmetros desconhecidos/repetidos/abusivos no proxy. [Worker PR #268](https://github.com/washingtonmsdj/catalogo/pull/268) implementou defesa correspondente **na origem direta**; [PR #269](https://github.com/washingtonmsdj/catalogo/pull/269) ajustou o smoke de cache para usar apenas a chave canônica `/api/recent?limit=1`. Gates de staging, promoção, cache HIT e rollback aprovados na publicação de 12/11; Worker `0b6d0d02-58f6-4f99-9a9a-92a605a498ed` observado a 100%.
- Correção original HTTP Range [PR #266](https://github.com/washingtonmsdj/catalogo/pull/266) **já foi integrada e publicada**; não reimplementar por workaround na Vercel/Pages. Imagens comuns continuam visíveis; mídias SpecialSTL identificadas permanecem em quarentena até aprovação de direitos.

## Segurança e validação

Validadores do cliente e do proxy limitam caminhos e campos antes de fazer requests. A autoridade final de leitura D1/R2 é **sempre o Worker**. O proxy Pages aplica `Content-Security-Policy: sandbox` e allowlist de cabeçalhos, sem aceitar redirecionamentos/credenciais do upstream. O proxy Vercel mantém transporte estritamente GET/HEAD público quando permitido por rota; nenhum deles é endpoint de escrita do catálogo.

Testes offline relevantes: `scripts/cloudflare/catalog-pages-proxy.test.mjs`, `scripts/vercel/catalog-proxy.test.mjs` e suíte do Worker original. **Não** confundir testes HTTP e build verde com QA visual autenticado desktop/mobile ou E2E de cadastro/orçamento. Cache HIT confirmado não prova consumo zero de D1 para consultas inéditas. Não executar scans SQL, importações, testes de carga, D1/R2 remoto em massa ou novos caches como forma de monitoramento.

Ver [README](../README.md), [AGENTS](../AGENTS.md), [plano de migração](MIGRACAO_CATALOGO_MONOREPO.md) e [runbook Pages](OPERACAO_CLOUDFLARE_PAGES.md).
