# Teste Simples - Página de Suporte

## Problema

A página `/suporte` está mostrando 3 headers idênticos empilhados.

## Teste Rápido

Vou criar uma versão simplificada para isolar o problema.

### Opção 1: Verificar se é problema de renderização

Abra o console do navegador (F12) e execute:
```javascript
document.querySelectorAll('header').length
```

Se retornar 3, o problema é de renderização múltipla.
Se retornar 1, o problema é visual/CSS.

### Opção 2: Verificar elementos no DOM

No DevTools, vá para a aba Elements e procure por `<header>`.
Conte quantos elementos `<header>` existem na página.

## Possível Solução Imediata

Se o problema for de renderização múltipla, pode ser causado por:

1. **React Query refetching**: O `useIsAdmin` ou `useAuth` podem estar causando re-renders
2. **useEffect loops**: Algum useEffect pode estar em loop infinito
3. **React Router**: A rota pode estar sendo renderizada múltiplas vezes

### Solução Temporária

Vou criar uma versão da página Support que não usa AppShell para testar:

```tsx
// Versão simplificada sem AppShell
export default function Support() {
  return (
    <div>
      <h1>Teste Simples</h1>
      <p>Se você ver apenas este conteúdo sem múltiplos headers, o problema está no AppShell</p>
    </div>
  );
}
```

## Próximos Passos

1. Verifique o console para os logs que adicionei
2. Execute o comando JavaScript acima no console
3. Me informe os resultados para eu poder corrigir o problema específico
