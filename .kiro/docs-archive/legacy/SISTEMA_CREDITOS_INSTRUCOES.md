# 🎯 Sistema de Créditos - Instruções de Ativação

## 📋 Resumo

O sistema de créditos foi **completamente implementado** e está pronto para uso. Este documento contém as instruções para ativar o sistema no seu ambiente.

---

## ✅ O que foi feito

### 1. Migration do Supabase
- ✅ Criada migration completa: `20260507000000_create_subscription_credit_system.sql`
- ✅ 8 tabelas criadas com relacionamentos corretos
- ✅ RLS policies configuradas
- ✅ Triggers de updated_at
- ✅ Seed data com planos iniciais

### 2. Rotas Adicionadas
- ✅ `/admin/creditos/dashboard` - Dashboard de métricas
- ✅ `/admin/creditos/assinaturas` - Gerenciar assinaturas
- ✅ `/admin/creditos/personagens` - Catálogo de personagens
- ✅ `/admin/creditos/ciclos` - Ciclos de produção
- ✅ `/painel-creditos` - Painel do usuário
- ✅ `/catalogo-personagens` - Catálogo público

### 3. Sidebar do Admin
- ✅ Nova seção "Sistema de Créditos" adicionada
- ✅ 4 itens de menu configurados
- ✅ Ícones apropriados

---

## 🚀 Como Ativar

### Passo 1: Aplicar Migration

Execute o script PowerShell:

```powershell
.\aplicar-migration-creditos.ps1
```

**O que o script faz:**
1. Verifica se Supabase CLI está instalado
2. Verifica se você está autenticado
3. Verifica se o projeto está linkado
4. Aplica a migration no banco de dados

**Se der erro:**

#### Erro: "Supabase CLI não encontrado"
```powershell
npm install -g supabase
```

#### Erro: "Não está logado"
```powershell
supabase login
```

#### Erro: "Projeto não está linkado"
```powershell
supabase link --project-ref SEU_PROJECT_REF
```

Para encontrar seu PROJECT_REF:
1. Acesse https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em Settings → General
4. Copie o "Reference ID"

---

### Passo 2: Regenerar Tipos TypeScript

Após aplicar a migration, regenere os tipos:

```powershell
npm run generate-types
```

Ou manualmente:

```powershell
supabase gen types typescript --project-id SEU_PROJECT_REF > src/integrations/supabase/types.ts
```

---

### Passo 3: Verificar Instalação

1. **Acesse o Dashboard Admin:**
   - URL: `http://localhost:5173/admin/creditos/dashboard`
   - Você deve ver métricas zeradas (normal, ainda não há dados)

2. **Verifique a Sidebar:**
   - Deve aparecer a seção "Sistema de Créditos"
   - Com 4 itens de menu

3. **Teste o Catálogo:**
   - URL: `http://localhost:5173/catalogo-personagens`
   - Deve carregar (vazio, sem personagens ainda)

---

## 📊 Estrutura do Banco de Dados

### Tabelas Criadas

#### 1. `subscription_credit_plans`
Planos de assinatura disponíveis.

**Seed Data:**
- Trimestral: R$ 150/mês → 120 créditos (100 base + 20 bônus)
- Semestral: R$ 280/mês → 250 créditos (200 base + 50 bônus)

#### 2. `subscription_credit_subscriptions`
Assinaturas ativas dos usuários.

**Campos principais:**
- `user_id`: Referência ao usuário
- `plan_type`: trimestral | semestral
- `status`: active | expired | cancelled
- `auto_renew`: Renovação automática
- `pending_plan_change`: Mudança de plano pendente

#### 3. `subscription_credit_user_credits`
Saldo de créditos de cada usuário.

**Invariante garantida:**
```
available_credits = total_credits - used_credits
```

#### 4. `subscription_credit_transactions`
Histórico de todas as transações.

