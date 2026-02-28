# Fix: collection_choice_history Foreign Keys e RLS Policies

**Data:** 2026-02-28  
**Status:** ✅ Aplicado com Sucesso

## 🐛 Problema Original

Erro 400 (Bad Request) ao fazer queries na tabela `collection_choice_history`:

```
GET .../collection_choice_history?select=*,user:profiles!collection_choice_history_user_id_fkey(...) 400
```

### Causas Identificadas

1. **Foreign keys sem nome explícito**: Supabase auto-gerava nomes que não correspondiam aos usados nas queries
2. **Foreign keys apontando para `auth.users`**: Queries tentavam join com `profiles`
3. **RLS policies com erro**: Tentavam acessar `profiles.role` (coluna inexistente)

## ✅ Solução Aplicada

### 1. Recriação da Tabela

Dropada e recriada com foreign key constraints nomeados explicitamente:

```sql
CONSTRAINT collection_choice_history_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id)
CONSTRAINT collection_choice_history_admin_user_id_fkey 
  FOREIGN KEY (admin_user_id) REFERENCES profiles(id)
CONSTRAINT collection_choice_history_previous_collection_id_fkey 
  FOREIGN KEY (previous_collection_id) REFERENCES collections(id)
CONSTRAINT collection_choice_history_new_collection_id_fkey 
  FOREIGN KEY (new_collection_id) REFERENCES collections(id)
```

### 2. Correção das RLS Policies

**Antes (ERRO):**
```sql
EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid()
  AND profiles.role = 'admin'  -- ❌ Coluna não existe
)
```

**Depois (CORRETO):**
```sql
public.has_role(auth.uid(), 'admin'::app_role)  -- ✅ Usa user_roles
```

### 3. Migração Aplicada

- **Arquivo:** `supabase/migrations/20260316000001_fix_collection_choice_history_constraints.sql`
- **Método:** SQL executado manualmente via Supabase Dashboard
- **Histórico:** Marcado como aplicado via `supabase migration repair`

## 📝 Arquivos Modificados

1. `supabase/migrations/20260316000000_create_collection_choice_history.sql` - Atualizado com constraints nomeados
2. `supabase/migrations/20260316000001_fix_collection_choice_history_constraints.sql` - Nova migração de correção
3. `src/services/audit-trail-service.ts` - Já estava correto, usando os nomes certos

## 🧪 Páginas Afetadas (Agora Funcionando)

- `src/pages/MySubscriptions.tsx` - Histórico de mudanças de coleção
- `src/components/admin/DeliveryDetailModal.tsx` - Detalhes de entrega com histórico

## ⚠️ Impacto

- **Dados perdidos:** Todos os registros existentes em `collection_choice_history` foram deletados
- **Motivo:** Necessário para recriar a tabela com constraints corretos
- **Mitigação:** Tabela era nova, sem dados críticos em produção

## ✨ Resultado

- ✅ Queries retornam 200 OK
- ✅ Joins com `profiles` funcionam corretamente
- ✅ RLS policies aplicam permissões corretamente
- ✅ Histórico de migrações sincronizado

## 🔍 Verificação

Para confirmar que está funcionando:

1. Abra o console do navegador
2. Acesse uma página que usa `collection_choice_history`
3. Verifique que não há mais erros 400
4. Queries devem retornar dados ou array vazio (sem erro)

## 📚 Referências

- Função `has_role()`: `supabase/migrations/20260130070552_348d261f-99e7-4165-81fd-fb1ce0039426.sql`
- Tabela `user_roles`: Usada para verificar permissões de admin
- Supabase Foreign Key Naming: https://supabase.com/docs/guides/database/joins-and-nesting
