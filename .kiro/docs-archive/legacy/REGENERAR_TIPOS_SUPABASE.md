# Regenerar Tipos do Supabase

Os tipos TypeScript do Supabase estão desatualizados e não incluem a tabela `standalone_purchases`. Isso pode estar causando problemas.

## Como Regenerar os Tipos

### Opção 1: Usando Supabase CLI (Recomendado)

```bash
# 1. Instalar Supabase CLI (se ainda não tiver)
npm install -g supabase

# 2. Login no Supabase
supabase login

# 3. Linkar o projeto
supabase link --project-ref pabxpvqwtvbjaunjejud

# 4. Gerar os tipos
supabase gen types typescript --linked > src/integrations/supabase/types.ts
```

### Opção 2: Usando npx (sem instalar globalmente)

```bash
npx supabase gen types typescript --project-id pabxpvqwtvbjaunjejud --schema public > src/integrations/supabase/types.ts
```

### Opção 3: Manualmente via Dashboard

1. Acesse: https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/api
2. Vá para a seção "TypeScript Types"
3. Copie o código gerado
4. Cole em `src/integrations/supabase/types.ts`

## Após Regenerar

1. **Limpe o cache do Vite**:
   ```bash
   rm -rf node_modules/.vite
   ```

2. **Reinicie o servidor**:
   ```bash
   npm run dev
   ```

3. **Limpe o cache do navegador** (Ctrl+Shift+Delete)

4. **Faça um hard refresh** (Ctrl+F5)

## Por Que Isso é Importante

Os tipos TypeScript do Supabase são gerados automaticamente a partir do schema do banco de dados. Quando você cria novas tabelas ou altera a estrutura, os tipos precisam ser regenerados para:

- Ter autocomplete correto no VS Code
- Evitar erros de tipo em tempo de compilação
- Garantir que as queries estejam corretas
- Ter a estrutura correta dos relacionamentos (foreign keys)

## Verificação

Após regenerar, o arquivo `src/integrations/supabase/types.ts` deve conter uma definição para `standalone_purchases` similar a:

```typescript
standalone_purchases: {
  Row: {
    id: string
    user_id: string
    collection_id: string
    cycle_id: string
    status: string
    deposit_amount: number
    balance_amount: number
    total_amount: number
    // ... outros campos
  }
  // ... Insert e Update types
}
```
