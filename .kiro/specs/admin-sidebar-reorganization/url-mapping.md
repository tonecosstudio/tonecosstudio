# Mapeamento de URLs - Antiga → Nova

**Data**: 2026-03-01  
**Spec**: admin-sidebar-reorganization  
**Tarefa**: 1.5

## Resumo Executivo

Este documento mapeia todas as mudanças de URL planejadas para a reorganização administrativa, incluindo:
- URLs mantidas sem mudança
- URLs consolidadas em novas páginas
- URLs com redirects
- URLs de páginas órfãs resolvidas

**Total de URLs mapeadas**: 35 URLs

## Legenda de Status

- ✅ **Mantida**: URL permanece inalterada
- 🔄 **Redirect**: URL antiga redireciona para nova
- 🆕 **Nova**: URL nova criada
- ❌ **Removida**: URL será removida (página obsoleta)
- 🔗 **Consolidada**: URL integrada em outra página

---

## Mapeamento Completo

### Visão Geral

| # | URL Antiga | URL Nova | Status | Tipo |
|---|------------|----------|--------|------|
| 1 | `/admin` | `/admin` | ✅ Mantida | Dashboard |
| 2 | `/admin/analytics` | `/admin/analytics` | ✅ Mantida | Analytics |

---

### Operações (Vendas, Pré-vendas, Assinaturas, Ciclos)

| # | URL Antiga | URL Nova | Status | Tipo |
|---|------------|----------|--------|------|
| 3 | `/admin/orcamentos` | `/admin/orcamentos` | ✅ Mantida | Orçamentos |
| 4 | `/admin/pre-vendas` | `/admin/pre-vendas` | ✅ Mantida | Pré-vendas |
| 5 | `/admin/assinaturas` | `/admin/assinaturas` | ✅ Mantida | Assinaturas |
| 6 | `/admin/ciclos` | `/admin/ciclos` | ✅ Mantida | Ciclos |
| 7 | `/admin/entregas` | `/admin/entregas` | ✅ Mantida | Entregas |
| 8 | `/admin/capacidade` | `/admin/capacidade` | ✅ Mantida | Capacidade |
| 9 | `/admin/auditoria` | `/admin/auditoria` | ✅ Mantida | Auditoria |
| 10 | `/admin/pecas-bonus` | `/admin/ciclos?tab=bonus` | 🔄 Redirect | Consolidação |

---

### Catálogo (Produtos, Modelos, Coleções)

| # | URL Antiga | URL Nova | Status | Tipo |
|---|------------|----------|--------|------|
| 11 | `/admin/upload` | `/admin/upload` | ✅ Mantida | Upload |
| 12 | `/admin/esteira` | `/admin/esteira` | ✅ Mantida | Esteira |
| 13 | `/admin/modelos` | `/admin/modelos-franquias?tab=models` | 🔄 Redirect | Consolidação |
| 14 | `/admin/franquias` | `/admin/modelos-franquias?tab=franchises` | 🔄 Redirect | Consolidação |
| 15 | N/A | `/admin/modelos-franquias` | 🆕 Nova | Consolidação |
| 16 | `/admin/colecoes` | `/admin/colecoes` | ✅ Mantida | Coleções |
| 17 | `/admin/gerenciar-colecoes` | `/admin/colecoes` | 🔄 Redirect | Duplicação |
| 18 | `/admin/embalagem` | `/admin/embalagem` | ✅ Mantida | Embalagem |

---

### Financeiro & Marketing

| # | URL Antiga | URL Nova | Status | Tipo |
|---|------------|----------|--------|------|
| 19 | `/admin/precos` | `/admin/precos-planos?tab=pricing` | 🔄 Redirect | Consolidação |
| 20 | `/admin/planos` | `/admin/precos-planos?tab=plans` | 🔄 Redirect | Consolidação |
| 21 | N/A | `/admin/precos-planos` | 🆕 Nova | Consolidação |
| 22 | `/admin/pagamentos` | `/admin/pagamentos` | ✅ Mantida | Hub Pagamentos |
| 23 | `/admin/financeiro` | `/admin/financeiro` | ✅ Mantida | Análise Financeira |
| 24 | `/admin/cupons` | `/admin/cupons` | ✅ Mantida | Cupons |
| 25 | `/admin/chaves-pagamento` | `/admin/chaves-pagamento` | ✅ Mantida | Chaves Pagamento |

---

