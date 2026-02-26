# 🚀 Instruções para Aplicar Sprint 1 - Fundação

## ✅ Status: PRONTO PARA APLICAR

O Sprint 1 está completo e pronto para ser aplicado ao projeto. Este sprint cria a base do sistema de Clube Premium sem afetar o sistema existente.

---

## 📦 O Que Foi Criado

### 1. Migration de Banco de Dados
**Arquivo:** `supabase/migrations/20260301000000_create_premium_club_system.sql`

**Cria:**
- ✅ Tabela `cycles` (ciclos quinzenais)
- ✅ Tabela `holidays` (feriados nacionais e da Bahia)
- ✅ Tabela `bonus_pieces` (peças bônus do plano semestral)
- ✅ Modificações em tabelas existentes (subscriptions, subscription_plans, collections, subscription_deliveries)
- ✅ Seed de feriados brasileiros 2026-2030
- ✅ Políticas RLS
- ✅ Índices otimizados

### 2. Serviços Core
**Arquivos:**
- `src/lib/services/timezoneService.ts` - Gerenciamento de timezone (America/Bahia UTC-3)
- `src/lib/services/businessDayService.ts` - Cálculo de dias úteis com feriados

### 3. Testes
**Arquivos:**
- `src/lib/services/timezoneService.test.ts` - 20+ casos de teste
- `src/lib/services/businessDayService.test.ts` - 30+ casos de teste
- `src/lib/services/businessDayService.property.test.ts` - 10 propriedades com 100+ iterações

---

## 🔧 Como Aplicar

### Passo 1: Verificar Arquivos Criados

```bash
# Verificar se os arquivos existem
ls -la supabase/migrations/20260301000000_create_premium_club_system.sql
ls -la src/lib/services/timezoneService.ts
ls -la src/lib/services/businessDayService.ts
```

### Passo 2: Aplicar Migration no Banco de Dados

**Opção A: Usando Supabase CLI (Recomendado)**
```bash
# Aplicar migration
npx supabase db push

# Ou se estiver usando supabase localmente
npx supabase db reset
```

**Opção B: Aplicar Manualmente no Supabase Dashboard**
1. Acesse: https://supabase.com/dashboard/project/YOUR_PROJECT/sql
2. Copie o conteúdo de `supabase/migrations/20260301000000_create_premium_club_system.sql`
3. Cole no editor SQL
4. Execute

### Passo 3: Verificar Tabelas Criadas

```sql
-- No Supabase SQL Editor, execute:

-- Verificar tabela cycles
SELECT * FROM cycles LIMIT 1;

-- Verificar tabela holidays
SELECT COUNT(*) as total_feriados FROM holidays;
-- Deve retornar ~50 feriados (2026-2030)

-- Verificar tabela bonus_pieces
SELECT * FROM bonus_pieces LIMIT 1;

-- Verificar colunas adicionadas
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'subscriptions' 
AND column_name IN ('entry_cycle_id', 'is_legacy_model', 'total_deliveries');
```

### Passo 4: Instalar Dependências (se necessário)

```bash
# Verificar se date-fns-tz está instalado
npm list date-fns-tz

# Se não estiver, instalar
npm install date-fns-tz

# Instalar fast-check para testes de propriedade
npm install -D fast-check
```

### Passo 5: Executar Testes

```bash
# Executar todos os testes do Sprint 1
npm test timezoneService
npm test businessDayService

# Ou executar todos os testes
npm test
```

---

## ✅ Checklist de Validação

Marque cada item após verificar:

- [ ] Migration aplicada com sucesso
- [ ] Tabela `cycles` existe e está vazia
- [ ] Tabela `holidays` existe e tem ~50 registros
- [ ] Tabela `bonus_pieces` existe e está vazia
- [ ] Colunas adicionadas em `subscriptions` existem
- [ ] Colunas adicionadas em `subscription_plans` existem
- [ ] Colunas adicionadas em `collections` existem
- [ ] Coluna `cycle_id` adicionada em `subscription_deliveries`
- [ ] Testes do TimezoneService passam
- [ ] Testes do BusinessDayService passam
- [ ] Testes de propriedade passam
- [ ] Sistema existente continua funcionando normalmente

---

## 🧪 Testes Manuais

### Teste 1: TimezoneService

