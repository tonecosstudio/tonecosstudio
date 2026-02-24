# Code Style Guide

Padrões de código, convenções e boas práticas do projeto Ordax.

## Stack de Linting

- **ESLint**: 9.32.0
- **TypeScript ESLint**: 8.38.0
- **Plugins**:
  - eslint-plugin-react-hooks
  - eslint-plugin-react-refresh

## Configuração ESLint

### eslint.config.js

```javascript
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

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
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
);
```

## TypeScript

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Regras TypeScript

1. **Strict Mode**: Sempre habilitado
2. **No Any**: Evitar `any`, usar tipos específicos ou `unknown`
3. **Null Safety**: Usar optional chaining (`?.`) e nullish coalescing (`??`)
4. **Type Imports**: Preferir `import type` quando possível

```typescript
// ✅ Bom
import type { User } from '@/types';
import { fetchUser } from '@/api';

// ❌ Evitar
import { User, fetchUser } from '@/api';
```

## Convenções de Nomenclatura

### Arquivos

```
PascalCase:
- Componentes React: UserProfile.tsx
- Types/Interfaces: User.ts

camelCase:
- Hooks: useAuth.ts
- Utils: formatDate.ts
- Services: authService.ts

kebab-case:
- Páginas: user-profile.tsx
- Estilos: button-styles.css
```

### Código

```typescript
// PascalCase: Componentes, Types, Interfaces, Classes
interface UserProfile {}
class AuthService {}
const UserCard = () => {};

// camelCase: Variáveis, funções, métodos
const userName = 'John';
function getUserData() {}

// UPPER_SNAKE_CASE: Constantes
const API_BASE_URL = 'https://api.example.com';
const MAX_RETRY_ATTEMPTS = 3;

// Private: Prefixo underscore (opcional)
class Service {
  private _cache = new Map();
}
```

## Estrutura de Componentes

### Componente Funcional

```typescript
import { useState, useEffect } from 'react';
import type { FC } from 'react';

// 1. Types/Interfaces
interface UserCardProps {
  userId: string;
  onSelect?: (id: string) => void;
}

// 2. Componente
export const UserCard: FC<UserCardProps> = ({ userId, onSelect }) => {
  // 3. Hooks
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 4. Effects
  useEffect(() => {
    loadUser();
  }, [userId]);

  // 5. Handlers
  const handleClick = () => {
    onSelect?.(userId);
  };

  // 6. Helper functions
  const loadUser = async () => {
    // ...
  };

  // 7. Early returns
  if (loading) return <Skeleton />;
  if (!user) return <EmptyState />;

  // 8. Render
  return (
    <div onClick={handleClick}>
      <h3>{user.name}</h3>
      <p>{user.email}</p>
    </div>
  );
};
```

### Ordem de Imports

```typescript
// 1. React
import { useState, useEffect } from 'react';
import type { FC } from 'react';

// 2. Bibliotecas externas
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

// 3. Componentes internos
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user/UserAvatar';

// 4. Hooks
import { useAuth } from '@/hooks/useAuth';

// 5. Utils/Services
import { formatDate } from '@/lib/utils';
import { userService } from '@/lib/services/userService';

// 6. Types
import type { User } from '@/types';

// 7. Estilos (se necessário)
import './styles.css';
```

## React Patterns

### 1. Props Destructuring

```typescript
// ✅ Bom
const UserCard = ({ name, email, avatar }: UserCardProps) => {
  return <div>{name}</div>;
};

// ❌ Evitar
const UserCard = (props: UserCardProps) => {
  return <div>{props.name}</div>;
};
```

### 2. Optional Props

```typescript
interface ButtonProps {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}

const Button = ({ label, onClick, disabled = false }: ButtonProps) => {
  return (
    <button onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
};
```

### 3. Children Props

```typescript
interface CardProps {
  children: React.ReactNode;
  title?: string;
}

const Card = ({ children, title }: CardProps) => {
  return (
    <div>
      {title && <h3>{title}</h3>}
      {children}
    </div>
  );
};
```

### 4. Conditional Rendering

