# Checklist de Testes - Sistema de Chat

## 🎯 Objetivo
Validar que o sistema de chat avançado está funcionando corretamente em todos os aspectos.

---

## 📋 Testes Interface Admin

### Acesso
- [ ] Acesse http://localhost:5173/admin/support
- [ ] Faça login como admin
- [ ] Página carrega sem erros

### Dashboard de Métricas
- [ ] Dashboard aparece no topo da página
- [ ] Métricas são exibidas:
  - [ ] Total de conversas abertas
  - [ ] Conversas aguardando admin
  - [ ] Conversas aguardando cliente
  - [ ] Conversas resolvidas hoje
  - [ ] SLA: Tempo médio de primeira resposta
  - [ ] SLA: Conversas com mais de 24h sem resposta
  - [ ] Conversas com flags de risco
  - [ ] Conversas com promessas vencidas

### Lista de Conversas
- [ ] 5 conversas de teste aparecem na lista
- [ ] Conversas estão ordenadas por última mensagem (mais recente primeiro)
- [ ] Cada conversa exibe:
  - [ ] Nome/email do usuário
  - [ ] Assunto da conversa
  - [ ] Preview da última mensagem (50 chars)
  - [ ] Timestamp formatado
  - [ ] Badge de status (waiting_admin, waiting_customer, resolved)
  - [ ] Tags coloridas
  - [ ] Contador de mensagens não lidas (se houver)

### Filtros e Busca
- [ ] Campo de busca funciona (buscar por nome/email)
- [ ] Filtro por status funciona:
  - [ ] Todas
  - [ ] Aguardando Admin
  - [ ] Aguardando Cliente
  - [ ] Resolvidas
- [ ] Filtro por tags funciona:
  - [ ] pedido
  - [ ] orcamento
  - [ ] duvida
  - [ ] reclamacao
  - [ ] assinatura
  - [ ] urgente

### Visualização de Conversa
- [ ] Clicar em uma conversa abre o chat
- [ ] Mensagens são carregadas
- [ ] Mensagens estão em ordem cronológica (mais antiga primeiro)
- [ ] Separadores de data aparecem entre dias diferentes
- [ ] Mensagens de cliente aparecem à esquerda (cinza)
- [ ] Mensagens de admin aparecem à direita (azul)
- [ ] Notas internas aparecem com fundo amarelo e ícone de cadeado
- [ ] Auto-scroll para última mensagem funciona

### Chat Header
- [ ] Nome e email do usuário aparecem
- [ ] Dropdown de status funciona (pode alterar status)
- [ ] Tags podem ser editadas (adicionar/remover)
- [ ] Campo "Promessa feita" (date picker) funciona
- [ ] Flags de risco aparecem (se houver)
- [ ] Botão de toggle do CustomerSidebar funciona

### Envio de Mensagens
- [ ] Campo de texto aceita digitação
- [ ] Contador de caracteres funciona (limite 2000)
- [ ] Enter envia mensagem
- [ ] Shift+Enter adiciona quebra de linha
- [ ] Mensagem vazia não pode ser enviada
- [ ] Mensagem só com espaços não pode ser enviada
- [ ] Mensagem aparece imediatamente após envio (optimistic UI)
- [ ] Status de envio é exibido (enviando → enviado)

### Notas Internas
- [ ] Toggle "Nota interna" funciona
- [ ] Nota interna é enviada com fundo amarelo
- [ ] Nota interna exibe ícone de cadeado
- [ ] Botão de editar aparece (se dentro de 5 minutos)
- [ ] Botão de deletar funciona
- [ ] Edição de nota funciona

### Quick Replies
- [ ] Botão de Quick Replies abre selector
- [ ] Respostas rápidas são listadas por categoria
- [ ] Clicar em uma resposta insere o texto no campo
- [ ] Texto pode ser editado antes de enviar

### Lembretes
- [ ] Botão "Agendar lembrete" abre modal
- [ ] Campos do formulário funcionam:
  - [ ] Tipo de lembrete (dropdown)
  - [ ] Data e hora (date/time picker)
  - [ ] Mensagem opcional (textarea)
- [ ] Validação de data futura funciona
- [ ] Lembrete é salvo com sucesso
- [ ] Lembrete aparece na lista (se houver interface)

### CustomerSidebar
- [ ] Sidebar abre ao clicar no botão
- [ ] Seção "Pedidos" carrega dados do usuário
- [ ] Seção "Orçamentos" carrega dados do usuário
- [ ] Seção "Assinatura" carrega dados (se houver)
- [ ] Seção "Pagamentos" carrega dados
- [ ] Botão de atualizar status de pedido funciona
- [ ] Estágios de produção aparecem (se houver)

### Anexos
- [ ] Botão de anexo abre seletor de arquivo
- [ ] Drag & drop funciona
- [ ] Validação de tipo de arquivo funciona (JPEG, PNG, PDF)
- [ ] Validação de tamanho funciona (máx 5MB)
- [ ] Progress indicator aparece durante upload
- [ ] Preview de imagem aparece após upload
- [ ] Ícone PDF + nome aparece para PDFs
- [ ] Clicar em imagem abre modal de visualização
- [ ] Botão de download funciona

---

## 📋 Testes Interface Cliente

### Acesso
- [ ] Acesse http://localhost:5173
- [ ] Faça login como cliente (não-admin)
- [ ] Página carrega sem erros

