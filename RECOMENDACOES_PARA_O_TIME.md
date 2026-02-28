# Recomendações para o Time de Desenvolvimento - ORDAX
**Data:** 28 de Fevereiro de 2026

---

## 🎯 VISÃO GERAL

Este documento contém recomendações profissionais para manter e melhorar a qualidade do código do projeto ORDAX após as correções aplicadas.

---

## 📋 PADRÕES A SEGUIR

### 1. Error Handling

**✅ FAZER:**
```typescript
import { DatabaseError, errorTracking, ErrorCategory } from "@/lib/error-tracking";

try {
  const { data, error } = await supabase.from('users').select('*');
  
  if (error) {
    throw new DatabaseError(
      `Failed to fetch users: ${error.message}`,
      ErrorCategory.DATABASE,
      { error },
      'Erro ao buscar usuários. Tente novamente.'
    );
  }
  
  return data;
} catch (error) {
  if (error instanceof DatabaseError) {
    throw error; // Re-throw custom errors
  }
  
  // Wrap unexpected errors
  const wrappedError = new DatabaseError(
    'Unexpected error',
    ErrorCategory.DATABASE,
    { error }
  );
  errorTracking.trackError(wrappedError);
  throw wrappedError;
}
```

**❌ NÃO FAZER:**
```typescript
// ❌ Erro silencioso
try {
  await doSomething();
} catch (error) {
  console.error('Error:', error);
  // Don't fail the operation
}

// ❌ Erro genérico sem contexto
throw new Error('Something went wrong');

// ❌ Erro não propagado
try {
  await doSomething();
} catch (error) {
  console.error(error);
  return null; // ❌ Esconde o erro
}
```

---

### 2. Type Safety

**✅ FAZER:**
```typescript
import type { Database } from "@/integrations/supabase/types";

type UserRow = Database['public']['Tables']['users']['Row'];

async function getUser(id: string): Promise<UserRow> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw new DatabaseError(error.message);
  return data; // ✅ Properly typed
}
```

**❌ NÃO FAZER:**
```typescript
// ❌ Type assertion
const data = (await supabase.from('users').select('*')) as any;

// ❌ Ignorar tipos
// @ts-ignore
const user = data.user;

// ❌ any em todo lugar
async function getUser(id: any): Promise<any> {
  // ...
}
```

---

### 3. Validação de Entrada

**✅ FAZER:**
```typescript
import { ValidationError, ErrorCategory } from "@/lib/error-tracking";

function validateEmail(email: string): void {
  if (!email || typeof email !== 'string') {
    throw new ValidationError(
      'Email must be a non-empty string',
      ErrorCategory.VALIDATION,
      { email },
      'Por favor, insira um email válido.'
    );
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError(
      'Invalid email format',
      ErrorCategory.VALIDATION,
      { email },
      'Formato de email inválido.'
    );
  }
}
```

**❌ NÃO FAZER:**
```typescript
// ❌ Sem validação
function processEmail(email: string) {
  // Assume email is valid
  sendEmail(email);
}

// ❌ Validação silenciosa
function validateEmail(email: string): boolean {
  if (!email) return false; // ❌ Não informa o usuário
  return true;
}
```

---

### 4. Logging e Debugging

**✅ FAZER:**
```typescript
import { errorTracking, ErrorSeverity } from "@/lib/error-tracking";

// Adicionar breadcrumb antes de operações importantes
errorTracking.addBreadcrumb(
  'User initiated payment',
  'payment',
  { amount: 100, method: 'pix' }
);

// Log com nível apropriado
errorTracking.log(
  'Payment processed successfully',
  ErrorSeverity.INFO,
  { paymentId, userId }
);

// Log de warning
errorTracking.log(
  'Payment method deprecated',
  ErrorSeverity.WARNING,
  { method: 'boleto' }
);
```

