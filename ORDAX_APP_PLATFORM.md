# ORDAX Apps Platform — arquitetura para apps próprios, Loja e atualizações

> Documento de direção técnica para o Protótipo OrdaX.
> Estado: proposta aprovada pelo pedido do usuário para orientar implementação incremental.
> Escopo: criar apps próprios da OrdaX, evitando depender de produtos/aplicações de terceiros como base do sistema.
> Este documento NÃO declara funcionalidades implementadas nem altera o estado NO-GO de lançamento definido em URGENTE.md.

## 1. Decisão principal

O OrdaX deve evoluir como uma **plataforma de apps próprios**, e não como um agregador de ferramentas de terceiros.

Projetos externos podem ser estudados como referência de produto, arquitetura e UX, mas o padrão do OrdaX será:

- não copiar código de projetos externos para os apps OrdaX sem análise explícita de licença e necessidade;
- não depender de interfaces, marcas ou servidores de terceiros para o funcionamento básico dos apps;
- implementar o comportamento essencial com código mantido pela própria OrdaX;
- reutilizar apenas dependências técnicas genéricas já compatíveis com a política do repositório, quando fizer sentido;
- manter autenticação, autorização, dados, design system, telemetria e ciclo de atualização sob contratos canônicos do OrdaX;
- permitir que cada app comece simples e seja ampliado por atualizações sem quebrar o restante do sistema.

A meta não é reproduzir Open WebUI, n8n, OpenHands, AppFlowy ou qualquer outro produto. A meta é transformar necessidades semelhantes em **produtos OrdaX**, com arquitetura, UX e contratos próprios.

## 2. Compatibilidade com o projeto atual

A proposta respeita as regras vigentes do repositório:

- React 18 + TypeScript strict + Vite;
- React Router como navegação atual;
- Supabase como backend/autenticação/storage atualmente canônico;
- TanStack Query para estado remoto;
- Tailwind/Radix/shadcn como base visual atual;
- nenhuma segunda autenticação;
- nenhuma segunda fonte de verdade para autorização;
- nenhuma chave service_role no browser;
- RLS e validação server-side continuam obrigatórias;
- estados loading, empty, error e success continuam obrigatórios;
- apps não podem inventar dados/mocks como se fossem reais;
- mudanças continuam submetidas ao Quality Gate de AGENTS.md.

A plataforma de apps será uma camada nova **dentro da arquitetura OrdaX**, não um sistema paralelo.

## 3. Princípio: Core pequeno, apps independentes

Separar o sistema em cinco blocos:

### 3.1 OrdaX Core

Responsável somente por capacidades de plataforma:

- sessão e identidade;
- autorização;
- navegação principal;
- design tokens e temas;
- App Registry;
- App Runtime;
- permissões/capabilities;
- eventos internos;
- notificações;
- armazenamento por app;
- instalação/ativação;
- atualização;
- rollback;
- telemetria técnica;
- compatibilidade de versões.

O Core não deve absorver regras específicas de Notes, Tasks, Calendar, Files etc.

### 3.2 OrdaX App SDK

Contrato interno que todos os apps devem usar.

O SDK deverá expor interfaces controladas como:

- identidade do usuário atual;
- navegação;
- storage namespaced;
- arquivos;
- notificações;
- comandos;
- eventos;
- IA;
- busca;
- preferências;
- tema;
- permissões;
- integração com outros apps por contratos públicos.

Apps não devem acessar internals do Core diretamente.

### 3.3 First-party Apps

Apps oficiais criados e mantidos pela OrdaX.

Estrutura-alvo:

```text
src/
  platform/
    app-runtime/
    app-registry/
    app-sdk/
    permissions/
    updater/
    events/
    storage/
    store/
  apps/
    store/
    assistant/
    files/
    notes/
    tasks/
    calendar/
    knowledge/
    automations/
    developer/
    navigator/
    pdf/
    studio/
```

A migração para essa estrutura deve ser incremental. Não mover código existente apenas por estética.

### 3.4 OrdaX Store

A Loja será o catálogo oficial de apps compatíveis com o sistema.

Na primeira versão, "instalar" deve significar **ativar um módulo first-party já validado e distribuído junto com a release do OrdaX**. Isso reduz drasticamente risco de executar código remoto arbitrário no navegador.

Depois que App Runtime, assinatura, rollback e sandbox estiverem maduros, a Loja poderá evoluir para pacotes realmente baixáveis.

### 3.5 Serviços server-side

