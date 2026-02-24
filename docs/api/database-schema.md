# 🗄️ Database Schema - Ordax

Documentação completa do esquema do banco de dados PostgreSQL (Supabase).

---

## 📋 Visão Geral

O banco de dados usa PostgreSQL 15 com extensões do Supabase, incluindo Row Level Security (RLS), triggers e funções customizadas.

### Extensões Habilitadas
- `pg_trgm` - Busca fuzzy/trigram
- `uuid-ossp` - Geração de UUIDs
- `pgcrypto` - Criptografia

---

## 👤 Autenticação e Usuários

### auth.users (Supabase Auth)

Tabela gerenciada pelo Supabase Auth.

**Campos Principais**:
- `id` (uuid) - PK
- `email` (text)
- `encrypted_password` (text)
- `email_confirmed_at` (timestamp)
- `last_sign_in_at` (timestamp)
- `created_at` (timestamp)

### profiles

Perfis de usuário (1:1 com auth.users).

```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  full_name text,
  phone text,
  whatsapp text,
  cpf text,
  birth_date date,
  
  address_street text,
  address_number text,
  address_complement text,
  address_neighborhood text,
  address_city text,
  address_state text,
  address_zip text,
  
  profile_completion integer DEFAULT 0,
  last_activity timestamptz
);
```

**Índices**:
- `idx_profiles_email` ON email
- `idx_profiles_full_name` ON full_name

**RLS**: Usuários veem apenas seu próprio perfil, admins veem todos.

### user_roles

Roles/permissões de usuários.

```sql
CREATE TYPE app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
```

**Roles Disponíveis**:
- `admin` - Acesso total
- `moderator` - Acesso limitado
- `user` - Cliente padrão

---

## 📦 Catálogo e Produtos

### characters (models)

Personagens/modelos do catálogo.

```sql
CREATE TABLE characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  
  name text NOT NULL,
  franchise_id uuid REFERENCES franchises(id),
  collection_id uuid REFERENCES collections(id),
  
  image_bucket text DEFAULT 'product-images',
  image_path text NOT NULL,
  
  status text DEFAULT 'available',
  release_month text,
  
  tags text[] DEFAULT '{}',
  description text
);
```

**Índices**:
- `idx_characters_franchise` ON franchise_id
- `idx_characters_collection` ON collection_id
- `idx_characters_name` ON name (trigram)

### franchises

Franquias (Marvel, DC, etc).

```sql
CREATE TABLE franchises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  
  canonical text NOT NULL UNIQUE,
  aliases text[] DEFAULT '{}',
  logo_url text,
  description text
);
```

### collections

Coleções de personagens.

```sql
CREATE TABLE collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  
  -- Preços
  price_full numeric(10,2) DEFAULT 500.00,
  price_pix numeric(10,2) DEFAULT 475.00,
  deposit_amount numeric(10,2) DEFAULT 100.00,
  is_price_custom boolean DEFAULT false,
  
  -- Custos (análise financeira)
  cost_material numeric(10,2),
  cost_labor numeric(10,2),
  cost_packaging numeric(10,2),
  cost_shipping numeric(10,2),
  cost_other numeric(10,2),
  
  -- Produção
  production_limit integer,
  production_start_date date,
  
  status text DEFAULT 'active',
  image_url text
);
```

**Índices**:
- `idx_collections_slug` ON slug
- `idx_collections_status` ON status

---

## 💰 Pagamentos e Assinaturas

### subscription_plans

Planos de assinatura.

```sql
CREATE TABLE subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  
  price numeric(10,2) NOT NULL,
  billing_cycle text NOT NULL, -- 'monthly', 'quarterly', 'semiannual'
  
  characters_count integer NOT NULL,
  bonus_characters integer DEFAULT 0,
  
  installments_max integer DEFAULT 10,
  
  is_active boolean DEFAULT true
);
```

### subscriptions

Assinaturas ativas.

```sql
CREATE TABLE subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES subscription_plans(id),
  collection_id uuid REFERENCES collections(id),
  
  status text DEFAULT 'active', -- 'active', 'paused', 'cancelled'
  
  start_date date NOT NULL,
  next_billing_date date,
  end_date date,
  
  payment_method text,
  
  characters_received integer DEFAULT 0,
  characters_total integer NOT NULL
);
```

**Índices**:
- `idx_subscriptions_user` ON user_id
- `idx_subscriptions_status` ON status

### payment_methods

Métodos de pagamento disponíveis.

```sql
CREATE TABLE payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  
  name text NOT NULL,
  type text NOT NULL, -- 'pix', 'credit_card', 'bank_slip', 'manual'
  
  is_active boolean DEFAULT true,
  installments_max integer DEFAULT 1,
  has_interest boolean DEFAULT false,
  discount_percentage numeric(5,2) DEFAULT 0,
  
  display_order integer DEFAULT 0
);
```

