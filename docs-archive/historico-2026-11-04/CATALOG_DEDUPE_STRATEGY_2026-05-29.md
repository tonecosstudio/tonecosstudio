# Catalog Dedupe Strategy - 2026-05-29

O catalogo deve ler do Supabase. O Google Drive e origem de importacao, nao fonte direta do site.

## Camadas

1. `catalog_import_items`: fila bruta/curadoria. Todo arquivo entra aqui primeiro, sempre oculto.
2. Storage `models`: copia otimizada em WebP e thumbnail. O Drive nao fica no caminho publico.
3. `models`: somente itens revisados/publicados, com personagem, versao, origem, tags e visibilidade.

## Duplicatas

- `source_file_id`: impede importar duas vezes o mesmo arquivo do Drive.
- `original_sha256`: detecta bytes exatamente iguais antes da compressao.
- `optimized_sha256`: detecta bytes iguais da copia salva no Storage.
- `perceptual_hash`: detecta imagem visualmente parecida, mesmo redimensionada/comprimida.
- `canonical_identity_key`: agrupa personagem + origem + versao. Exemplo: `dragon-ball|goku|super-saiyan-3`.

Duplicata visual nao deve ser apagada automaticamente. Ela fica como `needs_review`, porque pode ser uma pose, escala ou edicao diferente.

## Sem nome

Arquivos como `desconhecido.jpg`, `figura1.jpg`, `photo_...`, `2.jpg` e `33.jpg` entram com:

- `status = queued`
- `catalog_visibility = hidden`
- tag `needs-name-review`
- sem publicacao automatica

Arquivos corrompidos ou placeholders de poucos bytes nao entram como modelo.

## Escala

Para milhoes de itens, a curadoria nao pode depender de nomes de arquivo. O pipeline precisa processar em lotes:

- hash exato indexado no banco;
- hash visual calculado fora do frontend;
- comparacao visual por buckets/candidatos, nao varredura total;
- publicacao atomica por RPC;
- revisao admin por status.

O frontend deve consumir apenas itens publicados ou previews explicitamente marcados como staging.

## Backfill executado em 2026-05-29

- Script: `scripts/catalog/backfill-dedupe-metadata.mjs`.
- Escopo: 44 itens em `catalog_import_items` e 56 registros em `models`.
- Falhas de leitura: 0.
- Falhas de update: 0.
- Fila: 44/44 com `optimized_sha256`, `perceptual_hash`, `canonical_identity_key` e dimensoes preenchidos.
- Fila: 42 unicos e 2 `needs_review` (`Videl` x `Videl (DD)`).
- Publico ativo: 8 modelos, 0 marcados como duplicados.
- Legado: duplicados antigos de Thundercats permanecem rastreados como metadata, sem afetar o catalogo publico.
