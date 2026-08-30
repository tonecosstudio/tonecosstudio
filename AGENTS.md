# AGENTS.md

## Missão

Trabalhar até que o ORDAX tenha prova de prontidão para lançamento. O documento URGENTE.md é o plano e status operacional canônico.

## Ordem de autoridade

1. pedido explícito do usuário e contrato do issue/PR atual;
2. este AGENTS.md;
3. URGENTE.md;
4. README.md e docs/README.md;
5. código, testes e configuração vigentes;
6. docs-archive e relatórios datados, que são apenas históricos.

Documentos históricos nunca podem sobrescrever o estado observado no código, CI ou produção.

## Regras de mudança

- Nunca escrever diretamente na main.
- Antes de escrever, registrar a branch e o HEAD de base.
- Não misturar limpeza documental, mudança de schema e deploy no mesmo checkpoint.
- Não apagar histórico útil: arquivar com índice e motivo.
- Não criar um segundo SSOT, segundo executor ou segundo mecanismo de autorização.
- Não afirmar “pronto”, “seguro”, “100%” ou percentuais sem prova reproduzível.
- Preservar mudanças não relacionadas e evitar refatorações cosméticas durante correções críticas.
- Segredos reais nunca entram no Git, logs, screenshots, issues ou VITE_*.
- Não executar migration remota, reativar serviço pago ou fazer deploy sem escopo e prova de rollback.
- Alterações relevantes atualizam URGENTE.md com HEAD, provas, next_action e do_not_repeat.

## Toolchain canônica

- Node.js 22.
- npm e package-lock.json como caminho de CI.
- TypeScript strict.
- Vitest para testes.
- Supabase migrations como histórico de schema.
- GitHub Actions como Quality Gate.
- Vercel/Cloudflare somente conforme runbook de ambiente que será consolidado.

Os lockfiles Bun permanecem apenas até P2 classificá-los e removê-los com CI verde.

## Quality Gate

Para uma mudança ser candidata a merge:

1. npm ci;
2. npm run format:check;
3. npm run typecheck;
4. npm run lint;
5. npm run security:supabase-access;
6. npm run test:coverage;
7. npm run build;
8. npm audit --omit=dev --audit-level=high.

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
