# Testes Recomendados - Sistema de Grupos

## 🧪 Plano de Testes

### 1. Testes Funcionais

#### 1.1 Listagem de Grupos
```typescript
// src/components/groups/__tests__/MemberGroupList.test.tsx

describe('MemberGroupList', () => {
  it('deve exibir skeleton durante carregamento', () => {
    // Verificar que skeleton é exibido
  });

  it('deve exibir lista de grupos após carregamento', () => {
    // Verificar que grupos são renderizados
  });

  it('deve exibir mensagem quando não há grupos', () => {
    // Verificar empty state
  });

  it('deve exibir erro quando falha ao carregar', () => {
    // Verificar error state
  });

  it('deve navegar ao clicar em um grupo', () => {
    // Verificar navegação
  });

  it('deve navegar ao pressionar Enter em um grupo', () => {
    // Verificar acessibilidade por teclado
  });

  it('deve exibir badge de mensagens não lidas', () => {
    // Verificar contador de não lidas
  });
});
```

#### 1.2 Mensagens do Grupo
```typescript
// src/components/groups/__tests__/MemberGroupMessages.test.tsx

describe('MemberGroupMessages', () => {
  it('deve exibir loading durante carregamento inicial', () => {
    // Verificar loading state
  });

  it('deve exibir mensagens após carregamento', () => {
    // Verificar renderização de mensagens
  });

  it('deve exibir empty state quando não há mensagens', () => {
    // Verificar empty state
  });

  it('deve atualizar mensagens em tempo real', () => {
    // Verificar Realtime
  });

  it('deve exibir anexos corretamente', () => {
    // Verificar renderização de anexos
  });

  it('deve fazer scroll automático para nova mensagem', () => {
    // Verificar auto-scroll
  });
});
```

#### 1.3 Hook de Mensagens
```typescript
// src/hooks/__tests__/useGroupMessages.test.ts

describe('useGroupMessages', () => {
  it('deve carregar mensagens ao montar', () => {
    // Verificar carregamento inicial
  });

  it('deve configurar subscription Realtime', () => {
    // Verificar setup de Realtime
  });

  it('deve adicionar nova mensagem via Realtime', () => {
    // Verificar recebimento de mensagem
  });

  it('deve evitar mensagens duplicadas', () => {
    // Verificar deduplicação
  });

  it('deve limpar subscription ao desmontar', () => {
    // Verificar cleanup
  });

  it('deve atualizar last_viewed_at ao abrir grupo', () => {
    // Verificar atualização de visualização
  });
});
```

---

### 2. Testes de Performance

#### 2.1 Teste de Queries
```sql
-- Verificar performance da função otimizada
EXPLAIN ANALYZE 
SELECT * FROM get_member_groups_optimized('user-id-here');

-- Deve executar em < 100ms
-- Deve fazer apenas 1 query principal
```

#### 2.2 Teste de Carga
```typescript
// Simular 100 usuários carregando grupos simultaneamente
describe('Performance Tests', () => {
  it('deve carregar grupos em menos de 500ms', async () => {
    const start = Date.now();
    await groupService.getMemberGroups(userId);
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(500);
  });

  it('deve suportar 100 requisições simultâneas', async () => {
    const promises = Array(100).fill(null).map(() => 
      groupService.getMemberGroups(userId)
    );
    await expect(Promise.all(promises)).resolves.toBeDefined();
  });
});
```

---

### 3. Testes de Acessibilidade

#### 3.1 Navegação por Teclado
```typescript
describe('Accessibility Tests', () => {
  it('deve permitir navegação por Tab', () => {
    // Verificar que todos os grupos são focáveis
  });

  it('deve permitir ativação por Enter', () => {
    // Verificar que Enter abre o grupo
  });

  it('deve permitir ativação por Space', () => {
    // Verificar que Space abre o grupo
  });

  it('deve ter aria-labels corretos', () => {
    // Verificar atributos ARIA
  });

  it('deve ter roles corretos', () => {
    // Verificar role="button"
  });
});
```

#### 3.2 Screen Reader
```typescript
describe('Screen Reader Tests', () => {
  it('deve anunciar número de mensagens não lidas', () => {
    // Verificar aria-label com contador
  });

  it('deve anunciar nome do grupo', () => {
    // Verificar aria-label com nome
  });

  it('deve anunciar estado de loading', () => {
    // Verificar aria-busy
  });
});
```

---

### 4. Testes de Integração

