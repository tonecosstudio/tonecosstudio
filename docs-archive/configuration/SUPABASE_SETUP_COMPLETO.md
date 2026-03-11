# 🚀 Configuração Completa do Supabase - Ordax

## 📋 Resumo Executivo

Configuração profissional de um novo projeto Supabase do zero, incluindo autenticação Google, sistema de roles, e todas as tabelas necessárias para o funcionamento do sistema Ordax.

**Project ID:** `pdytjhtjlxvbbeuxgnms`  
**URL:** `https://pdytjhtjlxvbbeuxgnms.supabase.co`  
**Data:** 9 de Março de 2026

---

## ✅ Migrations Aplicadas

### 1. Sistema de Autenticação e Perfis
**Migration:** `20260309141843_create_profiles_and_admin_system.sql`

- Tabela `profiles` com roles (customer, admin, super_admin)
- Trigger automático para criar perfil ao registrar usuário
- Sistema de promoção de usuários a admin
- RLS policies para controle de acesso

### 2. Funções de Verificação de Roles
**Migration:** `20260309142256_create_has_role_function.sql`

- `has_role(_user_id, _role)` - Verifica se usuário tem role específica
- `is_admin()` - Verifica se usuário é admin ou super_admin
- `is_super_admin()` - Verifica se usuário é super_admin
- `get_user_role()` - Retorna a role do usuário atual

### 3. Correção de Políticas RLS
**Migration:** `20260309143550_fix_profiles_rls_policies.sql`

- Políticas RLS simplificadas e seguras
- Separação clara entre permissões de usuários e admins
- Prevenção de conflitos de permissões

### 4. Tabelas Core do Sistema
**Migration:** `20260309143736_create_core_tables.sql`

**Tabelas criadas:**
- `collections` - Coleções de personagens
- `characters` - Personagens individuais
- `cycles` - Ciclos mensais de produção (modelo 90 dias)
- `system_settings` - Configurações do sistema

**Enums criados:**
- `collection_status` - Status das coleções
- `cycle_status` - Status dos ciclos

### 5. Sistema de Assinaturas e Compras
**Migration:** `20260309143842_create_subscriptions_and_purchases.sql`

**Tabelas criadas:**
- `subscription_plans` - Planos de assinatura (Básico, Premium, Colecionador)
- `subscriptions` - Assinaturas dos usuários
- `subscription_deliveries` - Entregas programadas
- `standalone_purchases` - Compras avulsas
- `manual_payments` - Pagamentos manuais
- `quotes` - Orçamentos e pedidos

**Enums criados:**
- `subscription_status` - Status das assinaturas
- `payment_status` - Status de pagamentos
- `purchase_status` - Status de compras

### 6. Sistema de Suporte e Notificações
**Migration:** `20260309143938_create_support_and_notifications.sql`

**Tabelas criadas:**
- `support_conversations` - Conversas de suporte
- `chat_groups` - Grupos de chat
- `admin_notifications` - Notificações para admins

### 7. Tabelas de Produção
**Migration:** `20260309144007_create_production_tables.sql`

**Tabelas criadas:**
- `models` - Modelos 3D para produção
- `images_queue` - Fila de processamento de imagens

### 8. Correção de Recursão Infinita em RLS
**Migration:** `20260309144104_fix_infinite_recursion_rls.sql`

- Criação de `current_user_role()` com SECURITY DEFINER
- Atualização de todas as políticas RLS para usar a nova função
- Eliminação de recursão infinita nas verificações de permissão

### 9. Funções Auxiliares
**Migration:** `20260309144710_create_helper_functions.sql`

- `get_current_production_limit()` - Retorna limite de produção
- `get_system_settings()` - Retorna configurações do sistema

### 10. Colunas Adicionais de Perfil
**Migration:** `20260309145035_add_missing_profile_columns_and_functions.sql`

- Adicionadas colunas: `display_name`, `collector_level`, `pieces_owned`, `total_spent`, `profile_completion`
- `admin_list_users()` - Lista todos os usuários (apenas admins)
- `update_profile_stats()` - Atualiza estatísticas do perfil
- `calculate_profile_completion()` - Calcula completude do perfil

### 11. Reload de Schema Cache
**Migration:** `20260309150858_reload_schema_cache.sql`

- Força PostgREST a recarregar o cache de schema

### 12. Refresh de Permissões
**Migration:** `20260309151036_grant_permissions_refresh.sql`

- Re-grant de permissões em todas as funções
- Garante que anon e authenticated roles tenham acesso correto

### 13. Tabelas de Catálogo e Preços
**Migration:** `20260309151524_create_catalog_and_pricing_tables.sql`

