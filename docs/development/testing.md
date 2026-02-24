# Testing Guide

Guia completo de testes do projeto Ordax, incluindo estratégias, ferramentas e como executar os testes.

## Stack de Testes

- **Framework**: Vitest 3.2.4
- **Testing Library**: @testing-library/react 16.0.0
- **Environment**: jsdom
- **Matchers**: @testing-library/jest-dom

## Estrutura de Testes

```
src/test/
├── setup.ts                      # Configuração global
├── example.test.ts               # Exemplo básico
├── accessibility.test.ts         # Testes de acessibilidade
├── error-boundary.test.tsx       # Testes de error boundaries
├── security-audit.test.ts        # Auditoria de segurança
├── xss-protection.test.ts        # Proteção XSS
├── performance.test.ts           # Testes de performance
├── e2e-integration.test.ts       # Integração E2E (requer DB)
├── e2e-integration-demo.test.ts  # Demo E2E (sem DB)
├── E2E_INTEGRATION_TESTS.md      # Documentação E2E
└── PERFORMANCE_TESTS.md          # Documentação performance
```

## Configuração

### vitest.config.ts

```typescript
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```

### Setup Global (src/test/setup.ts)

```typescript
import "@testing-library/jest-dom";

// Mock matchMedia para testes
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
```

## Scripts de Teste

```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "test:performance": "cross-env VITEST_PERFORMANCE=true vitest run src/test/performance.test.ts",
  "test:e2e": "cross-env VITEST_INTEGRATION=true vitest run src/test/e2e-integration.test.ts"
}
```

## Executando Testes

### Todos os testes
```bash
npm run test
```

### Modo watch (desenvolvimento)
```bash
npm run test:watch
```

### Teste específico
```bash
npm run test -- src/test/accessibility.test.ts
```

### Com filtro de nome
```bash
npm run test -- -t "should render"
```

### Testes de performance
```bash
npm run test:performance
```

### Testes E2E (requer database)
```bash
npm run test:e2e
```

## Tipos de Testes

### 1. Testes Unitários

Testam componentes e funções isoladamente.

**Exemplo:**
```typescript
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('should render with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
});
```

### 2. Testes de Acessibilidade

Validam conformidade com padrões de acessibilidade.

**Cobertura:**
- Estrutura semântica HTML
- Atributos ARIA
- Navegação por teclado
- Contraste de cores
- Labels e descrições

**Exemplo:**
```typescript
it('should have proper ARIA labels', () => {
  render(<LoginForm />);
  expect(screen.getByLabelText('Email')).toBeInTheDocument();
  expect(screen.getByLabelText('Senha')).toBeInTheDocument();
});
```

### 3. Testes de Segurança

Validam proteções contra vulnerabilidades.

**Cobertura:**
- Proteção XSS
- Sanitização de HTML
- Validação de inputs
- CSRF tokens
- Autenticação/Autorização

**Exemplo:**
```typescript
it('should sanitize user input', () => {
  const maliciousInput = '<script>alert("XSS")</script>';
  const sanitized = DOMPurify.sanitize(maliciousInput);
  expect(sanitized).not.toContain('<script>');
});
```

### 4. Testes de Performance

Validam requisitos de performance do sistema.

**Métricas:**
- Dashboard load: ≤ 2s com 100 itens
- Detalhes: ≤ 1s
- Upload 5MB: ≤ 10s
- 50 uploads concorrentes sem degradação

**Executar:**
```bash
export VITEST_PERFORMANCE=true
npm run test:performance
```

### 5. Testes E2E / Integração

Validam fluxos completos do sistema.

**Cobertura:**
- Fluxo de pagamento completo
- Aprovação/rejeição admin
- Sistema de chat
- Assinaturas e entregas
- Notificações

**Executar:**
```bash
# Demo (sem database)
npm run test -- src/test/e2e-integration-demo.test.ts

# Completo (com database)
export VITEST_INTEGRATION=true
npm run test:e2e
```

## Boas Práticas

### 1. Estrutura de Testes

