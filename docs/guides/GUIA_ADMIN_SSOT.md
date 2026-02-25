# 📘 Guia Rápido: Atualizar Cronograma de Lançamento

**Para:** Administradores  
**Tempo:** 2-3 minutos  
**Frequência:** Todo dia 15 do mês

---

## 🎯 Quando Usar

Use este guia sempre que um lote encerrar (dia 15 de cada mês) e você precisar atualizar as informações para o próximo ciclo.

---

## 📍 Passo 1: Acessar o Painel

1. Faça login como admin
2. No menu lateral, vá em **Configurações**
3. Clique em **Conteúdo (SSOT)**

Ou acesse diretamente: `https://seusite.com/admin/configuracoes-conteudo`

---

## 📝 Passo 2: Atualizar Informações

### Aba "Lote Atual"

Preencha os campos com as informações do próximo lote:

```
┌─────────────────────────────────────────────┐
│ Nome do Lote                                │
│ ┌─────────────────────────────────────────┐ │
│ │ Março/Abril                             │ │
│ └─────────────────────────────────────────┘ │
│ Nome do lote/ciclo atual                    │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Início das Vendas                           │
│ ┌─────────────────────────────────────────┐ │
│ │ 2026-03-15                              │ │
│ └─────────────────────────────────────────┘ │
│ Data de início das vendas (YYYY-MM-DD)     │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Fim das Vendas                              │
│ ┌─────────────────────────────────────────┐ │
│ │ 2026-04-15                              │ │
│ └─────────────────────────────────────────┘ │
│ Data de fim das vendas (YYYY-MM-DD)        │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Início da Produção                          │
│ ┌─────────────────────────────────────────┐ │
│ │ 2026-04-16                              │ │
│ └─────────────────────────────────────────┘ │
│ Data de início da produção (YYYY-MM-DD)    │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Fim da Produção                             │
│ ┌─────────────────────────────────────────┐ │
│ │ 2026-04-30                              │ │
│ └─────────────────────────────────────────┘ │
│ Data de fim da produção (YYYY-MM-DD)       │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Mês de Envio                                │
│ ┌─────────────────────────────────────────┐ │
│ │ Maio                                    │ │
│ └─────────────────────────────────────────┘ │
│ Mês de envio do lote atual                 │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Prazo de Envio (dia útil)                   │
│ ┌─────────────────────────────────────────┐ │
│ │ 5                                       │ │
│ └─────────────────────────────────────────┘ │
│ Dia útil limite de envio no mês            │
└─────────────────────────────────────────────┘
```

---

## 💾 Passo 3: Salvar

1. Clique no botão **"Salvar Alterações"** no final da página
2. Aguarde a mensagem de sucesso: ✅ "Configurações atualizadas com sucesso"

---

## ✅ Passo 4: Verificar

Abra em novas abas para confirmar que tudo foi atualizado:

- [ ] `/colecoes` - Verifique o banner no topo
- [ ] `/colecoes` - Role até o cronograma e verifique as datas
- [ ] `/planos` - Verifique o FAQ "Quando recebo a primeira peça?"

**Tudo atualizado?** ✅ Pronto!

---

## 📅 Padrão de Datas

### Regra Geral

```
Vendas:    Dia 15 → Dia 15 do mês seguinte (30 dias)
Produção:  Dia 16 → Dia 30 do mês seguinte (15 dias)
Envio:     Até 5º dia útil do mês seguinte
```

### Exemplo Prático

**Lote Março/Abril:**

```
Vendas:    15/03/2026 → 15/04/2026
Produção:  16/04/2026 → 30/04/2026
Envio:     Maio (até 5º dia útil)
```

**Lote Abril/Maio:**

```
Vendas:    15/04/2026 → 15/05/2026
Produção:  16/05/2026 → 30/05/2026
Envio:     Junho (até 5º dia útil)
```

---

## 🔄 Calendário de Atualizações 2026

| Lote    | Atualizar em | Vendas      | Produção | Envio     |
| ------- | ------------ | ----------- | -------- | --------- |
| Fev/Mar | 15/02        | 15/02-15/03 | 16-30/03 | Abril     |
| Mar/Abr | 15/03        | 15/03-15/04 | 16-30/04 | Maio      |
| Abr/Mai | 15/04        | 15/04-15/05 | 16-30/05 | Junho     |
| Mai/Jun | 15/05        | 15/05-15/06 | 16-30/06 | Julho     |
| Jun/Jul | 15/06        | 15/06-15/07 | 16-30/07 | Agosto    |
| Jul/Ago | 15/07        | 15/07-15/08 | 16-30/08 | Setembro  |
| Ago/Set | 15/08        | 15/08-15/09 | 16-30/09 | Outubro   |
| Set/Out | 15/09        | 15/09-15/10 | 16-30/10 | Novembro  |
| Out/Nov | 15/10        | 15/10-15/11 | 16-30/11 | Dezembro  |
| Nov/Dez | 15/11        | 15/11-15/12 | 16-30/12 | Janeiro   |
| Dez/Jan | 15/12        | 15/12-15/01 | 16-30/01 | Fevereiro |

---

## ⚠️ Atenção

### Não Esqueça

- ✅ Atualizar SEMPRE no dia 15
- ✅ Verificar se as datas estão corretas
- ✅ Confirmar que o mês de envio está correto
- ✅ Testar as páginas após salvar

### Não Precisa

- ❌ Editar código
- ❌ Fazer deploy
- ❌ Atualizar manualmente cada página
- ❌ Reiniciar servidor

---

## 🆘 Problemas Comuns

### "Erro ao atualizar configurações"

**Solução:**

1. Verifique sua conexão com internet
2. Confirme que você está logado como admin
3. Tente novamente

### "As páginas não atualizaram"

**Solução:**

1. Limpe o cache do navegador (Ctrl+Shift+R)
2. Aguarde até 5 minutos (tempo do cache)
3. Verifique se salvou corretamente

### "Esqueci de atualizar no dia 15"

**Solução:**

1. Atualize assim que lembrar
2. As páginas mostrarão as informações antigas até você atualizar
3. Após salvar, tudo volta ao normal

---

## 📞 Suporte

Se tiver dúvidas ou problemas:

1. Verifique este guia novamente
2. Consulte `CORRECOES_SSOT_IMPLEMENTADAS.md` para detalhes técnicos
3. Entre em contato com o desenvolvedor

---

## 🎓 Dicas Pro

### Preparar com Antecedência

Você pode preparar as informações do próximo lote alguns dias antes:

1. Anote as datas em um papel/nota
2. No dia 15, basta copiar e colar
3. Leva menos de 1 minuto!

### Criar Lembrete

Configure um lembrete mensal:

- **Título:** "Atualizar Lote no Admin"
- **Data:** Todo dia 15
- **Hora:** 9h da manhã
- **Repetir:** Mensalmente

### Verificação Rápida

Após salvar, abra apenas `/colecoes` e verifique:

- Banner no topo
- Cronograma no meio da página

Se esses dois estiverem corretos, o resto também está! ✅

---

## ✨ Benefícios

**Antes deste sistema:**

- ⏱️ 30+ minutos para atualizar
- 📝 Editar 5+ arquivos de código
- 🐛 Risco de esquecer algum lugar
- 💻 Precisava de conhecimento técnico

**Agora:**

- ⏱️ 2-3 minutos para atualizar
- 📝 Preencher 1 formulário simples
- 🐛 Impossível esquecer (tudo atualiza junto)
- 💻 Qualquer admin consegue fazer

---

**Última atualização:** 24/02/2026  
**Versão:** 1.0
