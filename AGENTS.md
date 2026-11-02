# AGENTS.md

## Missão

Consolidar o **Tonecos Studio** como produto comercial único: site, catálogo escalável, clientes, orçamentos, pedidos, pagamentos e produção. O OrdaX OS é um produto independente. Consulte `URGENTE.md` para estado real e `docs/TONECOS-STUDIO-CONSOLIDACAO.md` para o contrato de autoridades.

## Ordem de autoridade

1. pedido explícito do usuário e contrato do issue/PR atual;
2. este AGENTS.md;
3. URGENTE.md;
4. README.md e docs/README.md;
5. código, testes e configuração vigentes;
6. docs-archive e relatórios datados, que são apenas históricos.

Documentos históricos nunca podem sobrescrever o estado observado no código, CI ou produção.

## Contrato visual obrigatório — decisão explícita de 02/11/2026

- **Preservar o layout original da aplicação OrdaX como referência visual oficial do Tonecos Studio.** A versão de `main` anterior à integração (`fdd2992a7d20b4ca29163e9ec77e9f19f59d8f41`) é a referência para comparação, não um alvo para ressuscitar a integração de dados antiga.
- Conservar a estética escura com dourado, o Arcade/HUD existente, componentes compartilhados, tipografia, estrutura, efeitos, espaçamentos, cabeçalho, rodapé, Home, área do cliente e administração. Substituir apenas a marca e textos/dominios antigos por **Tonecos / Tonecos Studio**. Não adotar uma nova paleta marfim/oliva nem substituir o visual por uma vitrine editorial.
- **Escala do catálogo:** acomodar acervo já superior a 2 mil modelos, com busca, ordenação, categorias, franquias, tags, filtros, galerias, seleção, links `/modelos/:slug`, carregamento incremental por cursor, imagens lazy/responsivas e estados de erro/sem resultados. A interface deve caber no visual antigo, sem sacrificar responsividade, acessibilidade e desempenho.
- As páginas `/modelos` e `/modelos/:slug` já reutilizam `ArcadeHero`, `ArcadeSectionTitle`, `ArcadeCard` e o visual escuro/dourado via `--gold-accent`; os tokens temporários `--tonecos-*` foram retirados no commit `52224ee`. A implementação da branch ainda exige homologação visual desktop/mobile e `release:verify` verde, não nova restauração estética. Não copiar `UniverseModelCard` com consultas legadas Supabase nem construir design system paralelo.
- **Sem redesign geral.** Qualquer alteração visual fora de branding, escala, filtros/tags, responsividade ou correções comprovadas de UX depende de autorização explícita do usuário. Mudanças em telas existentes requerem comparação visual antiga/nova no desktop e no celular antes do merge.
- Manter um único SSOT de tokens e componentes. Após migrar os consumidores do novo catálogo, remover tokens temporários `--tonecos-*` se não forem utilizados. Não criar um segundo design system.

## Regras de mudança

- A `main` continua sendo a única branch publicada. **Durante a consolidação autorizada em 01/11/2026, usar exclusivamente `integration/tonecosstudio-canonical-20261101` para mudanças de código**, sem PR ou branch paralela.
- **Não enviar commits para a main enquanto a antiga integração Vercel/OrdaX não for comprovadamente desvinculada.** Uma promoção acidental pode atingir o domínio do OrdaX OS.
- Antes de qualquer gravação, verificar HEAD, branch alvo, destinatário do deploy e mudanças concorrentes.
- Antes de cada push de integração, confira o destino automático da Vercel. Se o preview continuar vinculado a `jogo-brasils-projects/ordax`, não envie código até o vínculo ser isolado; atualização documental só é permitida quando o ignore step provar que não haverá build.
- Não criar outra branch ou PR sem justificativa explícita e autorização; após isolamento do deploy, integrar apenas com gates completos no SHA final.
- Não misturar limpeza documental, mudança de schema e deploy no mesmo checkpoint.
- Não apagar histórico útil: arquivar com índice e motivo.
- Não criar um segundo SSOT, segundo executor ou segundo mecanismo de autorização.
- Não afirmar “pronto”, “seguro”, “100%” ou percentuais sem prova reproduzível.
- Preservar mudanças não relacionadas e evitar refatorações cosméticas durante correções críticas.
- Segredos reais nunca entram no Git, logs, screenshots, issues ou VITE_*.
- Não executar migration remota, reativar serviço pago ou fazer deploy sem escopo e prova de rollback.
- Alterações relevantes atualizam URGENTE.md com HEAD, provas, next_action e do_not_repeat.
- Nunca reconstruir um segundo banco de modelos Supabase: o gateway público do Worker do catálogo é a única autoridade de busca/publicação, com leitura limitada e sem scans D1.

## Toolchain canônica

- Node.js 24 LTS.
- npm e package-lock.json como caminho de CI.
- TypeScript strict.
- Vitest para testes.
- Supabase migrations como histórico de schema.
- GitHub Actions como Quality Gate.
- Vercel/Cloudflare somente conforme runbook de ambiente que será consolidado.

Os lockfiles Bun permanecem apenas até P2 classificá-los e removê-los com CI verde.

## Quality Gate

Para uma mudança permanecer na main e ser candidata a release:

1. npm ci;
2. npm run typecheck;
3. npm run lint;
4. npm run security:supabase-access;
5. auditores de autoridade comercial, profiles, notificações e configurações públicas;
6. npm run test:coverage;
7. npm run build;
8. npm audit --omit=dev --audit-level=high;
9. npm run format:check.

A formatação continua requisito de GO. Ela fica por último enquanto a baseline histórica estiver fora do padrão, para não impedir que erros funcionais, de segurança, testes, build e dependências sejam descobertos e corrigidos primeiro. A dívida de formatação deve permanecer explícita até um commit mecânico controlado normalizar a baseline.

Falha deve ser corrigida ou registrada como bloqueio explícito; nunca ocultada reduzindo o gate sem justificativa.

## Supabase e segurança

- Confirmar o project_id antes de qualquer operação.
- Toda tabela/view exposta precisa de grants deliberados e RLS apropriada.
- Views públicas devem usar security_invoker quando suportado.
- SECURITY DEFINER exige necessidade documentada, search_path seguro, EXECUTE restrito e teste.
- UI nunca é fronteira de autorização.
- Operações administrativas usam o gateway canônico e validação server-side.
- Funções verify_jwt=false devem provar assinatura/segredo, rate limit, idempotência quando aplicável e fail-closed.
- service_role é exclusivamente server-side.
- Mudanças de schema devem ser migrations ordenadas e testadas do zero.

## Frontend e produto

- Estados loading, empty, error e success são obrigatórios para dados remotos.
- Não mostrar sucesso/atividade quando a fonte está vazia ou indisponível.
- Não publicar mocks, placeholders ou dados de demonstração como se fossem reais.
- Toda rota crítica deve funcionar por navegação e refresh direto.
- Mudanças visuais exigem verificação desktop e mobile, teclado, contraste e landmarks.
- Conteúdo legal, contato, preços e marca devem vir de fonte canônica.

## Checkpoint obrigatório

Ao encerrar trabalho, registrar em URGENTE.md:

- HEAD;
- concluído;
- testes/provas;
- bloqueios;
- next_action;
- do_not_repeat.
