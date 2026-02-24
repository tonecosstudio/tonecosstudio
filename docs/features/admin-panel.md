# 🛠️ Painel Administrativo - Ordax

Documentação completa do painel administrativo e suas funcionalidades.

---

## 📋 Visão Geral

O painel administrativo da Ordax é uma interface completa para gestão de todos os aspectos da plataforma, desde usuários até produção e finanças.

### Acesso

**URL**: `/admin`  
**Permissão**: Requer role `admin`

---

## 🏠 Dashboard Principal

### AdminHome (/admin)

**Métricas em Tempo Real**:

- Total de usuários
- Assinaturas ativas
- Pedidos em produção
- Receita do mês
- Conversas abertas
- Taxa de conversão

**Gráficos**:

- Vendas por período
- Novos usuários
- Status de produção
- Métodos de pagamento

**Ações Rápidas**:

- Criar novo usuário
- Processar pedido
- Responder chat
- Gerar relatório

---

## 👥 Gestão de Usuários

### AdminUsers (/admin/usuarios)

**Funcionalidades**:

- Lista de todos os usuários
- Busca por nome/email
- Filtros por role/status
- Ordenação customizável
- Paginação

**Ações por Usuário**:

- Ver detalhes completos
- Editar informações
- Promover a admin
- Desativar conta
- Ver histórico

### AdminUserDetails (/admin/usuarios/:id)

**Informações Exibidas**:

- Dados pessoais
- Assinaturas ativas
- Histórico de pedidos
- Pagamentos realizados
- Conversas de suporte
- Atividade recente

**Ações Disponíveis**:

- Editar perfil
- Alterar role
- Resetar senha
- Enviar email
- Criar nota interna

---

## 💬 Suporte e Chat

### AdminSupport (/admin/suporte)

**Interface Completa**:

- Lista de conversas
- Chat em tempo real
- Dados do cliente (sidebar)
- Métricas de atendimento

**Funcionalidades**:

- Mensagens instantâneas
- Anexos de arquivos
- Notas internas
- Quick replies
- Tags e flags
- Promised dates

**Documentação Detalhada**: Ver [chat-system.md](chat-system.md)

---

## 👥 Grupos de Comunicação

### AdminGroupsPage (/admin/grupos)

**Gestão de Grupos**:

- Lista de todos os grupos
- Criar novo grupo
- Editar grupo existente
- Ver membros
- Estatísticas

**Tipos de Grupos**:

- Segmentação automática
- Grupos manuais
- Grupos por coleção
- Grupos por status

### AdminGroupDetailsPage (/admin/grupos/:id)

**Detalhes do Grupo**:

- Informações básicas
- Lista de membros
- Mensagens enviadas
- Estatísticas de engajamento

**Ações**:

- Adicionar/remover membros
- Enviar mensagem em lote
- Editar configurações
- Exportar lista

---

## 📦 Gestão de Produtos

### AdminModels (/admin/modelos)

**Gestão de Personagens**:

- Lista de todos os modelos
- Upload de imagens
- Classificação por IA
- Edição em lote

**Campos**:

- Nome do personagem
- Franquia
- Coleção
- Status (disponível/esgotado)
- Imagens
- Descrição

### AdminFranchises (/admin/franquias)

**Gestão de Franquias**:

- Lista de franquias
- Criar/editar franquia
- Associar personagens
- Estatísticas

**Informações**:

- Nome da franquia
- Logo
- Descrição
- Total de personagens
- Popularidade

### AdminCollections (/admin/colecoes)

**Gestão de Coleções**:

- Lista de coleções
- Criar/editar coleção
- Associar personagens
- Configurar preços
- Definir custos

**Documentação Detalhada**: Ver [collections-system.md](collections-system.md)

---

## 💰 Gestão Financeira

### AdminPricing (/admin/precos)

**Configuração de Preços**:

- Preços globais padrão
- Preços por coleção
- Desconto PIX
- Valor da entrada

**Documentação Detalhada**: Ver [payment-system.md](payment-system.md)

### AdminCollectionFinancials (/admin/financeiro)

**Análise Financeira**:

- Custos por coleção
- Lucro e margem
- ROI
- Comparação de métodos
- Recomendações

**Documentação Detalhada**: Ver [payment-system.md](payment-system.md)

### AdminPayments (/admin/pagamentos)

**Gestão de Pagamentos**:

- Lista de pagamentos
- Filtros por status/método
- Confirmação manual
- Reembolsos
- Relatórios

### PaymentCalculator (/admin/calculadora)

**Calculadora de Preços**:

- Simular preços
- Calcular taxas
- Comparar métodos
- Ver lucro líquido

