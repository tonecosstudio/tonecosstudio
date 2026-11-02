# Integração canônica do catálogo público no Tonecos Studio

A única autoridade para modelos, categorias, franquias, galerias e imagens é o Worker Cloudflare `tonecos-catalogo-api` (D1/R2). O Tonecos Studio não mantém cópia dos modelos no Supabase.

## Caminho de leitura

Em produção e previews HTTPS, sem configuração explícita, o navegador usa `/catalogo-api/` na própria origem. O `vercel.json` encaminha somente as rotas públicas indexadas de catálogo, categoria, franquia, ficha, galeria e `media/` para o Worker, antes do fallback SPA. Nenhum endpoint genérico ou administrativo é exposto pelo proxy. As chamadas são `GET`, sem credenciais; paginação máxima 60 no gateway e padrão 24 na UI. O proxy respeita as instruções de cache da origem, sem impor TTL novo. A CSP não precisa liberar domínios externos.

`src/config/canonical-catalog-endpoint.ts` é o único resolvedor da base para as duas telas (`/modelos` e `/modelos/:slug`). `VITE_CANONICAL_CATALOG_API_BASE` continua sendo um override explícito; em desenvolvimento sem HTTPS a integração permanece desabilitada, sem fallback para OrdaX.

## Evidência de conectividade (02/11/2026)

O Worker `https://tonecos-catalogo-api.tonecosstudio.workers.dev` respondeu `200` e `ok=true` no endpoint de saúde. Uma única consulta de amostra `/api/catalog?limit=1` respondeu `200`, 1 item e cursor seguinte. Um `HEAD` da capa de amostra respondeu `206`, tipo `image/webp`. Não foram executadas varreduras, migrações, escritas ou consultas integrais ao D1.

## Gates

A homologação de UI no navegador protegido ainda depende de acesso autenticado ao preview. A associação histórica de `ordax.com.br`, `www.ordax.com.br` e `ordax-three.vercel.app` ao projeto Vercel precisa ser removida separadamente: não transferir domínio nem alterar DNS. Publicação em produção permanece proibida antes dessa revisão.