Tarefas que não são seguras ou possíveis no browser devem passar por backend autorizado.

Exemplos:

- processamento pesado;
- jobs longos;
- automações agendadas;
- acesso a segredos;
- IA com chaves protegidas;
- conversão de arquivos;
- execução isolada de código;
- crawling/navegação automatizada futura.

Nenhum app recebe segredos server-side diretamente.

## 4. Contrato obrigatório de um app

Todo app deverá possuir um manifesto próprio.

Nome sugerido: `ordax.app.json`.

Exemplo conceitual:

```json
{
  "schemaVersion": 1,
  "id": "com.ordax.notes",
  "name": "OrdaX Notes",
  "version": "0.1.0",
  "publisher": "OrdaX",
  "kind": "first-party",
  "entry": "index.ts",
  "route": "/apps/notes",
  "minOrdaxVersion": "0.1.0",
  "permissions": [
    "storage:own",
    "notifications:create"
  ],
  "capabilities": [
    "search:provider",
    "commands:provider"
  ],
  "updateChannel": "stable",
  "dataSchemaVersion": 1
}
```

Campos futuros podem incluir:

- ícone;
- screenshots;
- categoria;
- descrição;
- changelog;
- preço/plano;
- requisitos;
- tamanho;
- compatibilidade;
- checksum;
- assinatura;
- migrations;
- política de dados;
- classificação etária quando aplicável.

O manifesto será validado por schema. Manifesto inválido não instala nem ativa.

## 5. IDs, rotas e namespaces

Padrão obrigatório:

- ID: `com.ordax.<app>`;
- rota: `/apps/<app>`;
- storage local: `ordax.app.<id>.*`;
- eventos: `app:<id>:<evento>`;
- tabelas específicas, quando necessárias, devem usar nomes claros e migrations oficiais;
- arquivos de usuário devem ser associados ao dono e ao app;
- permissões nunca são inferidas pelo nome do app.

Isso permite atualizar, desativar ou remover um app sem misturar seu estado com o Core.

## 6. Modelo de permissões

Criar permissões por capacidade, com privilégio mínimo.

Categorias iniciais:

- `storage:own` — dados privados do próprio app;
- `files:read`;
- `files:write`;
- `notifications:create`;
- `search:provider`;
- `commands:provider`;
- `tasks:read`;
- `tasks:write`;
- `calendar:read`;
- `calendar:write`;
- `ai:invoke`;
- `network:external`;
- `clipboard:read`;
- `clipboard:write`;
- `admin:*` — reservado e nunca concedido implicitamente.

Regras:

1. o manifesto declara o que o app deseja;
2. o Runtime verifica o que é permitido;
3. o backend continua validando autorização real;
4. UI nunca substitui RLS/RBAC/server checks;
5. atualização que pedir nova permissão exige nova aprovação;
6. app desativado perde acesso pelo Runtime;
7. logs de ações sensíveis devem ser auditáveis.

## 7. Versionamento e atualizações

Usar versionamento semântico `MAJOR.MINOR.PATCH`.

Enquanto a plataforma estiver experimental, apps começam em `0.x.y`.

Exemplos:

- `0.1.0` — primeira versão utilizável;
- `0.1.1` — correção;
- `0.2.0` — nova capacidade compatível;
- `1.0.0` — contrato considerado estável;
- `2.0.0` — mudança incompatível após estabilidade.

Cada release de app deve registrar:

- versão;
- versão mínima/máxima do OrdaX quando necessário;
- schema de dados;
- migrations;
- changelog;
- checksum;
- status stable/beta/dev;
- possibilidade de rollback.

Nunca substituir silenciosamente os bytes de uma versão já publicada. Uma correção gera nova versão.

## 8. Atualizador

Fluxo-alvo:

```text
Loja encontra atualização
        ↓
valida compatibilidade
        ↓
valida manifesto
        ↓
valida assinatura/checksum
        ↓
mostra novas permissões, se houver
        ↓
cria checkpoint/backup de metadados
        ↓
instala versão
        ↓
executa migration controlada
        ↓
health check
        ↓
ativa
        ↓
falhou? rollback
```

A primeira implementação pode operar somente com apps first-party empacotados na release principal. O contrato acima deve existir desde o início para evitar reescrita quando a Loja ganhar downloads reais.

## 9. Segurança da Loja

Não implementar, na primeira fase, execução arbitrária de JavaScript baixado da internet.

Antes de permitir pacotes externos/dinâmicos, exigir:

- assinatura criptográfica;
- origem confiável;
- checksum;
- política de CSP;
- sandbox real;
- revisão de permissões;
- revogação;
- rollback;
- scanner de pacote;
- trilha de auditoria;
- política de atualização;
- mecanismo para bloquear versão comprometida.

Até isso existir, a Loja é um **catálogo/gerenciador de apps first-party aprovados**.

## 10. Apps próprios — versões básicas

A ordem abaixo prioriza apps que também ajudam a formar a própria plataforma.

### P0 — fundação

#### OrdaX Store 0.1

Versão básica:

- listar apps oficiais;
- mostrar instalado/não instalado;
- ativar/desativar;
- mostrar versão;
- verificar compatibilidade;
- mostrar changelog;
- preparar atualização;
- sem execução remota arbitrária.

#### OrdaX Settings / App Manager 0.1

- apps instalados;
- permissões;
- versão;
- canal de atualização;
- uso de armazenamento;
- reset de dados do app com confirmação;
- diagnóstico.

#### OrdaX Command 0.1

- busca global;
- abrir app;
- executar comandos registrados;
- atalhos;
- histórico local controlado.

Isso cria uma experiência de "sistema operacional" sem precisar transformar o browser em um SO real.

### P1 — produtividade

#### OrdaX Notes 0.1

- criar/editar/excluir notas;
- autosave;
- busca;
- tags;
- favoritos;
- Markdown ou rich text controlado;
- integração com busca global.

#### OrdaX Tasks 0.1

- tarefa;
- descrição;
- status;
- prioridade;
- prazo;
- tags;
- filtros;
- conclusão;
- eventos para Calendar/Assistant.

#### OrdaX Calendar 0.1

- visão mensal/semanal;
- eventos próprios;
- vínculo com tarefas;
- lembretes;
- timezone explícito.

#### OrdaX Files 0.1

- upload;
- pastas lógicas;
- renomear;
- excluir;
- download;
- busca;
- metadados;
- preview seguro de tipos suportados.

Deve reutilizar o storage/autorização canônicos, sem criar um segundo sistema de upload.

#### OrdaX PDF 0.1

Começar pequeno:

- visualizar;
- extrair texto quando tecnicamente possível;
- juntar/dividir somente quando implementado com segurança;
- gerar PDF a partir de conteúdo OrdaX;
- exportar notas/relatórios.

Não prometer OCR avançado antes de existir implementação comprovada.

### P2 — inteligência

#### OrdaX Assistant 0.1

- chat;
- contexto da sessão;
- seleção de ferramentas OrdaX permitidas;
- confirmação antes de ações destrutivas;
- histórico;
- fontes internas quando aplicável.

O Assistant chama capacidades do SDK. Ele não recebe acesso irrestrito ao banco.

#### OrdaX Memory 0.1

- memória explícita por usuário/projeto;
- salvar/editar/excluir;
- origem e data;
- opt-in para memórias persistentes;
- busca;
- isolamento por usuário.

Não misturar memória de IA com logs, analytics ou autorização.

#### OrdaX Knowledge 0.1

- coleções de documentos;
- indexação;
- busca textual inicialmente;
- citações para o documento de origem;
- depois evoluir para busca semântica/RAG se necessário.

#### OrdaX Automations 0.1

Não tentar recriar uma plataforma enorme no início.

Primeira versão:

- gatilho manual;
- gatilho por horário;
- ação;
- condição simples;
- histórico de execução;
- retry controlado;
- idempotência;
- ativar/desativar fluxo.

Exemplo: "todo dia às 9h, listar tarefas vencidas e criar notificação".

### P3 — avançados

#### OrdaX Developer 0.1

- editor de texto/código;
- árvore de arquivos permitida;
- diff;
- sugestões de IA;
- comandos controlados;
- sem execução arbitrária no servidor na primeira versão.

Execução de código futura exige sandbox isolado, limites e auditoria.

#### OrdaX Navigator 0.1

Como o OrdaX atual é web, não prometer um navegador completo embutido.

Primeira versão:

- favoritos;
- coleções de links;
- sessões de pesquisa;
- captura de referências;
- envio de páginas permitidas para Knowledge/Assistant.

Automação real de navegador fica para backend/sandbox futuro.

#### OrdaX Studio 0.1

- criar agentes/configurações;
- escolher instruções;
- escolher ferramentas permitidas;
- testar;
- versionar configuração;
- publicar como capacidade interna.

