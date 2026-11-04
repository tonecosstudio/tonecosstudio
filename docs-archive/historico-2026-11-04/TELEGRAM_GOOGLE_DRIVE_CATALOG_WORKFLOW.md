# Telegram Google Drive Catalog Workflow

Guia operacional para a instancia do Codex que vai trabalhar no outro computador.

## Contexto

Estamos usando a pasta do Telegram sincronizada no Google Drive para permitir que mais de um computador participe da curadoria do catalogo.

Pasta do Google Drive:

`https://drive.google.com/drive/folders/16s8SEHpoSN-EZnxouljMBgURO_bim-FP`

ID da pasta:

`16s8SEHpoSN-EZnxouljMBgURO_bim-FP`

O objetivo e manter:

- os arquivos fisicos organizados no PC/Drive;
- a origem original preservada;
- um manifesto rastreavel entre Telegram, catalogo fisico e Supabase;
- o catalogo publico do site alimentado pelo Supabase, nao pelo repositorio Git.

## Regra Principal

Nunca mover, renomear ou apagar imagens da raiz sincronizada do Telegram.

A raiz e fonte original. Se uma imagem sair dela, o sincronizador do Telegram pode baixar tudo novamente.

Sempre trabalhar por copia:

```text
raiz Telegram -> copia catalogada -> WebP/Supabase
```

## Estrutura Esperada

No computador local, a pasta sincronizada deve seguir este modelo:

```text
telegram-2370335738-images/
  20241115_144001_msg_121004_photo.jpg
  20241115_144001_msg_121006_photo.jpg
  manifest.jsonl
  download-summary.json
  catalogo/
    anime/
    games/
    filmes/
    comics/
    original/
    _controle/
      pendentes.csv
      lote_001.csv
      catalog_manifest.jsonl
      catalog_hash_index.json
      duplicados.csv
```

## Responsabilidade do Outro PC

O outro PC pode fazer curadoria e organizacao, mas sempre em copias.

Permitido:

- visualizar imagens;
- preencher CSVs de classificacao;
- copiar imagens da raiz para `catalogo/`;
- organizar e renomear copias dentro de `catalogo/`;
- detectar duplicadas por hash;
- gerar/atualizar manifestos;
- converter imagens catalogadas para WebP;
- subir imagens WebP para Supabase Storage em staging;
- criar itens na fila `catalog_import_items` com status de revisao.

Proibido:

- mover imagens da raiz Telegram;
- renomear imagens da raiz Telegram;
- apagar imagens da raiz Telegram;
- publicar direto no catalogo publico sem staging/revisao;
- salvar milhares de imagens no GitHub normal.

## Arquivos de Controle

### CSV de Lote

Formato minimo:

```csv
source,category,franchise,folder,filename,confidence,notes
20241115_144001_msg_121004_photo.jpg,anime,dragon ball,goku,goku 1.jpg,alta,
```

Campos:

- `source`: nome exato do arquivo original na raiz Telegram.
- `category`: categoria fisica principal, exemplo `anime`, `games`, `filmes`, `comics`, `original`.
- `franchise`: obra/origem, exemplo `dragon ball`, `naruto`, `marvel`.
- `folder`: personagem/modelo/conjunto.
- `filename`: nome publico limpo da copia catalogada.
- `confidence`: `alta`, `media` ou `baixa`.
- `notes`: observacoes de curadoria.

### Manifesto de Catalogo

O manifesto deve guardar o vinculo entre origem e destino.

Campos recomendados:

```json
{
  "source_type": "telegram",
  "source_name": "20241115_144001_msg_121004_photo.jpg",
  "message_id": "121004",
  "source_path": "telegram-2370335738-images/20241115_144001_msg_121004_photo.jpg",
  "catalog_relpath": "anime/dragon ball/goku/goku 1.jpg",
  "size": 34199,
  "sha256": "...",
  "category": "anime",
  "franchise": "dragon ball",
  "folder": "goku",
  "filename": "goku 1.jpg",
  "confidence": "alta",
  "notes": ""
}
```

## Scripts Disponiveis no Projeto

No repositorio `ordax`, existe o script:

```text
scripts/catalog/telegram_catalog_sync.py
```

Se o outro PC nao tiver o repositorio aberto, use a copia sincronizada no Drive:

```text
telegram-2370335738-images/catalogo/_controle/tools/telegram_catalog_sync.py
```

