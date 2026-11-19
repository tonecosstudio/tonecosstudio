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

## Nomes sem legenda: cartaz, fontes oficiais e similaridade local

Para imagens sem metadados textuais, a Curadoria **não inventa um personagem**. O fluxo de revisão prioritário é:

1. Conferir se o **próprio render** contém nome/versão (por exemplo, um cartaz do criador). O aplicativo pode registrar a proposta por `suggest_name_from_embedded_text`; a proposta não vira `confirmado` automaticamente.
2. Abrir **Referências do próprio estúdio** diretamente na tela **Nomes propostos**. A seleção por tópico em `official_sources` fornece os perfis verificados no Patreon, Cults3D ou ArtStation. Em tópicos que misturam vários criadores, um perfil de estúdio é apenas referência — **não comprova** autoria de uma imagem individual.
3. Examinar **Imagens locais semelhantes**, que usa dHash, aHash e proporção, exibindo até três candidatos e opção **Usar como rascunho**. Isso não escreve um nome automaticamente e nunca o confirma. A revisão precisa verificar a imagem correspondente na publicação oficial.
4. Somente após cruzar título/arte e a página do lançamento, registrar `confirmado` com link oficial e gerar hardlinks, se necessário.

A pesquisa encontrou perfis oficiais para Merge Project Figures, Uel Winner, Sekai 3D Models, Nomnom Figures, Kaidan 3D e 3Dmoonn. Os perfis e links são públicos; **nenhuma imagem privada do Telegram foi enviada** aos sites para pesquisa reversa. Algumas páginas bloqueiam requisições automatizadas: o aplicativo somente oferece links de consulta e não tenta contornar desafios de acesso.

Para gerar as assinaturas visuais em **lotes com checkpoint no SQLite local** (Pillow instalado somente na máquina de trabalho):

```powershell
python visual_name_suggestions.py --limit 6000
```

A rotina opcional roda **fora** do servidor web para não bloquear a interface. Endpoints locais de consulta: `GET /api/official-sources?topic=...` e `GET /api/visual-candidates/<ID>`. O arquivo `teste_visual_name_suggestions.py` contém E2E com imagens artificiais; o teste confirma que possíveis semelhanças **não alteram automaticamente** `name_proposals`.

A curadoria permanece privada até a homologação do catálogo comercial e dos direitos de uso. Resultados de rastreamento, nomes capturados de cartazes e bancos de imagens locais não são versionados.

## Localizar nomes no próprio catálogo do estúdio (Abe3D / Uel Winner)

Foi acrescentado o perfil oficial Abe3D (Cults3D, Patreon e ArtStation) à lista de referências da Curadoria; Uel Winner já tinha seus canais oficiais associados. Na tela **1. Nomes propostos**, o link de publicação individual agora também pode ser aberto diretamente, sem sair da revisão.

A função `suggest_name_from_studio_catalog(...)` registra somente uma **proposta** quando uma imagem local sem legenda parece corresponder visualmente a um título do catálogo oficial. Ela:

- exige fonte HTTPS de um provedor homologado, ID presente e coincidência exata com o tópico de origem;
- preserva título, universo, estúdio e URL da fonte no SQLite local com trilha de evento;
- atribui `status=provavel`, `evidence_type=studio_catalog_visual_candidate` e `confidence=0.60`, sem confirmar a identidade nem criar pastas ou hardlinks;
- rejeita sobrescrita de identificações existentes;
- permanece preservada se o Telegram alterar os metadados do arquivo. Revisões manuais e nomes com título impresso no render também são protegidos contra reprocessamento.

As aplicações em lote de títulos e IDs específicos estão em scripts de diagnóstico **locais privados**, não versionados no GitHub, porque contêm referências à biblioteca privada do Telegram. Não existe uma segunda base canônica.

`teste_catalogo_oficial.py` cobre ID/estúdio, fonte HTTPS, idempotência, conservação após alteração de origem, preservação de edição manual, nenhuma confirmação ou cópia automática e limpeza do banco temporário no Windows.

**Licenciamento de uso comercial:** a existência do modelo no Cults3D/Patreon e a identificação da imagem não autorizam a TONART a reproduzir renders ou vender impressões. O plano pessoal do Abe3D informa uso pessoal, enquanto há opção específica para comercialização física; direitos de uso e limites devem ser verificados antes de publicar qualquer imagem ou produto. O manifesto permanece com `aprovado_para_publicacao=false` em todas as entradas.

## Títulos legíveis nos renders e páginas específicas dos criadores

A etapa de nomeação aceita transcrever **nomes impressos no próprio cartaz** por meio de `suggest_name_from_embedded_text`; não confundir com OCR automático nem com identidade confirmada. O tópico compartilhado `Merge Project Figures _ Nostalgic Studios` contém imagens de mais de uma marca. Por isso, o estúdio deve ser atribuído pela evidência da imagem e não por herança indiscriminada do nome do tópico.

A operação `attach_catalog_reference(db_path, message_id, expected_title, source_url, note)` associa à proposta `provavel` uma página **específica** do produto no catálogo do estúdio, sem promover seu status. Aceita apenas HTTPS, título esperado idêntico, provedor associado ao estúdio nesse tópico e nenhuma referência preexistente conflitante. URLs iguais são idempotentes; links divergentes exigem revisão explícita. Atualiza revisão e auditoria no **mesmo SQLite local**. O teste `teste_catalogo_oficial.py` cobre vínculo, conflitos, idempotência e ausência de aprovação/materialização automática.

Na inspeção privada de 19/11/2026, foram transcritos 17 títulos claros do lote Merge Project/Nostalgic e ligadas cinco páginas específicas do criador no Cults3D (Gallantmon, Obelisk the Tormentor, Matt and MetalGarurumon, Peppercat e Rokusho). As correspondências **permanecem propostas**, não se tornando automaticamente catálogos públicos, arquivos aprovados ou licenças de comercialização. Os IDs locais, as fotos do Telegram e os scripts de ingestão de dados privados permanecem fora do GitHub.

As regras de lançamento são invariantes: não alterar as fotos originais nem o downloader, não enviar o SQLite/manifesto privado para o repositório, não agrupar imagens apenas porque exibem o mesmo personagem, e não marcar `aprovado_para_publicacao=true` sem revisão de direitos de imagem e autorização comercial.