**❌ NÃO FAZER:**
```typescript
// ❌ Console.log em produção
console.log('User data:', userData); // ❌ Pode expor dados sensíveis

// ❌ Sem contexto
console.error('Error'); // ❌ Sem informação útil

// ❌ Logs excessivos
console.log('Step 1');
console.log('Step 2');
console.log('Step 3'); // ❌ Poluição de logs
```

---

### 5. Async/Await

**✅ FAZER:**
```typescript
import { withErrorHandling, ErrorCategory } from "@/lib/error-tracking";

// Usar wrapper para error handling consistente
const users = await withErrorHandling(
  () => supabase.from('users').select('*'),
  'Failed to fetch users',
  ErrorCategory.DATABASE,
  { context: 'user-list' }
);

// Ou manualmente com try/catch
try {
  const result = await someAsyncOperation();
  return result;
} catch (error) {
  // Handle error properly
  throw new DatabaseError(
    'Operation failed',
    ErrorCategory.DATABASE,
    { error }
  );
}
```

**❌ NÃO FAZER:**
```typescript
// ❌ Promise sem await
someAsyncOperation(); // ❌ Erro não capturado

// ❌ Catch vazio
try {
  await someAsyncOperation();
} catch (error) {
  // ❌ Erro ignorado
}

// ❌ Async sem try/catch
async function doSomething() {
  const data = await fetchData(); // ❌ Erro não tratado
  return data;
}
```

---

## 🔧 FERRAMENTAS E COMANDOS

### Regenerar Tipos do Supabase
```bash
# Após mudanças no schema
npx supabase gen types typescript --local > src/integrations/supabase/types.ts
```

### Verificar Tipos
```bash
# Verificar erros de tipo sem build
npx tsc --noEmit
```

### Lint
```bash
# Verificar problemas de código
npm run lint

# Corrigir automaticamente
npm run lint -- --fix
```

### Format
```bash
# Formatar código
npm run format

# Verificar formatação
npm run format:check
```

### Build
```bash
# Build de produção
npm run build

# Build de desenvolvimento
npm run build:dev
```

### Testes
```bash
# Rodar todos os testes
npm run test

# Testes com coverage
npm run test:coverage

# Testes em watch mode
npm run test:watch
```

---

## 🚨 SINAIS DE ALERTA

### Quando Revisar o Código

1. **Type Assertions (`as any`, `as unknown`)**
   - Sempre questione: "Por que preciso disso?"
   - Geralmente indica tipos desatualizados ou design incorreto

2. **Try/Catch Vazio**
   - Erros devem ser tratados ou propagados
   - Nunca ignore erros silenciosamente

3. **Console.log em Produção**
   - Use o sistema de logging (`errorTracking.log`)
   - Console.log deve ser removido antes do commit

4. **Funções Muito Longas (>50 linhas)**
   - Considere quebrar em funções menores
   - Cada função deve ter uma responsabilidade clara

5. **Duplicação de Código**
   - DRY (Don't Repeat Yourself)
   - Extraia lógica comum para funções/hooks

6. **Imports Não Utilizados**
   - ESLint vai avisar
   - Remova antes do commit

---

## 📝 CHECKLIST DE CODE REVIEW

### Antes de Criar PR

- [ ] Código compila sem erros (`npm run build`)
- [ ] Lint passa sem erros (`npm run lint`)
- [ ] Testes passam (`npm run test`)
- [ ] Tipos estão corretos (`npx tsc --noEmit`)
- [ ] Sem `console.log` ou `debugger`
- [ ] Sem `as any` ou type assertions desnecessárias
- [ ] Error handling implementado
- [ ] Validação de entrada implementada
- [ ] Comentários úteis adicionados
- [ ] Documentação atualizada (se necessário)

### Durante Code Review

- [ ] Lógica está clara e fácil de entender
- [ ] Nomes de variáveis/funções são descritivos
- [ ] Sem duplicação de código
- [ ] Performance é adequada
- [ ] Segurança foi considerada
- [ ] Acessibilidade foi considerada
- [ ] Testes cobrem casos importantes
- [ ] Error handling é robusto
- [ ] Mensagens de erro são user-friendly

---

## 🎓 RECURSOS DE APRENDIZADO

### TypeScript
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)