### Usuários & Comunicação

| # | URL Antiga | URL Nova | Status | Tipo |
|---|------------|----------|--------|------|
| 26 | `/admin/users` | `/admin/usuarios` | 🔄 Redirect | Padronização PT |
| 27 | `/admin/users/:userId` | `/admin/usuarios/:userId` | 🔄 Redirect | Padronização PT |
| 28 | N/A | `/admin/usuarios` | 🆕 Nova | Padronização PT |
| 29 | `/admin/comunicacao` | `/admin/comunicacao` | ✅ Mantida | Comunicação |
| 30 | `/admin/grupos/:groupId` | `/admin/grupos/:groupId` | ✅ Mantida | Detalhes Grupo |

---

### Configurações

| # | URL Antiga | URL Nova | Status | Tipo |
|---|------------|----------|--------|------|
| 31 | `/admin/configuracoes` | `/admin/configuracoes` | ✅ Mantida | Configurações |
| 32 | `/admin/notificacoes` | `/admin/notificacoes` | ✅ Mantida | Notificações |
| 33 | `/admin/notificacoes/historico` | `/admin/notificacoes/historico` | ✅ Mantida | Histórico |
| 34 | N/A | `/admin/feriados` | 🆕 Nova | Página Órfã |

---

### Redirects de Compatibilidade (Mantidos)

| # | URL Antiga | URL Nova | Motivo | Expiração |
|---|------------|----------|--------|-----------|
| 35 | `/admin/payments` | `/admin/pagamentos?tab=payments` | Migração PT/EN | 2025-12-31 |
| 36 | `/admin/configuracoes-sistema` | `/admin/configuracoes?tab=general` | Consolidação | Permanente |
| 37 | `/admin/configuracoes-conteudo` | `/admin/configuracoes?tab=content` | Consolidação | Permanente |
| 38 | `/admin/limite-producao` | `/admin/configuracoes?tab=production` | Consolidação | Permanente |
| 39 | `/admin/conformidade-legal` | `/admin/configuracoes?tab=legal` | Consolidação | Permanente |
| 40 | `/admin/metodos-pagamento` | `/admin/pagamentos?tab=methods` | Consolidação | Permanente |
| 41 | `/admin/suporte` | `/admin/comunicacao?tab=support` | Consolidação | Permanente |
| 42 | `/admin/grupos` | `/admin/comunicacao?tab=groups` | Consolidação | Permanente |
| 43 | `/admin/respostas-rapidas` | `/admin/comunicacao?tab=quick-replies` | Consolidação | Permanente |
| 44 | `/admin/templates-comunicacao` | `/admin/comunicacao?tab=templates` | Consolidação | Permanente |

---

### Páginas Órfãs Resolvidas

| # | Página | URL Nova | Resolução | Status |
|---|--------|----------|-----------|--------|
| 45 | AdminHolidayManager | `/admin/feriados` | Adicionar rota | 🆕 Nova |
| 46 | PaymentVerification | `/admin/pagamentos?tab=verification` | Integrar ao Hub | 🔗 Consolidada |
| 47 | StandalonePurchases | `/admin/orcamentos` (filtro) | Integrar a Orçamentos | 🔗 Consolidada |

---

### Páginas Obsoletas (Sem URL)

| # | Página | Status | Substituta |
|---|--------|--------|------------|
| 48 | AdminPayments | ❌ Removida | AdminPaymentHub |
| 49 | AdminSupport | ❌ Removida | AdminCommunication |
| 50 | AdminSystemSettings | ❌ Removida | AdminSettings (aba) |
| 51 | AdminContentSettings | ❌ Removida | AdminSettings (aba) |
| 52 | AdminProductionLimit | ❌ Removida | AdminSettings (aba) |
| 53 | LegalCompliance | ❌ Removida | AdminSettings (aba) |
| 54 | PaymentCalculator | ❌ Removida | AdminPaymentHub (aba) |
| 55 | AdminPaymentMethods | ❌ Removida | AdminPaymentHub (aba) |
| 56 | AdminQuickReplies | ❌ Removida | AdminCommunication (aba) |
| 57 | CommunicationTemplates | ❌ Removida | AdminCommunication (aba) |
| 58 | AdminGroupsPage | ❌ Removida | AdminCommunication (aba) |

---

## Mapeamento por Seção do Menu

### Seção 1: Visão Geral