---

## 📋 Assinaturas e Planos

### AdminSubscriptions (/admin/assinaturas)

**Gestão de Assinaturas**:

- Lista de assinaturas
- Filtros por status/plano
- Detalhes completos
- Ações em lote

**Ações**:

- Ativar/pausar
- Cancelar
- Alterar plano
- Processar pagamento
- Enviar notificação

**Documentação Detalhada**: Ver [subscription-system.md](subscription-system.md)

### AdminPlans (/admin/planos)

**Gestão de Planos**:

- Lista de planos
- Criar/editar plano
- Configurar preços
- Definir benefícios
- Ativar/desativar

### AdminPreorders (/admin/pre-pedidos)

**Gestão de Pré-Pedidos**:

- Lista de pré-pedidos
- Status de produção
- Pagamentos pendentes
- Envio de atualizações

---

## 💳 Métodos de Pagamento

### AdminPaymentMethods (/admin/metodos-pagamento)

**Configuração**:

- Lista de métodos
- Ativar/desativar
- Configurar taxas
- Definir parcelamento
- Ordenar exibição

**Métodos Disponíveis**:

- PIX
- Cartão de crédito
- Boleto bancário
- Transferência manual

---

## 📊 Orçamentos

### AdminQuotes (/admin/orcamentos)

**Gestão de Orçamentos**:

- Lista de solicitações
- Filtros por status
- Criar orçamento
- Aprovar/rejeitar
- Converter em pedido

**Status**:

- Pendente
- Em análise
- Aprovado
- Rejeitado
- Convertido

**Ações**:

- Responder solicitação
- Editar valores
- Enviar proposta
- Acompanhar negociação

---

## 🎁 Cupons e Descontos

### AdminCoupons (/admin/cupons)

**Gestão de Cupons**:

- Lista de cupons
- Criar cupom
- Editar existente
- Ativar/desativar
- Estatísticas de uso

**Tipos de Cupom**:

- Percentual (%)
- Valor fixo (R$)
- Frete grátis
- Primeira compra

**Configurações**:

- Código do cupom
- Valor do desconto
- Data de validade
- Limite de uso
- Uso por usuário
- Produtos aplicáveis

---

## 📦 Produção

### AdminPackaging (/admin/embalagem)

**Gestão de Embalagem**:

- Tipos de embalagem
- Custos
- Fornecedores
- Estoque

### AdminProductionLimit (/admin/limite-producao)

**Limites de Produção**:

- Capacidade mensal
- Produção atual
- Disponibilidade
- Alertas

**Documentação Detalhada**: Ver [collections-system.md](collections-system.md)

---

## 🚀 Upload e Processamento

### UploadQueue (/admin/upload)

**Upload Massivo**:

- Upload de até 2000 imagens
- Processamento em lote
- Fila de processamento
- Status em tempo real

**Funcionalidades**:

- Drag & drop
- Preview de imagens
- Progress bar
- Retry em caso de erro

### Conveyor (/admin/esteira)

**Modo Esteira**:

- Aprovação rápida
- Classificação por IA
- Edição inline
- Atalhos de teclado

**Fluxo**:

1. Imagem aparece
2. IA sugere classificação
3. Admin aprova/edita
4. Próxima imagem

---

## 🤖 Respostas Rápidas

### AdminQuickReplies (/admin/respostas-rapidas)

**Gestão de Templates**:

- Lista de respostas
- Criar template
- Editar existente
- Categorizar
- Ativar/desativar

**Campos**:

- Título
- Conteúdo
- Categoria
- Atalho (opcional)
- Status

**Uso**:

- No chat de suporte
- Inserir com um clique
- Editar antes de enviar

---

## 📊 Analytics

### AdminAnalytics (/admin/analytics)

**Relatórios Disponíveis**:

- Vendas por período
- Novos usuários
- Taxa de conversão
- Produtos mais vendidos
- Métodos de pagamento
- Performance de coleções

**Filtros**:

- Período customizável
- Por produto/coleção
- Por método de pagamento
- Por região

**Exportação**:

- PDF
- Excel
- CSV

---

## ⚖️ Conformidade Legal

### LegalCompliance (/admin/legal)

**Gestão de Documentos**:

- Termos de uso
- Política de privacidade
- Política de cookies
- Termos de assinatura

**Funcionalidades**:

- Editor de texto rico
- Versionamento
- Histórico de mudanças
- Preview
- Publicação

---

## 📧 Templates de Comunicação

### CommunicationTemplates (/admin/templates)

**Gestão de Templates**:

- Templates de email
- Templates de notificação
- Templates de status
- Variáveis dinâmicas

**Tipos**:

- Boas-vindas
- Confirmação de pedido
- Status de produção
- Pagamento confirmado
- Envio realizado

**Variáveis Disponíveis**:

- `{nome_cliente}`
- `{numero_pedido}`
- `{data_entrega}`
- `{valor_total}`
- `{link_rastreamento}`

---

## 🔐 Permissões e Roles

### Sistema de Roles

**Roles Disponíveis**:

- `admin` - Acesso total
- `support` - Apenas suporte
- `production` - Apenas produção
- `user` - Cliente padrão

### Permissões por Role

**Admin**:

- ✅ Todos os acessos
- ✅ Gerenciar usuários
- ✅ Configurações do sistema
- ✅ Relatórios financeiros

**Support**:

- ✅ Chat e suporte
- ✅ Ver pedidos
- ✅ Criar orçamentos
- ❌ Configurações
- ❌ Relatórios financeiros

**Production**:

- ✅ Gestão de produção
- ✅ Upload de imagens
- ✅ Status de pedidos
- ❌ Configurações
- ❌ Gestão de usuários

---

## 🛡️ Segurança

### Proteções Implementadas

**Autenticação**:

- JWT tokens
- Session management
- Refresh tokens

**Autorização**:

- Row Level Security (RLS)
- Role-based access control
- Verificação em cada rota

**Auditoria**:

- Log de ações críticas
- Histórico de mudanças
- Rastreamento de usuário

---

## 🔧 Configurações do Sistema

### Configurações Disponíveis

**Gerais**:

- Nome da loja
- Logo
- Cores do tema
- Informações de contato

**Email**:

- Provedor (Resend/SendGrid)
- API Key
- Email de envio
- Templates

**Pagamentos**:

- Mercado Pago credentials
- Métodos ativos
- Taxas
- Parcelamento

**Produção**:

- Capacidade mensal
- Tempo de produção
- Fornecedores

---

## 📱 Responsividade

O painel admin é totalmente responsivo:

**Desktop** (> 1024px):

- Layout completo
- Sidebar fixa
- Múltiplas colunas

**Tablet** (768px - 1024px):

- Sidebar colapsável
- Layout adaptado
- Touch-friendly

**Mobile** (< 768px):

- Menu hamburguer
- Layout vertical
- Otimizado para touch

---

## ⌨️ Atalhos de Teclado

### Navegação

- `Ctrl + K` - Busca global
- `Ctrl + /` - Ajuda
- `Esc` - Fechar modal

### Chat

- `Ctrl + Enter` - Enviar mensagem
- `Ctrl + Shift + N` - Nova conversa
- `Ctrl + Shift + R` - Quick reply

### Esteira

- `→` - Próxima imagem
- `←` - Imagem anterior
- `A` - Aprovar
- `R` - Rejeitar
- `E` - Editar

---

## 🧪 Testes

### Checklist de Validação

**Acesso**:

- [ ] Admin consegue acessar todas as páginas
- [ ] Support tem acesso limitado
- [ ] User não acessa admin

**Funcionalidades**:

- [ ] CRUD de usuários funciona
- [ ] Chat em tempo real funciona
- [ ] Upload de imagens funciona
- [ ] Pagamentos são processados
- [ ] Relatórios são gerados

**Performance**:

- [ ] Páginas carregam < 2s
- [ ] Busca é rápida
- [ ] Sem travamentos

---

## 📚 Referências

### Código-Fonte

**Páginas**:

- `src/pages/admin/AdminHome.tsx`
- `src/pages/admin/AdminUsers.tsx`
- `src/pages/admin/AdminSupport.tsx`
- `src/pages/admin/AdminCollections.tsx`
- `src/pages/admin/AdminPayments.tsx`
- E mais 20+ páginas admin

**Componentes**:

- `src/components/admin/`
- `src/components/RequireAdmin.tsx`

**Serviços**:

- `src/lib/admin-payment-service.ts`
- `src/lib/roles.ts`
- `src/lib/permissions/`

---

## 🎯 Melhores Práticas

### Para Admins

1. **Revisar diariamente**:
   - Conversas de suporte
   - Pagamentos pendentes
   - Pedidos em produção

2. **Monitorar métricas**:
   - Taxa de conversão
   - Tempo de resposta
   - Satisfação do cliente

3. **Manter atualizado**:
   - Preços
   - Estoque
   - Templates

### Para Desenvolvimento

1. **Sempre verificar permissões**
2. **Logar ações críticas**
3. **Validar inputs**
4. **Testar em diferentes roles**

---

**Última atualização**: 2026-02-24  
**Versão**: 1.0.0  
**Status**: ✅ Produção