```typescript
// ✅ Bom - Ternário para alternativas
{isLoading ? <Spinner /> : <Content />}

// ✅ Bom - && para renderização condicional
{error && <ErrorMessage error={error} />}

// ✅ Bom - Early return
if (!user) return <EmptyState />;

// ❌ Evitar - Ternário aninhado
{isLoading ? <Spinner /> : error ? <Error /> : <Content />}
```

### 5. Event Handlers

```typescript
// ✅ Bom - Arrow function inline para passar parâmetros
<button onClick={() => handleDelete(id)}>Delete</button>

// ✅ Bom - Referência direta sem parâmetros
<button onClick={handleSubmit}>Submit</button>

// ❌ Evitar - Criar função nova a cada render
<button onClick={() => console.log('clicked')}>Click</button>
```

## Hooks Customizados

```typescript
// useAuth.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
};
```

## Async/Await

```typescript
// ✅ Bom - Try/catch com tratamento de erro
const loadData = async () => {
  try {
    setLoading(true);
    const data = await fetchData();
    setData(data);
  } catch (error) {
    console.error('Error loading data:', error);
    toast.error('Erro ao carregar dados');
  } finally {
    setLoading(false);
  }
};

// ✅ Bom - Promise.all para operações paralelas
const loadAll = async () => {
  const [users, posts] = await Promise.all([
    fetchUsers(),
    fetchPosts(),
  ]);
};

// ❌ Evitar - Await sequencial desnecessário
const data1 = await fetch1();
const data2 = await fetch2(); // Poderia ser paralelo
```

## Comentários

```typescript
// ✅ Bom - Comentário explicativo
// Calcula o desconto de 5% para pagamento via PIX
const pixDiscount = total * 0.05;

// ✅ Bom - TODO com contexto
// TODO: Implementar paginação quando houver mais de 100 itens

// ✅ Bom - JSDoc para funções públicas
/**
 * Formata um valor monetário para o padrão brasileiro
 * @param value - Valor em centavos
 * @returns String formatada (ex: "R$ 1.234,56")
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value / 100);
};

// ❌ Evitar - Comentário óbvio
// Incrementa o contador
setCount(count + 1);

// ❌ Evitar - Código comentado
// const oldFunction = () => {
//   // ...
// };
```

## Formatação

### Indentação
- 2 espaços (não tabs)
- Configurado no editor

### Linha
- Máximo 100 caracteres (recomendado)
- Quebrar em múltiplas linhas se necessário

### Aspas
- Strings: aspas duplas `"text"`
- JSX: aspas duplas `<div className="container">`

### Ponto e vírgula
- Sempre usar (configurado no ESLint)

### Trailing comma
- Sempre usar em objetos/arrays multi-linha

```typescript
// ✅ Bom
const user = {
  name: 'John',
  email: 'john@example.com',
};

// ❌ Evitar
const user = {
  name: 'John',
  email: 'john@example.com'
};
```

## Executar Linting

```bash
# Verificar erros
npm run lint

# Fix automático
npm run lint -- --fix
```

## Integração com Editor

### VSCode Settings

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

### Extensões Recomendadas

- ESLint
- TypeScript and JavaScript Language Features
- Tailwind CSS IntelliSense
- Error Lens

## Boas Práticas Gerais

### 1. DRY (Don't Repeat Yourself)
Extrair código duplicado para funções/componentes reutilizáveis.

### 2. Single Responsibility
Cada função/componente deve ter uma única responsabilidade.

### 3. Composition over Inheritance
Preferir composição de componentes ao invés de herança.

### 4. Immutability
Não mutar objetos/arrays diretamente, criar novas instâncias.

```typescript
// ✅ Bom
const newArray = [...oldArray, newItem];
const newObject = { ...oldObject, newProp: value };

// ❌ Evitar
oldArray.push(newItem);
oldObject.newProp = value;
```

### 5. Error Handling
Sempre tratar erros adequadamente.

### 6. Type Safety
Aproveitar o TypeScript para garantir type safety.

### 7. Performance
- Usar React.memo para componentes pesados
- Usar useMemo/useCallback quando apropriado
- Evitar re-renders desnecessários

## Recursos

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [ESLint Rules](https://eslint.org/docs/latest/rules/)
- [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
