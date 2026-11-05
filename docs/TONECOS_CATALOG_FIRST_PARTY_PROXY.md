# Catálogo público — proxy canônico do Cloudflare Pages

**Hospedagem do frontend:** Cloudflare Pages tonecosstudio, conta Tonecos. **API única:** Worker tonecos-catalogo-api na mesma conta, controlador de D1/R2. O site não possui catálogo em Supabase nem outra API.

## Como funciona

Em HTTPS, o navegador usa **/catalogo-api/** na própria origem do site. A função **functions/catalogo-api/[[path]].js** só atende rotas públicas GET da allowlist; sua única saída autorizada é **env.CATALOG_WORKER.fetch**. O Service Binding **CATALOG_WORKER → tonecos-catalogo-api** está configurado nos ambientes preview e produção do Pages. Sem binding, retornar erro em vez de usar outro Worker, URL externa ou outro banco.

Rotas de leitura aceitas pela função:
- /catalogo-api/api/catalog
- /catalogo-api/api/categories
- /catalogo-api/api/franchises
- /catalogo-api/api/folders
- /catalogo-api/api/models/:slug
- /catalogo-api/api/models/:slug/images
- /catalogo-api/media/:path* (segmentos validados)

Método diferente de GET → 405; path fora da allowlist → 404; exceção no upstream → 502; redirecionamento inesperado é rejeitado. Encaminha Range de mídia e If-None-Match. A resposta é **construída por allowlist de cabeçalhos**: preserva somente semântica pública de JSON, cache, ETag, Range, codificação, CORS público e CORP de mídia; descarta cookies, Clear-Site-Data, políticas de segurança impostas pelo upstream, Refresh, Location, Link, Content-Disposition e credenciais CORS. O Worker não recebe autoridade para alterar a política do site por meio de cabeçalhos. O contrato da **Pages Function** não é o mesmo que um HEAD direto no Worker, que pode ter suporte diferente.

**Resolver SSOT:** src/config/canonical-catalog-endpoint.ts. **Cliente:** src/services/catalog/public-catalog-gateway.ts. O cliente usa uma única função de GET JSON para listagem, ficha, galeria e navegação; URLs de mídia só são construídas a partir de chaves `media/...` que obedeçam aos limites de segmentos e comprimento da função Pages. Chaves apontando para `api/...`, segmentos inválidos, traversal, controle ou Unicode malformado são rejeitadas antes de renderização. A variável VITE_CANONICAL_CATALOG_API_BASE é override explícito, não convite para fallback OrdaX. As rewrites no vercel.json são apenas compatibilidade histórica, não o caminho oficial Cloudflare.

## Testes e evidências

- Teste offline: scripts/cloudflare/catalog-pages-proxy.test.mjs, seleção/gateway de catálogo e gate scripts/security/assert-public-mvp-bundle.mjs.
- Sondas anteriores de baixo volume validaram seis capas WebP, ficha do modelo **nier-10h-nier** e galeria. **Não** confundir isso com renderização visual correta em mobile/desktop.
- Problema HTTP Range no backend está separado em **washingtonmsdj/catalogo#266**; não corrigir na Pages Function com workaround e não implantar Worker sem testes/staging/rollback.
- Jamais realizar scan SQL, importação ou varredura D1/R2 para validar integração do frontend.

Ver [arquitetura](TONECOS-STUDIO-CONSOLIDACAO.md) e [runbook](OPERACAO_CLOUDFLARE_PAGES.md).