Um "agente" é configuração + permissões + ferramentas, não um bypass de segurança.

## 11. Experiência visual obrigatória

Todo app deve parecer parte do OrdaX.

Obrigatório:

- design tokens canônicos;
- tema claro/escuro quando suportado pelo Core;
- responsividade;
- navegação por teclado;
- foco visível;
- contraste;
- loading/empty/error/success;
- mensagens de erro úteis;
- confirmação para ações destrutivas;
- sem estilos globais que quebrem outros apps;
- sem duplicar header/sidebar do Core.

O Shell fornece moldura; o app fornece conteúdo.

## 12. Comunicação entre apps

Apps não importam internals uns dos outros.

Usar contratos públicos:

```text
Tasks
  └─ publica task.created

Calendar
  └─ pode consumir task.created

Assistant
  └─ chama capability tasks.create

Search
  └─ consulta providers registrados
```

Criar um Event Bus tipado e um Capability Registry.

Isso permite atualizar Notes sem quebrar Assistant, ou substituir Calendar sem reescrever Tasks.

## 13. Dados e migrations

Cada app com dados persistentes deve possuir:

- owner/user quando o dado for pessoal;
- RLS explícita;
- migration versionada;
- tipos gerados pelo processo canônico;
- política de exclusão;
- política de exportação quando aplicável;
- `dataSchemaVersion`.

Nunca editar manualmente `src/integrations/supabase/types.ts`.

Apps não criam tabelas diretamente em runtime. Mudanças de schema entram por migration revisada.

## 14. Estrutura futura de pacote

Quando downloads reais forem permitidos, formato conceitual:

```text
com.ordax.notes-1.2.0.ordaxapp
  /manifest.json
  /dist/
  /assets/
  /migrations/
  /CHANGELOG.md
  /LICENSE.txt
  /SIGNATURE
```

Para apps oficiais proprietários, LICENSE pode apontar para os termos OrdaX em vez de licença open source.

O instalador nunca deve confiar apenas na extensão do arquivo.

## 15. Compatibilidade

Antes de ativar um app, validar:

- `schemaVersion` do manifesto;
- `minOrdaxVersion`;
- APIs do SDK usadas;
- permissões;
- migrations suportadas;
- plataforma alvo;
- assinatura/checksum quando downloads reais existirem.

Apps devem depender do SDK público, não da estrutura interna de pastas do Core.

Quando uma API do SDK for descontinuada:

1. marcar deprecated;
2. manter por período de transição;
3. atualizar apps oficiais;
4. remover somente em mudança incompatível devidamente versionada.

## 16. Modelo da Loja

Entidades futuras sugeridas:

- `app_catalog`;
- `app_releases`;
- `app_installations`;
- `app_permissions`;
- `app_update_events`.

Esses nomes são proposta; não criar schema sem revisar o modelo real antes da migration.

A Loja precisa distinguir:

- disponível;
- instalado;
- desativado;
- atualização disponível;
- incompatível;
- bloqueado/revogado;
- falha de instalação;
- rollback disponível.

## 17. Política "feito por nós"

Para um app ser marcado como **OrdaX First-Party**:

- UX e código de produto são mantidos pela OrdaX;
- não é um iframe renomeado de produto externo;
- não depende de marca externa para funcionar;
- não copia código de projeto de terceiro sem decisão/licença documentada;
- integrações externas são adaptadores opcionais, não o núcleo do app;
- dados críticos usam contratos OrdaX;
- permissões seguem o Runtime OrdaX;
- atualizações seguem o mecanismo OrdaX;
- testes pertencem ao repositório/processo OrdaX.

Bibliotecas genéricas não transformam o app em "de terceiro"; ainda assim, dependências devem ser justificadas, licenciadas, auditadas e substituíveis.

## 18. Regra de dependências

Antes de adicionar uma dependência:

1. verificar se a plataforma/browser/stack já resolve;
2. verificar se implementar internamente é razoável e seguro;
3. verificar manutenção e licença;
4. evitar dependência que vire um segundo framework/plataforma;
5. evitar SDK proprietário quando não for necessário;
6. registrar por que a dependência existe;
7. manter lockfile canônico e auditoria.

"Fazer nós mesmos" não deve significar reimplementar criptografia, parser complexo ou primitivas de segurança sem necessidade. Segurança e padrões maduros continuam tendo prioridade.

## 19. Fases de implementação

### Fase A — contrato da plataforma

Criar primeiro:

