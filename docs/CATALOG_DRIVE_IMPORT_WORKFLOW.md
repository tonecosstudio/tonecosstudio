# Catalog Drive Import Workflow

Fluxo profissional para trazer imagens do Google Drive para o catalogo sem publicar lixo ou duplicatas.

## Decisao de arquitetura

O site le modelos do Supabase. O Google Drive e apenas origem de importacao.

Arquivos importados passam por:

1. Manifesto vindo do Drive.
2. Dry run para revisar nomes e classificacao.
3. Upload otimizado para Supabase Storage (`webp` + thumbnail).
4. Fila `catalog_import_items`.
5. Curadoria admin.
6. Publicacao em `models`.

## Regras de classificacao

- `Colecao Tonecos/*`: candidato a colecao vendavel.
- `Games`, `Filmes & Series`, `Animes & Desenhos`, `Tokusatsu`: categorias/origens para catalogo geral.
- Arquivos soltos na raiz: entram como `hidden` e precisam de revisao.
- Nomes genericos como `photo_...`, `figura1`, `desconhecido`, `image...` ficam com status `queued` e tag `needs-name-review`.
- Nomes no padrao `Personagem - Obra.jpg` separam personagem e origem automaticamente.
- Versoes entre parenteses viram `variant_name`, por exemplo `MUMM-RA (2)`.

## Dry run

Antes do dry-run, valide o manifesto. Essa etapa nao acessa o Supabase e apenas confere formato, duplicidade interna, IDs e tipo de arquivo:

```powershell
npm run catalog:import-drive -- `
  --validate-only `
  --manifest tmp/drive-folder-items.json `
  --slug thundercats `
  --context collection `
  --source-folder-id 1chAOa3EOmMmE-fzrLyomQ9IbxMNK4QVF `
  --source-folder-name Thundercats `
  --source-title Thundercats `
  --media-type series
```

Depois use dry-run antes de qualquer importacao real:

```powershell
npm run catalog:import-drive -- `
  --dry-run `
  --limit 8 `
  --manifest tmp/drive-folder-items.json `
  --slug thundercats `
  --context collection `
  --source-folder-id 1chAOa3EOmMmE-fzrLyomQ9IbxMNK4QVF `
  --source-folder-name Thundercats `
  --source-title Thundercats `
  --media-type series
```

## Importacao real

Depois das migrations aplicadas no Supabase:

O script carrega `.env.local` e `.env` automaticamente para ler `VITE_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`.
Antes de enviar qualquer imagem, ele verifica se `catalog_import_items` existe. Se a migration ainda nao foi aplicada, a importacao para antes do upload.

```powershell
npm run catalog:import-drive -- `
  --manifest tmp/drive-folder-items.json `
  --slug thundercats `
  --context collection `
  --source-folder-id 1chAOa3EOmMmE-fzrLyomQ9IbxMNK4QVF `
  --source-folder-name Thundercats `
  --source-title Thundercats `
  --media-type series `
  --visibility hidden
```

`IMPORT_VISIBILITY` deve ficar `hidden` por padrao. A decisao final de ir para catalogo geral, colecao, ambos ou oculto acontece na curadoria admin.

Depois da importacao, rode a auditoria de hashes/duplicidade:

```powershell
npm run catalog:dedupe
```

Depois da auditoria, gere o relatorio de saude do catalogo:

```powershell
npm run catalog:health
```

Se o relatorio apontar tags internas em modelos publicos, normalize as tags publicas pelo SSOT:

```powershell
npm run catalog:clean-public-tags -- --dry-run
npm run catalog:clean-public-tags
```

O relatorio informa `manifestTotal`, `valid`, `rejected`, `imported`, `updated`, `skipped` e `failed`. O importador e idempotente por `source_file_id`. Se o mesmo arquivo do Drive ja existir na fila com status `published`, `duplicate`, `rejected` ou `hidden`, ele e registrado como `skipped` no relatorio e nao sobrescreve a imagem no Storage nem altera o modelo publico.

## Bloqueio atual

As migrations de catalogo profissional precisam estar no Supabase remoto antes da fila funcionar:

- `20260528090000_catalog_curation_pricing.sql`
- `20260528100000_catalog_professional_taxonomy.sql`
- `20260528101000_catalog_import_curation_queue.sql`
- `20260528102000_catalog_publish_import_rpc.sql`

## Fallback temporario usado em 2026-05-28

Como `catalog_import_items` ainda nao existe no banco remoto, foi usado um importador de staging:

```powershell
node tmp/import-identified-drive-models-staging.mjs
```

Esse fallback:

- importa apenas itens ja identificados e validados visualmente;
- compacta tudo para WebP antes de enviar ao Supabase Storage;
- salva os arquivos em `models/catalog-staging/{categoria}/{subcategoria}`;
- cria linhas inativas em `models` (`is_active = false`);
- nao publica os modelos no catalogo publico;
- gera relatorio em `tmp/catalog-identified-staging-import-report.json`.

Use este caminho apenas enquanto a fila profissional nao estiver disponivel no Supabase remoto.
