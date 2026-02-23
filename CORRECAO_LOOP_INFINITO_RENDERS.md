# Correção: Loop Infinito de Re-renders

## Problema Identificado

A página `/suporte` estava renderizando o `AppShell` e `AppHeader` mais de 30 vezes, causando:
- 3 headers visíveis empilhados
- Performance extremamente degradada
- Loop infinito de re-renders

## Causa Raiz

O problema era causado por uma combinação de fatores:

1. **useAuth**: Chamava `setState` múltiplas vezes (listener + getSession)
2. **useIsAdmin**: Refetchava constantemente sem `staleTime`
3. **AppShell**: Não estava memoizado, re-renderizando a cada mudança

## Correções Aplicadas

### 1. AppShell.tsx - Memoização
```typescript
import { memo } from "react";

function AppShellComponent({ children }: PropsWithChildren) {
  // ... código
}

export default memo(AppShellComponent);
```

**Benefício**: Evita re-renders desnecessários quando as props não mudam.

### 2. auth.ts - Controle de Montagem
```typescript
export function useAuth() {
  const [state, setState] = useState<AuthState>({ 
    session: null, 
    user: null, 
    isLoading: true 
  });

  useEffect(() => {
    let mounted = true;

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setState({ session, user: session?.user ?? null, isLoading: false });
      }
    });

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (mounted) {
          setState({ 
            session: data.session ?? null, 
            user: data.session?.user ?? null, 
            isLoading: false 
          });
        }
      })
      .catch(() => {
        if (mounted) {
          setState((s) => ({ ...s, isLoading: false }));
        }
      });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
```

**Benefício**: Previne `setState` em componentes desmontados.

### 3. roles.ts - Cache de Queries
```typescript
export function useIsAdmin(userId?: string) {
  return useQuery({
    queryKey: ["is-admin", userId],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    queryFn: async () => {
      if (!userId) return false;
      const { data, error } = await supabase.rpc("has_role", { 
        _user_id: userId, 
        _role: "admin" 
      });
      if (error) throw error;
      return Boolean(data);
    },
  });
}
```

**Benefício**: Evita refetches desnecessários, mantendo o resultado em cache por 5 minutos.

## Resultado Esperado

Após as correções:
- Apenas 1 header visível
- AppShell renderiza 2-3 vezes no máximo (montagem inicial + carregamento de dados)
- Performance significativamente melhorada
- Sem loops infinitos

## Como Verificar

1. Recarregue a página `/suporte` (Ctrl+F5)
2. Abra o DevTools Console (F12)
3. Você deve ver apenas algumas renderizações iniciais
4. Execute no console:
```javascript
document.querySelectorAll('header').length
```
Deve retornar: `1`

## Impacto em Outras Páginas

Essas otimizações beneficiam TODAS as páginas que usam:
- `AppShell`
- `useAuth`
- `useIsAdmin`

Todas as páginas do app agora terão melhor performance.
