# TONART — Catálogo público separado e Telegram como origem prioritária

**Estado:** contrato de implementação / pré-publicação. Não autoriza upload, publicação ou mudanças de DNS.  
**Fonte única de código:** `tonecosstudio/tonecosstudio`, `main`. Sem repositório paralelo.

## 1. Dois frontends, uma autoridade de catálogo

| Superfície | Endereço planejado | Entrada de build | Acesso |
|---|---|---|---|
| Catálogo público | `catalogo.tonartstudio.com.br` | `src/PublicCatalogApp.tsx` / `src/CatalogMvpShell.tsx` | Anônimo, somente aprovados |
| Site TONART principal | `tonartstudio.com.br` | landing existente | Público sem recursos incompletos |
| Comercial / administração | Ambiente interno separado | `src/TonecosCommercialApp.tsx` | Autenticado + autorização no backend, protegido também no hosting |

**Não** usar `src/App.tsx` para criar outra cópia do catálogo e **não** expor o app local da Curadoria na Internet. O catálogo aprovado segue servido pelo Worker e armazenamento canônicos existentes em `services/catalogo/`; o frontend público não pode importar módulos de conta, pagamento ou administração.

Para Vercel, o build do catálogo público deve configurar:

```env
VITE_PUBLIC_CATALOG_MVP=true
VITE_PREVIEW_READ_ONLY=true
VITE_TONECOS_COMMERCIAL_MVP=false
VITE_CATALOG_QUOTES_ENABLED=false
VITE_TONECOS_SUBSCRIPTIONS_ENABLED=false
VITE_TONECOS_COINS_ENABLED=false
```

Não reutilizar o mesmo *build* comercial na origem `catalogo.`. O projeto `tonart-studio-public` existente tem o domínio principal associado: qualquer projeto adicional precisa ser verificado antes de criar/atribuir domínio. URL e API públicos devem ser testados de ponta a ponta antes de DNS/produção. Não proteger páginas privadas apenas ocultando links, por CSS, robots.txt ou nome de subdomínio. Proteção precisa ocorrer no hosting **e** no backend (sessão/RLS/admin).

## 2. O que é SSOT

- **Telegram = origem preferencial de ativos/identidade de origem**: arquivo original, tópico, legenda, data, `message_id`, hash, vinculação do álbum e rastreabilidade. Não editar nem eliminar.
- **Curadoria = autoridade de proposta/revisão interna**: nomes sugeridos e confirmados, identidade do modelo, conjunto de imagens, provas e decisão humana. O banco local é privado.
- **Catálogo/Worker e seu armazenamento existente = autoridade da publicação**: modelos, slugs canônicos, galeria pública, propriedade de storage, versões e regras de consulta pública.
- Uma imagem importada antigamente pode continuar vinculada ao mesmo `model_id`; a preferência pelo Telegram **não cria um segundo modelo** ou uma segunda galeria.
- **Direitos de uso:** acesso a um grupo privado, Patreon ou Cults3D não equivale automaticamente a licença para expor suas imagens comercialmente. Antes de publicar, registrar permissão, autoria e proveniência; também revisar marcas/personagens e termos das fontes.

## 3. Ciclo de vida de cada imagem

1. **Ingestão**: downloader escreve em `Downloads/telegram-2370335738-images/<tópico>/msg_ID.*` e registra checkpoint em SQLite.
2. **Identificação**: PR #45 trabalha no mesmo banco da Curadoria, com `assets`, `annotations`, `name_proposals`, `model_groups`. A UI pode mostrar imagens antes da aprovação, mas **não as publica**.
3. **Gate de curadoria**: só entra no pré-publicador se `annotations.status=aprovado` **e** `name_proposals.status=confirmado`.
4. **Gate de direitos**: cada `message_id`/SHA-256 deve constar num CSV privado de autorização de uso público, com URL HTTPS de evidência. Ausência, divergência ou ambiguidade = bloqueio.
5. **Gate de integridade**: ler bytes do arquivo original sem modificá-lo; SHA-256 deve coincidir com o SQLite. Arquivo faltante, caminho fora da raiz ou divergência = bloqueio.
6. **Reconciliação**: comparar com inventário canônico real. Mesmo SHA-256 = reutilizar ativo/identidade existente, preferindo proveniência Telegram; mesmo estúdio e modelo com hash diferente = revisão para vincular imagem adicional; totalmente novo = candidato a criar modelo.
7. **Staging**: `scripts/catalog/preparar-publicacao-curadoria-telegram.py` produz apenas `decisoes.csv`, `resumo.json`, `lote_elegivel.jsonl`. **Nunca sobe imagens**.
8. **Transformação e importação (fase posterior):** após revisão do lote, passar pelo pipeline WebP e pelas rotinas **existentes**:
   - `scripts/catalog/build-telegram-webp-site-import-plan.mjs`
   - `scripts/catalog/build-telegram-webp-storage-upload-plan.mjs`
   - `scripts/catalog/build-telegram-webp-db-import-plan.mjs`
   - `scripts/cloudflare/upload-catalog-webp-to-r2.mjs`
   - `scripts/cloudflare/import-r2-catalog-queue.mjs`
   Nunca fazer upload direto do app local ou criar D1/R2/Worker paralelos.