| Item Menu | URL | Mudança |
|-----------|-----|---------|
| Dashboard | `/admin` | Nenhuma |
| Analytics | `/admin/analytics` | Nenhuma |

---

### Seção 2: Operações

| Item Menu | URL | Mudança |
|-----------|-----|---------|
| Orçamentos | `/admin/orcamentos` | Nenhuma |
| Pré-vendas | `/admin/pre-vendas` | Nenhuma |
| Assinaturas | `/admin/assinaturas` | Nenhuma |
| Dashboard de Ciclos | `/admin/ciclos` | Nenhuma |
| Gerenciar Entregas | `/admin/entregas` | Nenhuma |
| Gerenciar Capacidade | `/admin/capacidade` | Nenhuma |
| Trilha de Auditoria | `/admin/auditoria` | Nenhuma |

**Nota**: Peças Bônus consolidada em Ciclos (aba)

---

### Seção 3: Catálogo

| Item Menu | URL | Mudança |
|-----------|-----|---------|
| Upload Massivo | `/admin/upload` | Nenhuma |
| Modo Esteira | `/admin/esteira` | Nenhuma |
| Modelos & Franquias | `/admin/modelos-franquias` | 🆕 Nova (consolidação) |
| Coleções & Personagens | `/admin/colecoes` | Nenhuma |
| Embalagem | `/admin/embalagem` | Nenhuma |

**Mudanças**:
- `/admin/modelos` → `/admin/modelos-franquias?tab=models`
- `/admin/franquias` → `/admin/modelos-franquias?tab=franchises`
- `/admin/gerenciar-colecoes` → `/admin/colecoes`

---

### Seção 4: Financeiro & Marketing

| Item Menu | URL | Mudança |
|-----------|-----|---------|
| Preços & Planos | `/admin/precos-planos` | 🆕 Nova (consolidação) |
| Hub de Pagamentos | `/admin/pagamentos` | Nenhuma |
| Análise Financeira | `/admin/financeiro` | Nenhuma |
| Cupons | `/admin/cupons` | Nenhuma |

**Mudanças**:
- `/admin/precos` → `/admin/precos-planos?tab=pricing`
- `/admin/planos` → `/admin/precos-planos?tab=plans`

---

### Seção 5: Usuários & Comunicação

| Item Menu | URL | Mudança |
|-----------|-----|---------|
| Gerenciar Usuários | `/admin/usuarios` | 🆕 Nova (padronização PT) |
| Central de Comunicação | `/admin/comunicacao` | Nenhuma |

**Mudanças**:
- `/admin/users` → `/admin/usuarios`

---

### Seção 6: Configurações

| Item Menu | URL | Mudança |
|-----------|-----|---------|
| Configurações do Sistema | `/admin/configuracoes` | Nenhuma |
| Feriados | `/admin/feriados` | 🆕 Nova (página órfã) |

---

## Impacto de Mudanças

### URLs Mantidas (Sem Mudança): 20

Estas URLs não sofrem alteração e continuam funcionando normalmente:
- `/admin`, `/admin/analytics`
- `/admin/orcamentos`, `/admin/pre-vendas`, `/admin/assinaturas`
- `/admin/ciclos`, `/admin/entregas`, `/admin/capacidade`, `/admin/auditoria`
- `/admin/upload`, `/admin/esteira`, `/admin/colecoes`, `/admin/embalagem`
- `/admin/pagamentos`, `/admin/financeiro`, `/admin/cupons`, `/admin/chaves-pagamento`
- `/admin/comunicacao`, `/admin/grupos/:groupId`
- `/admin/configuracoes`, `/admin/notificacoes`, `/admin/notificacoes/historico`

**Impacto**: Nenhum - Usuários não percebem mudança

---

### URLs com Redirect (Compatibilidade): 14

Estas URLs antigas redirecionam para novas URLs:
- `/admin/pecas-bonus` → `/admin/ciclos?tab=bonus`
- `/admin/modelos` → `/admin/modelos-franquias?tab=models`
- `/admin/franquias` → `/admin/modelos-franquias?tab=franchises`
- `/admin/gerenciar-colecoes` → `/admin/colecoes`
- `/admin/precos` → `/admin/precos-planos?tab=pricing`
- `/admin/planos` → `/admin/precos-planos?tab=plans`
- `/admin/users` → `/admin/usuarios`
- `/admin/payments` → `/admin/pagamentos?tab=payments`
- `/admin/configuracoes-sistema` → `/admin/configuracoes?tab=general`
- `/admin/configuracoes-conteudo` → `/admin/configuracoes?tab=content`
- `/admin/limite-producao` → `/admin/configuracoes?tab=production`
- `/admin/conformidade-legal` → `/admin/configuracoes?tab=legal`
- `/admin/metodos-pagamento` → `/admin/pagamentos?tab=methods`
- `/admin/suporte` → `/admin/comunicacao?tab=support`

