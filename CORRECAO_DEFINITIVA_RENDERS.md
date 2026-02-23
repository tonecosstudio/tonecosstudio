# Correção Definitiva: Loop Infinito de Re-renders

## Análise do Problema

Analisando os logs, identifiquei o problema raiz:

```
userId: undefined → userId: 'f5ac399c...' → userId: undefined → userId: 'f5ac399c...'
```

O `userId` estava alternando entre `undefined` e o ID real infinitamente.

## Causa Raiz

O `useAuth` estava chamando `setState` duas vezes de forma conflitante:

1. **onAuthStateChange** (listener) - Dispara imediatamente com `null`
2. **getSession()** - Dispara logo depois com a sessão real

Isso criava um loop:
- Listener dispara → userId = undefined
- getSession dispara → userId = 'xxx'
- Listener dispara novamente → userId = undefined
- E assim por diante...

## Solução Implementada

### 1. auth.ts - Ordem Correta e Flag de Controle

```typescript
export function useAuth() {
  const [state, setState] = useState<AuthState>({ 
    session: null, 
    user: null, 
    isLoading: true 
  });

  useEffect(() => {
    let mounted = true;
    let initialLoadDone = false;

    // PRIMEIRO: Buscar sessão atual
    supabase.auth.getSession().then(({ data }) => {
      if (mounted && !initialLoadDone) {
        initialLoadDone = true; // Marca como carregado
        setState({ 
          session: data.session ?? null, 
          user: data.session?.user ?? null, 
          isLoading: false 
        });
      }
    });

    // DEPOIS: Escutar mudanças (só atualiza após carga inicial)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted && initialLoadDone) {
        setState({ session, user: session?.user ?? null, isLoading: false });
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

**Mudanças chave:**
- Flag `initialLoadDone` previne conflitos entre getSession e listener
- getSession executa PRIMEIRO e marca como concluído
- Listener só atualiza DEPOIS da carga inicial

### 2. roles.ts - Desabilitar Refetches Desnecessários

```typescript
export function useIsAdmin(userId?: string) {
  return useQuery({
    queryKey: ["is-admin", userId],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false,      // NOVO
    refetchOnWindowFocus: false, // NOVO
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

**Mudanças chave:**
- `refetchOnMount: false` - Não refetch ao montar se já tem cache
- `refetchOnWindowFocus: false` - Não refetch ao focar na janela

### 3. AppShell.tsx - Dependências Estáveis

```typescript
const headerProps = useMemo(() => ({
  user,
  isAdmin: Boolean(isAdmin),
  cartCount: count,
  onSignOut: signOut
}), [user?.id, isAdmin, count]); // user?.id ao invés de user
```

**Mudança chave:**
- Usa `user?.id` ao invés de `user` nas dependências
- Evita re-renders quando o objeto `user` muda mas o ID permanece igual

## Resultado Esperado

Após as correções, você deve ver no console:

```
AppShell render {pathname: '/suporte', userId: undefined, isAdmin: undefined, count: 0, isLoading: true}
AppShell render {pathname: '/suporte', userId: 'f5ac399c...', isAdmin: undefined, count: 0, isLoading: false}
AppShell render {pathname: '/suporte', userId: 'f5ac399c...', isAdmin: false, count: 0, isLoading: false}
```

Total: 3 renders (inicial, após auth, após isAdmin) - NORMAL e esperado.

## Como Testar

1. Feche TODAS as abas do navegador
2. Abra uma nova aba
3. Acesse `http://localhost:8080/suporte`
4. Verifique o console - deve ter no máximo 3-4 renders
5. Execute no console:
```javascript
document.querySelectorAll('header').length
```
Deve retornar: `1`

## Por Que Isso Aconteceu

O problema é comum em apps React + Supabase porque:
1. Supabase dispara eventos de auth de forma assíncrona
2. React Query refetch por padrão em várias situações
3. Objetos como `user` mudam referência mesmo com mesmos valores

A solução envolve:
- Controlar a ordem de execução (getSession antes de listener)
- Desabilitar refetches desnecessários
- Usar dependências estáveis (IDs ao invés de objetos)
