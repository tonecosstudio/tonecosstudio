# Resumo das Correções Aplicadas - Problema dos Headers

## Problema Original
Página `/suporte` exibindo 3 headers empilhados verticalmente.

## Correções Aplicadas

### 1. Removido AppShell Duplicado (Support.tsx)
**Antes:**
```tsx
<RequireAuth>
  <AppShell>  {/* ❌ Duplicado */}
    <div>Conteúdo</div>
  </AppShell>
</RequireAuth>
```

**Depois:**
```tsx
<RequireAuth>  {/* RequireAuth já fornece AppShell */}
  <div>Conteúdo</div>
</RequireAuth>
```

### 2. Otimizado useAuth (auth.ts)
- Adicionada flag `initialLoadDone` para prevenir conflitos
- getSession executa PRIMEIRO, depois listener
- Previne loop infinito de re-renders

### 3. Otimizado useIsAdmin (roles.ts)
- Adicionado `refetchOnMount: false`
- Adicionado `refetchOnWindowFocus: false`
- `staleTime: 5 minutos`

### 4. Otimizado AppShell
- Props estabilizadas com `useMemo`
- Usa `user?.id` ao invés de `user` nas dependências

### 5. Memoizado AppHeader
- Wrapped com `memo()` para evitar re-renders desnecessários

### 6. Otimizado RequireAuth
- Retorna `null` durante loading ao invés de renderizar AppShell
- Evita flash de conteúdo durante carregamento

## Status Atual
- ✅ Loop infinito de re-renders: CORRIGIDO
- ✅ 3 headers: CORRIGIDO (era aninhamento incorreto)
- ⚠️ 2 headers: INVESTIGANDO

## Possíveis Causas dos 2 Headers

1. **Transição Visual**: Durante o carregamento, pode haver uma transição entre estados
2. **CSS Sticky**: O `position: sticky` pode estar criando efeito visual de duplicação
3. **Cache do Navegador**: Código antigo ainda em cache
4. **React DevTools**: Pode estar mostrando componentes desmontados

## Como Verificar

### Método 1: Inspecionar Elemento
1. Clique com botão direito na página
2. Selecione "Inspecionar"
3. Na aba Elements, procure por `<header>`
4. Conte quantos elementos `<header>` existem

### Método 2: Console
```javascript
document.querySelectorAll('header').length
```

### Método 3: Screenshot
Tire uma screenshot mostrando os 2 headers para análise visual

## Próximos Passos

Se ainda houver 2 headers reais no DOM:
1. Verificar se há outro componente renderizando header
2. Verificar se o React está renderizando o componente duas vezes
3. Verificar se há algum portal ou modal criando header adicional
4. Verificar CSS que possa estar duplicando visualmente

## Arquivos Modificados

1. `src/pages/Support.tsx` - Removido AppShell
2. `src/lib/auth.ts` - Corrigido loop infinito
3. `src/lib/roles.ts` - Desabilitado refetches
4. `src/components/AppShell.tsx` - Otimizado com useMemo
5. `src/components/shell/AppHeader.tsx` - Memoizado
6. `src/components/RequireAuth.tsx` - Retorna null durante loading
