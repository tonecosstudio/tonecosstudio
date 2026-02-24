# Sistema de Grupos Automáticos (SSOT)

## 📋 Visão Geral

Sistema de **Single Source of Truth** que cria e gerencia grupos automaticamente baseado em eventos do sistema. Os grupos são sincronizados em tempo real sem necessidade de intervenção manual.

---

## 🎯 Grupos Criados Automaticamente

### Grupos de Comunicação

#### 1. 🎉 Novos Membros
- **Quando é criado**: Já existe no sistema
- **Quem entra**: Todos os usuários cadastrados
- **Trigger**: Quando um novo usuário se cadastra
- **Sincronização**: Automática via trigger `trigger_add_new_user_to_welcome_group`

#### 2. 📢 Avisos Importantes
- **Quando é criado**: Já existe no sistema
- **Quem entra**: Todos os usuários (manual, admin decide)
- **Uso**: Comunicados críticos, manutenções, mudanças importantes
- **Sincronização**: Manual (admin adiciona/remove membros)

### Grupos de Assinantes

#### 3. ⭐ Assinantes
- **Quando é criado**: Já existe no sistema
- **Quem entra**: Usuários com assinatura ativa (qualquer coleção)
- **Trigger**: Quando uma assinatura é criada ou atualizada
- **Sincronização**: Automática via trigger `trigger_sync_groups_on_subscription`
- **Exclusão mútua**: Quem está aqui NÃO está em "Ex-Assinantes" ou "Usuários Free"

#### 4. ⏰ Assinaturas Expirando
- **Quando é criado**: Já existe no sistema
- **Quem entra**: Usuários com assinatura ativa que vence em até 7 dias
- **Uso**: Campanhas de retenção, lembretes de renovação
- **Sincronização**: Diária via `sync_segmentation_groups()`

#### 5. 🔄 Ex-Assinantes
- **Quando é criado**: Já existe no sistema
- **Quem entra**: Usuários que já tiveram assinatura mas não têm mais ativa
- **Uso**: Campanhas de reativação, ofertas especiais
- **Sincronização**: Automática via trigger + diária
- **Exclusão mútua**: Quem está aqui NÃO está em "Assinantes"

#### 6. 🆓 Usuários Free
- **Quando é criado**: Já existe no sistema
- **Quem entra**: Usuários que NUNCA tiveram assinatura
- **Uso**: Campanhas de conversão, onboarding
- **Sincronização**: Automática via trigger + diária
- **Exclusão mútua**: Quem está aqui NÃO está em "Assinantes" ou "Ex-Assinantes"

### Grupos por Coleção

#### 7. 📦 Grupos por Coleção
- **Quando é criado**: Automaticamente quando uma nova coleção é criada
- **Quem entra**: Assinantes daquela coleção específica
- **Trigger**: Quando uma coleção é criada (`trigger_create_group_for_collection`)
- **Sincronização**: Automática quando assinatura da coleção muda

---

## ⚙️ Como Funciona

### Fluxo de Eventos

```
┌─────────────────────┐
│ Novo Usuário        │
│ se Cadastra         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Trigger Automático  │
│ add_new_user_to_    │
│ welcome_group()     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Usuário Adicionado  │
│ ao Grupo            │
│ "Novos Membros"     │
└─────────────────────┘
```

```
┌─────────────────────┐
│ Nova Coleção        │
│ é Criada            │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Trigger Automático  │
│ create_group_for_   │
│ new_collection()    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Grupo Criado        │
│ "📦 [Nome Coleção]" │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Assinantes da       │
│ Coleção Adicionados │
└─────────────────────┘
```

```
┌─────────────────────┐
│ Assinatura Criada   │
│ ou Atualizada       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Trigger Automático  │
│ sync_groups_on_     │
│ subscription_change │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Usuário Adicionado  │
│ aos Grupos:         │
│ - Assinantes Geral  │
│ - Grupo da Coleção  │
└─────────────────────┘
```

---

## 🔧 Funções Disponíveis

### 1. `sync_automatic_group_members(group_id)`
Sincroniza membros de um grupo específico baseado em seus critérios.

```sql
SELECT sync_automatic_group_members('uuid-do-grupo');
```

### 2. `sync_all_automatic_groups()`
Sincroniza TODOS os grupos automáticos do sistema.

```sql
SELECT sync_all_automatic_groups();
```

### 3. `sync_segmentation_groups()`
Sincroniza apenas grupos de segmentação (Expirando, Ex-Assinantes, Free).
Deve ser executado diariamente via cron job.

```sql
SELECT sync_segmentation_groups();
```

### 4. `create_default_groups()`
Cria os grupos padrão do sistema (Novos Membros, Assinantes, Avisos, etc).

```sql
SELECT create_default_groups();
```

---

## 🎮 Interface de Administração

### Aba "Sincronização Automática"

Na página `/admin/grupos`, há uma aba dedicada que mostra:

- ✅ Status do sistema (ativo/inativo)
- 🔄 Botão para sincronização manual
- 📊 Lista de grupos gerenciados automaticamente
- ℹ️ Informações sobre quando usar sincronização manual

### Quando Usar Sincronização Manual?

