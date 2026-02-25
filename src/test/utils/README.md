# Test Utilities

Utilitários para facilitar a escrita de testes no projeto Ordax.

## 📚 Conteúdo

- `test-utils.tsx` - Funções de renderização com providers
- `supabase-mocks.ts` - Mocks do Supabase client

## 🚀 Como Usar

### Renderização com Providers

Use `renderWithProviders` ao invés de `render` do @testing-library/react:

```tsx
import { renderWithProviders, screen } from "@/test/utils/test-utils";
import { MyComponent } from "./MyComponent";

describe("MyComponent", () => {
  it("should render correctly", () => {
    renderWithProviders(<MyComponent />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });
});
```

### QueryClient Customizado

Se precisar de um QueryClient customizado:

```tsx
import { renderWithProviders, createTestQueryClient } from "@/test/utils/test-utils";

it("should handle query errors", () => {
  const queryClient = createTestQueryClient();
  renderWithProviders(<MyComponent />, { queryClient });
});
```

### Mocks do Supabase

#### Mock Básico (já configurado globalmente)

O Supabase client já está mockado globalmente no `setup.ts`. Você pode usar diretamente:

```tsx
import { supabase } from "@/integrations/supabase/client";

it("should fetch data", async () => {
  // O mock já está ativo
  const { data } = await supabase.from("users").select();
  expect(data).toEqual([]);
});
```

#### Mock com Dados Customizados

Para retornar dados específicos em um teste:

```tsx
import { vi } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import { mockQuerySuccess } from "@/test/utils/supabase-mocks";

it("should display user data", async () => {
  const mockUsers = [
    { id: "1", name: "John" },
    { id: "2", name: "Jane" },
  ];

  // Mock a resposta específica
  vi.mocked(supabase.from).mockReturnValue({
    select: vi.fn().mockResolvedValue(mockQuerySuccess(mockUsers)),
  } as any);

  renderWithProviders(<UserList />);

  await waitFor(() => {
    expect(screen.getByText("John")).toBeInTheDocument();
  });
});
```

#### Mock de Autenticação

```tsx
import { vi } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import { mockUser, mockSession } from "@/test/utils/supabase-mocks";

it("should show user profile when authenticated", async () => {
  // Mock usuário autenticado
  vi.mocked(supabase.auth.getUser).mockResolvedValue({
    data: { user: mockUser },
    error: null,
  });

  renderWithProviders(<Profile />);

  await waitFor(() => {
    expect(screen.getByText(mockUser.email)).toBeInTheDocument();
  });
});
```

#### Mock de Realtime

```tsx
import { vi } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import { createMockChannel } from "@/test/utils/supabase-mocks";

it("should receive realtime updates", async () => {
  const mockChannel = createMockChannel();
  vi.mocked(supabase.channel).mockReturnValue(mockChannel as any);

  renderWithProviders(<RealtimeComponent />);

  // Simular evento realtime
  act(() => {
    mockChannel._trigger("postgres_changes", {
      new: { id: "1", message: "New message" },
    });
  });

  await waitFor(() => {
    expect(screen.getByText("New message")).toBeInTheDocument();
  });
});
```

#### Mock de Storage

```tsx
import { vi } from "vitest";
import { supabase } from "@/integrations/supabase/client";

it("should upload file", async () => {
  const mockFile = new File(["content"], "test.jpg", { type: "image/jpeg" });

  vi.mocked(supabase.storage.from).mockReturnValue({
    upload: vi.fn().mockResolvedValue({
      data: { path: "uploads/test.jpg" },
      error: null,
    }),
  } as any);

  renderWithProviders(<FileUpload />);

  const input = screen.getByLabelText("Upload file");
  await userEvent.upload(input, mockFile);

  await waitFor(() => {
    expect(screen.getByText("Upload successful")).toBeInTheDocument();
  });
});
```

### Helpers de Mock

#### mockQuerySuccess

Cria uma resposta de sucesso do Supabase:

```tsx
import { mockQuerySuccess } from "@/test/utils/supabase-mocks";

const response = mockQuerySuccess([{ id: "1", name: "Test" }]);
// { data: [...], error: null, count: 1, status: 200 }
```

#### mockQueryError

Cria uma resposta de erro do Supabase:

```tsx
import { mockQueryError } from "@/test/utils/supabase-mocks";

const response = mockQueryError("Not found", "PGRST116");
// { data: null, error: { message: "Not found", code: "PGRST116" }, ... }
```

## 🎯 Boas Práticas

### 1. Use renderWithProviders

❌ **Evite:**

```tsx
import { render } from "@testing-library/react";

render(<MyComponent />); // Sem providers!
```

✅ **Prefira:**

```tsx
import { renderWithProviders } from "@/test/utils/test-utils";

renderWithProviders(<MyComponent />);
```

### 2. Limpe Mocks Entre Testes

```tsx
import { vi } from "vitest";

describe("MyComponent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("test 1", () => {
    // ...
  });

  it("test 2", () => {
    // Mocks limpos automaticamente
  });
});
```

### 3. Mock Apenas o Necessário

❌ **Evite mockar tudo:**

```tsx
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    // 100 linhas de mocks...
  },
}));
```

✅ **Mock apenas o que o teste usa:**

```tsx
vi.mocked(supabase.from).mockReturnValue({
  select: vi.fn().mockResolvedValue(mockQuerySuccess(data)),
} as any);
```

### 4. Use waitFor para Operações Assíncronas

```tsx
import { waitFor } from "@/test/utils/test-utils";

it("should load data", async () => {
  renderWithProviders(<DataComponent />);

  await waitFor(() => {
    expect(screen.getByText("Data loaded")).toBeInTheDocument();
  });
});
```

### 5. Teste Comportamento, Não Implementação

❌ **Evite:**

```tsx
expect(mockFunction).toHaveBeenCalledWith(/* ... */);
```

✅ **Prefira:**

```tsx
expect(screen.getByText("Success message")).toBeInTheDocument();
```

## 🔧 Troubleshooting

### Erro: "No QueryClient set"

**Causa:** Componente não está envolvido com QueryClientProvider

**Solução:** Use `renderWithProviders` ao invés de `render`

### Erro: "Cannot read properties of undefined (reading 'on')"

**Causa:** Supabase channel não está mockado

**Solução:** Use `createMockChannel()` do supabase-mocks.ts

### Erro: "Cannot read properties of undefined (reading 'mockReturnValue')"

**Causa:** Mock não foi configurado corretamente

**Solução:** Verifique se está usando `vi.mocked()` corretamente:

```tsx
import { vi } from "vitest";

vi.mocked(supabase.from).mockReturnValue(/* ... */);
```

## 📖 Exemplos Completos

Veja os testes atualizados para exemplos completos:

- `src/components/admin/ExportButton.test.tsx`
- `src/components/admin/PeriodFilter.test.tsx`
- `src/hooks/useSystemSettings.test.tsx`

## 🔗 Referências

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [React Query Testing](https://tanstack.com/query/latest/docs/react/guides/testing)
- [Supabase Testing](https://supabase.com/docs/guides/getting-started/testing)
