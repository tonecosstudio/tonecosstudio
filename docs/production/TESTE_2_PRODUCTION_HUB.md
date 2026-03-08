# 🧪 TESTE 2: PRODUCTION HUB DISPLAY

**Data**: 2026-03-08  
**Objetivo**: Verificar se os itens aparecem corretamente no ProductionHub

---

## 📋 PRÉ-REQUISITOS

- ✅ Teste 1 concluído (item criado na production_queue)
- ✅ Aplicação rodando localmente ou em produção

---

## 🔍 PARTE A: VERIFICAÇÃO SQL

### Passo 1: Executar Script de Diagnóstico

1. Abra o Supabase Studio SQL Editor
2. Execute o script: `scripts/diagnostics/teste-production-hub.sql`

### Resultados Esperados:

#### 1. TODOS_OS_ITENS
```
tipo: TODOS_OS_ITENS
total: 2 (ou mais)
```

#### 2. LISTA_DETALHADA
Deve mostrar todos os itens com:
- `order_type`: 'manual_payment', 'subscription_delivery', etc.
- `customer_name`: preenchido
- `collection_name`: preenchido
- `production_status`: 'awaiting_choice', 'ready_for_production', etc.
- `current_stage`: 'awaiting_choice', 'design', etc.

#### 3. MANUAL_PAYMENT_ITEMS
Deve mostrar pelo menos 1 item:
- `order_type`: 'manual_payment'
- `collection_name`: 'Naruto - Akatsuki'
- `production_status`: 'awaiting_choice'
- `choice_status`: 'pending'
- `choice_deadline`: data futura (7 dias)

#### 4. RLS_POLICIES
Deve mostrar as políticas de RLS da tabela `production_queue`

#### 5. RLS_STATUS
```
rls_enabled: true ou false
```

---

## 🖥️ PARTE B: VERIFICAÇÃO NA INTERFACE

### Passo 1: Acessar ProductionHub

1. Abra a aplicação
2. Faça login como admin
3. Navegue para: `/admin/production` ou clique em "Produção" no menu admin

### Passo 2: Verificar Visualização Kanban

**O que verificar:**
- ✅ Coluna "Aguardando Escolha" deve ter pelo menos 1 card
- ✅ Card deve mostrar:
  - Nome do cliente
  - Nome da coleção ("Naruto - Akatsuki")
  - Badge de status
  - Prazo de escolha (se aplicável)

**Captura de tela**: Tire uma captura da tela do Kanban

### Passo 3: Verificar Visualização Lista

1. Clique na aba "Lista"

**O que verificar:**
- ✅ Tabela deve mostrar todos os itens
- ✅ Colunas visíveis:
  - Cliente
  - Coleção
  - Status
  - Estágio
  - Prioridade
  - Data de criação
- ✅ Item de manual_payment deve estar na lista

**Captura de tela**: Tire uma captura da tela da Lista

### Passo 4: Verificar Filtros

1. Teste filtro por status: "Aguardando Escolha"
2. Teste filtro por tipo: "Manual Payment"
3. Teste busca por nome do cliente

**O que verificar:**
- ✅ Filtros funcionam corretamente
- ✅ Item aparece/desaparece conforme filtro
- ✅ Busca encontra o item

### Passo 5: Verificar Detalhes do Item

1. Clique em um item (card ou linha da tabela)
2. Painel lateral deve abrir

**O que verificar:**
- ✅ Painel lateral abre
- ✅ Mostra todos os detalhes:
  - ID do pedido
  - Tipo de pedido
  - Cliente
  - Coleção
  - Status de produção
  - Estágio atual
  - Prioridade
  - Datas
- ✅ Botões de ação disponíveis

---

## ❌ PROBLEMAS POSSÍVEIS

### Problema 1: Nenhum item aparece

**Possíveis causas:**
1. RLS bloqueando acesso
2. Query com erro
3. Dados não sincronizados

**Diagnóstico:**
```sql
-- Verificar se há dados
SELECT COUNT(*) FROM production_queue;

-- Verificar RLS
SELECT tablename, rowsecurity FROM pg_tables 
WHERE tablename = 'production_queue';

-- Testar query como admin
SET ROLE authenticated;
SELECT * FROM production_queue LIMIT 5;
```

### Problema 2: Item aparece no SQL mas não na interface

**Possíveis causas:**
1. Cache do React Query
2. Filtros aplicados por padrão
3. Erro no transform dos dados

**Solução:**
1. Abrir DevTools (F12)
2. Ir para Network tab
3. Recarregar página
4. Verificar request para `/rest/v1/production_queue`
5. Ver resposta da API

### Problema 3: Erro ao carregar dados

**Diagnóstico:**
1. Abrir Console do navegador (F12)
2. Procurar por erros em vermelho
3. Verificar mensagem de erro

**Soluções comuns:**
- Erro 401: Problema de autenticação
- Erro 403: Problema de permissão (RLS)
- Erro 500: Problema no servidor

---

## ✅ CRITÉRIOS DE SUCESSO

O teste passa se:

1. ✅ SQL retorna pelo menos 1 item de manual_payment
2. ✅ Item aparece no Kanban (coluna "Aguardando Escolha")
3. ✅ Item aparece na Lista
4. ✅ Filtros funcionam corretamente
5. ✅ Detalhes do item são exibidos ao clicar
6. ✅ Sem erros no console

---

## 📝 RELATÓRIO

Após executar o teste, documente:

### SQL
- [ ] Quantos itens na fila?
- [ ] Quantos manual_payment?
- [ ] RLS está habilitado?

### Interface
- [ ] Itens aparecem no Kanban?
- [ ] Itens aparecem na Lista?
- [ ] Filtros funcionam?
- [ ] Detalhes abrem corretamente?

### Erros
- [ ] Algum erro no console?
- [ ] Algum erro na Network tab?
- [ ] Alguma funcionalidade não funciona?

---

## 🔄 PRÓXIMOS PASSOS

Se o teste passar:
- ✅ Marcar Teste 2 como concluído
- ⏳ Continuar para Teste 3 (Character Choice Flow)

Se o teste falhar:
- ❌ Documentar erro completo
- ❌ Executar diagnóstico
- ❌ Corrigir problema profissionalmente

---

**Criado por**: Kiro AI  
**Data**: 2026-03-08  
**Status**: ⏳ AGUARDANDO EXECUÇÃO

