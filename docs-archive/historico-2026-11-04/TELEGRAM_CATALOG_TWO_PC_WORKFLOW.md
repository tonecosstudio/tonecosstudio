# Telegram Catalogo - Fluxo Seguro em Dois PCs

Este procedimento organiza o trabalho com duas maquinas usando a mesma pasta do
Google Drive sincronizada:

```text
G:\Outros computadores\Meu computador (2)\telegram-2370335738-images
```

A pasta raiz do Telegram continua sendo fonte imutavel. Nunca mover, renomear
ou apagar imagens da raiz. O catalogo trabalha sempre por copia para
`catalogo/`.

## Regra de Ouro

Duas maquinas podem ajudar na classificacao, mas apenas uma maquina deve
aplicar/copiar imagens por vez.

O motivo e simples: Google Drive pode ter atraso de upload/download. Se dois
PCs gerarem `pendentes.csv` ou aplicarem lotes ao mesmo tempo com estado
defasado, eles podem disputar os mesmos arquivos ou escrever controles centrais
fora de ordem.

## Modelo Recomendado

Use um PC principal como coordenador e um PC auxiliar como classificador.

### PC Principal

Responsavel por:

- rodar a etapa zero;
- gerar `pendentes.csv`;
- reservar lotes para cada trabalhador;
- fazer dry-run dos lotes preenchidos;
- aplicar/copyar imagens para `catalogo/`;
- atualizar `catalog_manifest.jsonl`;
- atualizar `catalog_hash_index.json`;
- regenerar `pendentes.csv` depois de cada conjunto aplicado.

### PC Auxiliar

Responsavel por:

- abrir o lote reservado para ele;
- visualizar o preview;
- preencher `category`, `franchise`, `folder`, `filename`, `confidence` e
  `notes`;
- opcionalmente rodar dry-run;
- nunca rodar `pending`;
- nunca rodar apply final;
- nunca editar `catalog_manifest.jsonl`, `catalog_hash_index.json`,
  `duplicados.csv` ou `pendentes.csv`.

## Estrutura Para Trabalhadores

Os lotes auxiliares ficam em:

```text
catalogo/_controle/workers/<worker-id>/
  lote_<worker-id>_001.csv
  lote_<worker-id>_002.csv
  preview_lote_<worker-id>_001.jpg
  batch_claims.jsonl
```

Exemplo:

```text
catalogo/_controle/workers/pc-auxiliar/
  lote_pc-auxiliar_001.csv
  preview_lote_pc-auxiliar_001.jpg
  batch_claims.jsonl
```

Cada CSV deve ser editado por uma unica pessoa/maquina. Nao compartilhe o mesmo
CSV aberto nos dois PCs.

## Preparar Estado no PC Principal

Antes de reservar novos lotes:

```powershell
$root = "G:\Outros computadores\Meu computador (2)\telegram-2370335738-images"
python scripts\catalog\telegram_catalog_preserve_existing.py --root $root
```

Essa etapa indexa o catalogo por `sha256`, le `lote_*.csv`, `duplicados.csv`,
`catalog_manifest.jsonl` e gera `pendentes.csv` sem recatalogar o que ja existe.

## Reservar Lote Para o PC Auxiliar

No PC principal:

```powershell
$root = "G:\Outros computadores\Meu computador (2)\telegram-2370335738-images"
python scripts\catalog\reserve_telegram_catalog_batch.py --root $root --worker pc-auxiliar --count 100
```

O script grava apenas em `catalogo/_controle/workers/pc-auxiliar/`. Ele nao
copia imagens e nao altera manifesto, indice de hash nem `pendentes.csv`.

Depois gere o preview do lote reservado:

```powershell
$root = "G:\Outros computadores\Meu computador (2)\telegram-2370335738-images"
$batch = Join-Path $root "catalogo\_controle\workers\pc-auxiliar\lote_pc-auxiliar_001.csv"
$preview = Join-Path $root "catalogo\_controle\workers\pc-auxiliar\preview_lote_pc-auxiliar_001.jpg"
powershell -ExecutionPolicy Bypass -File scripts\catalog\Build-TelegramBatchPreview.ps1 -Root $root -Batch $batch -Output $preview
```

Espere o Google Drive sincronizar o CSV e o preview antes de o PC auxiliar
comecar a classificar.

## Trabalho no PC Auxiliar

No PC auxiliar:

1. Abra o CSV reservado em `catalogo/_controle/workers/pc-auxiliar/`.
2. Use o preview JPG para identificar as imagens.
3. Preencha somente as colunas de classificacao.
4. Salve o CSV e aguarde o Google Drive terminar o upload.

Dry-run opcional no PC auxiliar:

```powershell
$root = "G:\Outros computadores\Meu computador (2)\telegram-2370335738-images"
$batch = Join-Path $root "catalogo\_controle\workers\pc-auxiliar\lote_pc-auxiliar_001.csv"
python scripts\catalog\telegram_catalog_sync.py --root $root apply --batch $batch --dry-run
```

Se houver conflito de destino, ajuste `filename`, `folder`, `franchise` ou
`category` no CSV. O PC auxiliar nao deve remover arquivos nem aplicar o lote.

## Aplicar Lote Preenchido

No PC principal, depois de o CSV preenchido chegar via Drive:

```powershell
$root = "G:\Outros computadores\Meu computador (2)\telegram-2370335738-images"
$batch = Join-Path $root "catalogo\_controle\workers\pc-auxiliar\lote_pc-auxiliar_001.csv"
python scripts\catalog\telegram_catalog_sync.py --root $root apply --batch $batch --dry-run
```

Se o dry-run estiver limpo:

```powershell
python scripts\catalog\telegram_catalog_sync.py --root $root apply --batch $batch
python scripts\catalog\update_telegram_catalog_hash_index.py --root $root --batch $batch
python scripts\catalog\telegram_catalog_preserve_existing.py --root $root
```

A ultima linha regenera `pendentes.csv` ja considerando o lote aplicado.

## Protecoes Contra Atraso do Google Drive

Mesmo com este fluxo, sempre tratar o Drive como eventualmente defasado.

Checklist antes de aplicar:

- Google Drive mostra que esta sincronizado no PC principal;
- o CSV preenchido esta fechado no PC auxiliar;
- dry-run foi executado no PC principal;
- `conflicts=0` e `missing=0`;
- se aparecer `already_cataloged_source` ou `duplicate_catalog_hash`, o script
  esta pulando itens que ja chegaram ao catalogo por outro caminho;
- depois do apply, atualizar o indice de hash e regenerar pendentes.

## O Que Nao Fazer

Nao fazer estes procedimentos em paralelo:

- dois PCs rodando `telegram_catalog_preserve_existing.py` ao mesmo tempo;
- dois PCs rodando `telegram_catalog_sync.py apply` ao mesmo tempo;
- dois PCs editando o mesmo `lote_*.csv`;
- PC auxiliar criando lotes a partir de um `pendentes.csv` possivelmente antigo;
- usar um arquivo de lock simples no Drive como garantia unica de exclusao,
  porque o proprio lock pode chegar atrasado na outra maquina.

## Se Quiser Aplicacao em Duas Maquinas

So use aplicacao em duas maquinas com janelas exclusivas:

1. PC A aplica seus lotes e termina.
2. PC A aguarda o Drive sincronizar.
3. PC B roda etapa zero, dry-run e aplica.
4. PC B atualiza indice, regenera pendentes e aguarda sincronizar.
5. PC A so volta depois de baixar esse estado.

Esse modo e mais lento operacionalmente e mais arriscado. Para catalogar dezenas
de milhares de imagens, o melhor ganho de velocidade vem de duas pessoas
classificando CSVs em paralelo, com aplicacao centralizada em um PC.