```typescript
describe('ComponentName', () => {
  // Setup
  beforeEach(() => {
    // Preparação antes de cada teste
  });

  // Cleanup
  afterEach(() => {
    // Limpeza após cada teste
  });

  // Testes agrupados por funcionalidade
  describe('when user is logged in', () => {
    it('should show user menu', () => {
      // Arrange
      const user = { name: 'John' };
      
      // Act
      render(<UserMenu user={user} />);
      
      // Assert
      expect(screen.getByText('John')).toBeInTheDocument();
    });
  });
});
```

### 2. Queries Recomendadas

Ordem de preferência (do mais acessível ao menos):

1. **getByRole**: `getByRole('button', { name: 'Submit' })`
2. **getByLabelText**: `getByLabelText('Email')`
3. **getByPlaceholderText**: `getByPlaceholderText('Digite seu email')`
4. **getByText**: `getByText('Bem-vindo')`
5. **getByTestId**: `getByTestId('submit-button')` (último recurso)

### 3. Async Testing

```typescript
import { waitFor } from '@testing-library/react';

it('should load data', async () => {
  render(<DataComponent />);
  
  // Aguardar elemento aparecer
  await waitFor(() => {
    expect(screen.getByText('Data loaded')).toBeInTheDocument();
  });
});
```

### 4. User Interactions

```typescript
import userEvent from '@testing-library/user-event';

it('should handle form submission', async () => {
  const user = userEvent.setup();
  render(<LoginForm />);
  
  await user.type(screen.getByLabelText('Email'), 'test@example.com');
  await user.type(screen.getByLabelText('Senha'), 'password123');
  await user.click(screen.getByRole('button', { name: 'Entrar' }));
  
  await waitFor(() => {
    expect(screen.getByText('Login successful')).toBeInTheDocument();
  });
});
```

### 5. Mocking

```typescript
// Mock de módulo
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => Promise.resolve({ data: [], error: null })),
    })),
  },
}));

// Mock de função
const mockFn = vi.fn();
mockFn.mockReturnValue('mocked value');
mockFn.mockResolvedValue({ data: 'async value' });
```

## Coverage

Para gerar relatório de cobertura:

```bash
npm run test -- --coverage
```

Metas de cobertura:
- Statements: > 80%
- Branches: > 75%
- Functions: > 80%
- Lines: > 80%

## Debugging Testes

### 1. Debug no VSCode

Adicione ao `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Vitest",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "test:watch"],
  "console": "integratedTerminal"
}
```

### 2. Debug no Terminal

```typescript
import { screen, debug } from '@testing-library/react';

it('should debug', () => {
  render(<Component />);
  
  // Imprime HTML do componente
  screen.debug();
  
  // Imprime elemento específico
  debug(screen.getByRole('button'));
});
```

### 3. Logs Úteis

```typescript
// Ver queries disponíveis
screen.logTestingPlaygroundURL();

// Ver estado do componente
console.log(screen.getByRole('button').outerHTML);
```

## CI/CD

### GitHub Actions

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm run test
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Troubleshooting

### Erro: "Cannot find module"

```bash
# Limpar cache
npm run test -- --clearCache

# Reinstalar dependências
rm -rf node_modules package-lock.json
npm install
```

### Erro: "matchMedia is not defined"

Já está configurado no `setup.ts`. Se persistir, verifique se o setup está sendo carregado.

### Testes lentos

```typescript
// Aumentar timeout
it('slow test', async () => {
  // ...
}, 10000); // 10 segundos

// Ou globalmente no vitest.config.ts
test: {
  testTimeout: 10000
}
```

### Erro de memória

```bash
# Aumentar limite de memória
NODE_OPTIONS=--max_old_space_size=4096 npm run test
```

## Recursos

- [Vitest Docs](https://vitest.dev/)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)
- [E2E Tests Documentation](../../src/test/E2E_INTEGRATION_TESTS.md)
- [Performance Tests Documentation](../../src/test/PERFORMANCE_TESTS.md)