- Após importação em massa de usuários
- Após correção de dados de assinaturas
- Se suspeitar de inconsistências nos grupos
- Após restaurar backup do banco de dados

---

## 🚀 Triggers Ativos

### 1. `trigger_add_new_user_to_welcome_group`
- **Tabela**: `auth.users`
- **Evento**: `AFTER INSERT`
- **Ação**: Adiciona usuário ao grupo "Novos Membros"

### 2. `trigger_create_group_for_collection`
- **Tabela**: `collections`
- **Evento**: `AFTER INSERT`
- **Ação**: Cria grupo para a nova coleção

### 3. `trigger_sync_groups_on_subscription`
- **Tabela**: `subscriptions`
- **Evento**: `AFTER INSERT OR UPDATE OF status`
- **Ação**: Sincroniza grupos de assinantes

---

## 📝 Exemplos de Uso

### Criar Nova Coleção
```sql
INSERT INTO collections (name, description)
VALUES ('Heróis Marvel', 'Coleção de heróis da Marvel');

-- Resultado: Grupo "📦 Heróis Marvel" criado automaticamente
```

### Novo Usuário se Cadastra
```sql
-- Usuário se cadastra via Supabase Auth
-- Resultado: Usuário adicionado automaticamente ao grupo "🎉 Novos Membros"
```

### Usuário Assina uma Coleção
```sql
INSERT INTO subscriptions (user_id, collection_id, status)
VALUES ('user-uuid', 'collection-uuid', 'active');

-- Resultado: 
-- 1. Usuário adicionado ao grupo "⭐ Assinantes"
-- 2. Usuário adicionado ao grupo "📦 [Nome da Coleção]"
```

### Assinatura Cancelada
```sql
UPDATE subscriptions 
SET status = 'canceled'
WHERE id = 'subscription-uuid';

-- Resultado:
-- 1. Usuário removido do grupo "⭐ Assinantes" (se não tiver outras assinaturas)
-- 2. Usuário removido do grupo da coleção específica
```

---

## 🔍 Monitoramento

### Ver Membros de um Grupo
```sql
SELECT 
  u.email,
  m.joined_at,
  m.last_viewed_at
FROM chat_group_members m
JOIN auth.users u ON u.id = m.user_id
WHERE m.group_id = 'uuid-do-grupo'
ORDER BY m.joined_at DESC;
```

### Ver Grupos Automáticos
```sql
SELECT 
  name,
  type,
  (SELECT COUNT(*) FROM chat_group_members WHERE group_id = g.id) as member_count
FROM chat_groups g
WHERE type IN ('assinantes', 'colecao', 'expirando', 'ex_assinantes', 'free')
AND deleted_at IS NULL
ORDER BY name;
```

### Ver Usuários por Segmento
```sql
-- Assinantes ativos
SELECT COUNT(*) FROM subscriptions WHERE status = 'active';

-- Assinaturas expirando (última/penúltima entrega nos próximos 7 dias)
SELECT COUNT(*) FROM subscriptions 
WHERE status = 'active' 
AND next_delivery_date BETWEEN NOW() AND (NOW() + INTERVAL '7 days')
AND deliveries_completed >= (deliveries_total - 1);

-- Ex-assinantes
SELECT COUNT(DISTINCT user_id) FROM subscriptions 
WHERE user_id NOT IN (SELECT user_id FROM subscriptions WHERE status = 'active');

-- Usuários free (nunca assinaram)
SELECT COUNT(*) FROM auth.users 
WHERE id NOT IN (SELECT DISTINCT user_id FROM subscriptions WHERE user_id IS NOT NULL);
```

---

## ⚠️ Importante

1. **Não delete grupos automáticos manualmente** - Use soft delete (deleted_at)
2. **Triggers são automáticos** - Não precisa chamar funções manualmente
3. **Sincronização é em tempo real** - Mudanças refletem imediatamente
4. **Grupos manuais não são afetados** - Apenas grupos automáticos são sincronizados
5. **Exclusão mútua entre grupos**:
   - Quem está em "Assinantes" NÃO está em "Ex-Assinantes" ou "Usuários Free"
   - Quem está em "Ex-Assinantes" NÃO está em "Assinantes"
   - Quem está em "Usuários Free" NUNCA teve assinatura
6. **Sincronização diária recomendada** - Execute `sync_segmentation_groups()` diariamente via cron

---

## 🐛 Troubleshooting

### Grupo não está sincronizando?
```sql
-- Verificar se o trigger está ativo
SELECT * FROM pg_trigger 
WHERE tgname LIKE '%group%';

-- Forçar sincronização manual
SELECT sync_all_automatic_groups();
```

### Usuário não foi adicionado ao grupo?
```sql
-- Verificar critérios do grupo
SELECT membership_criteria 
FROM chat_groups 
WHERE id = 'uuid-do-grupo';

-- Verificar assinaturas do usuário
SELECT * FROM subscriptions 
WHERE user_id = 'uuid-do-usuario';
```

---

## 📚 Arquivos Relacionados

- **Migration**: `supabase/migrations/20260224060000_automatic_groups_system.sql`
- **Componente Admin**: `src/components/groups/AutomaticGroupsManager.tsx`
- **Página Admin**: `src/pages/admin/AdminGroupsPage.tsx`
