# 🔧 Aplicar RLS Policies Manualmente

## 🎯 Problema Identificado

As policies RLS não foram criadas corretamente via scripts. É necessário aplicá-las manualmente via Supabase Dashboard.

---

## ⚠️ ANÁLISE REALIZADA

### Situação Atual:
- ✅ Tabela `coin_exchange_rate` existe
- ✅ Dados existem (R$ 500 = 100 coins)
- ✅ RLS está habilitado
- ❌ **NENHUMA POLICY CRIADA**
- ✅ Admin existe na tabela `user_roles`
- ✅ UPDATE funciona com service role

### Conclusão:
O UPDATE não funciona no frontend porque não há policies RLS permitindo a operação para usuários autenticados.

---

## 🚀 Solução: Aplicar Policies Manualmente

### Passo 1: Acessar Supabase Dashboard

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor** (menu lateral esquerdo)
4. Clique em **New Query**

### Passo 2: Copiar e Executar SQL

Cole o SQL abaixo e clique em **Run**:

```sql
-- =====================================================
-- Fix RLS Policies para coin_exchange_rate
-- =====================================================

-- Garantir que RLS está habilitado
ALTER TABLE coin_exchange_rate ENABLE ROW LEVEL SECURITY;

-- Remover policies antigas (se existirem)
DROP POLICY IF EXISTS "Todos podem ver a cotação ativa" ON coin_exchange_rate;
DROP POLICY IF EXISTS "Apenas admins podem atualizar cotação" ON coin_exchange_rate;
DROP POLICY IF EXISTS "Apenas admins podem inserir cotação" ON coin_exchange_rate;
DROP POLICY IF EXISTS "Admins podem atualizar cotação" ON coin_exchange_rate;
DROP POLICY IF EXISTS "Usuários autenticados podem atualizar cotação" ON coin_exchange_rate;

-- POLICY 1: SELECT (Leitura)
CREATE POLICY "coin_exchange_rate_select_policy"
  ON coin_exchange_rate
  FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

-- POLICY 2: UPDATE (Atualização)
CREATE POLICY "coin_exchange_rate_update_policy"
  ON coin_exchange_rate
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- POLICY 3: INSERT (Inserção)
CREATE POLICY "coin_exchange_rate_insert_policy"
  ON coin_exchange_rate
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Grants
GRANT SELECT ON coin_exchange_rate TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON coin_exchange_rate TO authenticated;
```

### Passo 3: Verificar Sucesso

Após executar, você deve ver:
```
Success. No rows returned
```

### Passo 4: Verificar Policies Criadas

Execute este SQL para confirmar:

```sql
SELECT 
  polname as policy_name,
  polcmd as command
FROM pg_policy
WHERE polrelid = 'coin_exchange_rate'::regclass
ORDER BY polname;
```

Deve retornar 3 policies:
- `coin_exchange_rate_insert_policy` (a)
- `coin_exchange_rate_select_policy` (r)
- `coin_exchange_rate_update_policy` (w)

---

## ✅ Após Aplicar

### 1. Reiniciar Servidor
```bash
# Pare o servidor (Ctrl+C no terminal)
npm run dev
```

### 2. Testar Cotação
1. Acesse: http://localhost:8081/admin/planos
2. Card "Cotação do Coin"
3. Clique em "Editar Cotação"
4. Altere valores
5. Clique em "Salvar Cotação"
6. ✅ Deve funcionar!

---

## 🔍 Como Funciona

### Fluxo Correto:
```
1. Usuário autenticado acessa /admin/planos
2. Frontend carrega cotação (SELECT policy permite)
3. Usuário edita e clica em "Salvar"
4. Frontend faz UPDATE
5. RLS verifica USING (usuário pode ler?)
   - Verifica se user_id está em user_roles com role='admin'
6. RLS verifica WITH CHECK (usuário pode escrever?)
   - Verifica se user_id está em user_roles com role='admin'
7. ✅ Ambos passam → UPDATE executado
8. ✅ Toast de sucesso
9. ✅ Query invalidada → dados recarregados
```

### Por Que Funciona:
- **USING**: Verifica se o usuário pode LER o registro (necessário para UPDATE)
- **WITH CHECK**: Verifica se o usuário pode ESCREVER no registro
- Ambos verificam se `auth.uid()` está na tabela `user_roles` com `role = 'admin'`

---

## 🐛 Se Ainda Não Funcionar

### Verificar Autenticação:
1. Abra DevTools (F12)
2. Console
3. Execute:
```javascript
const { data } = await supabase.auth.getUser();
console.log('User ID:', data.user?.id);
```

4. Verifique se o ID corresponde ao da tabela `user_roles`

### Verificar Role:
Execute no SQL Editor:
```sql
SELECT * FROM user_roles WHERE user_id = 'SEU_USER_ID_AQUI';
```

Deve retornar uma linha com `role = 'admin'`.

---

## 📁 Arquivos Relacionados

- Migration: `supabase/migrations/20260510000006_fix_coin_exchange_rls_final.sql`
- Análise: `analise-completa-cotacao.mjs`
- Código: `src/pages/admin/AdminPlansConfiguration.tsx`

---

**Aplique as policies manualmente e teste!** 🚀
