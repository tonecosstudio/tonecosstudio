# Comandos Rápidos - Sistema de Chat

## 🚀 Iniciar Desenvolvimento

```bash
# Iniciar servidor local
npm run dev

# Abrir no navegador
# http://localhost:5173
```

## 📊 Verificar Status

```bash
# Ver migrations aplicadas
supabase migration list

# Ver status do Supabase local
supabase status

# Ver logs do Supabase
supabase logs
```

## 🗄️ Banco de Dados

```bash
# Aplicar migrations
supabase db push

# Aplicar migrations incluindo todas
supabase db push --include-all

# Resetar banco local (CUIDADO!)
supabase db reset

# Fazer dump do banco
supabase db dump -f backup.sql
```

## 🔍 Verificar Dados do Chat

Execute no Supabase SQL Editor (https://supabase.com/dashboard):

```sql
-- Ver todas as conversas
SELECT 
  c.id,
  c.subject,
  u.email,
  c.status,
  c.tags,
  COUNT(m.id) as total_mensagens
FROM support_conversations c
JOIN auth.users u ON u.id = c.user_id
LEFT JOIN support_messages m ON m.conversation_id = c.id
GROUP BY c.id, u.email
ORDER BY c.last_message_at DESC;

-- Ver mensagens recentes
SELECT 
  m.message,
  m.sender_type,
  m.is_internal,
  m.created_at
FROM support_messages m
ORDER BY m.created_at DESC
LIMIT 20;

-- Ver estatísticas
SELECT 
  'Conversas' as tipo,
  COUNT(*) as total
FROM support_conversations
UNION ALL
SELECT 
  'Mensagens' as tipo,
  COUNT(*) as total
FROM support_messages;
```

Ou execute o script completo:
```sql
-- Copie e cole o conteúdo de verificar-status-chat.sql
```

## 🧪 Testar Sistema

### Interface Admin
1. Acesse: http://localhost:5173/admin/support
2. Login como admin
3. Verifique lista de conversas
4. Clique em uma conversa
5. Envie uma mensagem
6. Teste filtros (status, tags)
7. Teste busca

### Interface Cliente
1. Acesse: http://localhost:5173
2. Login como cliente (não-admin)
3. Clique no ícone de chat (canto inferior direito)
4. Verifique suas conversas
5. Envie uma mensagem
6. Confirme que notas internas NÃO aparecem

### Testar Realtime
1. Abra duas abas do navegador
2. Aba 1: Admin em /admin/support
3. Aba 2: Cliente no chat
4. Envie mensagem de uma aba
5. Verifique se aparece na outra em tempo real

## 🧹 Limpar Dados de Teste

```sql
-- Execute no Supabase SQL Editor
-- ATENÇÃO: Isso vai deletar as conversas de teste!

DELETE FROM support_messages 
WHERE conversation_id IN (
  SELECT id FROM support_conversations
  WHERE subject IN (
    'Dúvida sobre meu pedido #12345',
    'Orçamento para produto personalizado',
    'Produto chegou com defeito',
    'Como funciona a assinatura?',
    'Informação sobre entrega'
  )
);

DELETE FROM support_conversations
WHERE subject IN (
  'Dúvida sobre meu pedido #12345',
  'Orçamento para produto personalizado',
  'Produto chegou com defeito',
  'Como funciona a assinatura?',
  'Informação sobre entrega'
);
```

Ou use o script:
```sql
-- Copie e cole o conteúdo de remover-dados-teste-chat.sql
```

## 📦 Outros Specs

### AI Vision Classification
```bash
# Aplicar migrations
supabase db push

# Testar classificação (criar script de teste)
npm run test:ai-vision
```

### Subscription Collections
```bash
# Continuar desenvolvimento
# Abrir tasks.md e seguir próximas tarefas
code .kiro/specs/subscription-collections/tasks.md
```

### Manual Payment System
```bash
# Iniciar implementação
# Revisar requirements primeiro
code .kiro/specs/manual-payment-system/requirements.md
```

## 🔧 Troubleshooting

### Erro de Migration
```bash
# Ver detalhes do erro
supabase db push --debug

# Verificar migrations locais vs remotas
supabase migration list

# Forçar aplicação de todas
supabase db push --include-all
```

### Erro de Conexão
```bash
# Verificar status do Supabase
supabase status

# Reiniciar Supabase local
supabase stop
supabase start
```

### Erro de Permissão RLS
```sql
-- Verificar políticas RLS
SELECT * FROM pg_policies 
WHERE tablename IN ('support_conversations', 'support_messages');

-- Desabilitar RLS temporariamente (APENAS PARA DEBUG!)
ALTER TABLE support_conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages DISABLE ROW LEVEL SECURITY;

-- Reabilitar RLS
ALTER TABLE support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
```

## 📚 Documentação

### Arquivos Importantes
- `EXECUTADO_HOJE.md` - O que foi feito hoje
- `PROXIMOS_PASSOS_CHAT.md` - Próximos passos detalhados
- `RESUMO_EXECUCAO_CHAT.md` - Resumo técnico da execução
- `STATUS_TODOS_SPECS.md` - Status de todos os specs
- `verificar-status-chat.sql` - Script de verificação
- `remover-dados-teste-chat.sql` - Script de limpeza

### Specs
- `.kiro/specs/advanced-chat-support-system/` - Chat (completo)
- `.kiro/specs/ai-vision-classification/` - AI Vision (60%)
- `.kiro/specs/manual-payment-system/` - Pagamentos (0%)
- `.kiro/specs/seo-performance-optimization/` - SEO (0%)
- `.kiro/specs/subscription-collections/` - Coleções (20%)

## 🎯 Atalhos Úteis

```bash
# Ver logs em tempo real
supabase logs --follow

# Abrir Supabase Studio local
supabase studio

# Gerar tipos TypeScript do banco
supabase gen types typescript --local > src/types/supabase.ts

# Executar testes
npm run test

# Build para produção
npm run build

# Preview do build
npm run preview
```

## 🔗 Links Úteis

- Supabase Dashboard: https://supabase.com/dashboard
- Supabase Docs: https://supabase.com/docs
- React Router: https://reactrouter.com
- shadcn/ui: https://ui.shadcn.com
- Tailwind CSS: https://tailwindcss.com

---

**Dica:** Salve este arquivo nos favoritos para acesso rápido aos comandos!
