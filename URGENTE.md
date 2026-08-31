# URGENTE — prontidão para lançamento

Status: **EM EXECUÇÃO — NO-GO para lançamento**  
Atualizado em: **2026-08-30 (America/Bahia)**  
Branch operacional: **main somente**  
HEAD funcional antes deste checkpoint: `4fb8eb470156f319615af3b01ebc3707e3e3b3ba`

Este arquivo é o **SSOT operacional** da preparação para lançamento do ORDAX. Histórico detalhado dos checkpoints anteriores permanece no Git; este documento mantém apenas o estado vigente, os bloqueios, as provas e a próxima ordem de execução.

## 1. Regras vigentes

1. Trabalhar diretamente na `main`; não criar branch/PR sem nova instrução explícita.
2. Commits pequenos e reversíveis.
3. Frontend nunca é fronteira suficiente de autorização ou segurança.
4. Preço, crédito, disponibilidade, pagamento e permissão falham fechados quando a fonte oficial não pode ser validada.
5. Segredos e `service_role` nunca entram em `VITE_*` ou bundle do navegador.
6. Um domínio deve ter uma autoridade canônica; remover executores, mocks e caminhos paralelos desnecessários.
7. Código/migration versionado não equivale a deploy ou prova remota.
8. Não declarar GO, segurança, CI verde ou lançamento sem prova reproduzível.

## 2. Estado atual

| Área | Estado | Observação |
| --- | --- | --- |
| Branch | **main somente** | decisão explícita do usuário |
| Proteção da main | **PENDENTE** | `protected=false`, required checks desligados |
| Quality Gate | **BLOQUEADO NA INFRA** | último job continua com `runner_id=0`, `runner_name=""`, `steps=[]` |
| Runtime | **Node 24.x** | manifesto/CI/Vercel alinhados |
| Pacote | **ordax-web@0.1.0** | identidade do template removida |
| Package manager | **NÃO CONSOLIDADO** | manter locks concorrentes até `npm ci` real |
| Raiz/SSOT | **MELHORADO** | `AGENTS.md`, `README.md`, `URGENTE.md`; `.kiro` concorrente removido |
| Catálogo mock | **REMOVIDO DO RUNTIME** | sem fallback demonstrativo no serviço público |
| Comercial | **FAIL-CLOSED NO CÓDIGO** | compra, planos e assinatura rejeitam preço/configuração inválidos |
| Payment voucher | **PRIVADO NO CÓDIGO** | object path por usuário + RLS; ainda sem prova remota |
| Payment proof | **SERVER-AUTHORITY VERSIONADA** | upload/scanner/rate limit/Storage migrados para Edge Function |
| Anexos de suporte | **SERVER-AUTHORITY VERSIONADA** | bucket privado, Edge upload, signed URLs, RLS de nota interna |
| Supabase remoto | **BLOQUEADOR** | projeto observado estava inativo; drift/migrations/RLS ainda não provados |
| Vercel/smoke visual | **SEM PROVA ATUAL** | build publicado e desktop/mobile ainda pendentes |
| Lançamento | **NO-GO** | CI, banco remoto, E2E, segurança e release engineering sem prova suficiente |

## 3. Concluído nesta preparação

### 3.1 Governança e limpeza

- [x] auditoria inicial de repo, Actions, site e Supabase;
- [x] `AGENTS.md` e `URGENTE.md` como contrato/SSOT;
- [x] limpeza da raiz e arquivamento do histórico principal;
- [x] remoção de `.lnk`, launcher/ruído operacional e spec `.kiro` órfão;
- [x] identidade `ordax-web@0.1.0` e Node 24.x;
- [x] Quality Gate versionado;
- [ ] restaurar alocação real do runner;
- [ ] proteger `main` quando o gate puder executar de verdade.

### 3.2 Mocks, placeholders e conteúdo falso

- [x] catálogo mock removido do runtime;
- [x] variáveis/scripts do mock removidos;
- [x] placeholders visuais de produto obsoletos removidos;
- [x] Open Graph real criado;
- [x] defaults inventados de social, telefone, CNPJ e endereço removidos;
- [x] versão visual sem correspondência removida;
- [x] compra fake de coins removida; rota antiga apenas redireciona;
- [ ] terminar inventário de flags, rotas e integrações legadas.

### 3.3 Preços e assinatura

- [x] compra avulsa sem preço hardcoded de fallback;
- [x] preço/PIX/entrada/saldos validados como finitos e coerentes;
- [x] planos inválidos não são oferecidos;
- [x] assinatura não inventa coins, economia, preço contextual ou `R$ 0,00` de carregamento;
- [x] erros comerciais exibem indisponibilidade/retry;
- [ ] testar ponta a ponta em backend/preview operacionais.

