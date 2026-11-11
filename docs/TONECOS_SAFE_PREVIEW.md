# Preview seguro — Tonecos em Cloudflare Pages

**Produto atual:** catálogo somente leitura. **Preview oficial:** Cloudflare Pages da conta Tonecos, protegido pelo **Cloudflare Access**. Vercel Authentication/preview é resíduo histórico e não define o fluxo de QA do MVP.

## Ambiente comprovado

- Configuração: VITE_PUBLIC_CATALOG_MVP=true, VITE_PREVIEW_READ_ONLY=true, VITE_UPLOAD_SECURITY_FAIL_CLOSED=true, VITE_CONTACT_EMAIL institucional.
- Service Binding CATALOG_WORKER → tonecos-catalogo-api em preview e produção.
- Sem VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY ou VITE_SUPABASE_PROJECT_ID no preview; build real provou 20 chunks públicos sem runtime Supabase/comercial. Não acrescentar anon key por conveniência.
- Produção automática desativada, preview automático none; indexação bloqueada por robots Disallow, meta noindex e ausência de sitemap.
- Cloudflare Access bloqueia acesso anônimo aos previews. Uma requisição HTTP 200 à página Sign in **não** demonstra o HTML do site ou o funcionamento de robots/sitemap.

## Homologação legítima

Executar QA de navegador com sessão autorizada, em desktop e mobile, testando Home, seis capas amostradas, listagem/busca/filtros, detalhe/galeria, navegação direta/refresh, estados de erro, acessibilidade e imagens. Salvar evidência do SHA e deployment **exatos**. O último bundle de código aprovado por build/deploy é o SHA **39e7a04a**, preview **ad578030**; o QA visual deste build não foi concluído.

Não desabilitar Access, inventar cookie/bypass, consultar D1 por status, usar Supabase de OrdaX, ligar pagamentos ou habilitar produção/indexação para fazer teste. Operações comerciais exigirão homologação de Auth/RLS/SMTP/autorização em ambiente próprio.

Gates seguintes: revisão jurídica responsável, prova de isolamento da Vercel antiga, domínio/canonical/HTTPS e rollback. Referências: [runbook](OPERACAO_CLOUDFLARE_PAGES.md) e [checkpoint](../URGENTE.md).
