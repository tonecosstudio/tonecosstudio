# Catalog Staging Import - 2026-05-28

Origem analisada:

`https://drive.google.com/drive/folders/1HcU2eCTb-jwar2yixG3f31PlWDbdvDuF`

## Resultado

- 40 itens identificados no manifesto manual inicial.
- 39 imagens abriram no contact sheet do Drive.
- 38 modelos foram gravados no Supabase como staging.
- 2 itens foram bloqueados antes de importar.
- 0 itens foram publicados no catalogo publico nesta etapa.

Todos os modelos importados ficaram com `is_active = false` em `models`, para revisao antes de aparecerem no site.

## Storage

As imagens foram compactadas para WebP antes do upload:

- imagem principal: ate 1400px de largura, `quality: 82`
- thumbnail: ate 480px de largura, `quality: 76`

Padrao de path no bucket `models`:

```text
catalog-staging/{categoria}/{subcategoria}/{driveFileId}-{nome}.webp
catalog-staging/{categoria}/{subcategoria}/thumbs/{driveFileId}-{nome}.webp
```

## Banco

Enquanto as migrations profissionais ainda nao estao aplicadas no Supabase remoto, os itens foram salvos na tabela legada `models` com:

- `name`: nome de exibicao, incluindo variante quando existe.
- `franchise`: obra/origem.
- `category` e `subcategory`: destino organizado para catalogo.
- `tags`: inclui `drive-import`, `drive-identified`, `catalog-staging`, `price-consultation` e `drive-id-{id}`.
- `image_bucket` e `image_path`: apontam para o WebP principal no Storage.
- `thumbnail_url`: URL publica do thumbnail WebP.
- `is_active = false`: nao aparece no catalogo publico.

## Itens bloqueados

| Arquivo | Motivo |
| --- | --- |
| `spider-man.jpg` | O Drive retornou apenas o texto `Teste 3`, apesar do metadado declarar `image/jpeg`. |
| `Tigre Branco Power Ranger.jpg` | A imagem validada visualmente corresponde a um mecha/Gundam, nao a Tigre Branco/Power Rangers. |

Atualizacao em 2026-05-29: `Tigre Branco Power Ranger.jpg` foi reclassificado como `White Tigerzord (Mighty Morphin)` e importado como staging inativo em `series/power-rangers`, com tag `needs-visual-review`.

## Distribuicao gravada

| Categoria/subcategoria | Quantidade |
| --- | ---: |
| `animes/demon-slayer` | 2 |
| `animes/doug` | 1 |
| `animes/dragon-ball` | 2 |
| `animes/dragon-ball-gt` | 1 |
| `animes/dragon-ball-z` | 1 |
| `animes/frieren` | 1 |
| `animes/kim-possible` | 1 |
| `animes/naruto` | 3 |
| `animes/one-piece` | 1 |
| `animes/one-punch-man` | 1 |
| `animes/saint-seiya` | 1 |
| `animes/solo-leveling` | 1 |
| `filmes/o-senhor-dos-aneis` | 1 |
| `jogos/devil-may-cry` | 1 |
| `jogos/gears-of-war` | 1 |
| `jogos/genshin-impact` | 1 |
| `jogos/god-of-war` | 1 |
| `jogos/magic-the-gathering` | 2 |
| `jogos/red-dead-redemption` | 1 |
| `jogos/the-evil-within` | 1 |
| `jogos/the-witcher` | 1 |
| `outros/fisiculturistas` | 5 |
| `quadrinhos/lady-death` | 1 |
| `quadrinhos/marvel` | 4 |
| `quadrinhos/x-men` | 1 |
| `series/power-rangers` | 1 |

## Artefatos locais

- `tmp/catalog-identified-drive-items.json`: manifesto classificado.
- `tmp/catalog-identified-contact-sheet.webp`: verificacao visual dos arquivos do Drive.
- `tmp/catalog-identified-contact-sheet-report.json`: metadados e falhas do Drive.
- `tmp/catalog-identified-staging-import-report.json`: resultado da importacao para Supabase.
- `tmp/catalog-staging-supabase-contact-sheet.webp`: verificacao visual dos thumbnails ja salvos no Supabase.
- `tmp/catalog-staging-supabase-contact-sheet-report.json`: metadados dos thumbnails do Supabase.

## Proximo passo

Usar a curadoria administrativa em `/admin/catalogo?tab=curation` para aprovar, publicar, rejeitar ou marcar duplicidade item por item. O catalogo publico continua lendo apenas modelos ativos; os 44 itens importados seguem ocultos ate aprovacao.

## Atualizacao 2026-05-29

- Total staging atual: 44 registros.
- Registros ativos no staging: 0.
- `White Tigerzord (Mighty Morphin)` foi adicionado como correcao de nome/imagem.
- 4 thumbnails staging foram trocadas para PNG transparente apenas para conferencia: `Dante`, `Frieren`, `Kyojuro Rengoku` e `Ranger Verde`.
- A fila profissional `catalog_import_items` foi populada com 44 itens em `review`: 39 vindos do staging original e 5 arquivos de nome generico identificados visualmente.
- Arquivos genericos validos adicionados ao staging: `Goku (Super Saiyan 4)`, `Harry Potter`, `Harry Potter e Voldemort (Diorama)`, `Rei Bruxo de Angmar (Montado)` e `Stitch`.
- Arquivos `desconhecido.jpg`, `figura1.jpg`, `figura2.jpg` e `figura3.jpg` foram bloqueados como payload invalido de 7 bytes.
- Auditoria de duplicidade do staging: 44 imagens lidas, 0 hash exato duplicado, 0 mesmo Drive ID, 1 par visual suspeito (`Videl (DD)` x `Videl`), 7 itens com `needs-visual-review`.

## Atualizacao 2026-05-29 - backfill profissional

- A fila profissional `catalog_import_items` esta ativa no Supabase remoto.
- 44 itens da fila receberam `original_sha256`, `optimized_sha256`, `perceptual_hash`, `canonical_identity_key`, dimensoes e formato de imagem.
- 42 itens da fila ficaram `duplicate_status = unique`.
- 2 itens da fila ficaram `duplicate_status = needs_review`: `Videl` e `Videl (DD)`, por similaridade visual.
- 5 itens da fila ficaram `name_review_status = needs_review` por origem em arquivos genericos.
- 9 itens da fila ficaram `visual_review_status = needs_review`.
- Os 56 registros em `models` tambem receberam hashes visuais e dimensoes; nenhum dos 8 modelos publicos ativos ficou marcado como duplicado.
