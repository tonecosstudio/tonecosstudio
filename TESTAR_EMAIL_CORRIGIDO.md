# ✅ Sistema de Email Corrigido

## O que foi corrigido

O sistema agora chama a Edge Function **diretamente do código** quando o admin envia uma mensagem, ao invés de depender do trigger do banco de dados.

### Vantagens:
- ✅ Mais confiável
- ✅ Funciona sem precisar do pg_net
- ✅ Logs mais claros no console do navegador
- ✅ Melhor controle de erros

## Como Testar AGORA

### 1. Abra o Console do Navegador
Pressione F12 para abrir o DevTools

### 2. Acesse o Admin
http://localhost:8080/admin/suporte

### 3. Responda uma Conversa
- Selecione uma conversa de cliente
- Digite uma mensagem
- Clique em "Enviar"

### 4. Verifique o Console
Você verá uma das seguintes mensagens:

✅ **Sucesso:**
```
Email enviado com sucesso: {success: true, emailId: "..."}
```

❌ **Erro:**
```
Erro ao chamar Edge Function de email: {...}
```

### 5. Verifique o Email
- O cliente deve receber o email em alguns segundos
- Verifique também a pasta de spam

## Diagnóstico

Execute: `diagnosticar-email.bat`

Isso mostrará:
- Notificações registradas
- Mensagens do admin
- Status do trigger
- Usuários com email
- Conversas ativas

## Ver Logs da Edge Function

Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/functions/send-email/logs

Ou execute:
```bash
supabase functions logs send-email
```

## Verificar Notificações no Banco

```sql
SELECT 
  en.created_at,
  en.status,
  en.error_message,
  sc.subject,
  p.email
FROM email_notifications en
JOIN support_conversations sc ON en.conversation_id = sc.id
JOIN profiles p ON en.recipient_user_id = p.id
ORDER BY en.created_at DESC
LIMIT 5;
```

## Possíveis Problemas

### 1. Email não cadastrado
```sql
-- Verificar se o usuário tem email
SELECT id, email, full_name 
FROM profiles 
WHERE id = 'UUID_DO_USUARIO';
```

### 2. Usuário está online
O sistema não envia email se o usuário estiver ativo nos últimos 5 minutos.

### 3. Erro na API do Resend
- Verifique se a API key está correta
- Verifique os logs da Edge Function
- Verifique o limite de emails (100/dia no plano gratuito)

### 4. Email vai para spam
- Configure SPF, DKIM, DMARC no Resend
- Use um domínio verificado

## Comandos Úteis

```bash
# Ver logs em tempo real
supabase functions logs send-email

# Diagnosticar problemas
diagnosticar-email.bat

# Verificar secrets
supabase secrets list

# Redeployar função
supabase functions deploy send-email
```

## Teste Manual via SQL

Se quiser testar criando uma mensagem diretamente no banco:

```sql
-- Substitua os UUIDs pelos valores reais
INSERT INTO support_messages (
  conversation_id,
  sender_id,
  sender_type,
  message
) VALUES (
  'UUID_DA_CONVERSA',
  'UUID_DO_ADMIN',
  'admin',
  'Teste de email - mensagem de teste'
);
```

## Está Pronto!

Agora quando você responder um cliente como admin, o email será enviado automaticamente! 📧✨

O sistema está mais robusto e confiável do que antes.
