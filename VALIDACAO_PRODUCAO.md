# Validação Premium Club v2.0 em Produção

**Data:** 26/02/2026  
**URL:** https://ordax-402ki8wow-jogo-brasils-projects.vercel.app

## Checklist de Validação

### 1. Verificar Site Está Online ✅
- [ ] Acessar URL principal
- [ ] Site carrega sem erros
- [ ] Sem erros no console (F12)
- [ ] Imagens carregam corretamente

### 2. Testar Página de Assinatura
**URL:** `/subscribe` ou `/subscribe-collection`

Verificar:
- [ ] Página carrega
- [ ] Planos aparecem:
  - Trimestral: R$ 1.350,00 (3 entregas)
  - Semestral: R$ 2.700,00 (6 entregas + 1 bônus)
- [ ] Seletor de coleção funciona
- [ ] Seletor de personagem funciona
- [ ] Informações de ciclo aparecem
- [ ] Datas de entrega são exibidas

### 3. Testar Painel Admin - Ciclos
**URL:** `/admin/cycles`

Verificar:
- [ ] Página carrega (precisa ser admin)
- [ ] Ciclos de Março 2026 aparecem:
  - Ciclo 1: 01/03 - 15/03
  - Ciclo 2: 16/03 - 31/03
- [ ] Ciclos de Abril 2026 aparecem
- [ ] Ciclos de Maio 2026 aparecem
- [ ] Capacidade é exibida (0/500)
- [ ] Status é exibido (open)
- [ ] Filtros funcionam

### 4. Testar Painel Admin - Feriados
**URL:** `/admin/holidays`

Verificar:
- [ ] Página carrega
- [ ] Feriados 2026-2030 aparecem
- [ ] Pode adicionar novo feriado
- [ ] Pode editar feriado
- [ ] Pode deletar feriado

### 5. Criar Assinatura Teste (CRÍTICO)

**Passo a passo:**

1. Fazer login como usuário teste
2. Ir para `/subscribe`
3. Selecionar **Plano Trimestral**
4. Selecionar uma coleção (ex: Marvel)
5. Selecionar um personagem (ex: Homem-Aranha)
6. Clicar em "Assinar"
7. Aguardar confirmação

**Verificar:**
- [ ] Assinatura foi criada
- [ ] Mensagem de sucesso aparece
- [ ] Redirecionamento funciona

### 6. Verificar Assinatura no Banco

Acessar Supabase Dashboard:
https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/editor

**Query 1: Verificar assinatura criada**
```sql
SELECT 
  id,
  user_id,
  collection_id,
  plan_type,
  is_legacy,
  status,
  created_at
FROM subscriptions 
WHERE is_legacy = false 
ORDER BY created_at DESC 
LIMIT 5;
```

Verificar:
- [ ] Assinatura aparece
- [ ] `is_legacy = false`
- [ ] `plan_type` correto (quarterly ou biannual)
- [ ] `status = active`

**Query 2: Verificar entregas agendadas**
```sql
SELECT 
  sd.id,
  sd.subscription_id,
  sd.delivery_number,
  sd.cycle_id,
  sd.status,
  c.cycle_number,
  c.month,
  c.year,
  c.shipping_date
FROM scheduled_deliveries sd
JOIN cycles c ON c.id = sd.cycle_id
WHERE sd.subscription_id = '<SUBSCRIPTION_ID>'
ORDER BY sd.delivery_number;
```

Verificar:
- [ ] 3 entregas para Trimestral (ou 6 para Semestral)
- [ ] Cada entrega tem um ciclo diferente
- [ ] Datas de envio estão corretas
- [ ] Status = scheduled

**Query 3: Verificar capacidade dos ciclos**
```sql
SELECT 
  id,
  cycle_number,
  month,
  year,
  capacity_current,
  capacity_max,
  status
FROM cycles 
WHERE id IN (
  SELECT DISTINCT cycle_id 
  FROM scheduled_deliveries 
  WHERE subscription_id = '<SUBSCRIPTION_ID>'
)
ORDER BY year, month, cycle_number;
```

Verificar:
- [ ] `capacity_current` aumentou em 1
- [ ] Não ultrapassou `capacity_max` (500)

### 7. Verificar Edge Functions

**Dashboard:**
https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud/functions

Verificar:
- [ ] `create-subscription-v2` está ACTIVE
- [ ] `schedule-deliveries` está ACTIVE
- [ ] Sem erros nos logs

