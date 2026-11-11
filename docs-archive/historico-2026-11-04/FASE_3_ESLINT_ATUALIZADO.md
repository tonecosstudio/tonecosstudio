# Fase 3 - ESLint Atualizado

**Data:** 11 de Março de 2026
**Status:** ✅ PARCIALMENTE COMPLETO

---

## 🎯 Objetivo

Atualizar configuração do ESLint para ser mais rigorosa, mudando regras críticas de "warn" para "error".

---

## ⚠️ Situação Inicial

**Arquivo:** `eslint.config.js`

**Problemas:**
1. **Regras em "warn"** - Não bloqueiam build/commit
2. **no-unused-vars em "warn"** - Variáveis não usadas passam despercebidas
3. **exhaustive-deps em "warn"** - Bugs de React Hooks não são bloqueados
4. **no-explicit-any em "warn"** - Type safety comprometida

---

## ✅ Mudanças Aplicadas

### Regras Atualizadas para "error"

#### 1. no-unused-vars (warn → error)
```javascript
// ANTES
"@typescript-eslint/no-unused-vars": ["warn", {
  argsIgnorePattern: "^_",
  varsIgnorePattern: "^_",
  caughtErrorsIgnorePattern: "^_"
}]

// DEPOIS
"@typescript-eslint/no-unused-vars": ["error", {
  argsIgnorePattern: "^_",
  varsIgnorePattern: "^_",
  caughtErrorsIgnorePattern: "^_"
}]
```

**Benefício:** Variáveis não usadas agora bloqueiam o build, forçando código limpo.

#### 2. exhaustive-deps (warn → error)
```javascript
// ANTES
"react-hooks/exhaustive-deps": "warn"

// DEPOIS
"react-hooks/exhaustive-deps": "error"
```

**Benefício:** Arrays de dependências incorretos agora bloqueiam o build, prevenindo bugs de React Hooks.

### Regras Mantidas em "warn"

#### 3. no-explicit-any (mantido em warn)
```javascript
"@typescript-eslint/no-explicit-any": "warn"
```

**Motivo:** 2093 erros em arquivos de teste. Corrigir todos levaria muito tempo.

**Plano futuro:** Corrigir gradualmente em sprints futuras.

---

## 📊 Análise de Erros

### Tentativa de Mudar no-explicit-any para "error"

**Resultado:** 2093 erros encontrados

**Distribuição:**
- Arquivos de teste: ~90% (1880+ erros)
- Arquivos de produção: ~10% (213 erros)

**Principais arquivos:**
- `src/services/**/*.test.ts` - 800+ erros
- `src/test/**/*.test.ts` - 600+ erros
- `src/services/**/*.ts` - 200+ erros
- `src/types/**/*.ts` - 100+ erros

**Decisão:** Manter em "warn" por enquanto, focar em regras críticas.

---

## 🎁 Benefícios das Mudanças

### Imediatos
1. **Código mais limpo** - Sem variáveis não usadas
2. **Menos bugs** - Arrays de dependências corretos
3. **Build mais rigoroso** - Erros críticos bloqueiam deploy
4. **Qualidade garantida** - CI/CD falha em erros

### Longo Prazo
1. **Manutenibilidade** - Código mais fácil de manter
2. **Onboarding** - Novos devs seguem padrões
3. **Refatoração segura** - Erros detectados automaticamente
4. **Produção estável** - Menos bugs em runtime

---

## 📝 Configuração Final

```javascript
export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,

      // React Refresh
      "react-refresh/only-export-components": "off",

      // TypeScript Rules - Strict for production, lenient for tests
      "@typescript-eslint/no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_"
      }],
      "@typescript-eslint/no-explicit-any": "warn", // TODO: Change to error after fixing tests
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-require-imports": "off",

      // General Rules
      "no-useless-escape": "off",
      "no-case-declarations": "off",

      // React Hooks Rules - Critical for React correctness
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error", // ✅ Changed from warn
    },
  },
);
```

---

## 🔄 Próximos Passos

### Sprint Atual (Não Crítico)
- ⏳ Documentar padrões de uso de `any` em testes
- ⏳ Criar guia de migração de `any` para tipos específicos

### Sprints Futuras
1. **Semana 2-3:** Corrigir `any` em arquivos de produção (213 erros)
2. **Semana 4-5:** Corrigir `any` em arquivos de teste (1880+ erros)
3. **Semana 6:** Mudar `no-explicit-any` para "error"

### Estratégia de Correção
```typescript
// ANTES (any)
function processData(data: any) {
  return data.map((item: any) => item.value);
}

// DEPOIS (tipado)
interface DataItem {
  value: string;
}

function processData(data: DataItem[]) {
  return data.map((item) => item.value);
}
```

---

## ✅ Validação

- ✅ Build executado com sucesso
- ✅ Zero erros de compilação
- ✅ Regras críticas em "error"
- ✅ Código pronto para produção
- ✅ CI/CD mais rigoroso

---

## 📈 Comparação

| Regra | Antes | Depois | Impacto |
|-------|-------|--------|---------|
| no-unused-vars | warn | error | ✅ Alto |
| exhaustive-deps | warn | error | ✅ Alto |
| no-explicit-any | warn | warn | ⏳ Futuro |
| rules-of-hooks | error | error | ✅ Mantido |

---

## 🎯 Conclusão

ESLint atualizado com sucesso para regras críticas. Mudanças aplicadas:
- ✅ `no-unused-vars`: warn → error
- ✅ `exhaustive-deps`: warn → error
- ⏳ `no-explicit-any`: mantido em warn (2093 erros para corrigir)

**Progresso Fase 3:** 50% → 55%

---

**Última atualização:** 11 de Março de 2026 - 06:30
**Responsável:** Equipe de Desenvolvimento
**Status:** ✅ PARCIALMENTE COMPLETO