```typescript
// No console do navegador ou em um arquivo de teste
import { timezoneService } from '@/lib/services/timezoneService';

// Testar conversão de timezone
const date = new Date('2026-03-15T23:59:59Z');
const bahiaDate = timezoneService.toSystemTimezone(date);
console.log('Data em Bahia:', timezoneService.formatDateTime(bahiaDate));

// Testar identificação de dia
const day = timezoneService.getDayOfMonth(bahiaDate);
console.log('Dia do mês:', day); // Deve ser 15 (Ciclo 1)
```

### Teste 2: BusinessDayService

```typescript
import { businessDayService } from '@/lib/services/businessDayService';

// Testar cálculo do 5º dia útil
const fifthDay = await businessDayService.calculateNthBusinessDay(3, 2026, 5);
console.log('5º dia útil de março/2026:', fifthDay);

// Testar se é dia útil
const isBusinessDay = await businessDayService.isBusinessDay(new Date('2026-03-15'));
console.log('15/03/2026 é dia útil?', isBusinessDay);

// Testar feriados
const holidays = await businessDayService.getHolidays(2026);
console.log('Feriados em 2026:', holidays.length);
```

### Teste 3: Verificar Feriados no Banco

```sql
-- Feriados nacionais
SELECT holiday_date, name, type 
FROM holidays 
WHERE type = 'national' 
AND EXTRACT(YEAR FROM holiday_date) = 2026
ORDER BY holiday_date;

-- Feriados da Bahia
SELECT holiday_date, name, type, state_code 
FROM holidays 
WHERE type = 'state' 
AND state_code = 'BA'
ORDER BY holiday_date;
```

---

## ⚠️ Possíveis Problemas e Soluções

### Problema 1: Migration falha com "relation already exists"
**Solução:** Algumas tabelas podem já existir. Verifique e ajuste a migration se necessário.

```sql
-- Verificar se tabelas existem
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('cycles', 'holidays', 'bonus_pieces');
```

### Problema 2: Testes falham com "Cannot find module"
**Solução:** Instalar dependências faltantes

```bash
npm install date-fns date-fns-tz
npm install -D fast-check @types/node
```

### Problema 3: Erro de timezone em testes
**Solução:** Configurar timezone nos testes

```typescript
// Adicionar no setup de testes
process.env.TZ = 'America/Bahia';
```

---

## 📊 Métricas de Sucesso

Após aplicar o Sprint 1, você deve ter:

- ✅ **3 novas tabelas** criadas
- ✅ **~50 feriados** cadastrados
- ✅ **4 tabelas modificadas** com novas colunas
- ✅ **2 serviços** funcionando
- ✅ **60+ testes** passando
- ✅ **0 quebras** no sistema existente

---

## 🎯 Próximos Passos

Após validar que tudo está funcionando:

1. ✅ Marque todos os itens do checklist acima
2. ✅ Confirme que os testes passam
3. ✅ Verifique que o sistema existente não quebrou
4. ✅ Me avise para continuar com o **Sprint 2: Gestão de Ciclos**

---

## 📝 Notas Importantes

### O Que Este Sprint NÃO Faz

- ❌ Não cria ciclos automaticamente (isso é Sprint 2)
- ❌ Não modifica o fluxo de assinatura existente
- ❌ Não afeta usuários finais
- ❌ Não muda a UI
- ❌ Não processa pagamentos

### O Que Este Sprint Faz

- ✅ Cria estrutura de banco de dados
- ✅ Adiciona serviços de timezone e dias úteis
- ✅ Popula feriados brasileiros
- ✅ Prepara base para próximos sprints
- ✅ Mantém compatibilidade com sistema existente

---

## 🆘 Precisa de Ajuda?

Se encontrar algum problema:

1. Verifique os logs de erro
2. Execute os testes para identificar o problema
3. Consulte a seção "Possíveis Problemas e Soluções"
4. Me avise com detalhes do erro

---

## ✅ Confirmação de Aplicação

Quando terminar, confirme:

```
[ ] Sprint 1 aplicado com sucesso
[ ] Todos os testes passam
[ ] Sistema existente funciona normalmente
[ ] Pronto para Sprint 2
```

**Data de Aplicação:** ___/___/______

**Responsável:** _________________

**Observações:** 
_________________________________________________
_________________________________________________
_________________________________________________
