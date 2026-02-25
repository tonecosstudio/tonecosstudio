# 🔧 Guia: Aplicar Migration de Templates e Agendamento

**Data:** 25/02/2026  
**Status:** PENDENTE

---

## ⚠️ Problema

O erro `403 Forbidden` ao acessar `message_templates` indica que a tabela não existe no banco de dados.

```
GET https://pabxpvqwtvbjaunjejud.supabase.co/rest/v1/message_templates?select=*&order=created_at.desc 403 (Forbidden)
```

---

## ✅ Solução

Aplicar a migration que cria as tabelas `message_templates` e `scheduled_messages`.

---

## 📋 Passo a Passo

### Opção 1: Via Supabase Studio (Recomendado)

1. **Abrir Supabase Studio**

   ```
   http://127.0.0.1:54323/project/default/sql
   ```

2. **Copiar o SQL**
   - Abrir o arquivo `APLICAR_MIGRATION_TEMPLATES.sql`
   - Copiar todo o conteúdo

3. **Executar no SQL Editor**
   - Colar o SQL no editor
   - Clicar em "Run" ou pressionar `Ctrl+Enter`
   - Aguardar confirmação de sucesso

4. **Verificar Resultado**
   - Deve mostrar:
     ```
     message_templates    | 1
     scheduled_messages   | 1
     ```

### Opção 2: Via CLI (Alternativa)

```bash
# Aplicar todas as migrations pendentes
supabase migration up --include-all

# Ou aplicar apenas a nova migration
supabase db reset
```

### Opção 3: Via psql (Se disponível)

```bash
# Conectar ao banco local
psql -h 127.0.0.1 -p 54322 -U postgres -d postgres

# Executar o arquivo
\i supabase/migrations/20260228000001_add_templates_and_scheduled_messages.sql

# Verificar
\dt message_templates
\dt scheduled_messages
```

---

## 🧪 Verificação

### 1. Verificar Tabelas Criadas

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('message_templates', 'scheduled_messages');
```

**Resultado esperado:**

```
table_name
-------------------
message_templates
scheduled_messages
```

### 2. Verificar Políticas RLS

```sql
SELECT tablename, policyname
FROM pg_policies
WHERE tablename IN ('message_templates', 'scheduled_messages');
```

**Resultado esperado:**

```
message_templates    | Admins can manage templates
message_templates    | Users can view own templates
scheduled_messages   | Admins can manage scheduled messages
scheduled_messages   | Users can view scheduled messages
```

### 3. Verificar Function

```sql
SELECT proname
FROM pg_proc
WHERE proname = 'process_scheduled_messages';
```

**Resultado esperado:**

```
proname
---------------------------
process_scheduled_messages
```

---

## 🔄 Após Aplicar

### 1. Recarregar a Aplicação

```bash
# No navegador, pressionar Ctrl+Shift+R (hard reload)
# Ou fechar e abrir novamente
```

### 2. Testar Funcionalidades

**Templates:**

1. Abrir página de grupos
2. Clicar em "Templates"
3. Criar um novo template
4. Aplicar o template

**Agendamento:**

1. Escrever uma mensagem
2. Clicar em "Agendar"
3. Selecionar data/hora futura
4. Confirmar agendamento

**Importação CSV:**

1. Clicar em "Importar CSV"
2. Baixar template
3. Fazer upload de arquivo
4. Ver relatório de importação

---

## 🐛 Troubleshooting

### Erro: "relation already exists"

**Causa:** Tabela já foi criada anteriormente

**Solução:**

```sql
-- Verificar se existe
SELECT * FROM message_templates LIMIT 1;

-- Se existir, não precisa fazer nada
-- Se não existir, dropar e recriar
DROP TABLE IF EXISTS message_templates CASCADE;
DROP TABLE IF EXISTS scheduled_messages CASCADE;

-- Executar migration novamente
```

### Erro: "permission denied"

**Causa:** Usuário não tem permissão

**Solução:**

```sql
-- Conectar como superuser (postgres)
-- Ou executar via Supabase Studio (já tem permissões)
```

### Erro: "foreign key constraint"

**Causa:** Tabelas referenciadas não existem

**Solução:**

```sql
-- Verificar se chat_groups existe
SELECT * FROM chat_groups LIMIT 1;

-- Verificar se profiles existe
SELECT * FROM profiles LIMIT 1;

-- Se não existirem, aplicar migrations anteriores primeiro
```

---

## 📊 Estrutura das Tabelas

### message_templates

```sql
Column      | Type         | Nullable | Default
------------|--------------|----------|------------------
id          | uuid         | not null | gen_random_uuid()
name        | text         | not null |
content     | text         | not null |
created_by  | uuid         | not null |
created_at  | timestamptz  | not null | now()
updated_at  | timestamptz  | not null | now()
```

**Constraints:**

- `name`: 1-100 caracteres
- `content`: 1-5000 caracteres

### scheduled_messages

```sql
Column        | Type         | Nullable | Default
--------------|--------------|----------|------------------
id            | uuid         | not null | gen_random_uuid()
group_id      | uuid         | not null |
message       | text         | not null |
scheduled_for | timestamptz  | not null |
status        | text         | not null | 'pending'
created_by    | uuid         | not null |
created_at    | timestamptz  | not null | now()
sent_at       | timestamptz  | null     |
error_message | text         | null     |
```

**Constraints:**

- `message`: 1-5000 caracteres
- `status`: 'pending', 'sent', 'failed', 'cancelled'
- `scheduled_for` > `created_at`

---

## 🎯 Próximos Passos

Após aplicar a migration:

1. ✅ Recarregar aplicação
2. ✅ Testar templates
3. ✅ Testar agendamento
4. ✅ Testar importação CSV
5. ✅ Verificar notificações
6. ✅ Testar analytics

---

## 📝 Notas

- A migration é idempotente (pode ser executada múltiplas vezes)
- Usa `CREATE TABLE IF NOT EXISTS`
- Usa `CREATE INDEX IF NOT EXISTS`
- Usa `DROP POLICY IF EXISTS` antes de criar

---

**Documento criado por:** Kiro AI  
**Data:** 25/02/2026