**Tipos:**
- `allocation`: Créditos alocados
- `debit_immediate`: Débito imediato (compra individual)
- `debit_cycle_close`: Débito no fechamento (pedido automático)
- `expiration`: Créditos expirados
- `adjustment`: Ajuste manual (admin)

#### 5. `subscription_credit_characters`
Catálogo de personagens para compra.

**Campos:**
- `price_cash`: Preço em dinheiro
- `price_credits`: Preço em créditos
- `is_exclusive_semestral`: Exclusivo para plano semestral
- `is_standard_collection`: Faz parte da coleção padrão

#### 6. `subscription_credit_production_cycles`
Ciclos de produção em lote.

**Status:**
- `open`: Aceitando pedidos
- `full`: Capacidade atingida
- `closed`: Fechado para produção

#### 7. `subscription_credit_orders`
Pedidos de personagens.

**Tipos:**
- `individual`: Débito imediato ao criar
- `automatic`: Débito no fechamento do ciclo

#### 8. `subscription_credit_order_items`
Personagens incluídos em cada pedido.

---

## 🔐 Segurança (RLS)

### Políticas Implementadas

**Usuários:**
- ✅ Veem apenas suas próprias assinaturas
- ✅ Veem apenas seus próprios créditos
- ✅ Veem apenas suas próprias transações
- ✅ Veem apenas seus próprios pedidos
- ✅ Podem criar pedidos
- ✅ Podem editar pedidos não travados

**Admins:**
- ✅ Veem tudo
- ✅ Podem gerenciar tudo
- ✅ Podem ajustar créditos manualmente

**Público:**
- ✅ Veem planos ativos
- ✅ Veem personagens ativos
- ✅ Veem ciclos de produção

---

## 🎨 Páginas Disponíveis

### Admin

#### 1. Dashboard (`/admin/creditos/dashboard`)
**Métricas exibidas:**
- Assinaturas (total, ativas, expiradas, canceladas)
- Créditos (alocados, usados, disponíveis, expirados)
- Ciclos de produção (abertos, fechados, capacidade)
- Receita (MRR estimado)
- Personagens (total, ativos, exclusivos)
- Pedidos (total, individuais, automáticos)

#### 2. Assinaturas (`/admin/creditos/assinaturas`)
**Funcionalidades:**
- Lista todas as assinaturas
- Filtros por status e plano
- Paginação
- Ajustar créditos manualmente
- Ver mudanças de plano pendentes

#### 3. Personagens (`/admin/creditos/personagens`)
**Funcionalidades:**
- Grid de personagens
- Criar novo personagem
- Editar personagem
- Desativar personagem (soft delete)
- Upload de imagem
- Definir preços (dinheiro e créditos)
- Marcar como exclusivo semestral

#### 4. Ciclos (`/admin/creditos/ciclos`)
**Funcionalidades:**
- Ver ciclo atual
- Criar novo ciclo
- Fechar ciclo manualmente
- Ver estatísticas do ciclo
- Monitorar capacidade

### Usuário

#### 1. Painel de Créditos (`/painel-creditos`)
**Seções:**
- Minha Assinatura (status, plano, renovação)
- Meus Créditos (saldo, histórico)
- Meu Pedido Automático (personagens adicionados)

#### 2. Catálogo (`/catalogo-personagens`)
**Funcionalidades:**
- Grid de personagens
- Filtros (disponíveis com meus créditos, exclusivos)
- Compra com créditos
- Barra de saldo no topo

---

## 🔄 Fluxo de Uso

### 1. Criar Personagens (Admin)
1. Acesse `/admin/creditos/personagens`
2. Clique em "Criar Personagem"
3. Preencha:
   - Nome
   - Descrição
   - Imagem URL
   - Preço em dinheiro
   - Preço em créditos
   - Exclusivo semestral? (checkbox)
4. Salve