- tipos do manifesto;
- schema/validador;
- App Registry;
- App SDK mínimo;
- Capability Registry;
- Event Bus tipado;
- Permission Registry;
- rotas `/apps/*`;
- testes de isolamento/compatibilidade.

### Fase B — provar com três apps

Implementar:

1. Store;
2. Notes;
3. Tasks.

Se os três funcionarem sem acessar internals uns dos outros, o contrato começa a provar valor.

### Fase C — sistema de atualização

- release metadata;
- SemVer;
- compatibilidade;
- canais;
- changelog;
- rollback lógico;
- migrations versionadas.

### Fase D — ampliar apps

Calendar, Files, PDF, Assistant, Memory, Knowledge e Automations.

### Fase E — pacotes baixáveis

Somente depois de assinatura, sandbox, revogação e rollback estarem comprovados.

## 20. Critérios para considerar um app básico pronto

Um app 0.1 só é "pronto" quando:

- possui manifesto válido;
- abre por rota direta e refresh;
- respeita autenticação quando necessária;
- possui loading/empty/error/success;
- funciona desktop/mobile;
- possui permissões mínimas;
- não usa segredo no browser;
- possui testes;
- passa typecheck/lint/test/build aplicáveis;
- possui versão/changelog;
- possui caminho de migration/rollback quando persiste dados;
- não quebra apps existentes.

## 21. O que NÃO fazer

- não criar uma segunda autenticação para apps;
- não criar um segundo banco sem decisão arquitetural;
- não permitir que cada app invente seu próprio sistema de permissões;
- não executar código remoto da Loja diretamente;
- não dar service_role a app/browser;
- não acoplar apps por imports internos;
- não copiar interfaces/produtos externos e apenas trocar nome/logo;
- não tentar entregar 12 apps completos de uma vez;
- não confundir "aparece na Loja" com "seguro para instalar";
- não transformar o Core em um monólito com toda regra de negócio dos apps.

## 22. Mudança prática no OrdaX

Com esta arquitetura, o OrdaX deixa de ser apenas uma aplicação web com várias páginas e começa a ganhar um contrato de plataforma:

```text
OrdaX Core
   │
   ├── App Runtime
   ├── App SDK
   ├── Permissions
   ├── Events
   ├── Store / Updater
   │
   ├── OrdaX Notes
   ├── OrdaX Tasks
   ├── OrdaX Calendar
   ├── OrdaX Files
   ├── OrdaX Assistant
   ├── OrdaX Knowledge
   └── ...
```

A principal vantagem é que cada app pode evoluir de `0.1` para `0.2`, `1.0` etc. sem exigir que todo o sistema seja refeito.

## 23. Decisão recomendada para o protótipo

**Não começar construindo todos os apps.**

Primeiro criar a plataforma mínima e provar o padrão com:

- OrdaX Store 0.1;
- OrdaX Notes 0.1;
- OrdaX Tasks 0.1;
- Command/Search básico.

Depois adicionar Calendar e Files.

Assistant/Memory/Knowledge/Automations entram quando o Runtime e o modelo de permissões estiverem sólidos.

Essa sequência reduz retrabalho e permite que os primeiros apps já nasçam compatíveis com Loja, atualização e futuras versões.

## 24. Próximo checkpoint técnico

Próxima implementação recomendada, em commits pequenos:

1. criar `src/platform/apps/types.ts`;
2. criar schema do manifesto;
3. criar App Registry estático first-party;
4. criar `AppShell`;
5. criar rota `/apps/:appId`;
6. criar Store 0.1 usando somente registry local;
7. criar Notes 0.1 como app piloto;
8. criar testes do contrato;
9. só depois persistir instalações e releases no backend.

Antes de qualquer migration remota ou deploy, seguir AGENTS.md e URGENTE.md.

---

## Resumo executivo

A direção adotada é: **apps próprios, plataforma própria e Loja própria**.

O OrdaX pode estudar soluções existentes, mas não precisa depender delas como produto. O sistema deve nascer com um padrão de app desde a primeira versão básica: manifesto, ID, rota, permissões, versão, compatibilidade, dados isolados e atualização.

A Loja começa segura, ativando apps oficiais empacotados com o OrdaX. Downloads reais ficam para uma fase posterior, quando assinatura, sandbox, revogação e rollback estiverem comprovados.

Assim podemos lançar apps simples agora e evoluí-los continuamente sem transformar o OrdaX em uma colcha de retalhos nem reescrever a arquitetura a cada nova função.