### manual_payment_links

Links de pagamento manual.

```sql
CREATE TABLE manual_payment_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  
  user_id uuid REFERENCES auth.users(id),
  subscription_id uuid REFERENCES subscriptions(id),
  
  amount numeric(10,2) NOT NULL,
  payment_method text NOT NULL,
  
  status text DEFAULT 'pending', -- 'pending', 'paid', 'expired'
  
  expires_at timestamptz,
  paid_at timestamptz,
  
  notes text
);
```

---

## 💬 Chat e Suporte

### support_conversations

Conversas de suporte.

```sql
CREATE TABLE support_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  
  subject text NOT NULL,
  status text DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
  priority text DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  
  tags text[] DEFAULT '{}',
  risk_flags text[] DEFAULT '{}',
  
  promised_date timestamptz,
  last_message_at timestamptz,
  
  unread_count_user integer DEFAULT 0,
  unread_count_admin integer DEFAULT 0
);
```

**Índices**:
- `idx_conversations_user` ON user_id
- `idx_conversations_status` ON status
- `idx_conversations_last_message` ON last_message_at

### support_messages

Mensagens de chat.

```sql
CREATE TABLE support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  conversation_id uuid REFERENCES support_conversations(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id),
  
  content text NOT NULL,
  is_internal_note boolean DEFAULT false,
  is_deleted boolean DEFAULT false,
  
  read_at timestamptz
);
```

**Índices**:
- `idx_messages_conversation` ON conversation_id
- `idx_messages_created_at` ON created_at

### support_attachments

Anexos de mensagens.

```sql
CREATE TABLE support_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  
  message_id uuid REFERENCES support_messages(id) ON DELETE CASCADE,
  
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer,
  mime_type text,
  
  thumbnail_path text
);
```

### quick_replies

Respostas rápidas (templates).

```sql
CREATE TABLE quick_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  
  title text NOT NULL,
  content text NOT NULL,
  category text,
  
  is_active boolean DEFAULT true
);
```

---

## 👥 Grupos de Comunicação

### chat_groups

Grupos de comunicação.

```sql
CREATE TABLE chat_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  name text NOT NULL,
  description text,
  
  type text NOT NULL, -- 'manual', 'assinantes', 'colecao', 'lancamentos', 'pedidos'
  membership_criteria jsonb,
  
  is_active boolean DEFAULT true,
  deleted_at timestamptz
);
```

**Tipos de Grupo**:
- `manual` - Membros adicionados manualmente
- `assinantes` - Assinantes ativos
- `colecao` - Assinantes de coleção específica
- `lancamentos` - Novos lançamentos
- `pedidos` - Por status de pedido

### chat_group_members

Membros dos grupos.

```sql
CREATE TABLE chat_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  
  group_id uuid REFERENCES chat_groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  
  UNIQUE(group_id, user_id)
);
```

**Índices**:
- `idx_group_members_group` ON group_id
- `idx_group_members_user` ON user_id

### chat_group_messages

Mensagens de grupo.

```sql
CREATE TABLE chat_group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  
  group_id uuid REFERENCES chat_groups(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id),
  
  content text NOT NULL,
  
  is_deleted boolean DEFAULT false
);
```

---

## 📋 Orçamentos e Pedidos

### quotes

Orçamentos solicitados.

```sql
CREATE TABLE quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  user_id uuid REFERENCES auth.users(id),
  
  status text DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  
  notes text,
  admin_notes text,
  
  total_amount numeric(10,2),
  
  is_preorder boolean DEFAULT false
);
```

### quote_items

Itens do orçamento.

```sql
CREATE TABLE quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  
  quote_id uuid REFERENCES quotes(id) ON DELETE CASCADE,
  character_id uuid REFERENCES characters(id),
  
  quantity integer DEFAULT 1,
  unit_price numeric(10,2),
  
  notes text
);
```

### preorders

Pré-pedidos.

```sql
CREATE TABLE preorders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  
  user_id uuid REFERENCES auth.users(id),
  collection_id uuid REFERENCES collections(id),
  
  status text DEFAULT 'pending',
  
  amount_paid numeric(10,2) DEFAULT 0,
  amount_total numeric(10,2) NOT NULL,
  
  production_stage text
);
```

---

## 🎁 Wishlist e Likes

### likes

Curtidas em personagens.

```sql
CREATE TABLE likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  character_id uuid REFERENCES characters(id) ON DELETE CASCADE,
  
  UNIQUE(user_id, character_id)
);
```

### wishlist

Lista de desejos.

```sql
CREATE TABLE wishlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  character_id uuid REFERENCES characters(id) ON DELETE CASCADE,
  
  priority integer DEFAULT 0,
  notes text,
  
  UNIQUE(user_id, character_id)
);
```