### 3.4 Uploads e Storage

#### `payment-vouchers`

- [x] autenticação obrigatória;
- [x] object path privado ligado ao `auth.uid()`;
- [x] bucket privado/MIME/5 MB/RLS versionados;
- [x] checkout valida propriedade do path;
- [x] corpo privilegiado preservado em `private_api`, wrapper `public` como `SECURITY INVOKER`;
- [x] documentação pública antiga removida.

#### `payment-proofs`

- [x] removido scanner ClamAV/browser e configuração `VITE_CLAMAV_*`;
- [x] scanner passou a usar segredos server-only `MALWARE_SCANNER_URL/TOKEN`;
- [x] validação canônica server-side: nome, 1 byte–5 MB, MIME, extensão e magic bytes;
- [x] rate limit passou de memória do browser para banco/Edge;
- [x] ownership do pagamento verificado server-side;
- [x] upload Storage via service role; browser não escreve diretamente;
- [x] bucket privado e políticas server-upload-only versionadas;
- [x] metadata continua usando RPC autenticado para preservar `auth.uid()`;
- [x] testes antigos do scanner/browser removidos e contrato do Edge testado estaticamente;
- [x] regra de segurança de upload centralizada em `_shared/secure-upload.ts`.

#### `support-attachments`

- [x] removido upload direto do navegador;
- [x] criada `upload-support-attachment` com JWT, rate limit e autorização de conversa/mensagem;
- [x] mesma validação/magic bytes/scanner canônico de `payment-proofs`;
- [x] bucket `support-attachments` passa a privado, 5 MB e JPEG/PNG/PDF;
- [x] nenhum INSERT/UPDATE direto para `authenticated` no Storage/metadata;
- [x] `file_path` único e RPC exige objeto existente antes de registrar metadata;
- [x] `public_url` legado passa a permanecer `NULL` no banco;
- [x] leitura usa signed URL temporária, não `getPublicUrl()` real;
- [x] cache de signed URL é limpo em troca/logout de usuário;
- [x] cliente não recebe acesso a anexos de notas internas via RLS/Storage;
- [x] teste legado de URL pública/thumbnail-browser substituído pelo contrato Edge privado.

**Importante:** essas migrations/Edge Functions estão versionadas, mas **não foram declaradas aplicadas no Supabase remoto**.

## 4. Bloqueios comprovados

### GitHub Actions

Última prova inspecionada neste checkpoint:

- run `33348054221`;
- HEAD `4fb8eb470156f319615af3b01ebc3707e3e3b3ba`;
- job `Build, test and security`;
- `runner_id=0`;
- `runner_name=""`;
- `steps=[]`.

Conclusão: a falha continua anterior a checkout/typecheck/lint/test/build. Não tratar como falha de aplicação e não consumir tempo rerodando o mesmo workflow enquanto esse padrão persistir.

### Supabase

- projeto remoto anteriormente observado como inativo;
- não há prova atual de migrations aplicadas, policies efetivas, Edge Functions implantadas ou advisors com banco ativo;
- não fazer operação remota/paga sem contexto/autorização operacional.

### Deploy/visual

- Vercel teve bloqueio por limite do plano Hobby;
- mudanças recentes não possuem build/smoke público comprovado;
- não aprovar UI apenas por inspeção de código.

## 5. Próxima ordem de execução

### P0 — Prova de engenharia

- [ ] resolver alocação do runner do GitHub Actions;
- [ ] `npm ci` em Node 24;
- [ ] format, typecheck, lint, auditoria Supabase, testes/cobertura e build;
- [ ] `npm audit` e correção controlada de high/critical;
- [ ] somente depois consolidar npm/remover locks Bun se comprovadamente desnecessários.

### P1 — Flags, rotas, integrações e legados

- [ ] inventariar feature flags e rotas desativadas/sem implementação;
- [ ] remover telas que parecem operacionais mas apenas retornam indisponibilidade/mock;
- [ ] revisar integrações opcionais expostas na UI antes de estarem realmente configuradas;
- [ ] revisar templates `.env*` restantes e eliminar duplicidade/claims obsoletos;
- [ ] revisar `docs/` vigente e separar setup/operations/arquitetura/histórico;
- [ ] localizar aliases/serviços de compatibilidade sem consumidores e remover quando seguro.

### P2 — Supabase e segurança remota

