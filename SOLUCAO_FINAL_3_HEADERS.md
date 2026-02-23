# Solução Final: 3 Headers na Página de Suporte

## Problema Real

A página `/suporte` estava exibindo 3 headers empilhados verticalmente.

## Causa Raiz Identificada

O problema NÃO era de re-renders, mas sim de **aninhamento incorreto de componentes**.

### Estrutura Incorreta

```tsx
// Support.tsx (ERRADO)
<RequireAuth>
  <AppShell>  {/* AppShell aqui */}
    <div>Conteúdo</div>
  </AppShell>
</RequireAuth>

// RequireAuth.tsx
export default function RequireAuth({ children }) {
  return <AppShell>{children}</AppShell>;  {/* AppShell aqui também! */}
}
```

Isso criava:
```
RequireAuth
  └─ AppShell (Header 1)
      └─ Support
          └─ AppShell (Header 2)
              └─ AppShell (Header 3)
```

## Solução Aplicada

Remover o `AppShell` da página `Support.tsx`, pois o `RequireAuth` já o fornece.

### Antes

```tsx
// Support.tsx
return (
  <RequireAuth>
    <AppShell>  {/* ❌ DUPLICADO */}
      <SEOHead title="Suporte" />
      <div>...</div>
    </AppShell>
  </RequireAuth>
);
```

### Depois

```tsx
// Support.tsx
return (
  <RequireAuth>  {/* RequireAuth já fornece AppShell */}
    <SEOHead title="Suporte" />
    <div>...</div>
  </RequireAuth>
);
```

## Arquivos Modificados

1. **src/pages/Support.tsx**
   - Removido import de `AppShell`
   - Removido `<AppShell>` wrapper
   - Mantido apenas `<RequireAuth>`

2. **src/lib/auth.ts**
   - Corrigido loop infinito de re-renders
   - Adicionada flag `initialLoadDone`

3. **src/lib/roles.ts**
   - Adicionado `refetchOnMount: false`
   - Adicionado `refetchOnWindowFocus: false`

4. **src/components/AppShell.tsx**
   - Otimizado com `useMemo` para props estáveis
   - Usa `user?.id` ao invés de `user` nas dependências

5. **src/components/shell/AppHeader.tsx**
   - Memoizado com `memo()`

## Resultado

Agora a estrutura correta é:

```
RequireAuth
  └─ AppShell (1 único header)
      └─ Support content
```

## Como Verificar

1. Acesse `http://localhost:8080/suporte`
2. Deve haver apenas 1 header visível
3. Execute no console:
```javascript
document.querySelectorAll('header').length
```
Deve retornar: `1`

## Lição Aprendida

Quando usar `RequireAuth`, NÃO adicione `AppShell` manualmente na página, pois:
- `RequireAuth` já fornece `AppShell`
- Adicionar outro `AppShell` cria aninhamento duplicado
- Isso resulta em múltiplos headers/footers

## Padrão Correto

```tsx
// ✅ CORRETO
<RequireAuth>
  <SEOHead title="Minha Página" />
  <div>Conteúdo</div>
</RequireAuth>

// ❌ ERRADO
<RequireAuth>
  <AppShell>
    <div>Conteúdo</div>
  </AppShell>
</RequireAuth>
```