---

## 🎫 Cupons e Notificações

### coupons

Cupons de desconto.

```sql
CREATE TABLE coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  
  code text UNIQUE NOT NULL,
  
  discount_type text NOT NULL, -- 'percentage', 'fixed', 'free_shipping'
  discount_value numeric(10,2) NOT NULL,
  
  valid_from timestamptz,
  valid_until timestamptz,
  
  usage_limit integer,
  usage_count integer DEFAULT 0,
  
  is_active boolean DEFAULT true
);
```

### notifications

Notificações do sistema.

```sql
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  
  type text NOT NULL,
  title text NOT NULL,
  message text,
  
  read_at timestamptz,
  
  link_url text,
  metadata jsonb
);
```

---

## 🔧 Sistema e Configurações

### system_settings

Configurações globais do sistema.

```sql
CREATE TABLE system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  
  description text
);
```

**Configurações Principais**:
- `default_price_full` - Preço padrão
- `default_price_pix` - Preço PIX padrão
- `pix_discount_percentage` - Desconto PIX
- `production_limit_monthly` - Limite de produção

### email_notifications

Log de notificações por email.

```sql
CREATE TABLE email_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  
  conversation_id uuid REFERENCES support_conversations(id),
  message_id uuid REFERENCES support_messages(id),
  recipient_user_id uuid REFERENCES auth.users(id),
  
  status text NOT NULL, -- 'sent', 'failed', 'skipped'
  
  sent_at timestamptz,
  error_message text,
  retry_count integer DEFAULT 0
);
```

---

## 🔐 Row Level Security (RLS)

### Políticas Comuns

**Usuários veem apenas seus dados**:
```sql
CREATE POLICY "Users can view own data"
ON table_name FOR SELECT
USING (auth.uid() = user_id);
```

**Admins veem tudo**:
```sql
CREATE POLICY "Admins can view all"
ON table_name FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);
```

**Inserção apenas autenticado**:
```sql
CREATE POLICY "Authenticated can insert"
ON table_name FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);
```

---

## 🔄 Triggers e Funções

### set_updated_at()

Atualiza `updated_at` automaticamente.

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar em tabelas
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON table_name
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

### calculate_pix_price()

Calcula preço PIX com desconto.

```sql
CREATE FUNCTION calculate_pix_price(
  price_full numeric,
  discount_percentage numeric
)
RETURNS numeric AS $$
BEGIN
  RETURN price_full * (1 - discount_percentage / 100);
END;
$$ LANGUAGE plpgsql;
```

### get_collection_pricing()

Retorna preços de uma coleção.

```sql
CREATE FUNCTION get_collection_pricing(collection_id uuid)
RETURNS TABLE (
  price_full numeric,
  price_pix numeric,
  deposit_amount numeric,
  remaining_full numeric,
  remaining_pix numeric,
  is_custom boolean
) AS $$
-- Implementação...
$$ LANGUAGE plpgsql;
```

---

## 📊 Views

### user_groups_with_details

View otimizada de grupos por usuário.

```sql
CREATE VIEW user_groups_with_details AS
SELECT
  gm.user_id,
  g.id AS group_id,
  g.name,
  g.description,
  g.type,
  COUNT(DISTINCT gm2.user_id) AS member_count,
  MAX(m.created_at) AS last_message_at
FROM chat_group_members gm
JOIN chat_groups g ON g.id = gm.group_id
LEFT JOIN chat_group_members gm2 ON gm2.group_id = g.id
LEFT JOIN chat_group_messages m ON m.group_id = g.id
WHERE g.deleted_at IS NULL
GROUP BY gm.user_id, g.id, g.name, g.description, g.type;
```

---

## 🧪 Dados de Teste

### Seed Data

```sql
-- Criar admin
INSERT INTO user_roles (user_id, role)
VALUES ('uuid-do-usuario', 'admin');

-- Criar franquia
INSERT INTO franchises (canonical, aliases)
VALUES ('Marvel', ARRAY['Marvel Comics', 'MCU']);

-- Criar coleção
INSERT INTO collections (name, slug, price_full, price_pix)
VALUES ('Marvel Legends', 'marvel-legends', 700.00, 665.00);
```

---

## 📚 Referências

### Migrations

**Localização**: `supabase/migrations/`

**Principais**:
- `20260131023039_create_profiles_and_likes.sql`
- `20260202000001_create_support_system.sql`
- `20260202115000_create_subscriptions_system.sql`
- `20260223000000_create_chat_groups.sql`

### Documentação Oficial

- [Supabase Database](https://supabase.com/docs/guides/database)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

---

**Última atualização**: 2026-02-24  
**Versão**: 1.0.0  
**Status**: ✅ Produção
