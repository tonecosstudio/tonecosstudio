# Plano de Implementação - Nova Página de Pedidos

**Data**: 2026-03-08  
**Estimativa**: 2-3 horas  
**Prioridade**: Alta

## Fase 1: Diagnóstico (15 min)

### 1.1 Verificar Dados no Banco
- [ ] Executar `scripts/diagnostics/verificar-pedidos-avulsos.sql`
- [ ] Confirmar se há pedidos avulsos cadastrados
- [ ] Verificar integridade dos relacionamentos (foreign keys)
- [ ] Identificar causa raiz do problema

### 1.2 Testar Query Atual
- [ ] Abrir console do navegador em `/admin/orders`
- [ ] Verificar logs de erro
- [ ] Testar query diretamente no Supabase
- [ ] Documentar erros encontrados

## Fase 2: Serviço Otimizado (30 min)

### 2.1 Criar orders-service-v2.ts
```typescript
// Funções principais:
- fetchAllOrders() - Query unificada otimizada
- fetchOrderById() - Busca individual
- updateOrderStatus() - Atualização de status
- exportOrders() - Exportação CSV
```

### 2.2 Otimizações
- ✅ Usar LEFT JOIN para evitar perda de dados
- ✅ Buscar todos os relacionamentos em paralelo
- ✅ Implementar cache inteligente
- ✅ Adicionar logs detalhados
- ✅ Tratamento de erros robusto

## Fase 3: Hooks de Dados (20 min)

### 3.1 useOrdersData.ts
```typescript
// Responsabilidades:
- Gerenciar estado de loading/error
- Implementar paginação
- Implementar prefetch
- Cache com TanStack Query
```

### 3.2 useOrdersFilters.ts
```typescript
// Responsabilidades:
- Gerenciar filtros (tipo, status, data)
- Gerenciar busca
- Sincronizar com URL (query params)
- Resetar filtros
```

### 3.3 useOrdersActions.ts
```typescript
// Responsabilidades:
- Atualizar status (individual/massa)
- Exportar CSV
- Gerar etiquetas
- Invalidar cache após mutações
```


## Fase 4: Componentes Base (45 min)

### 4.1 OrdersHeader.tsx
- [ ] Título e descrição
- [ ] Contador de pedidos
- [ ] Stats rápidas (por tipo)

### 4.2 OrdersFilters.tsx
- [ ] Select de tipo
- [ ] Multi-select de status
- [ ] Date range picker
- [ ] Botão de reset

### 4.3 OrdersSearch.tsx
- [ ] Input com debounce
- [ ] Ícone de loading
- [ ] Botão de limpar
- [ ] Sugestões (opcional)

### 4.4 OrdersTable.tsx
- [ ] Cabeçalho com checkbox "selecionar todos"
- [ ] Colunas: tipo, cliente, coleção, status, valor, data
- [ ] Ordenação por coluna
- [ ] Loading skeleton
- [ ] Estado vazio

### 4.5 OrderRow.tsx
- [ ] Checkbox de seleção
- [ ] Ícone por tipo
- [ ] Badge de status
- [ ] Formatação de valores
- [ ] Data relativa
- [ ] Click para abrir detalhes

### 4.6 OrderDetailPanel.tsx
- [ ] Slide-in panel
- [ ] Informações completas
- [ ] Histórico de status
- [ ] Ações rápidas
- [ ] Botão de fechar

### 4.7 OrderActions.tsx
- [ ] Barra de ações em massa
- [ ] Contador de selecionados
- [ ] Botões: atualizar status, exportar, limpar
- [ ] Modais de confirmação

### 4.8 OrdersPagination.tsx
- [ ] Navegação de páginas
- [ ] Select de itens por página
- [ ] Info de total
- [ ] Prefetch da próxima página

## Fase 5: Página Principal (30 min)

### 5.1 OrdersPageV2.tsx
```typescript
// Estrutura:
- Usar hooks de dados e filtros
- Compor componentes
- Gerenciar estado local (modais, painel)
- Tratamento de erros
- SEO
```

### 5.2 Integração
- [ ] Importar todos os componentes
- [ ] Conectar hooks
- [ ] Implementar handlers
- [ ] Adicionar loading states
- [ ] Adicionar error boundaries

## Fase 6: Testes e Validação (30 min)

### 6.1 Testes Manuais
- [ ] Verificar que todos os tipos aparecem
- [ ] Testar filtros
- [ ] Testar busca
- [ ] Testar paginação
- [ ] Testar ações em massa
- [ ] Testar detalhes
- [ ] Testar responsividade

### 6.2 Testes de Performance
- [ ] Verificar tempo de carregamento
- [ ] Verificar prefetch
- [ ] Verificar cache
- [ ] Verificar queries no Supabase

### 6.3 Testes de Erro
- [ ] Simular erro de rede
- [ ] Simular dados vazios
- [ ] Simular erro de permissão
- [ ] Verificar mensagens de erro

## Fase 7: Migração (15 min)

### 7.1 Atualizar Rotas
```typescript
// Em src/App.tsx ou router config
// Trocar OrdersPage por OrdersPageV2
<Route path="/admin/orders" element={<OrdersPageV2 />} />
```

### 7.2 Backup da Página Antiga
- [ ] Renomear OrdersPage.tsx para OrdersPageOld.tsx
- [ ] Manter por 1 semana para rollback se necessário
- [ ] Documentar diferenças

### 7.3 Atualizar Links
- [ ] Verificar todos os links para /admin/orders
- [ ] Atualizar navegação
- [ ] Atualizar breadcrumbs

## Fase 8: Documentação (15 min)

### 8.1 Documentar Mudanças
- [ ] Criar CHANGELOG.md
- [ ] Documentar novas funcionalidades
- [ ] Documentar breaking changes
- [ ] Atualizar README

### 8.2 Documentar Código
- [ ] JSDoc em funções principais
- [ ] Comentários em lógica complexa
- [ ] Exemplos de uso
- [ ] Tipos TypeScript documentados

## Checklist Final

### Funcionalidades
- [ ] Todos os tipos de pedidos aparecem
- [ ] Filtros funcionam corretamente
- [ ] Busca funciona corretamente
- [ ] Paginação funciona corretamente
- [ ] Ações em massa funcionam
- [ ] Detalhes abrem corretamente
- [ ] Exportação CSV funciona

### Qualidade
- [ ] Sem erros no console
- [ ] Sem warnings do TypeScript
- [ ] Sem queries N+1
- [ ] Performance aceitável (<2s carregamento)
- [ ] Responsivo em mobile
- [ ] Acessível (keyboard navigation)

### Documentação
- [ ] Código documentado
- [ ] README atualizado
- [ ] CHANGELOG criado
- [ ] Testes documentados

## Rollback Plan

Se houver problemas críticos:

1. Reverter rota para OrdersPageOld.tsx
2. Investigar problema
3. Corrigir em branch separada
4. Testar novamente
5. Re-deploy

## Próximos Passos Após Implementação

1. Monitorar logs de erro
2. Coletar feedback dos usuários
3. Implementar melhorias sugeridas
4. Adicionar testes automatizados
5. Otimizar performance se necessário