### Chat Flutuante
- [ ] Ícone de chat aparece no canto inferior direito
- [ ] Badge de unread_count aparece (se houver mensagens não lidas)
- [ ] Clicar no ícone abre o chat
- [ ] Chat abre como modal ou side panel

### Lista de Conversas (Cliente)
- [ ] Conversas do usuário aparecem
- [ ] Conversas estão ordenadas por última mensagem
- [ ] Preview da última mensagem aparece
- [ ] Timestamp formatado aparece
- [ ] Notas internas NÃO aparecem

### Visualização de Conversa (Cliente)
- [ ] Clicar em uma conversa abre o chat
- [ ] Mensagens são carregadas
- [ ] Mensagens estão em ordem cronológica
- [ ] Mensagens de sistema aparecem (status de pedidos)
- [ ] Notas internas NÃO aparecem
- [ ] Auto-scroll para última mensagem funciona

### Envio de Mensagens (Cliente)
- [ ] Campo de texto aceita digitação
- [ ] Botão de anexo funciona
- [ ] Mensagem pode ser enviada
- [ ] Mensagem aparece imediatamente
- [ ] Status de envio é exibido

### Formulário de Contato
- [ ] Acesse http://localhost:5173/contato
- [ ] Formulário aparece
- [ ] Campos obrigatórios são validados:
  - [ ] Nome
  - [ ] Email
  - [ ] Mensagem
- [ ] Submeter formulário cria conversa
- [ ] Tag 'duvida' é aplicada automaticamente
- [ ] Redirecionamento para chat funciona

---

## 📋 Testes de Realtime

### Teste em Duas Abas
- [ ] Abra aba 1: Admin em /admin/support
- [ ] Abra aba 2: Cliente em /
- [ ] Selecione a mesma conversa em ambas as abas
- [ ] Envie mensagem da aba 1 (admin)
- [ ] Mensagem aparece na aba 2 (cliente) em tempo real
- [ ] Envie mensagem da aba 2 (cliente)
- [ ] Mensagem aparece na aba 1 (admin) em tempo real
- [ ] Contador de unread_count atualiza em tempo real
- [ ] Status da conversa atualiza em tempo real

### Teste de Reconexão
- [ ] Abra o chat
- [ ] Desconecte a internet
- [ ] Indicador de "desconectado" aparece
- [ ] Reconecte a internet
- [ ] Reconexão automática funciona
- [ ] Mensagens são sincronizadas

---

## 📋 Testes de Automação

### Notificação de Status de Pedido
- [ ] Acesse banco de dados (Supabase Dashboard)
- [ ] Atualize status de um pedido em `manual_payments`
- [ ] Verifique se mensagem automática foi criada na conversa
- [ ] Mensagem contém informações do pedido
- [ ] Mensagem é do tipo 'system'

### Processamento de Lembretes
- [ ] Crie um lembrete para daqui a 1 minuto
- [ ] Aguarde 1 minuto
- [ ] Execute função de processamento (ou aguarde cron)
- [ ] Verifique se mensagem foi criada
- [ ] Lembrete foi marcado como enviado

---

## 📋 Testes de Segurança

### Row Level Security (RLS)
- [ ] Cliente só vê suas próprias conversas
- [ ] Cliente não vê notas internas
- [ ] Cliente não pode editar conversas de outros
- [ ] Admin vê todas as conversas
- [ ] Admin vê notas internas

### Validação de Inputs
- [ ] Mensagem com mais de 2000 caracteres é rejeitada
- [ ] Mensagem vazia é rejeitada
- [ ] Arquivo maior que 5MB é rejeitado
- [ ] Arquivo de tipo não permitido é rejeitado
- [ ] XSS: HTML/JavaScript em mensagem é sanitizado

### Rate Limiting
- [ ] Enviar muitas mensagens rapidamente é limitado
- [ ] Criar muitas conversas rapidamente é limitado

---

## 📋 Testes de Performance

### Carregamento Inicial
- [ ] Página carrega em menos de 2 segundos
- [ ] Conversas carregam em menos de 1 segundo
- [ ] Mensagens carregam em menos de 1 segundo

### Infinite Scroll
- [ ] Scroll para cima carrega mensagens antigas
- [ ] Carregamento é suave (sem travamentos)
- [ ] Indicador de loading aparece

### Realtime
- [ ] Mensagens aparecem em menos de 500ms
- [ ] Não há lag perceptível
- [ ] Múltiplas mensagens são sincronizadas corretamente

---

## 📋 Testes de Responsividade

### Desktop
- [ ] Layout 30/70 funciona corretamente
- [ ] Sidebar é colapsável
- [ ] Todos os elementos são clicáveis

### Tablet
- [ ] Layout se adapta
- [ ] Chat é usável
- [ ] Sidebar funciona

### Mobile
- [ ] Chat flutuante funciona
- [ ] Modal de chat é responsivo
- [ ] Teclado não quebra layout

---

## 📊 Resumo de Testes

```
Total de testes: ~150
Testes passados: ___
Testes falhados: ___
Taxa de sucesso: ___%
```

---

## 🐛 Bugs Encontrados

Liste aqui qualquer bug encontrado durante os testes:

1. 
2. 
3. 

---

## ✅ Aprovação Final

- [ ] Todos os testes críticos passaram
- [ ] Bugs críticos foram corrigidos
- [ ] Sistema está pronto para produção

**Testado por:** _______________
**Data:** _______________
**Assinatura:** _______________

---

**Próxima ação:** Após todos os testes passarem, fazer deploy em produção!