- [ ] confirmar projeto de produção correto;
- [ ] medir migration drift;
- [ ] aplicar migrations de forma controlada;
- [ ] provar RLS/grants/Storage/`SECURITY DEFINER`/schemas privados;
- [ ] auditar todas as funções `verify_jwt=false` e proteção alternativa;
- [ ] reconciliar funções Git x implantadas;
- [ ] BOLA/IDOR cliente/admin/pagamento/suporte;
- [ ] provar ausência de `service_role` no bundle;
- [ ] testar malware scanner server-side real e comportamento fail-closed.

### P3 — Funcionalidade e UI

- [ ] restaurar/corrigir catálogo publicado vazio;
- [ ] smoke público: home, universo, personagem, modelo, detalhe, busca, contato;
- [ ] auth: cadastro, login, recuperação, logout;
- [ ] cliente: perfil, wishlist, dashboard, notificações e suporte;
- [ ] admin/RBAC;
- [ ] compra/assinatura/pagamento em ambiente de teste;
- [ ] desktop/tablet/mobile, loading/vazio/erro/retry;
- [ ] acessibilidade e Lighthouse/Core Web Vitals medidos.

### P4 — Release engineering

- [ ] SemVer/política de release;
- [ ] staging/preview separado de produção;
- [ ] artefato imutável promovido entre ambientes;
- [ ] secrets checklist;
- [ ] monitoramento/logs/alertas;
- [ ] backup/restore/rollback ensaiados;
- [ ] RC e release notes.

## 6. Critérios de GO

Todos devem estar verdadeiros:

- [ ] Quality Gate verde no commit exato da RC;
- [ ] instalação reproduzível;
- [ ] nenhum secret high-confidence em Git/bundle;
- [ ] nenhum risco crítico/alto aberto sem mitigação/aceitação formal;
- [ ] RLS, grants, Storage e funções privilegiadas provados no ambiente ativo;
- [ ] catálogo real e estados de falha honestos;
- [ ] pagamentos/uploads do escopo testados ponta a ponta;
- [ ] fluxos público/cliente/admin aprovados;
- [ ] cobertura mínima configurada satisfeita;
- [ ] acessibilidade/desempenho medidos;
- [ ] dados legais/LGPD validados;
- [ ] backup/restore/rollback ensaiados;
- [ ] RC versionada, monitorada e reversível.

## 7. Checkpoint 10 — 2026-08-30

HEAD de início do bloco de continuidade: `e5546acff74f81a212ea857fae29c0109e166267`  
HEAD funcional antes deste documento: `4fb8eb470156f319615af3b01ebc3707e3e3b3ba`

Concluído:

- `payment-proofs` consolidado em Edge/server authority;
- scanner browser e `VITE_CLAMAV_*` removidos;
- política de upload server-side centralizada e reutilizada;
- suporte migrado de Storage público/browser para bucket privado/Edge/signed URL;
- nota interna protegida também no nível de metadata/Storage;
- RPC de suporte não aceita mais URL pública e só registra objeto existente/único;
- testes legados alinhados aos novos contratos;
- configuração de malware scanner passou a ser server-only;
- compra fake de coins permanece removida.

Provas disponíveis:

- inspeção do wrapper `public.record_support_attachment_upload`: continua `SECURITY INVOKER` e delega a `private_api`;
- policies/migrations novas estão na `main`;
- `upload-payment-proof` e `upload-support-attachment` usam o mesmo `_shared/secure-upload.ts`;
- Quality Gate do HEAD `4fb8eb4...` ainda morreu com `runner_id=0`/`steps=[]` antes de executar qualquer step.

Bloqueios:

- testes/typecheck/build não executados pelo CI;
- migrations e Edge Functions não provadas no Supabase remoto;
- scanner real ainda precisa de endpoint server-side configurado;
- preview/smoke público pendente;
- `main` ainda sem proteção.

Next action:

1. auditar flags/rotas/integrações que ainda simulam funcionalidade;
2. remover aliases/legados sem consumidores e documentação contraditória;
3. continuar revisão estática de Storage/RPCs enquanto o Supabase remoto estiver indisponível;
4. corrigir a primeira falha **real** do Quality Gate quando houver runner;
5. só depois avançar para prova remota e release candidate.

Do not repeat:

- não reintroduzir upload direto do browser para comprovantes/suporte;
- não usar `getPublicUrl()` para anexos privados;
- não colocar scanner/segredos em `VITE_*`;
- não tratar validação client-side como fronteira de segurança;
- não criar branch/PR nesta execução;
- não declarar migration aplicada ou CI verde sem prova.
