# Guia de Testes Manuais: Chat Production Fixes

## 🎯 Objetivo
Validar as 3 correções críticas implementadas antes do deployment em produção.

---

## ✅ Checklist Geral

### Pré-requisitos:
- [ ] Migration aplicada localmente (`npx supabase db reset`)
- [ ] Frontend rodando (`npm run dev`)
- [ ] 2 navegadores/abas abertas (cliente + admin)
- [ ] Usuário cliente criado
- [ ] Usuário admin criado

---

## 📧 Teste 1: Email Notifications

### Setup:
1. Configurar secrets localmente (criar `.env.local`):
```bash
EMAIL_PROVIDER=resend
EMAIL_API_KEY=re_xxxxx  # Sua key de teste
EMAIL_FROM=test@example.com
EMAIL_FROM_NAME=Test Support
BASE_URL=http://localhost:5173
```

2. Deploy Edge Function localmente:
```bash
npx supabase functions serve send-email
```

### Cenário 1.1: Email para usuário offline
**Passos**:
1. Login como cliente
2. Criar conversa via formulário de contato
3. Fazer logout (simular offline)
4. Login como admin
5. Enviar mensagem para o cliente
6. Aguardar 30 segundos

**Resultado Esperado**:
- [ ] Email recebido na caixa de entrada do cliente
- [ ] Email contém nome do admin
- [ ] Email contém conteúdo da mensagem
- [ ] Email contém link para conversa
- [ ] Template HTML renderizado corretamente
- [ ] Registro criado em `email_notifications` com status 'sent'

**SQL para verificar**:
```sql
SELECT * FROM email_notifications 
WHERE recipient_user_id = 'ID_DO_CLIENTE'
ORDER BY created_at DESC;
```

### Cenário 1.2: Sem email para usuário online
**Passos**:
1. Login como cliente (manter aba aberta)
2. Admin envia mensagem
3. Aguardar 30 segundos

**Resultado Esperado**:
- [ ] Nenhum email enviado
- [ ] Nenhum registro em `email_notifications`
- [ ] Mensagem aparece no chat do cliente em tempo real

### Cenário 1.3: Retry em caso de falha
**Passos**:
1. Configurar API key inválida temporariamente
2. Admin envia mensagem para cliente offline
3. Verificar logs da Edge Function

**Resultado Esperado**:
- [ ] 3 tentativas de envio (1s, 2s, 4s de delay)
- [ ] Registro em `email_notifications` com status 'failed'
- [ ] `retry_count = 3`
- [ ] `error_message` preenchido

---

## 📎 Teste 2: Attachment System (Optimistic Updates)

### Cenário 2.1: Upload de imagem (cliente)
**Passos**:
1. Login como cliente
2. Abrir chat
3. Clicar em anexar
4. Selecionar imagem (< 5MB)
5. Observar UI

**Resultado Esperado**:
- [ ] Preview da imagem aparece IMEDIATAMENTE (< 100ms)
- [ ] Barra de progresso visível
- [ ] Progresso atualiza (0% → 100%)
- [ ] Após upload, preview permanece
- [ ] Console: SEM logs de `setTimeout`
- [ ] Console: SEM erros de Realtime

### Cenário 2.2: Upload de PDF (admin)
**Passos**:
1. Login como admin
2. Abrir conversa
3. Anexar PDF
4. Observar UI

**Resultado Esperado**:
- [ ] Nome do arquivo aparece imediatamente
- [ ] Indicador "Enviando... X%" visível
- [ ] Após upload, arquivo clicável
- [ ] Download funciona

### Cenário 2.3: Erro de upload
**Passos**:
1. Desconectar internet
2. Tentar anexar arquivo
3. Observar UI

**Resultado Esperado**:
- [ ] Mensagem de erro aparece
- [ ] Arquivo marcado com ❌
- [ ] Mensagem de erro descritiva
- [ ] Possível tentar novamente

### Cenário 2.4: Múltiplos anexos
**Passos**:
1. Selecionar 3 imagens de uma vez
2. Enviar mensagem
3. Observar UI

**Resultado Esperado**:
- [ ] Todos os 3 previews aparecem imediatamente
- [ ] Progresso individual para cada arquivo
- [ ] Todos persistem após upload
- [ ] Ordem mantida

### Cenário 2.5: Anexo de outro usuário (Realtime)
**Passos**:
1. Cliente e admin em abas separadas
2. Cliente envia imagem
3. Observar aba do admin

**Resultado Esperado**:
- [ ] Imagem aparece automaticamente no admin
- [ ] SEM necessidade de refresh manual
- [ ] Aparece em < 1 segundo

### Cenário 2.6: Persistência após refresh
**Passos**:
1. Enviar mensagem com anexo
2. Aguardar upload completo
3. Dar F5 na página
4. Abrir mesma conversa

**Resultado Esperado**:
- [ ] Anexo ainda visível
- [ ] Preview funciona
- [ ] Download funciona

---

## 💬 Teste 3: Typing Indicator

### Cenário 3.1: Cliente digitando → Admin vê
**Passos**:
1. Abrir chat como cliente (aba 1)
2. Abrir mesma conversa como admin (aba 2)
3. Cliente começa a digitar
4. Observar aba do admin

**Resultado Esperado**:
- [ ] Após ~300ms, admin vê "[Nome] está digitando..."
- [ ] 3 bolinhas animadas
- [ ] Texto formatado corretamente

### Cenário 3.2: Admin digitando → Cliente vê
**Passos**:
1. Admin digita
2. Observar aba do cliente

**Resultado Esperado**:
- [ ] Cliente vê "Admin está digitando..."
- [ ] Animação suave

