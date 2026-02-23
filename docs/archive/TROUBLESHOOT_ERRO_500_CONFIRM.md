# 🔧 Troubleshooting - Erro 500 confirm-model

## ❌ Problema

Erro 500 persiste ao clicar em "Confirmar" (Enter) na esteira:
```
POST .../functions/v1/confirm-model 500 (Internal Server Error)
```

## 🔍 Possíveis Causas

### 1. Função `has_role` não existe
A função `has_role` pode não existir no banco remoto, causando erro nas políticas RLS.

### 2. Tabela `franchise_rules` não foi criada
O SQL pode não ter sido executado completamente.

### 3. Políticas RLS bloqueando acesso
As políticas podem estar impedindo a Edge Function de acessar a tabela.

---

## 🚀 Solução Passo a Passo

### PASSO 1: Verificar o Banco

Execute o SQL de verificação:

**Arquivo:** `VERIFICAR_BANCO.sql`

**Onde:** https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new

**O que verificar:**
1. ✅ Função `has_role` existe?
2. ✅ Tabela `franchise_rules` existe?
3. ✅ Colunas AI em `images_queue` existem?
4. ✅ Políticas RLS estão criadas?
5. ✅ Função `set_updated_at` existe?

---

### PASSO 2: Aplicar SQL Alternativo

Se `has_role` **NÃO EXISTE**, use o SQL alternativo:

**Arquivo:** `SQL_ALTERNATIVO_SEM_HAS_ROLE.sql`

**Diferenças:**
- ❌ Não usa `has_role`
- ✅ Usa políticas RLS simples (qualquer autenticado pode acessar)
- ✅ Cria a função `set_updated_at` se não existir
- ✅ Usa `DROP POLICY IF EXISTS` para evitar erros

**Como aplicar:**
1. Abrir: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new
2. Copiar **TUDO** de `SQL_ALTERNATIVO_SEM_HAS_ROLE.sql`
3. Colar e executar (Run)

---

### PASSO 3: Verificar Logs da Função

No Dashboard do Supabase:
1. Ir para: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/functions
2. Clicar em `confirm-model`
3. Clicar na aba "Logs"
4. Procurar pelo erro específico

**Erros comuns:**
- `function has_role does not exist` → Use SQL alternativo
- `relation "franchise_rules" does not exist` → Tabela não foi criada
- `permission denied` → Problema com RLS

---

### PASSO 4: Testar Novamente

1. Recarregar frontend (Ctrl+R)
2. Tentar confirmar uma imagem novamente
3. Verificar console

---

## 🔧 Soluções por Tipo de Erro

### Erro: "function has_role does not exist"

**Solução:**
Use `SQL_ALTERNATIVO_SEM_HAS_ROLE.sql` que não depende de `has_role`.

---

### Erro: "relation franchise_rules does not exist"

**Solução:**
Execute novamente o SQL completo:
```sql
CREATE TABLE IF NOT EXISTS public.franchise_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  priority int NOT NULL DEFAULT 100,
  pattern text NOT NULL,
  franchise_canonical text NOT NULL,
  note text NULL
);
```

---

### Erro: "permission denied for table franchise_rules"

**Solução 1 - Desabilitar RLS temporariamente:**
```sql
ALTER TABLE public.franchise_rules DISABLE ROW LEVEL SECURITY;
```

**Solução 2 - Política permissiva:**
```sql
DROP POLICY IF EXISTS "allow_all_franchise_rules" ON public.franchise_rules;
CREATE POLICY "allow_all_franchise_rules"
ON public.franchise_rules
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
```

---

### Erro: "function set_updated_at does not exist"

**Solução:**
```sql
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
```

---

## 🆘 Solução Rápida (Se Nada Funcionar)

### Desabilitar RLS Completamente

```sql
-- ATENÇÃO: Isso remove a segurança da tabela!
-- Use apenas para testar

ALTER TABLE public.franchise_rules DISABLE ROW LEVEL SECURITY;
```

Depois de testar, você pode reabilitar:
```sql
ALTER TABLE public.franchise_rules ENABLE ROW LEVEL SECURITY;
```

---

## 📊 Checklist de Troubleshooting

- [ ] Executei `VERIFICAR_BANCO.sql`
- [ ] Verifiquei se `has_role` existe
- [ ] Verifiquei se `franchise_rules` existe
- [ ] Apliquei `SQL_ALTERNATIVO_SEM_HAS_ROLE.sql` (se necessário)
- [ ] Verifiquei logs da função no Dashboard
- [ ] Recarreguei o frontend
- [ ] Testei novamente

---

## 📁 Arquivos de Suporte

- `VERIFICAR_BANCO.sql` - Verificar estado do banco
- `SQL_ALTERNATIVO_SEM_HAS_ROLE.sql` - SQL sem dependência de has_role
- `TROUBLESHOOT_ERRO_500_CONFIRM.md` - Este guia

---

## 🎯 Próximos Passos

1. Execute `VERIFICAR_BANCO.sql` e me mostre o resultado
2. Com base no resultado, aplicaremos a solução correta
3. Testaremos novamente

---

## 💡 Dica

Se você me mostrar o resultado de `VERIFICAR_BANCO.sql`, posso identificar exatamente qual é o problema e fornecer a solução específica!
