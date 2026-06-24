# Cloudflare live status - Ordax

Data: 2026-06-12

Conta:

```text
Account ID: ac1ca1b50d09c7a4cb81274d2aa1e78f
Account name: Washingtonmsdj@gmail.com's Account
```

## Zonas DNS

```text
acheguese.com.br - active
ordax.com.br     - active
```

Zona Ordax:

```text
Zone ID: 6c98a2130176029e14c14d949bafd66a
Cloudflare nameservers:
- addyson.ns.cloudflare.com
- dylan.ns.cloudflare.com
Original nameservers:
- a.sec.dns.br
- c.sec.dns.br
```

`ordax.com.br` ja esta delegado para a Cloudflare e operando com proxy ativo.

## DNS configurado

```text
A     ordax.com.br      -> 76.76.21.21                         proxied
CNAME www.ordax.com.br  -> 41ba9f63fdc43df6.vercel-dns-017.com proxied
TXT   _vercel           -> verificacao Vercel                   DNS only
TXT   _vercel           -> verificacao Vercel                   DNS only
```

O apex continua apontando para a Vercel, agora preparado para passar pelo proxy
Cloudflare quando a zona ativar.

## Catalogo

R2:

```text
Bucket: ordax-catalog
Storage class: Standard
Location: ENAM
Created: 2026-06-06T22:58:46.707Z
r2.dev: pub-cd42e375046145d498ddee4da8f5950e.r2.dev (enabled)
CORS: enabled for ordax.com.br, www.ordax.com.br e localhost:8080
```

Worker:

```text
Script: ordax-catalog-assets
R2 binding: ORDAX_CATALOG -> ordax-catalog
```

Worker route:

```text
ordax.com.br/catalog-webp-final/* -> ordax-catalog-assets
```

Checagem publica:

```text
https://ordax.com.br/catalog-webp-final/test-upload.txt -> 200
```

## Pages

```text
Project: ordax
Subdomain: ordax.pages.dev
Production branch: main
Build command: npm run build
Output dir: dist
Latest deployment: none
Custom domain: none
```

Pages esta preparado, mas nao esta assumindo `ordax.com.br` porque a producao
atual foi preservada na Vercel.

## Settings de seguranca

Tentativas via API para estes settings foram feitas:

```text
SSL Full
Always Use HTTPS
Minimum TLS 1.2
Automatic HTTPS Rewrites
Brotli
```

A API conectada negou esses ajustes com erro de permissao/autenticacao para zone
settings. O DNS proxy e a Worker route foram configurados mesmo assim.

## Catalogo Dragon Ball

Estado do lote preparado em 2026-06-12:

```text
R2 bucket: lote Dragon Ball enviado
Supabase queue: 370 itens Dragon Ball publicados
Catalogo publico: ativo
```

Validacao:

```text
Uploads: 740/740
Fila publicada: 370/370
Rota publica: 200
```

Arquivos de operacao:

```powershell
tmp/dragon-ball-live/dragon-ball-worker-upload-report.json
tmp/dragon-ball-live/dragon-ball-publish-report.json
```