### Cenário 3.3: Timeout automático
**Passos**:
1. Cliente digita
2. Para de digitar (não envia)
3. Aguardar 3 segundos
4. Observar aba do admin

**Resultado Esperado**:
- [ ] Indicador aparece após 300ms
- [ ] Indicador desaparece após 3s de inatividade
- [ ] Transição suave (fade out)

### Cenário 3.4: Enviar mensagem limpa indicador
**Passos**:
1. Cliente digita
2. Admin vê indicador
3. Cliente envia mensagem (Enter)
4. Observar aba do admin

**Resultado Esperado**:
- [ ] Indicador desaparece IMEDIATAMENTE ao enviar
- [ ] Mensagem aparece no lugar

### Cenário 3.5: Múltiplos usuários digitando
**Passos**:
1. Abrir 3 abas: cliente, admin1, admin2
2. Cliente e admin1 digitam ao mesmo tempo
3. Observar aba do admin2

**Resultado Esperado**:
- [ ] Admin2 vê "Cliente e Admin1 estão digitando..."
- [ ] Formato correto para 2 usuários

### Cenário 3.6: Input vazio não dispara
**Passos**:
1. Cliente foca no input
2. Não digita nada
3. Observar aba do admin

**Resultado Esperado**:
- [ ] Nenhum indicador aparece
- [ ] Sem broadcasts desnecessários

### Cenário 3.7: Nota interna não dispara (admin)
**Passos**:
1. Admin ativa "Nota Interna"
2. Admin digita
3. Observar aba do cliente

**Resultado Esperado**:
- [ ] Cliente NÃO vê indicador de digitação
- [ ] Notas internas não disparam typing events

---

## 🔍 Verificações de Código

### Checklist de Código Limpo:
- [ ] `ChatButton.tsx`: SEM `setTimeout`
- [ ] `ChatButton.tsx`: SEM `refreshKey`
- [ ] `ChatButton.tsx`: SEM `onMessageSent` callback
- [ ] `useMessages.ts`: TEM `optimisticAttachments` state
- [ ] `useMessages.ts`: TEM funções `add/update/removeOptimisticAttachment`
- [ ] `CustomerMessageInput.tsx`: USA `startTyping()` e `stopTyping()`
- [ ] `ChatInterface.tsx`: USA `startTyping()` e `stopTyping()`

### Verificar no Console do Browser:
```javascript
// Não deve haver:
- Logs de setTimeout
- Erros de Realtime subscription
- Warnings de React keys
- Memory leaks

// Deve haver:
- Logs de typing events (se debug ativado)
- Logs de attachment uploads
- Logs de Realtime connections
```

---

## 📊 Métricas de Performance

### Timing Esperado:
- **Optimistic Update**: < 10ms (instantâneo)
- **Typing Indicator**: ~350ms (300ms debounce + 50ms broadcast)
- **Email Notification**: < 1s (após trigger)
- **Attachment Upload**: Depende do tamanho (100-500ms por MB)
- **Realtime Broadcast**: < 100ms

### Ferramentas:
```javascript
// No console do browser
console.time('optimistic-update');
// ... ação ...
console.timeEnd('optimistic-update');
```

---

## 🐛 Troubleshooting

### Problema: Typing indicator não aparece
**Verificar**:
1. Console: Erros de Realtime?
2. Network tab: Broadcast events sendo enviados?
3. User ID e Name sendo passados corretamente?

### Problema: Anexos não aparecem
**Verificar**:
1. Console: Erros de upload?
2. Storage bucket: Arquivo foi criado?
3. Realtime: Evento INSERT foi recebido?
4. Optimistic attachments: Estado correto?

### Problema: Email não enviado
**Verificar**:
1. Edge Function: Está rodando?
2. Secrets: Configurados corretamente?
3. API Key: Válida?
4. Logs: `npx supabase functions logs send-email`

---

## ✅ Critérios de Aprovação

### Para aprovar para produção, TODOS devem passar:

**Email Notifications**:
- [ ] Email recebido para usuário offline
- [ ] Sem email para usuário online
- [ ] Retry funciona em caso de falha
- [ ] Template HTML renderizado corretamente

**Attachment System**:
- [ ] Anexos aparecem instantaneamente
- [ ] Barra de progresso funciona
- [ ] Anexos persistem após refresh
- [ ] Realtime funciona bidirecionalmente
- [ ] SEM setTimeout no código
- [ ] SEM refreshKey no código

**Typing Indicator**:
- [ ] Funciona cliente → admin
- [ ] Funciona admin → cliente
- [ ] Timeout de 3s funciona
- [ ] Limpa ao enviar mensagem
- [ ] Múltiplos usuários formatado corretamente
- [ ] Input vazio não dispara

**Geral**:
- [ ] Sem erros no console
- [ ] Sem warnings de React
- [ ] Performance aceitável
- [ ] UX fluida e profissional

---

## 📝 Relatório de Testes

Após completar todos os testes, preencher:

**Data**: ___________  
**Testador**: ___________  
**Ambiente**: [ ] Local [ ] Staging [ ] Produção

**Resultados**:
- Email Notifications: [ ] ✅ Passou [ ] ❌ Falhou
- Attachment System: [ ] ✅ Passou [ ] ❌ Falhou
- Typing Indicator: [ ] ✅ Passou [ ] ❌ Falhou

**Bugs Encontrados**:
1. ___________
2. ___________
3. ___________

**Aprovado para produção**: [ ] SIM [ ] NÃO

**Assinatura**: ___________

---

**Última atualização**: 2026-02-22  
**Versão**: 1.0.0