### React
- [React Docs](https://react.dev/)
- [React Hooks](https://react.dev/reference/react)

### Supabase
- [Supabase Docs](https://supabase.com/docs)
- [Supabase TypeScript Support](https://supabase.com/docs/guides/api/typescript-support)

### Error Handling
- [Error Handling Best Practices](https://www.joyent.com/node-js/production/design/errors)
- [Sentry Best Practices](https://docs.sentry.io/platforms/javascript/best-practices/)

---

## 🤝 CONTRIBUINDO

### Workflow

1. **Criar Branch**
   ```bash
   git checkout -b feature/nome-da-feature
   ```

2. **Desenvolver**
   - Seguir padrões deste documento
   - Commitar frequentemente
   - Usar conventional commits

3. **Testar**
   ```bash
   npm run test
   npm run lint
   npm run build
   ```

4. **Criar PR**
   - Descrição clara do que foi feito
   - Screenshots se aplicável
   - Referenciar issues relacionadas

5. **Code Review**
   - Responder comentários
   - Fazer ajustes necessários
   - Aguardar aprovação

6. **Merge**
   - Squash commits se necessário
   - Deletar branch após merge

---

## 💡 DICAS PROFISSIONAIS

### 1. Escreva Código para Humanos
```typescript
// ❌ Difícil de entender
const x = u.filter(i => i.s === 'a').map(i => i.n);

// ✅ Claro e descritivo
const activeUserNames = users
  .filter(user => user.status === 'active')
  .map(user => user.name);
```

### 2. Comente o "Porquê", Não o "O Quê"
```typescript
// ❌ Comentário óbvio
// Incrementa o contador
counter++;

// ✅ Explica o motivo
// Increment counter to track retry attempts for exponential backoff
counter++;
```

### 3. Mantenha Funções Pequenas
```typescript
// ❌ Função fazendo muitas coisas
async function processUser(userId: string) {
  // 100 linhas de código...
}

// ✅ Funções pequenas e focadas
async function validateUser(userId: string) { /* ... */ }
async function fetchUserData(userId: string) { /* ... */ }
async function updateUserStatus(userId: string) { /* ... */ }

async function processUser(userId: string) {
  await validateUser(userId);
  const data = await fetchUserData(userId);
  await updateUserStatus(userId);
}
```

### 4. Use Early Returns
```typescript
// ❌ Nested ifs
function processData(data: Data | null) {
  if (data) {
    if (data.isValid) {
      if (data.hasPermission) {
        // Process...
      }
    }
  }
}

// ✅ Early returns
function processData(data: Data | null) {
  if (!data) return;
  if (!data.isValid) return;
  if (!data.hasPermission) return;
  
  // Process...
}
```

### 5. Evite Magic Numbers
```typescript
// ❌ Magic numbers
setTimeout(callback, 5000);
if (users.length > 100) { /* ... */ }

// ✅ Constantes nomeadas
const FIVE_SECONDS = 5000;
const MAX_USERS_PER_PAGE = 100;

setTimeout(callback, FIVE_SECONDS);
if (users.length > MAX_USERS_PER_PAGE) { /* ... */ }
```

---

## 🎯 METAS DE QUALIDADE

### Curto Prazo (1 mês)
- [ ] Zero `as any` no código
- [ ] 80% de test coverage
- [ ] Todos os TODOs críticos resolvidos
- [ ] CI/CD configurado

### Médio Prazo (3 meses)
- [ ] 90% de test coverage
- [ ] Performance score > 90
- [ ] Security score > 95
- [ ] Documentação completa

### Longo Prazo (6 meses)
- [ ] Zero technical debt crítico
- [ ] Arquitetura modular consolidada
- [ ] Monitoring e alerting completos
- [ ] Time treinado em best practices

---

**Última Atualização:** 28 de Fevereiro de 2026  
**Mantenha este documento atualizado conforme o projeto evolui!**
