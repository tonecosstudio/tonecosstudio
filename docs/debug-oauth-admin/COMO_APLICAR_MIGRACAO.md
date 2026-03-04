# 🚀 Como Aplicar a Migração de Desnormalização

## ⚠️ SITUAÇÃO ATUAL

O Supabase CLI está apresentando conflitos com migrações antigas que já foram aplicadas manualmente. A solução mais confiável é usar o SQL Editor do dashboard do Supabase.

## 📋 PASSO A PASSO (5 minutos)

### 1️⃣ Abra o arquivo SQL

Abra o arquivo na raiz do projeto:
```
apply-character-choices-denormalization.sql
```

Este arquivo contém o SQL simplificado e otimizado para aplicar a migração.

### 2️⃣ Acesse o Supabase SQL Editor

Abra no navegador:
```
https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/sql/new
```

Faça login se necessário.

### 3️⃣ Copie e Cole

1. Selecione TODO o conteúdo de `apply-character-choices-denormalization.sql` (Ctrl+A)
2. Copie (Ctrl+C)
3. Cole no SQL Editor do Supabase (Ctrl+V)

### 4️⃣ Execute

- Clique no botão **"Run"** (canto inferior direito)
- OU pressione **Ctrl+Enter**
- Aguarde alguns segundos

### 5️⃣ Verifique o Resultado

Você deve ver uma das seguintes mensagens:

✅ **"✅ Migração aplicada com sucesso!"** - Perfeito!

✅ **"already exists"** - Também está OK! Significa que parte já foi aplicada.

❌ **Erro diferente** - Copie a mensagem de erro e me avise.

## 🔍 VERIFICAÇÃO

Após executar, rode esta query no mesmo SQL Editor para confirmar:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'character_choices' 
  AND column_name IN ('customer_name', 'customer_email', 'collection_name');
```

**Resultado esperado:** 3 linhas mostrando:
- customer_name | text
- customer_email | text  
- collection_name | text

## 📊 TESTE FINAL

Depois de aplicar, teste se os dados foram populados:

```sql
SELECT 
  id, 
  customer_name, 
  customer_email, 
  collection_name 
FROM character_choices 
LIMIT 5;
```

**Resultado esperado:** Deve mostrar nomes de clientes e coleções preenchidos (não NULL).

## ✅ PRÓXIMOS PASSOS

Após aplicar a migração com sucesso:

1. ✅ O código já está atualizado para usar os campos desnormalizados
2. ✅ As funções `fetchPendingChoices()` e `getChoiceHistory()` já estão corrigidas
3. ✅ O erro PGRST200 deve desaparecer
4. 🎯 Podemos testar a interface de gerenciamento de escolhas de personagens
5. 🎯 Continuar com as tarefas restantes do Production Management System

## 🆘 PROBLEMAS?

Se encontrar qualquer erro:
1. Copie a mensagem de erro completa
2. Me avise para ajudar a resolver
3. Não se preocupe - nenhuma alteração é destrutiva

## 📚 DOCUMENTAÇÃO RELACIONADA

- **Explicação técnica:** `docs/character-choices-denormalization-fix.md`
- **Instruções detalhadas:** `MIGRATION_INSTRUCTIONS.md`
- **Spec do projeto:** `.kiro/specs/production-management-system/`