**Tabelas criadas:**
- `price_categories` - Categorias de preço (Padrão, Premium, Deluxe, Especial)
- `collection_characters` - Relacionamento avançado entre coleções e personagens

**Funcionalidades:**
- Sistema de categorização de preços
- Metadados avançados (theme_category, product_line)
- Flag is_catalog para controle de visibilidade
- 4 categorias de preço pré-configuradas

### 14. Sistema de Moedas e Precificação
**Migration:** `20260309151804_create_coins_and_pricing_system.sql`

**Tabelas criadas:**
- `user_coins` - Saldo de moedas virtuais dos usuários
- `coin_packages` - Pacotes de moedas para venda (4 pacotes pré-configurados)
- `coin_transactions` - Histórico completo de transações
- `pricing_tiers` - Níveis de precificação (4 tiers pré-configurados)

**Correções:**
- Adicionado valor 'active' ao enum `cycle_status`

**Automações:**
- Trigger para criar saldo inicial ao criar perfil

### 15. Fix Price Categories e Collection Pricing
**Migration:** `20260309152018_fix_price_categories_and_add_collection_pricing.sql`

**Correções:**
- Adicionada coluna `is_active` à tabela `price_categories`

**Tabelas criadas:**
- `collection_types` - Tipos de coleção (4 tipos pré-configurados)
- `collection_base_pricing` - Preços base por tipo de coleção

---

## 🔐 Configuração de Autenticação

### Google OAuth
✅ Configurado e funcionando
- Provider habilitado no Supabase Dashboard
- Redirect URIs configuradas
- Client ID e Secret configurados

### Super Admin
✅ Usuário `washingtonmsdj@gmail.com` promovido a super_admin

---

## 📊 Estrutura de Dados

### Modelo de Ciclos (90 dias)
O sistema opera com ciclos mensais:
- **Vendas:** 30 dias (mês inteiro)
- **Produção:** 30 dias (mês seguinte)
- **Envio:** Segunda quinzena do terceiro mês
- **Total:** ~90 dias (3 meses)

### Planos de Assinatura
1. **Básico** - R$ 150,00 - 1 personagem/mês
2. **Premium** - R$ 280,00 - 2 personagens/mês
3. **Colecionador** - R$ 400,00 - 3 personagens/mês

### Configurações Padrão
- Preço padrão: R$ 150,00
- Preço PIX (5% desconto): R$ 142,50
- Limite de produção mensal: 100 unidades
- Dia de abertura de vendas: 1º dia do mês

---

## 🔒 Segurança (RLS)

### Princípios Implementados
1. **Least Privilege:** Usuários só acessam seus próprios dados
2. **Admin Override:** Admins têm acesso total quando necessário
3. **Public Read:** Dados públicos (coleções ativas, personagens revelados) acessíveis a todos
4. **Secure Functions:** Funções SECURITY DEFINER para evitar recursão

### Políticas por Tabela
- **profiles:** Usuários veem próprio perfil, admins veem todos
- **collections/characters:** Público vê ativos/revelados, admins veem todos
- **subscriptions/purchases:** Usuários veem próprios, admins veem todos
- **admin_notifications:** Apenas admins
- **system_settings:** Todos leem, apenas admins modificam

---

## 🛠️ Comandos Úteis

### Aplicar Migrations
```bash
supabase db push
```

### Gerar Types TypeScript
```bash
supabase gen types typescript --linked > src/types/supabase.ts
```

### Ver Status
```bash
supabase status
```

### Criar Nova Migration
```bash
supabase migration new nome_da_migration
```

---

## 📝 Próximos Passos

1. ✅ Autenticação Google configurada
2. ✅ Tabelas principais criadas
3. ✅ RLS policies implementadas
4. ✅ Super admin configurado
5. ⏳ Gerar types TypeScript atualizados
6. ⏳ Criar dados de teste (coleções, personagens)
7. ⏳ Testar fluxos completos no frontend

---

## 🎯 Status Atual

**Sistema:** ✅ Operacional  
**Autenticação:** ✅ Funcionando  
**Database:** ✅ Configurado  
**RLS:** ✅ Sem erros  
**Admin Access:** ✅ Funcionando  

---

## 📞 Suporte

Para questões sobre a configuração:
- Documentação Supabase: https://supabase.com/docs
- Dashboard: https://supabase.com/dashboard/project/pdytjhtjlxvbbeuxgnms

---

**Configuração realizada por:** Kiro AI Assistant  
**Data:** 9 de Março de 2026  
**Versão:** 1.0.0