#### 4.1 Fluxo Completo
```typescript
describe('Integration Tests', () => {
  it('deve completar fluxo: listar > abrir > visualizar mensagens', async () => {
    // 1. Carregar lista de grupos
    // 2. Clicar em um grupo
    // 3. Verificar mensagens carregadas
    // 4. Verificar contador zerado
  });

  it('deve receber mensagem em tempo real', async () => {
    // 1. Abrir grupo
    // 2. Admin envia mensagem
    // 3. Verificar mensagem aparece
    // 4. Verificar scroll automático
  });

  it('deve atualizar contador de não lidas', async () => {
    // 1. Verificar contador inicial
    // 2. Admin envia mensagem
    // 3. Verificar contador incrementado
    // 4. Abrir grupo
    // 5. Verificar contador zerado
  });
});
```

---

### 5. Testes de Segurança

#### 5.1 RLS (Row Level Security)
```sql
-- Testar que usuário só vê seus grupos
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims.sub TO 'user-id-here';

SELECT * FROM chat_groups;
-- Deve retornar apenas grupos do usuário

SELECT * FROM chat_group_messages WHERE group_id = 'group-id';
-- Deve retornar mensagens apenas se usuário é membro
```

#### 5.2 Validações
```typescript
describe('Security Tests', () => {
  it('não deve permitir acesso a grupo sem membership', async () => {
    // Tentar acessar grupo de outro usuário
    await expect(
      messageService.listGroupMessages(groupId, unauthorizedUserId)
    ).rejects.toThrow('Você não é membro deste grupo');
  });

  it('não deve permitir envio de mensagem por não-admin', async () => {
    // Tentar enviar mensagem como usuário comum
    await expect(
      messageService.sendBroadcastMessage(groupId, userId, 'test')
    ).rejects.toThrow('Apenas administradores podem enviar mensagens');
  });
});
```

---

### 6. Testes de Erro

#### 6.1 Falhas de Rede
```typescript
describe('Error Handling Tests', () => {
  it('deve exibir erro quando API falha', async () => {
    // Simular falha de rede
    // Verificar mensagem de erro exibida
  });

  it('deve permitir retry após erro', async () => {
    // Simular falha
    // Clicar em retry
    // Verificar nova tentativa
  });

  it('deve funcionar offline com cache', async () => {
    // Carregar dados
    // Desconectar rede
    // Verificar dados em cache
  });
});
```

#### 6.2 Realtime Failures
```typescript
describe('Realtime Error Tests', () => {
  it('deve continuar funcionando se Realtime falhar', async () => {
    // Simular falha de Realtime
    // Verificar que app continua funcionando
    // Verificar fallback para polling manual
  });

  it('deve reconectar automaticamente', async () => {
    // Simular desconexão
    // Verificar tentativa de reconexão
  });
});
```

---

## 🎯 Checklist de Testes Manuais

### Funcionalidade Básica
- [ ] Carregar lista de grupos
- [ ] Clicar em um grupo
- [ ] Visualizar mensagens
- [ ] Ver anexos
- [ ] Scroll automático funciona
- [ ] Contador de não lidas atualiza

### Performance
- [ ] Carregamento rápido (< 1s)
- [ ] Sem lag ao navegar
- [ ] Realtime instantâneo
- [ ] Sem polling desnecessário

### Acessibilidade
- [ ] Navegação por Tab funciona
- [ ] Enter/Space ativam grupos
- [ ] Screen reader funciona
- [ ] Contraste adequado
- [ ] Foco visível

### Responsividade
- [ ] Mobile (< 768px)
- [ ] Tablet (768px - 1024px)
- [ ] Desktop (> 1024px)
- [ ] Orientação portrait/landscape

### Navegadores
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

### Estados
- [ ] Loading
- [ ] Empty state
- [ ] Error state
- [ ] Success state

---

## 📊 Métricas de Sucesso

### Performance
- Tempo de carregamento < 500ms
- Queries < 3 por operação
- Realtime latency < 100ms

### Qualidade
- Cobertura de testes > 80%
- 0 erros de TypeScript
- 0 warnings de acessibilidade

### UX
- Tempo de resposta percebido < 1s
- 0 "flashes" de conteúdo
- Feedback visual em todas as ações

---

## 🚀 Como Executar

### Testes Unitários
```bash
npm test
```

### Testes de Integração
```bash
npm run test:integration
```

### Testes E2E
```bash
npm run test:e2e
```

### Testes de Performance
```bash
npm run test:performance
```

### Testes de Acessibilidade
```bash
npm run test:a11y
```

---

## 📝 Relatório de Testes

Após executar os testes, gerar relatório:

```bash
npm run test:coverage
```

Verificar:
- Cobertura de código
- Testes falhando
- Performance metrics
- Acessibilidade score

---

## ✅ Critérios de Aceitação

Para considerar as correções completas:

1. ✅ Todos os testes unitários passando
2. ✅ Cobertura > 80%
3. ✅ Performance < 500ms
4. ✅ Acessibilidade > 90/100
5. ✅ 0 erros de TypeScript
6. ✅ 0 warnings de console
7. ✅ Funciona em todos os navegadores
8. ✅ Funciona em todos os tamanhos de tela