9. **Publicação**: somente referências revisadas e assinadas pelo backend canônico ficam visíveis em `catalogo.`. Página pública não pode indexar pendentes nem importar diretórios de download. Preservar rollback e IDs permanentes.

## 4. Comando de pré-publicação

Requer apenas Python 3.12+; não usa credenciais Telegram nem Cloudflare:

```powershell
python scripts/catalog/preparar-publicacao-curadoria-telegram.py `
  --db "C:\Users\ordax\Documents\TONART-Telegram-Import\espelho-telegram\curadoria-local\curadoria.sqlite3" `
  --source-root "C:\Users\ordax\Downloads\telegram-2370335738-images" `
  --existing-csv "C:\dados-privados\tonart-inventario-canonico.csv" `
  --rights-csv "C:\dados-privados\direitos-de-imagens.csv" `
  --out "C:\Users\ordax\Documents\TONART-Telegram-Import\publicacao-staging"
```

**Inventário TONART CSV:** colunas de SHA (`sha256`, `original_sha256` ou `image_hash`), `model_id`, `studio` e `model`. Extrair dos dados canônicos, sem inventar correspondências.

**Direitos de imagens CSV** (mantido privado, nunca versionado):

```csv
message_id,sha256,public_use_authorized,evidence_url
12345,aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa,sim,https://exemplo.org/autorizacao/12345
```

O exemplo usa dados fictícios. **Não preencher permissões em massa sem evidência**.

Sem inventário canônico ou sem autorização comprovada, o script permanece *fail-closed* e não inclui itens no lote elegível. No momento de criação deste documento, a Curadoria tinha apenas nomes prováveis e nenhuma imagem com aprovação dupla; o pré-publicador corretamente bloqueou todos os 3.808 registros observados. As contagens mudam conforme a coleta.

## 5. Critérios para ativar catalogo.tonartstudio.com.br

1. Build público isolado: sem código/rotas comerciais ou administrativa nas dependências, teste de bundle e segurança aprovado.
2. Exposição somente de itens aprovados no Worker, com RLS, ACL e mídia com direitos confirmados.
3. Ficha, galeria, pesquisa, filtros, carregamento progressivo, SEO e mobile testados no domínio de staging; não exigir login para navegar.
4. Processo de importação idempotente (hash, IDs canônicos, staging → revisão → commit, sem duplicar modelo ou bytes), testes de amostra e rollback.
5. Conta/assinaturas continuam em desenvolvimento interno; o contato para orçamento pode usar fluxo de visitante já aprovado no projeto, sem inventar um segundo backend.
6. Verificar domínios e ambiente Vercel, registrar deployment exato aprovado, apontar `catalogo.` somente depois. O endereço `tonartstudio.com.br/catalogo` pode redirecionar para o subdomínio após a implantação.

**Não executar publicação de imagens privadas, alterações de DNS, fusão destrutiva ou lançamento completo como efeito automático deste plano.**

## 6. Independência entre agentes

- Chat da Curadoria / PR #45: identifica e confirma modelos, nomes, álbuns e evidências.
- Esta etapa: leitura somente dos resultados aprovados, reconciliação com catálogo existente e plano de publicação. Não editar PR #45.
- Pipeline publicado: **uma única autoridade** (`services/catalogo/` e scripts existentes), com testes e logs, sem pipelines paralelos.
