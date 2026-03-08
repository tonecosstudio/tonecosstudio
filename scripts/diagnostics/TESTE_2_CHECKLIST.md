# ✅ TESTE 2: CHECKLIST RÁPIDO

**SQL confirmado**: 2 itens na fila (1 manual_payment + 1 standalone_purchase)

---

## 🖥️ VERIFICAR NA INTERFACE

### 1. Acessar ProductionHub
- [ ] Abrir aplicação
- [ ] Login como admin
- [ ] Ir para `/admin/production`

### 2. Visualização Kanban
- [ ] Página carrega sem erros?
- [ ] Vejo 2 cards no total?
- [ ] Card de "Naruto - Akatsuki" está visível?
- [ ] Card mostra nome do cliente?
- [ ] Card mostra status "Aguardando Escolha"?

### 3. Visualização Lista
- [ ] Clicar na aba "Lista"
- [ ] Tabela mostra 2 linhas?
- [ ] Linha de manual_payment está visível?
- [ ] Colunas estão preenchidas corretamente?

### 4. Filtros
- [ ] Filtro por status funciona?
- [ ] Busca por nome do cliente funciona?
- [ ] Filtro por tipo de pedido funciona?

### 5. Detalhes
- [ ] Clicar em um item
- [ ] Painel lateral abre?
- [ ] Mostra todos os detalhes?
- [ ] Botões de ação aparecem?

---

## ❌ SE ALGO NÃO FUNCIONAR

### Nenhum item aparece
1. Abrir DevTools (F12)
2. Ir para Console
3. Procurar erros em vermelho
4. Copiar mensagem de erro completa
5. Me informar

### Erro ao carregar
1. Ir para Network tab (F12)
2. Recarregar página
3. Procurar request para `production_queue`
4. Ver status code (200, 401, 403, 500?)
5. Ver resposta
6. Me informar

---

## ✅ RESULTADO

Marque uma opção:

- [ ] ✅ **PASSOU**: Tudo funciona, itens aparecem corretamente
- [ ] ⚠️ **PARCIAL**: Alguns itens aparecem, mas há problemas
- [ ] ❌ **FALHOU**: Nenhum item aparece ou erro crítico

Se falhou ou parcial, descreva o problema:
```
[Cole aqui o erro ou descrição do problema]
```

---

**Tempo estimado**: 3 minutos