**Impacto**: Baixo - Redirects automáticos mantêm compatibilidade

---

### URLs Novas Criadas: 4

Estas URLs são criadas para consolidações e páginas órfãs:
- `/admin/modelos-franquias` (consolidação)
- `/admin/precos-planos` (consolidação)
- `/admin/usuarios` (padronização)
- `/admin/feriados` (página órfã)

**Impacto**: Positivo - Melhor organização

---

### URLs Removidas (Páginas Obsoletas): 11

Estas páginas não têm mais URLs (foram consolidadas):
- AdminPayments, AdminSupport
- AdminSystemSettings, AdminContentSettings, AdminProductionLimit, LegalCompliance
- PaymentCalculator, AdminPaymentMethods
- AdminQuickReplies, CommunicationTemplates, AdminGroupsPage

**Impacto**: Nenhum - Funcionalidade preservada em outras páginas

---

## Guia de Migração para Usuários

### Se você tinha favorito em:

**`/admin/modelos`** → Agora é `/admin/modelos-franquias` (aba Modelos)  
**`/admin/franquias`** → Agora é `/admin/modelos-franquias` (aba Franquias)  
**`/admin/precos`** → Agora é `/admin/precos-planos` (aba Preços)  
**`/admin/planos`** → Agora é `/admin/precos-planos` (aba Planos)  
**`/admin/users`** → Agora é `/admin/usuarios`  
**`/admin/pecas-bonus`** → Agora é `/admin/ciclos` (aba Peças Bônus)  
**`/admin/gerenciar-colecoes`** → Agora é `/admin/colecoes`

**Nota**: Todos os favoritos antigos continuam funcionando com redirect automático!

---

## Checklist de Implementação

### Fase 1: Criar Novas URLs
- [ ] Criar rota `/admin/modelos-franquias`
- [ ] Criar rota `/admin/precos-planos`
- [ ] Criar rota `/admin/usuarios`
- [ ] Criar rota `/admin/feriados`

### Fase 2: Implementar Redirects
- [ ] Redirect `/admin/modelos` → `/admin/modelos-franquias?tab=models`
- [ ] Redirect `/admin/franquias` → `/admin/modelos-franquias?tab=franchises`
- [ ] Redirect `/admin/precos` → `/admin/precos-planos?tab=pricing`
- [ ] Redirect `/admin/planos` → `/admin/precos-planos?tab=plans`
- [ ] Redirect `/admin/users` → `/admin/usuarios`
- [ ] Redirect `/admin/pecas-bonus` → `/admin/ciclos?tab=bonus`
- [ ] Redirect `/admin/gerenciar-colecoes` → `/admin/colecoes`

### Fase 3: Atualizar Menu
- [ ] Atualizar item "Modelos" → "Modelos & Franquias"
- [ ] Remover item "Franquias" (consolidado)
- [ ] Atualizar item "Preços" → "Preços & Planos"
- [ ] Remover item "Planos" (consolidado)
- [ ] Atualizar item "Lista de Usuários" → "Gerenciar Usuários"
- [ ] Adicionar item "Feriados" em Configurações
- [ ] Remover item "Peças Bônus" (consolidado em Ciclos)
- [ ] Remover item "Gerenciar Coleções" (duplicado)

### Fase 4: Remover Páginas Obsoletas
- [ ] Remover 11 páginas obsoletas
- [ ] Remover imports
- [ ] Remover rotas antigas

### Fase 5: Documentação
- [ ] Atualizar documentação de usuário
- [ ] Criar guia de migração
- [ ] Atualizar README

---

## Próximos Passos

1. ✅ Fase 1 completa: Preparação e Análise
2. ⏳ Fase 2: Configuração de Navegação (Tarefa 2.1-2.4)
3. ⏳ Fase 3: Atualização de Componentes (Tarefa 3.1-3.9)
4. ⏳ Fase 4: Remoção de Código Obsoleto (Tarefa 5.1-5.6)
