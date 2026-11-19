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
