# Catalog Drive Inventory - 2026-05-28

Pasta raiz analisada:

`https://drive.google.com/drive/folders/1HcU2eCTb-jwar2yixG3f31PlWDbdvDuF`

## Classificacao inicial

### Colecoes candidatas

`Colecao Tonecos`

Subpastas:

- `Quarteto Fantastico`
- `Inimigos da Vizinhanca`
- `Thundercats`
- `Terror`

Regra: estas pastas podem virar colecoes no site, mas cada item ainda passa por curadoria antes de publicar.

### Categorias/origens para catalogo geral

`Games`

- Muitas subpastas por franquia/obra: `God of War`, `Elden Ring`, `Resident Evil`, `Tekken`, `The Witcher`, `Zelda`, etc.
- Tambem possui arquivos soltos, que devem entrar como `hidden` para revisao.

`Filmes & Series`

- Subpastas como `Marvel - Dc`, `Blade Runner`, `DC`, `Harry Potter`, `Transformers`, `01 Terror`, `02 - Series`.
- Mistura obras especificas com categorias amplas.

`Animes & Desenhos`

- Mistura arquivos soltos bons (`nezuko.jpg`, `rengoku.jpg`, `Sung Jinwoo - Solo Leveling.jpg`) com nomes genericos (`photo_...`).
- Tem subpastas como `Akatsuki`, `Animes`, `Classicos`, `Outros`.

`Tokusatsu & Cultura Japonesa`

- Subpastas: `Power Ranger`, `Changeman`, `Cybercops`, `Kamen Rider`, `Jaspion`, `Jiban`, `Jiraya`.
- Possui tambem arquivos soltos de Power Ranger.

`Fisiculturistas`

- Pasta pequena com arquivos de Arnold, Ronnie Coleman, Dorian Yates e Jay Cutler.

### Arquivos soltos da raiz

Exemplos bons para curadoria:

- `spider-man.jpg`
- `Frieren.jpg`
- `puri puri prisoner - One Puch man.jpg`
- `ciri - The witcher.jpg`
- `Sung Jinwoo - Solo Leveling.jpg`
- `Homem de Areia.jpg`
- `Rei bruxo de Angmar.jpg`

Exemplos que precisam revisao manual:

- `desconhecido.jpg`
- `figura1.jpg`
- `figura2.jpg`
- `figura3.jpg`
- `photo_2025-...`
- `2.jpg`
- `33.jpg`

## Regra de importacao

Arquivos soltos e nomes genericos entram na fila com:

- `catalog_visibility = hidden`
- `status = queued`
- tag `needs-name-review`

Pasta com obra bem definida entra com:

- `status = review`
- `source_title` preenchido quando possivel
- `catalog_visibility = hidden` ate a curadoria decidir `general`, `collection` ou `both`