**Ver logs:**
```bash
supabase functions logs create-subscription-v2 --tail
supabase functions logs schedule-deliveries --tail
```

### 8. Testar Mudança de Personagem

1. Acessar assinatura criada
2. Tentar mudar personagem
3. Verificar:
   - [ ] Botão de mudança aparece
   - [ ] Countdown até cutoff aparece
   - [ ] Mudança funciona (se dentro do prazo)
   - [ ] Bloqueio funciona (se fora do prazo)

### 9. Monitoramento (Primeiras 24h)

**Métricas a acompanhar:**

Dashboard Vercel:
https://vercel.com/jogo-brasils-projects/ordax

- [ ] Uptime > 99%
- [ ] Tempo de resposta < 2s
- [ ] Taxa de erro < 1%
- [ ] Sem erros 500

Dashboard Supabase:
https://supabase.com/dashboard/project/pabxpvqwtvbjaunjejud

- [ ] Database health OK
- [ ] Edge Functions respondendo
- [ ] Sem erros críticos

### 10. Testes de Performance

**Teste 1: Carregamento da página**
- [ ] Página inicial < 2s
- [ ] Página de assinatura < 2s
- [ ] Painel admin < 3s

**Teste 2: Criação de assinatura**
- [ ] Processo completo < 5s
- [ ] Sem travamentos
- [ ] Feedback visual adequado

**Teste 3: Navegação**
- [ ] Transições suaves
- [ ] Sem delays perceptíveis
- [ ] Responsivo em mobile

## Problemas Encontrados

### Problema 1: [Descrever]
- **Severidade:** Crítico / Alto / Médio / Baixo
- **Descrição:** 
- **Como reproduzir:**
- **Solução:**

### Problema 2: [Descrever]
- **Severidade:** 
- **Descrição:** 
- **Como reproduzir:**
- **Solução:**

## Comandos Úteis

### Verificar logs em tempo real
```bash
# Edge Functions
supabase functions logs create-subscription-v2 --tail
supabase functions logs schedule-deliveries --tail

# Vercel
vercel logs <deployment-url> --follow
```

### Verificar status
```bash
# Vercel
vercel ls

# Supabase
supabase functions list
```

### Queries úteis
```sql
-- Total de assinaturas v2.0
SELECT COUNT(*) FROM subscriptions WHERE is_legacy = false;

-- Total de entregas agendadas
SELECT COUNT(*) FROM scheduled_deliveries;

-- Capacidade dos ciclos
SELECT 
  cycle_number,
  month,
  year,
  capacity_current,
  capacity_max,
  ROUND((capacity_current::float / capacity_max) * 100, 2) as percentage
FROM cycles
WHERE year = 2026 AND month IN (3, 4, 5)
ORDER BY month, cycle_number;

-- Últimas assinaturas criadas
SELECT 
  s.id,
  s.created_at,
  s.plan_type,
  u.email,
  c.name as collection_name
FROM subscriptions s
JOIN auth.users u ON u.id = s.user_id
LEFT JOIN collections c ON c.id = s.collection_id
WHERE s.is_legacy = false
ORDER BY s.created_at DESC
LIMIT 10;
```

## Rollback (Se Necessário)

Se houver problemas críticos:

### 1. Desativar Feature Flags
```typescript
// src/config/featureFlags.ts
export const featureFlags = {
  premiumClubV2: false, // ❌ DESATIVAR
  premiumClubCycles: false,
  premiumClubDeliveries: false,
  premiumClubBonusPieces: false,
};
```

### 2. Rebuild e Redeploy
```bash
npm run build
vercel --prod --yes
```

### 3. Rollback Completo
Ver `DEPLOY_CHECKLIST.md` seção "Rollback"

## Próximos Passos

Após validação bem-sucedida:

1. ✅ Monitorar por 24 horas
2. ✅ Coletar feedback de usuários
3. ✅ Ajustar capacidade se necessário
4. ✅ Documentar aprendizados
5. ✅ Planejar melhorias

## Status Final

- **Data de Validação:** ___/___/2026
- **Validado por:** _______________
- **Status:** ⏳ Em validação / ✅ Aprovado / ❌ Problemas encontrados
- **Observações:**

---

**Versão:** 2.0.0  
**Ambiente:** Produção  
**Última atualização:** 26/02/2026