Ele trabalha com a pasta local do Telegram e nunca move imagens da raiz.

Gerar CSV de pendentes:

```powershell
python -B scripts\catalog\telegram_catalog_sync.py pending
```

Testar lote sem copiar:

```powershell
python -B scripts\catalog\telegram_catalog_sync.py apply --batch "CAMINHO_DO_LOTE.csv" --dry-run
```

Aplicar lote:

```powershell
python -B scripts\catalog\telegram_catalog_sync.py apply --batch "CAMINHO_DO_LOTE.csv"
```

Aplicar lote significa:

- ler `source` na raiz Telegram;
- copiar a imagem para `catalogo/{category}/{franchise}/{folder}/{filename}`;
- preservar a imagem original;
- gravar o vinculo em `catalogo/_controle/catalog_manifest.jsonl`.

Se o CSV estiver incompleto, o script pula as linhas sem destino para evitar jogar tudo em pastas genericas.

## Etapa Zero: Preservar o Catalogo Ja Existente

Antes de criar novos lotes, trate tudo que ja esta em `catalogo/` como catalogo existente.

Nao recatalogar imagens que ja estao em `catalogo/`.

Obrigatorio antes de gerar `pendentes.csv`:

1. Recriar/validar o indice de hash do catalogo atual.
2. Verificar os `lote_*.csv` ja existentes.
3. Verificar `catalog_manifest.jsonl`, se existir.
4. Verificar `duplicados.csv`, se existir.
5. So depois gerar novo `pendentes.csv`.

Se o arquivo existir no `catalogo/` com o mesmo `sha256`, ele nao deve ser copiado de novo. Ele deve ser tratado como `already_cataloged` ou `duplicate_exact`, conforme o caso.

Se houver imagens catalogadas sem manifesto, crie um manifesto retroativo comparando:

```text
raiz Telegram por sha256 -> catalogo por sha256
```

O manifesto retroativo deve registrar:

```text
source_name
message_id
source_path
catalog_relpath
size
sha256
status=already_cataloged
```

Somente imagens da raiz que nao aparecem por `source_name`, `message_id` ou `sha256` devem entrar em novo lote.

## Fluxo Recomendado para o Outro PC

1. Confirmar que o Google Drive terminou de sincronizar a pasta.
2. Confirmar que a raiz Telegram tem os arquivos originais.
3. Nao mover nada da raiz.
4. Rodar a Etapa Zero para preservar o catalogo ja existente.
5. Rodar `pending` para listar somente imagens ainda nao catalogadas.
6. Separar um lote pequeno de trabalho, preferencialmente 50 a 200 imagens.
7. Preencher o CSV do lote.
8. Rodar `apply --dry-run`.
9. Se nao houver conflito, rodar `apply`.
10. Conferir visualmente a pasta `catalogo/`.
11. Atualizar `catalog_hash_index.json` quando o lote for grande.
12. Se configurado, converter as copias catalogadas para WebP e subir para Supabase staging.
13. Nunca publicar direto no catalogo publico.

## Supabase

O projeto ja possui uma fila profissional de importacao:

- `catalog_import_batches`
- `catalog_import_items`
- `admin_publish_catalog_import_item`

O destino correto para imagens vindas do outro PC e staging.

Recomendado:

```text
bucket: models
storage path principal:
catalog-import/telegram/optimized/{message_id}-{slug}.webp

storage path thumb:
catalog-import/telegram/thumbs/{message_id}-{slug}.webp
```

Registro recomendado em `catalog_import_items`:

```text
source_type: telegram
source_file_id: telegram:2370335738:{message_id}
source_folder_id: 16s8SEHpoSN-EZnxouljMBgURO_bim-FP
source_folder_name: telegram-2370335738-images
source_drive_path: caminho relativo no Drive, se disponivel
file_name: nome original local
storage_bucket: models
storage_path: caminho WebP principal
thumbnail_url: URL publica do thumbnail
image_hash/original_sha256: sha256 da imagem original
optimized_sha256: sha256 do WebP
status: review
catalog_visibility: hidden
```

Padrao de seguranca:

- `catalog_visibility = hidden`;
- `status = review`;
- publicacao so depois da curadoria admin;
- duplicadas exatas devem ser marcadas como duplicadas, nao importadas como novos modelos.

## Relacao com `catalog-assets`

O projeto ja tem um catalogo antigo/curado:

```text
catalog-assets/drive-curated-v12/
  catalogo/
  colecoes/
  _manifest/catalog-assets-manifest.json
  _audit/
  _review/
  90_DUPLICATAS/
```

Esse catalogo nao deve ser sobrescrito diretamente pela pasta do Telegram.

Tratamento correto:

```text
catalog-assets/drive-curated-v12 = base antiga
telegram catalogado              = complemento/atualizacao
catalogo unificado               = saida final
Supabase                         = staging/publicacao
```

Se uma imagem do Telegram for melhor/mais atual para um modelo ja existente:

- manter o hash e origem da imagem antiga;
- adicionar a imagem nova como candidata;
- marcar no manifesto que ela substitui ou complementa a imagem antiga;
- publicar no Supabase apenas depois de revisao.

## Duplicadas

A pasta `_duplicados` existe porque em uma etapa anterior as imagens foram movidas da raiz, o Telegram baixou novamente e depois elas foram movidas de novo.

Agora a regra e:

- duplicada exata: mesmo `sha256`;
- duplicada visual/provavel: mesmo personagem/modelo, mas hash diferente;
- nunca resolver duplicidade movendo arquivo da raiz;
- registrar duplicidade em CSV/manifesto.
- se a imagem ja existe em `catalogo/`, nao copiar novamente;
- se a imagem ja existe em `_duplicados/`, nao usar como modelo principal sem revisao.

## O que Deve Voltar para o PC Principal

Se o outro PC trabalhar so com curadoria:

- CSVs de lote preenchidos;
- `catalog_manifest.jsonl`;
- `duplicados.csv`;
- relatorios de revisao.

Se o outro PC tambem subir para Supabase:

- relatorio de upload/importacao;
- IDs dos itens criados em `catalog_import_items`;
- lista de conflitos/rejeitados;
- hashes originais e otimizados.

Nao precisa voltar:

- imagens brutas;
- imagens catalogadas ja sincronizadas pelo Drive;
- arquivos temporarios de thumbnail/contact sheet, exceto se forem usados para revisao.

## Checklist Antes de Rodar Qualquer Aplicacao

- A raiz Telegram esta intacta?
- O Google Drive terminou a sincronizacao?
- O catalogo existente foi indexado por hash antes de gerar novos pendentes?
- As imagens ja existentes em `catalogo/` foram preservadas, sem recopia?
- O CSV tem `source`, `category`, `franchise`, `folder` e `filename` preenchidos?
- O lote foi testado com `--dry-run`?
- Nao ha conflito de destino?
- Duplicadas exatas foram separadas?
- A publicacao esta como `hidden/review`?
- O manifesto registra origem, destino e hash?

## Prompt para a Outra Instancia do Codex

Use este texto ao iniciar o outro Codex:

```text
Voce esta ajudando a organizar o catalogo de imagens do Ordax.

Leia este documento inteiro antes de agir:
telegram-2370335738-images/catalogo/_controle/TELEGRAM_GOOGLE_DRIVE_CATALOG_WORKFLOW.md

Se tambem houver repositorio local, leia:
docs/TELEGRAM_GOOGLE_DRIVE_CATALOG_WORKFLOW.md

Pasta Google Drive sincronizada:
https://drive.google.com/drive/folders/16s8SEHpoSN-EZnxouljMBgURO_bim-FP

Regra critica:
Nunca mover, renomear ou apagar imagens da raiz telegram-2370335738-images.
Sempre trabalhar por copia.

Objetivo:
Classificar imagens do Telegram, preservar o catalogo ja existente, criar/preencher CSVs de lote, aplicar somente por copia em catalogo/, manter manifestos com source_name/message_id/sha256/catalog_relpath e, quando configurado, preparar upload WebP para Supabase staging.

Antes de criar qualquer novo lote:
1. Indexe o catalogo atual por sha256.
2. Leia lote_*.csv, duplicados.csv e catalog_manifest.jsonl.
3. Gere ou complete um manifesto retroativo para imagens que ja estao em catalogo/.
4. Gere pendentes somente para imagens da raiz que ainda nao existem por source_name/message_id/sha256.

Nao copie de novo imagem que ja existe em catalogo/.

Antes de aplicar qualquer lote, rode dry-run.
Antes de publicar qualquer coisa no site, manter status hidden/review.
GitHub deve receber codigo, CSVs e manifestos pequenos, nao milhares de imagens.
```
