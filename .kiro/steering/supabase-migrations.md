---
inclusion: auto
---

# REGRA CRÍTICA: Aplicação Automática de Migrations no Supabase

## ⚠️ REGRA OBRIGATÓRIA

**SEMPRE que criar uma migration SQL no diretório `supabase/migrations/`, você DEVE aplicá-la automaticamente no Supabase.**

**NUNCA peça ao usuário para aplicar manualmente. SEMPRE aplique você mesmo.**

## 🔧 COMO APLICAR MIGRATIONS

### Método 1: Via Supabase Management API (PREFERIDO)

Use a Management API do Supabase para aplicar migrations:

```javascript
const SUPABASE_URL = "https://pabxpvqwtvbjaunjejud.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "[key do .env]";

// Ler o SQL da migration
const sql = readFileSync('supabase/migrations/XXXXX.sql', 'utf-8');

// Aplicar via Management API
const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/query`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`
  },
  body: JSON.stringify({ query: sql })
});
```

### Método 2: Via Supabase CLI (se disponível)

```bash
npx supabase db push
```

### Método 3: Executar SQL diretamente via client

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Para cada comando SQL
const commands = sql.split(';').filter(cmd => cmd.trim());
for (const cmd of commands) {
  await supabase.rpc('exec_sql', { sql_query: cmd });
}
```

## 📋 PROCESSO OBRIGATÓRIO

Quando criar uma migration:

1. ✅ Criar o arquivo SQL em `supabase/migrations/`
2. ✅ **APLICAR IMEDIATAMENTE** usando um dos métodos acima
3. ✅ Verificar se foi aplicada com sucesso
4. ✅ Informar o usuário que foi aplicada
5. ❌ **NUNCA** pedir ao usuário para aplicar manualmente

## 🚫 O QUE NÃO FAZER

- ❌ Criar migration e pedir ao usuário para aplicar
- ❌ Criar documentação de "como aplicar manualmente"
- ❌ Deixar migrations pendentes
- ❌ Assumir que o usuário vai aplicar depois

## ✅ O QUE FAZER

- ✅ Aplicar a migration imediatamente após criar
- ✅ Verificar se foi aplicada com sucesso
- ✅ Tratar erros e tentar métodos alternativos
- ✅ Informar o usuário que a migration foi aplicada

## 🔑 CREDENCIAIS

As credenciais estão no arquivo `.env`:
- `VITE_SUPABASE_URL`: URL do projeto Supabase
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key para operações admin

## 📝 EXEMPLO DE APLICAÇÃO

```javascript
// aplicar-migration.mjs
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = "https://pabxpvqwtvbjaunjejud.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";

const sql = readFileSync('supabase/migrations/20260228000001_add_hero_image_setting.sql', 'utf-8');

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Executar SQL
const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

if (error) {
  console.error('Erro ao aplicar migration:', error);
  // Tentar método alternativo
} else {
  console.log('Migration aplicada com sucesso!');
}
```

## 🎯 OBJETIVO

O usuário não deve se preocupar com aplicação de migrations. Isso é responsabilidade do assistente (você).

**Sempre aplique as migrations automaticamente. Sempre.**
