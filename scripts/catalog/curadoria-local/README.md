# Curadoria Visual TONART — aplicativo local

Aplicativo **privado e local** para identificar imagens durante o download do Telegram. Não é um novo backend do catálogo público e não altera a importação existente.

## Separação dos dados

- **Origem imutável:** `%USERPROFILE%\Downloads\telegram-2370335738-images\<TÓPICO>\msg_<ID>.jpg` e seu `progresso.sqlite3`, de propriedade do downloader.
- **Curadoria:** `curadoria-local/curadoria.sqlite3` ao lado do script executado, com identificações, revisão otimista e versões.
- **Saída revisada:** `curadoria-local/modelos-revisados/<estúdio>/<modelo>/<nome>-msg<ID>.jpg`. Gerada somente a pedido, para modelos aprovados. Usa hardlinks e não move os originais.
- **TONART:** a comparação opcional exige inventário CSV com `sha256` e `source` ou `filename`. Duplicata exata prefere o Telegram na proposta de reconciliação, sem apagar ou publicar nada.

Os nomes são **metadados editáveis** até a aprovação; não são atribuídos automaticamente por reconhecimento visual. O aplicativo mantém estúdio, modelo, personagem, universo, legenda original e ID da mensagem.

## Execução local

Requisitos: Python 3.12+ com biblioteca padrão. Não precisa de Telethon nem da sessão do Telegram para a interface.

```powershell
cd scripts/catalog/curadoria-local
python tonart_curadoria.py
```

Abra `http://127.0.0.1:8769`. O navegador sincroniza a listagem a cada 10 segundos. O servidor vincula apenas `127.0.0.1`.

## Segurança

**Não versionar nem sincronizar:** arquivos de sessão Telegram, `*.dpapi`, tokens, bancos SQLite, fotos de grupos privados, logs com dados pessoais ou o inventário preenchido de curadoria. Toda publicação comercial e escolha de imagem exigem revisão e direitos de uso.

API de leitura: `/api/stats`, `/api/items`, `/media/<id>`. API de edição: `/api/annotate`, `/api/materialize`, `/api/export`, `/api/import-tonart-csv`, exigindo origem local e token gerado localmente. Nunca expor a porta ou o token à rede.

Este diretório é apenas a **implementação versionada**. A instalação Windows já existente usa uma cópia local e uma pasta de dados separada. Evite executar dois servidores na mesma porta.

## Testes

```powershell
python teste_curadoria.py
python teste_ui.py
```

O E2E usa um diretório temporário e uma imagem fictícia. Verifica edição, conflito de revisão, exportação por hardlink sem modificar a origem e preferência do Telegram para o mesmo SHA-256.

## Fluxo obrigatório: nomear primeiro, agrupar depois

A etapa de **nomeação** foi implementada em `name_curadoria.py` e usa o **mesmo SQLite local** da Curadoria Visual, sem criar outro banco. Ela examina cada imagem independentemente, extrai estúdio, título, universo e variante das legendas estruturadas do Telegram e sugere nomes únicos como `deadpool-diorama-msg13588.jpg`. Caso uma imagem não tenha legenda, pode herdar o nome de um álbum somente quando todas as legendas válidas desse álbum concordam.

Os nomes são preservados em `name_proposals` com evidência, confiança, estado, revisão e histórico em `name_proposal_events`. A etapa roda **antes** do agrupamento no ciclo incremental do aplicativo. As propostas não são nomes oficiais comprovados, nem aprovações comerciais.

Abra a interface e use **1. Nomes propostos** para buscar, conferir a imagem, a legenda e a origem, corrigir o nome e registrar uma revisão. O estado **confirmado** exige nome, estúdio e um link HTTPS da publicação oficial conferida pelo revisor; nenhuma identificação textual recebe automaticamente esse estado.

Use **Exportar nomes propostos** para gerar exclusivamente no computador o arquivo privado `curadoria-local/manifesto-nomes-propostos.csv`, com referências ao Telegram. O botão **Gerar nomes confirmados** materializa somente as imagens confirmadas sob `curadoria-local/modelos-revisados/<estúdio>/<modelo>/<nome>-msg<ID>.<ext>`, por hardlink, sem mover ou alterar a origem. Conflitos de SHA interrompem a operação; não sobrescreve arquivos existentes.

**2. Agrupar depois** permanece disponível para verificar álbuns e duplicatas, porém nomes iguais não são prova suficiente de uma única estatueta. O agrupamento exige álbum compartilhado ou identidade exata de conteúdo. Nenhuma das etapas publica no catálogo de produção. A execução após reinício reutiliza os checkpoints persistidos no SQLite local.

### APIs e testes desta etapa

- Leitura: `GET /api/names`, `GET /api/stats` (inclui `naming`).
- Revisão protegida pelo token e origem local: `POST /api/review-name`, `POST /api/export-names`, `POST /api/materialize-confirmed-names`.
- Teste isolado: `python teste_name_curadoria.py` (nomes únicos, versões, álbum, retomada, fonte oficial, conflito otimista, manifesto, materialização e integridade dos originais).
- Testes de regressão: `python teste_curadoria.py`, `python teste_smart_curadoria.py`, `python teste_ui.py`.

As cópias privadas de imagens, mensagens, manifestos preenchidos, arquivos de sessão e bancos locais **não entram no GitHub**. O ambiente local Windows deve sincronizar o código da PR #45 sem substituir a pasta privada `curadoria-local`.
