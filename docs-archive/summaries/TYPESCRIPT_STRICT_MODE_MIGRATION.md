# 🔒 TypeScript Strict Mode Migration Plan

**Status**: 📋 Preparado para Implementação  
**Prioridade**: 🔴 Alta  
**Tempo Estimado**: 2-3 semanas

---

## 🎯 Objetivo

Migrar o projeto de TypeScript modo não-strict para strict mode completo, aumentando type safety e prevenindo bugs em produção.

---

## 📊 Situação Atual

```typescript
// tsconfig.json - TODAS as verificações desabilitadas
{
  "strict": false,                    // ❌
  "noImplicitAny": false,            // ❌
  "noUnusedParameters": false,       // ❌
  "noUnusedLocals": false,           // ❌
  "strictNullChecks": false          // ❌
}
```

---

## 🗺️ Plano de Migração (4 Fases)

### Fase 1: strictNullChecks (1 semana)

**Objetivo**: Eliminar null/undefined errors

```typescript
// tsconfig.json
{
  "strictNullChecks": true  // ✅ Habilitar
}
```

**Erros Esperados**: ~200-300 erros

**Como Corrigir**:

```typescript
// ❌ Antes
function getUser(id: string) {
  const user = users.find((u) => u.id === id);
  return user.name; // Error: user pode ser undefined
}

// ✅ Depois
function getUser(id: string) {
  const user = users.find((u) => u.id === id);
  if (!user) throw new Error("User not found");
  return user.name;
}

// Ou com optional chaining
function getUserName(id: string) {
  return users.find((u) => u.id === id)?.name ?? "Unknown";
}
```

**Checklist**:

- [ ] Habilitar strictNullChecks
- [ ] Corrigir erros em src/lib/
- [ ] Corrigir erros em src/components/
- [ ] Corrigir erros em src/pages/
- [ ] Corrigir erros em src/hooks/
- [ ] Rodar testes
- [ ] Commit

---

### Fase 2: noImplicitAny (1 semana)

**Objetivo**: Tipar todo código explicitamente

```typescript
// tsconfig.json
{
  "strictNullChecks": true,
  "noImplicitAny": true  // ✅ Habilitar
}
```

**Erros Esperados**: ~150-200 erros

**Como Corrigir**:

```typescript
// ❌ Antes
function processData(data) {
  // Error: 'data' implicitly has 'any' type
  return data.map((item) => item.value);
}

// ✅ Depois
interface DataItem {
  value: number;
}

function processData(data: DataItem[]): number[] {
  return data.map((item) => item.value);
}
```

**Checklist**:

- [ ] Habilitar noImplicitAny
- [ ] Criar types em src/types/
- [ ] Tipar funções em src/lib/
- [ ] Tipar componentes
- [ ] Tipar hooks
- [ ] Rodar testes
- [ ] Commit

---

### Fase 3: strict: true (3-5 dias)

**Objetivo**: Habilitar todas verificações strict

```typescript
// tsconfig.json
{
  "strict": true  // ✅ Habilitar tudo
}
```

**Inclui**:

- strictNullChecks ✅
- noImplicitAny ✅
- strictBindCallApply ✅
- strictFunctionTypes ✅
- strictPropertyInitialization ✅
- noImplicitThis ✅
- alwaysStrict ✅

**Erros Esperados**: ~50-100 erros

**Como Corrigir**:

```typescript
// strictBindCallApply
const fn = (a: number, b: string) => {};
fn.call(null, 1, "test"); // ✅ Type-safe

// strictFunctionTypes
type Handler = (event: MouseEvent) => void;
const handler: Handler = (event: Event) => {}; // ❌ Error

// strictPropertyInitialization
class User {
  name: string; // ❌ Error: not initialized

  // ✅ Opções:
  name!: string; // Definite assignment
  name?: string; // Optional
  name: string = ""; // Default value
}
```

**Checklist**:

- [ ] Habilitar strict: true
- [ ] Corrigir erros de bind/call/apply
- [ ] Corrigir erros de function types
- [ ] Corrigir erros de property initialization
- [ ] Rodar testes
- [ ] Commit

---

### Fase 4: Unused Checks (2-3 dias)

**Objetivo**: Limpar código não usado

```typescript
// tsconfig.json
{
  "strict": true,
  "noUnusedLocals": true,      // ✅ Habilitar
  "noUnusedParameters": true   // ✅ Habilitar
}
```

**Erros Esperados**: ~100-150 erros

**Como Corrigir**:

```typescript
// ❌ Antes
function processUser(id: string, name: string, age: number) {
  console.log(id); // name e age não usados
}

// ✅ Depois - Remover não usados
function processUser(id: string) {
  console.log(id);
}

// ✅ Ou prefixar com _
function processUser(id: string, _name: string, _age: number) {
  console.log(id);
}
```

**Checklist**:

- [ ] Habilitar noUnusedLocals
- [ ] Habilitar noUnusedParameters
- [ ] Remover variáveis não usadas
- [ ] Remover parâmetros não usados
- [ ] Rodar testes
- [ ] Commit final

---

## 📋 Checklist Geral

### Antes de Começar

- [ ] Criar branch: `feat/typescript-strict-mode`
- [ ] Backup do código atual
- [ ] Rodar todos os testes (devem passar)
- [ ] Comunicar ao time

### Durante Migração

- [ ] Trabalhar em pequenos commits
- [ ] Rodar testes após cada fase
- [ ] Documentar decisões complexas
- [ ] Pedir review de código crítico

### Após Conclusão

- [ ] Todos os testes passando
- [ ] Build sem erros
- [ ] Documentação atualizada
- [ ] PR criado e revisado
- [ ] Merge para main

---

## 🛠️ Ferramentas Úteis

### VSCode Settings

```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "editor.codeActionsOnSave": {
    "source.fixAll": true
  }
}
```

### Scripts Úteis

```bash
# Ver todos os erros TypeScript
npx tsc --noEmit

# Ver erros de um arquivo específico
npx tsc --noEmit src/lib/auth.ts

# Contar erros
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l
```

---

## 📊 Métricas de Sucesso

### Antes

- ❌ 0% type safety
- ❌ Bugs em produção por null/undefined
- ❌ Refatoração arriscada
- ❌ IntelliSense limitado

### Depois

- ✅ 100% type safety
- ✅ 90% menos bugs em produção
- ✅ Refatoração segura
- ✅ IntelliSense completo

---

## 🚀 Como Começar

```bash
# 1. Criar branch
git checkout -b feat/typescript-strict-mode

# 2. Fase 1 - Habilitar strictNullChecks
# Editar tsconfig.json

# 3. Ver erros
npx tsc --noEmit

# 4. Corrigir erros um por um
# Começar por src/lib/ (mais crítico)

# 5. Testar
npm run test

# 6. Commit
git add .
git commit -m "feat: enable strictNullChecks"

# 7. Repetir para próximas fases
```

---

## 💡 Dicas

1. **Comece pelos arquivos mais críticos**: lib/, services/
2. **Use optional chaining**: `?.` e nullish coalescing `??`
3. **Crie type guards** para validações complexas
4. **Não use `any`**: Use `unknown` e faça type narrowing
5. **Documente decisões**: Comentários em código complexo
6. **Peça ajuda**: Alguns casos são complexos

---

## 📞 Suporte

Se encontrar dificuldades:

1. Consultar [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
2. Ver exemplos em projetos similares
3. Perguntar no time
4. Abrir issue para discussão

---

**Status**: ⏳ Aguardando início  
**Próximo Passo**: Criar branch e começar Fase 1  
**Responsável**: A definir
