# Cloudflare Ordax: DNS, Vercel origin, R2 e seguranca

Este setup usa somente o dominio:

```text
https://ordax.com.br
```

Nao usar `catalog.ordax.com.br`.

## Arquitetura atual

```text
ordax.com.br/*                    -> Cloudflare proxy -> Vercel
ordax.com.br/catalog-webp-final/* -> Cloudflare Worker -> R2 ordax-catalog
```

Cloudflare Pages `ordax` esta preparado, mas nao e o origin de producao atual,
porque o site Ordax ja esta na Vercel e ainda nao ha deployment no Pages.

## Criado/configurado na Cloudflare

- Zona DNS `ordax.com.br`
  - Status: `active`
  - Nameservers Cloudflare:
    - `addyson.ns.cloudflare.com`
    - `dylan.ns.cloudflare.com`
- DNS apex `ordax.com.br`
  - Tipo: `A`
  - Conteudo: `76.76.21.21`
  - Proxy: ligado
  - Objetivo: manter a producao na Vercel com protecao Cloudflare
- DNS `www.ordax.com.br`
  - CNAME Vercel importado
  - Proxy: ligado
- Worker route
  - `ordax.com.br/catalog-webp-final/*`
  - Script: `ordax-catalog-assets`
- R2 bucket
  - `ordax-catalog`
  - `r2.dev` habilitado
  - CORS aplicado para `https://ordax.com.br`, `https://www.ordax.com.br` e `http://127.0.0.1:8080`
- Pages project preparado
  - `ordax`
  - `ordax.pages.dev`
  - Sem dominio customizado ativo

## Estado atual

A zona ja esta ativa na Cloudflare. O dominio `ordax.com.br` responde pela
borda Cloudflare e a rota do catalogo em:

```text
https://ordax.com.br/catalog-webp-final/*
```

ja esta ligada ao Worker `ordax-catalog-assets`.

## Variaveis

Configure no `.env.local` ou no ambiente de CI. Nao envie segredos no chat.

```powershell
$env:CLOUDFLARE_API_TOKEN="..."
$env:CLOUDFLARE_ACCOUNT_ID="ac1ca1b50d09c7a4cb81274d2aa1e78f"
$env:CLOUDFLARE_ZONE_NAME="ordax.com.br"
$env:CLOUDFLARE_ZONE_TYPE="full"
$env:CLOUDFLARE_PRODUCTION_ORIGIN="vercel"
$env:CLOUDFLARE_VERCEL_APEX_A_RECORD="76.76.21.21"
$env:CLOUDFLARE_PAGES_PROJECT="ordax"
$env:CLOUDFLARE_PAGES_PRODUCTION_BRANCH="main"
$env:CLOUDFLARE_CATALOG_WORKER="ordax-catalog-assets"
$env:CLOUDFLARE_CATALOG_ROUTE="ordax.com.br/catalog-webp-final/*"
$env:CLOUDFLARE_R2_BUCKET="ordax-catalog"
$env:VITE_CATALOG_ASSET_BASE_URL="https://ordax.com.br"
```

Para upload dos WebPs ao R2:

```powershell
$env:CLOUDFLARE_R2_ACCESS_KEY_ID="..."
$env:CLOUDFLARE_R2_SECRET_ACCESS_KEY="..."
$env:CLOUDFLARE_R2_ENDPOINT="https://ac1ca1b50d09c7a4cb81274d2aa1e78f.r2.cloudflarestorage.com"
```

Para inserir a fila no Supabase:

```powershell
$env:VITE_SUPABASE_URL="https://seu-projeto.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="..."
```

## Bootstrap

Dry-run:

```powershell
npm run cloudflare:bootstrap
```

Execucao real:

```powershell
npm run cloudflare:bootstrap -- --execute
```

O bootstrap:

- cria/verifica a zona `ordax.com.br`;
- tenta configurar SSL Full, Always HTTPS, TLS minimo 1.2 e HTTPS Rewrites;
- cria/atualiza DNS apex para Vercel com proxy Cloudflare;
- cria bucket R2;
- sobe o Worker `ordax-catalog-assets`;
- cria a rota `ordax.com.br/catalog-webp-final/*`;
- cria/atualiza o Pages project `ordax`, sem assumir a producao enquanto
  `CLOUDFLARE_PRODUCTION_ORIGIN=vercel`.

As configuracoes de SSL/HTTPS podem exigir permissao extra de zone settings.
Quando a API nao tiver permissao, o bootstrap registra `blocked` e continua.

## Catalogo Telegram

Saida WebP esperada:

```text
C:\Users\Casa\Downloads\ordax-catalogo-webp-final
```

Dry-run:

```powershell
npm run cloudflare:r2:upload-catalog
npm run cloudflare:r2:import-queue
```

Execucao:

```powershell
npm run cloudflare:r2:upload-catalog -- --execute
npm run cloudflare:r2:import-queue -- --execute
```

O importador grava URLs como:

```text
https://ordax.com.br/catalog-webp-final/...
```

Estado Dragon Ball em 2026-06-12:

```text
740 objetos WebP enviados ao R2
370 itens publicados no Supabase
rota publica validada em ordax.com.br/catalog-webp-final/...
```

## Beneficios gratuitos Cloudflare aplicados/preparados

- DNS autoritativo Cloudflare.
- Proxy Cloudflare ligado no apex e no `www`.
- Protecao DDoS na borda.
- Worker route isolada para o catalogo.
- R2 como storage sem expor chaves no frontend.
- Cache longo para assets WebP do catalogo.
- Headers de seguranca no Pages e no Worker.
- SSL/TLS universal apos a zona sair de `pending`.

## Vercel

O apex foi configurado com o valor geral recomendado pela Vercel para dominios
raiz:

```text
A ordax.com.br -> 76.76.21.21
```

O registro `www.ordax.com.br` importado da Vercel foi mantido.
