# Tonecos Studio — consolidação canônica do site e catálogo

Estado: **EM INTEGRAÇÃO / NO-GO**. Esta diretriz substitui o planejamento de plataforma de apps OrdaX como orientação do produto comercial Tonecos, sem apagar seu histórico.

## Missão e proprietários

- **Produto único:** `washingtonmsdj/tonecosstudio` hospeda a experiência web Tonecos (home, modelos, seleção, clientes, orçamentos, pagamentos, pedidos e produção).
- **Marca pública:** `src/config/brand.ts` fornece nome e assinatura canônica **Tonecos Studio**. Marca pública não define automaticamente razão social, canais de contato, propriedade intelectual ou domínio. `CONTACT` mantém configuração comercial; dados legais precisam ser confirmados.
- **Catálogo de modelos:** `washingtonmsdj/catalogo` continua sendo fonte técnica temporária da API canônica Cloudflare (Worker + D1 + R2 + Drive), com metadados, busca, mídia e identidade do modelo. O Studio **não** deve recriar `public_catalog_models` no Supabase para o novo acervo, executar ingestão própria ou indexar uma cópia integral do inventário.
- **Operação comercial:** o backend Supabase do Studio é autoridade sobre sessões, clientes, orçamentos comerciais finais, preços aprovados, pedidos, pagamentos e produção. O site **não** deve converter um `POST /api/quotes` do Worker em pedido Supabase automaticamente: o cruzamento exige contrato idempotente com referências e autorização.
- **Rastro de migração:** preservar IDs Cloudflare de origem em referências comerciais explícitas, sem atribuir falsos UUIDs Supabase, e vincular cada solicitação a sua situação editorial/publicada.
- **Projeto legado:** `washingtonmsdj/catalogo` somente será arquivado depois de o Studio consumir o Worker com QA móvel/desktop, links antigos reconciliados e publicação/rollback comprovados. Não apagar dados, buckets ou histórico antes.

## Prova de implementação inicial na única branch

`integration/tonecosstudio-canonical-20261101`

Implementado:
- `src/config/brand.ts` e teste: marca visual canônica.
- Header, footer, home e SEO das principais páginas removem OrdaX como marca pública.
- HTML/OG não anunciam o domínio do OS; a URL pública Tonecos ainda está **pendente de homologação**, portanto não inventar canonical/domain.
- CSP não inclui `ordax.com.br` por padrão. `robots.txt` mantém `Disallow: /` durante a migração; sitemap antigo foi retirado. Regenerar sitemap e permitir indexação **somente** após domínio Tonecos e publicação aprovados.
- Contatos e razão social não recebem defaults falsos do OrdaX; habilitar somente valores reais verificados.
- Mídias do R2 legado não usam fallback `ordax.com.br`; falta configurar a origem de mídia do novo site antes do cutover.
- `src/services/catalog/public-catalog-gateway.ts` introduz um **gateway de leitura isolado**, com `GET /api/catalog`, cursor e limite 60, rejeição de respostas inválidas, nenhum retry automático e nenhum acesso direto ao D1. Ele **ainda não está conectado à rota de produção**.
- Nenhuma migration, backend, publicação de Worker, pedido ou orçamento real foi alterado.

## Bloqueios para merge / release (falha fechada)

1. **Vercel:** GitHub registra a integração antiga `jogo-brasils-projects/ordax` e domínio `ordax.com.br`, hoje reservado ao OrdaX OS. Conta Vercel conectada neste contexto é `ordaxsystems`, não a conta legada. Não fazer push na main nem promover deploy até comprovar que o projeto Tonecos possui deployment independente, com *produção* desvinculada do OS.
2. **CI:** a última execução `Quality Gate #36719911543` da main `fdd2992a7d20b4ca29163e9ec77e9f19f59d8f41` falhou; o PR #3 corrige um teste determinístico de feriados, mas ainda está pendente de integração e novos gates. Não reaproveitar alegação antiga de testes verdes como prova atual.
3. **Domínio e identidade:** definir URL first-party Tonecos, novos endereços reais de contato, política de indexação e vínculos SEO. Não colocar URLs ou e-mails imaginados como produção.
4. **Gateway:** homologar o endpoint Worker e proxy same-origin de Tonecos **sem varreduras D1/R2**; manter API read-only, capturas tipadas de páginas pequenas e nenhuma conversão silenciosa de orçamento.
5. **Contratos comerciais:** garantir idempotência, snapshot de nomes/modelos, preço por autoridade Supabase, pedido autenticado e recuperação de falhas (Worker aceita solicitação e Supabase falha ou vice-versa); preservar histórico de clientes, pagamentos e produção.
6. **Frontend premium:** após os gates, substituir o visual arcade legado pelo sistema editorial da Tonecos com um SSOT de cores, fontes, espaçamento, acessibilidade e navegação. Usar modelos e mídia autorizados; imagens de animais são apenas demonstração, não o tema do catálogo.
7. **QA:** compilar TypeScript, lint, formatação, Vitest/coverage, security audits, build e testes desktop/mobile com o **mesmo SHA**. Não afrouxar assertions ou CI para obter verde.

## Ordem de execução sem trabalho duplicado

1. Revisar e estabilizar o único branch `integration/tonecosstudio-canonical-20261101`; corrigir qualquer falha de TypeScript/formatos; manter main inalterada.
2. Obter confirmação operacional dos limites do projeto Vercel e destino exclusivo da Tonecos; configurar pipeline seguro e testável sem domínio OrdaX.
3. Integrar o gateway do Worker na rota do Studio atrás de contrato versionado, sem replicar dados para o Supabase; adaptar busca, cursor, mídia e galeria.
4. Transformar a seleção em solicitação comercial única com status e idempotência entre sistemas e teste end-to-end; não usar o formulário antigo como ordem de produção automática.
5. Aplicar nova identidade visual única e revisar fluxos administrativos existentes sem substituí-los por mocks.
6. Executar gates completos; integrar a main **somente se** o alvo de deployment estiver comprovadamente isolado e seguro.
7. Só após cutover/rollback validado, redirecionar URLs externas e arquivar o catálogo separado sem apagar Worker, mídia ou histórico.

## Restrições

- **Quota Cloudflare D1 grátis:** nenhum scan total, SQL de produção opcional, recorrência agressiva ou nova ingestão sem orçamento medido fora do D1. Ver `catalogo/docs/CONTINUIDADE-OPERACIONAL.md`.
- **Direitos de imagem e proveniência:** candidato externo, metadata e prévia não equivalem a licença comercial. Manter itens pendentes fora da publicação.
- **Não há liberação de produção:** nesta etapa somente branch GitHub com código e testes versionados. Não declarar lançamento pronto sem as verificações do mesmo SHA.
