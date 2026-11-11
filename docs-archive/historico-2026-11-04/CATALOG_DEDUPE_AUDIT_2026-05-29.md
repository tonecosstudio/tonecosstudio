# Catalog Dedupe Audit - 2026-05-29

Escopo: `all`.

## Resumo

- Modelos auditados: 56
- Imagens lidas com sucesso: 56
- Falhas de imagem: 0
- Grupos com mesmo arquivo Drive: 1
- Grupos com mesmo hash exato: 1
- Pares visualmente muito parecidos: 4
- Grupos com mesma identidade canonica: 3
- Itens com nome generico: 0
- Itens marcados para revisao visual: 7

## Como duplicata funciona

- Mesmo `source_file_id`: e a mesma origem do Drive, nao deve criar outro item.
- Mesmo SHA-256: imagem exatamente igual, mesmo que tenha outro nome.
- Mesmo perceptual hash ou distancia baixa: imagem visualmente parecida; entra para revisao antes de bloquear.
- Mesma identidade canonica: mesmo personagem/origem/versao; pode ser duplicata ou variante intencional.

## Mesmo Arquivo Drive

- `1BMDZVjXxrRpfpOwAc-3ZmXFay5tG_t7U` (2)
  - MUMM-RA | d3b708db-aa9b-4e0a-87c8-15285890dc24 | Drive: 1BMDZVjXxrRpfpOwAc-3ZmXFay5tG_t7U
  - MUMM-RA (2) | 23d9706d-a186-4c0c-abd3-64ce308f4511 | Drive: 1BMDZVjXxrRpfpOwAc-3ZmXFay5tG_t7U

## Hash Exato

- `e29f169158a37f7472bc896a7cb3710dd2fc60a9083b8e59bb9e4737b3e3b3ef` (2)
  - MUMM-RA | d3b708db-aa9b-4e0a-87c8-15285890dc24 | Drive: 1BMDZVjXxrRpfpOwAc-3ZmXFay5tG_t7U
  - MUMM-RA (2) | 23d9706d-a186-4c0c-abd3-64ce308f4511 | Drive: 1BMDZVjXxrRpfpOwAc-3ZmXFay5tG_t7U

## Identidade Canonica

- `thundercats|lion-o|` (2)
  - LION O | 9109ff0c-e3b2-4e8d-8563-c8334ee4ea1b | Drive: sem-id
  - LION-O | c893b194-d469-4da0-88e1-8535a7386f7c | Drive: 1vEfnJrGMpH8_Yo2p3gd9Ugzxc1PSVU7m
- `thundercats|mumm-ra|` (2)
  - MUMM RA | 59957d04-4eb4-4a6e-ac1e-f181409f0820 | Drive: sem-id
  - MUMM-RA | d3b708db-aa9b-4e0a-87c8-15285890dc24 | Drive: 1BMDZVjXxrRpfpOwAc-3ZmXFay5tG_t7U
- `thundercats|panthro|` (2)
  - Panthro | 09859000-667a-4ca7-b28d-21149e9fafda | Drive: sem-id
  - PANTHRO | 0a87b9a7-2bff-4cde-823c-0e08c2f98080 | Drive: 1B8Bg1dP_3Ej27tuYcRVFKjV0dZU-n0aY

## Pares Visuais

- distancia 5: LION O <-> LION-O
- distancia 5: MUMM RA <-> MUMM-RA
- distancia 5: MUMM RA <-> MUMM-RA (2)
- distancia 6: Videl (DD) <-> Videl

## Falhas

Nenhuma falha de leitura de imagem.

