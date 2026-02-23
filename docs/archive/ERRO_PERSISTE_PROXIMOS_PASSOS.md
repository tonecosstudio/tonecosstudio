# ⚠️ Erro 500 Persiste - Próximos Passos

## 🎯 Situação Atual

✅ SQL foi aplicado com sucesso ("Success. No rows returned")
❌ Erro 500 em `confirm-model` ainda ocorre

## 🔍 Por Que Isso Acontece?

Possíveis causas:
1. A função `has_role` não existe no banco remoto
2. As políticas RLS estão bloqueando o acesso
3. A função `set_updated_at` não existe

---

## 🚀 Solução em 2 Passos

### PASSO 1: Verificar o Banco (30 segundos)

**Abrir:** https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new

**Copiar e executar:** Todo o conteúdo de `VERIFICAR_BANCO.sql`

**Resultado esperado:**
Você verá várias tabelas mostrando o que existe no banco.

---

### PASSO 2: Aplicar SQL Alternativo (1 minuto)

**Abrir:** https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new

**Copiar e executar:** Todo o conteúdo de `SQL_ALTERNATIVO_SEM_HAS_ROLE.sql`

**O que este SQL faz:**
- ✅ Não depende de `has_role`
- ✅ Usa políticas RLS mais simples
- ✅ Cria `set_updated_at` se não existir
- ✅ Usa `DROP POLICY IF EXISTS` para evitar erros

---

## 📊 Resultado Esperado

Após aplicar o SQL alternativo:

**ANTES:**
```
❌ POST .../confirm-model 500 (Internal Server Error)
```

**DEPOIS:**
```
✅ POST .../confirm-model 200 (OK)
✅ Imagem confirmada com sucesso
```

---

## 📁 Arquivos Necessários

1. **`VERIFICAR_BANCO.sql`** - Para diagnosticar o problema
2. **`SQL_ALTERNATIVO_SEM_HAS_ROLE.sql`** - Para corrigir

---

## 🆘 Se Ainda Não Funcionar

Execute este SQL para desabilitar RLS temporariamente:

```sql
ALTER TABLE public.franchise_rules DISABLE ROW LEVEL SECURITY;
```

Depois teste novamente. Se funcionar, o problema é com as políticas RLS.

---

## ⏱️ Tempo Estimado

- Verificar banco: 30 segundos
- Aplicar SQL alternativo: 1 minuto
- Testar: 30 segundos

**TOTAL: ~2 minutos**

---

## 🎯 Checklist

- [ ] Executei `VERIFICAR_BANCO.sql`
- [ ] Vi os resultados
- [ ] Executei `SQL_ALTERNATIVO_SEM_HAS_ROLE.sql`
- [ ] Recarreguei o frontend (Ctrl+R)
- [ ] Testei confirmar uma imagem
- [ ] Erro 500 desapareceu

---

## 💡 Dica Importante

O SQL alternativo usa políticas RLS mais permissivas (qualquer usuário autenticado pode acessar). Isso é OK para desenvolvimento/teste. Para produção, você pode ajustar as políticas depois.

---

## 📞 Próximo Passo

**Execute agora:** `SQL_ALTERNATIVO_SEM_HAS_ROLE.sql`

Isso deve resolver o problema! 🚀
