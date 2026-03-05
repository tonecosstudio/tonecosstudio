# 🚀 Guia Rápido: Resolver Erros 404 em 3 Minutos

## ⚡ Solução Rápida (3 passos)

### 1️⃣ Abrir SQL Editor

Acesse: https://supabase.com/dashboard/project/lprsvnwshfxhpnwrxfpy/editor

Clique em **SQL Editor** no menu lateral esquerdo.

### 2️⃣ Executar Script

1. Abra o arquivo `APLICAR_MIGRATIONS_CRITICAS.sql` (está na raiz do projeto)
2. Copie **TODO** o conteúdo (Ctrl+A, Ctrl+C)
3. Cole no SQL Editor do Supabase (Ctrl+V)
4. Clique no botão **Run** (ou pressione Ctrl+Enter)

### 3️⃣ Recarregar Aplicação

1. Volte para a aplicação no navegador
2. Pressione **F5** para recarregar
3. ✅ Os erros 404 devem desaparecer!

---

## 🔍 O que o script faz?

- ✅ Cria a tabela `collections` (coleções de personagens)
- ✅ Cria a tabela `cycles` (ciclos de produção)
- ✅ Configura permissões (RLS policies)
- ✅ Cria índices para performance
- ✅ Insere um ciclo de exemplo para testes

---

## ❓ Problemas?

### Erro: "relation already exists"
✅ **Isso é bom!** Significa que a tabela já existe. Continue com o script.

### Erro: "permission denied"
❌ Você precisa de permissões de admin. Verifique se está logado com a conta correta.

### Ainda vejo erros 404 após recarregar
1. Abra o Console do navegador (F12)
2. Vá na aba **Network**
3. Recarregue a página (F5)
4. Procure por requisições com status 404
5. Verifique qual tabela está faltando

---

## 📊 Verificação Manual

Se quiser confirmar que as tabelas foram criadas, execute no SQL Editor:

```sql
-- Listar tabelas criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('collections', 'cycles')
ORDER BY table_name;

-- Contar registros
SELECT 
  'collections' as tabela,
  COUNT(*) as registros
FROM collections
UNION ALL
SELECT 
  'cycles' as tabela,
  COUNT(*) as registros
FROM cycles;
```

Resultado esperado:
```
table_name
-----------
collections
cycles

tabela       | registros
-------------|----------
collections  | 0
cycles       | 1
```

---

## 🎯 Próximos Passos

Após resolver os erros 404:

1. **Criar coleções** - Acesse o painel admin para criar suas primeiras coleções
2. **Configurar ciclos** - Ajuste os ciclos de produção conforme necessário
3. **Testar fluxo completo** - Faça um teste end-to-end do sistema

---

## 💡 Dica Pro

Para evitar esse problema no futuro, sempre que adicionar novas migrations:

```bash
# Aplicar todas as migrations de uma vez
npx supabase db push
```

Ou configure um hook de deploy para aplicar automaticamente.
