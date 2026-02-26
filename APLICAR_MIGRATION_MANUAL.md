# Como Aplicar a Migration Manualmente

**Data:** 25 de Fevereiro de 2026

---

## 🎯 Objetivo

Aplicar a migration de notificações de usuários no Supabase.

---

## 📋 Passo a Passo

### 1. Acessar o Supabase Dashboard

1. Abra seu navegador
2. Acesse: https://supabase.com/dashboard
3. Faça login
4. Selecione seu projeto

### 2. Abrir o SQL Editor

1. No menu lateral, clique em **SQL Editor**
2. Clique em **New Query**

### 3. Copiar o SQL

O SQL está no arquivo:
```
supabase/migrations/20260228200000_create_user_notifications_system.sql
```

**Opção A: Copiar do arquivo**
1. Abra o arquivo no VS Code
2. Selecione todo o conteúdo (Ctrl+A)
3. Copie (Ctrl+C)

**Opção B: Usar o script PowerShell**
```powershell
.\aplicar-migration-notificacoes.ps1
```
Escolha a opção 3 para copiar automaticamente.

### 4. Colar e Executar

1. Cole o SQL no editor (Ctrl+V)
2. Clique em **Run** (ou pressione Ctrl+Enter)
3. Aguarde a execução (pode levar alguns segundos)

### 5. Verificar Sucesso

Se tudo correu bem, você verá:
- ✅ "Success. No rows returned"
- Ou mensagens de sucesso para cada comando

---

## 🔍 Verificar Instalação

Execute este SQL para verificar se as tabelas foram criadas:

```sql
-- Verificar tabelas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_notifications', 'user_notification_settings');

-- Verificar enum
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'user_notification_type'::regtype;

-- Verificar RLS
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('user_notifications', 'user_notification_settings');

-- Verificar realtime
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'user_notifications';
```

Você deve ver:
- 2 tabelas criadas
- 14 tipos de notificação no enum
- 7 políticas RLS
- 1 tabela no realtime

---

## 🧪 Criar Notificação de Teste

Após aplicar a migration, teste criando uma notificação:

```sql
-- Substitua 'seu-email@exemplo.com' pelo seu email
SELECT create_user_notification(
  (SELECT id FROM auth.users WHERE email = 'seu-email@exemplo.com'),
  'system_announcement',
  'Sistema de Notificações Ativado',
  'O novo sistema de notificações está funcionando!',
  'high',
  NULL,
  NULL,
  '/notificacoes',
  'Ver Notificações',
  'Megaphone'
);

-- Verificar se foi criada
SELECT * FROM user_notifications ORDER BY created_at DESC LIMIT 5;
```

---

## ❌ Problemas Comuns

### Erro: "type notification_priority does not exist"

**Causa:** O enum `notification_priority` não existe (foi criado na migration de admin).

**Solução:** Execute primeiro a migration de admin:
```
supabase/migrations/20260228100000_create_admin_notifications_system.sql
```

### Erro: "relation user_notifications already exists"

**Causa:** A migration já foi aplicada.

**Solução:** Não é necessário fazer nada. A migration já está aplicada.

### Erro: "permission denied"

**Causa:** Você não tem permissões de admin no banco.

**Solução:** Verifique se está usando o usuário correto no Supabase Dashboard.

---

## ✅ Próximos Passos

Após aplicar a migration com sucesso:

1. **Testar localmente:**
   ```bash
   npm run dev
   ```

2. **Verificar no navegador:**
   - Faça login
   - Veja o sino de notificações no header
   - Crie uma notificação de teste via SQL
   - Veja a notificação aparecer

3. **Acessar histórico:**
   - Navegue para `/notificacoes`
   - Veja o histórico completo

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs do Supabase
2. Consulte `DEPLOY_NOTIFICACOES_2026.md`
3. Verifique o console do navegador

---

**Boa sorte!** 🚀