### 2. Criar Ciclo de Produção (Admin)
1. Acesse `/admin/creditos/ciclos`
2. Clique em "Criar Ciclo"
3. Preencha:
   - Nome (ex: "Ciclo Janeiro 2026")
   - Capacidade máxima (ex: 100 pedidos)
   - Data de fechamento
4. Salve

### 3. Usuário Assina
1. Usuário acessa `/painel-creditos`
2. Clica em "Ver Planos"
3. Escolhe Trimestral ou Semestral
4. Realiza pagamento
5. Sistema aloca créditos automaticamente

### 4. Usuário Compra Personagem
1. Acessa `/catalogo-personagens`
2. Vê saldo de créditos no topo
3. Escolhe personagem
4. Clica "Comprar com X créditos"
5. Créditos são debitados imediatamente
6. Personagem é adicionado ao pedido do ciclo atual

### 5. Ciclo Fecha
1. Data de fechamento chega
2. Sistema debita créditos dos pedidos automáticos
3. Trava todos os pedidos
4. Inicia produção

---

## 🐛 Troubleshooting

### Erro: "Tabela não encontrada"
**Causa:** Migration não foi aplicada.
**Solução:** Execute `.\aplicar-migration-creditos.ps1`

### Erro: "Permission denied"
**Causa:** RLS policies não foram criadas.
**Solução:** Verifique se a migration foi aplicada completamente.

### Erro: "Tipos TypeScript desatualizados"
**Causa:** Tipos não foram regenerados após migration.
**Solução:** Execute `npm run generate-types`

### Páginas não aparecem na sidebar
**Causa:** Cache do navegador.
**Solução:** Limpe o cache ou force refresh (Ctrl+Shift+R)

### Dashboard mostra erro 404
**Causa:** Rotas não foram adicionadas ao App.tsx.
**Solução:** Verifique se as alterações no App.tsx foram salvas.

---

## 📝 Próximos Passos

Após ativar o sistema:

1. **Criar Personagens**
   - Adicione pelo menos 5-10 personagens no catálogo
   - Defina preços em créditos apropriados

2. **Criar Ciclo Inicial**
   - Crie o primeiro ciclo de produção
   - Defina capacidade realista

3. **Testar Fluxo Completo**
   - Crie uma assinatura de teste
   - Compre personagens
   - Verifique débito de créditos

4. **Configurar Webhooks**
   - Conecte webhook de pagamento
   - Ative assinaturas automaticamente

5. **Implementar Notificações**
   - Email quando créditos são alocados
   - Email quando ciclo está fechando
   - Email quando pedido é enviado

---

## 🎯 Diferenças do Sistema Tradicional

| Aspecto | Sistema Tradicional | Sistema de Créditos |
|---------|-------------------|-------------------|
| **Modelo** | Assinatura com entregas fixas | Assinatura com compra à la carte |
| **Pagamento** | Mensal por entrega | Mensal por créditos |
| **Escolha** | 1 personagem por mês | Quantos quiser (até acabar créditos) |
| **Produção** | Individual por entrega | Em lote por ciclo |
| **Flexibilidade** | Baixa | Alta |
| **Acumulação** | Não acumula | Créditos acumulam |

---

## ✅ Checklist de Ativação

- [ ] Migration aplicada com sucesso
- [ ] Tipos TypeScript regenerados
- [ ] Dashboard admin acessível
- [ ] Sidebar mostra "Sistema de Créditos"
- [ ] Catálogo de personagens carrega
- [ ] Painel do usuário carrega
- [ ] Pelo menos 1 personagem criado
- [ ] Pelo menos 1 ciclo criado
- [ ] Fluxo de compra testado

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs do console do navegador
2. Verifique os logs do Supabase
3. Consulte a documentação do Supabase: https://supabase.com/docs
4. Revise o arquivo `ANALISE_SISTEMA_CREDITOS.md` para detalhes técnicos

---

**Sistema pronto para produção após completar o checklist acima!** ✅
