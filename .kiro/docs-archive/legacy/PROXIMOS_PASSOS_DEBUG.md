# 🔍 Próximos Passos - Debug do Erro 400

## 📊 Status Atual

- ✅ Queries corrigidas (campos corretos)
- ✅ RLS configurado em todas as tabelas
- ✅ Políticas criadas para joins
- ❌ Erro 400 ainda persiste

## 🎯 Adicionei Logs Detalhados

Modifiquei o código para capturar a mensagem de erro EXATA do Supabase:

### Arquivos Modificados:
1. `src/services/standalone-purchase-service.ts`
2. `src/services/admin/orders-service.ts`

### O Que os Logs Vão Mostrar:
- ❌ Mensagem de erro completa
- 🔢 Código do erro
- 💡 Hint do Supabase
- 📝 Detalhes adicionais

## 🚀 Como Testar

1. **Servidor já está rodando** em http://localhost:8080/

2. **Limpe o cache do navegador:**
   - Pressione `Ctrl + Shift + Delete`
   - Limpe tudo

3. **Abra o console do navegador:**
   - Pressione `F12`
   - Vá para a aba "Console"

4. **Acesse a página:**
   - http://localhost:8080/admin/standalone-purchases

5. **Procure no console por:**
   ```
   ❌ Error fetching standalone purchases
   Error details: {...}
   Error code: ...
   Error message: ...
   ```

## 📋 Me Envie

Copie e cole TODA a mensagem de erro que aparecer no console, incluindo:
- Error code
- Error message
- Error hint
- Error details (o JSON completo)

## 🔍 Possíveis Causas

Com base no erro exato, podemos identificar:

### 1. Foreign Key Não Existe
```
Error: relation "public.standalone_purchases" has no column "..."
```
**Solução:** Adicionar coluna faltante

### 2. Relacionamento Não Configurado
```
Error: Could not find a relationship between 'standalone_purchases' and '...'
```
**Solução:** Criar foreign key constraint

### 3. RLS Bloqueando Join
```
Error: new row violates row-level security policy
```
**Solução:** Ajustar políticas RLS

### 4. Sintaxe da Query
```
Error: syntax error at or near "..."
```
**Solução:** Corrigir sintaxe da query

## 💡 Alternativa: Testar Query Diretamente

Se quiser, podemos testar a query diretamente no Supabase Dashboard:

1. Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/editor
2. Vá para "SQL Editor"
3. Execute:

```sql
-- Teste 1: Ver se a tabela existe e tem dados
SELECT COUNT(*) FROM standalone_purchases;

-- Teste 2: Ver estrutura da tabela
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'standalone_purchases';

-- Teste 3: Testar join com profiles
SELECT sp.*, p.full_name, p.email
FROM standalone_purchases sp
LEFT JOIN profiles p ON sp.user_id = p.id
LIMIT 1;

-- Teste 4: Testar join com collections
SELECT sp.*, c.name, c.slug
FROM standalone_purchases sp
LEFT JOIN collections c ON sp.collection_id = c.id
LIMIT 1;

-- Teste 5: Testar join com cycles
SELECT sp.*, cy.cycle_number, cy.month, cy.year
FROM standalone_purchases sp
LEFT JOIN cycles cy ON sp.cycle_id = cy.id
LIMIT 1;

-- Teste 6: Testar query completa
SELECT 
  sp.*,
  p.id as profile_id, p.full_name, p.email,
  c.id as collection_id, c.name as collection_name, c.slug,
  cy.id as cycle_id, cy.cycle_number, cy.month, cy.year
FROM standalone_purchases sp
LEFT JOIN profiles p ON sp.user_id = p.id
LEFT JOIN collections c ON sp.collection_id = c.id
LEFT JOIN cycles cy ON sp.cycle_id = cy.id
LIMIT 1;
```

Me envie o resultado de cada teste!

## 🎯 Objetivo

Com a mensagem de erro exata, posso identificar o problema real e criar a solução definitiva.

---

**Aguardando:** Mensagem de erro completa do console do navegador
