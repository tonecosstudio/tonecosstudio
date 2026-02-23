# Debug: Múltiplos Headers na Página de Suporte

## Console Logs Adicionados

Adicionei console.logs temporários para identificar o problema:

1. `AppShell renderizado` - Mostra quando o AppShell é renderizado
2. `AppHeader renderizado` - Mostra quando o AppHeader é renderizado  
3. `Support renderizado` - Mostra quando o componente Support é renderizado

## Como Testar

1. Abra o navegador e acesse: `http://localhost:8080/suporte`
2. Abra o DevTools (F12)
3. Vá para a aba Console
4. Verifique quantas vezes cada log aparece

## O Que Procurar

### Cenário Normal (1 header)
```
AppShell renderizado /suporte
AppHeader renderizado
Support renderizado { conversationIdFromUrl: null, loading: true }
Support renderizado { conversationIdFromUrl: null, loading: false }
```

### Cenário com Problema (3 headers)
Se você ver algo como:
```
AppShell renderizado /suporte
AppHeader renderizado
AppShell renderizado /suporte
AppHeader renderizado
AppShell renderizado /suporte
AppHeader renderizado
Support renderizado ...
```

Isso indica que o componente está sendo renderizado 3 vezes.

## Possíveis Causas

1. **React Query refetch**: Algum hook pode estar causando re-renders
2. **useAuth ou useIsAdmin**: Podem estar causando múltiplas renderizações
3. **Routing issue**: O React Router pode estar renderizando a rota múltiplas vezes
4. **CSS issue**: Pode ser apenas visual (menos provável)

## Próximos Passos

Após verificar o console, me informe:
1. Quantas vezes cada log aparece
2. Se há algum erro no console
3. Se o problema persiste após recarregar a página (Ctrl+F5)

## Solução Temporária

Se o problema for de renderização múltipla, podemos:
1. Adicionar um `useMemo` ou `useCallback` para evitar re-renders
2. Verificar se há loops infinitos nos useEffects
3. Simplificar a estrutura de componentes
