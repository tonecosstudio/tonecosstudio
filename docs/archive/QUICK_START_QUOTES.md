# ⚡ Quick Start - Ativar Sistema de Orçamentos

## 🎯 Objetivo

Aplicar a migration para ativar o sistema de orçamentos em 5 minutos.

---

## 📋 Passo a Passo

### 1️⃣ Abrir SQL Editor

Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new

### 2️⃣ Copiar SQL

Abra o arquivo: `supabase/migrations/20260130235223_create_quotes_system.sql`

Copie **TODO** o conteúdo (Ctrl+A, Ctrl+C)

### 3️⃣ Colar e Executar

1. Cole no SQL Editor do Supabase (Ctrl+V)
2. Clique no botão **Run** (ou Ctrl+Enter)
3. Aguarde a mensagem de sucesso

### 4️⃣ Verificar

Execute este SQL para confirmar:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('quotes', 'quote_items');
```

Deve retornar 2 linhas:
- `quotes`
- `quote_items`

---

## ✅ Pronto!

Agora você pode:

1. **Criar orçamentos**: http://localhost:5173/orcamento
2. **Ver carrinho**: http://localhost:5173/orcamento/carrinho
3. **Gerenciar no admin**: http://localhost:5173/admin/orcamentos

---

## 🧪 Testar

### Como usuário:
1. Acesse o catálogo
2. Clique em "Solicitar Orçamento" em um modelo
3. Preencha quantidade e escala
4. Adicione ao carrinho
5. Finalize o pedido

### Como admin:
1. Acesse `/admin/orcamentos`
2. Veja o pedido criado
3. Altere o status para "reviewing"
4. Adicione observações

---

## ❌ Troubleshooting

### Erro: "relation quotes does not exist"
➡️ A migration não foi aplicada. Repita os passos acima.

### Erro: "permission denied"
➡️ Verifique se está logado como admin no Supabase Dashboard.

### Não vejo os orçamentos no admin
➡️ Verifique se você é admin:
```sql
SELECT * FROM user_roles WHERE user_id = auth.uid();
```

---

## 📚 Mais Informações

- **Documentação completa**: `STATUS_ADMIN_COMPLETO.md`
- **Instruções detalhadas**: `APLICAR_MIGRATION_QUOTES.md`
- **Checklist geral**: `CHECKLIST_FINAL.md`
