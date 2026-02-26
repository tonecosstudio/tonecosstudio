# Guia de Migração - Premium Club v2.0

## Visão Geral

Este documento descreve o processo de migração do modelo antigo de assinaturas (preço por coleção) para o novo modelo Premium Club v2.0 (preço fixo por plano).

## Diferenças Entre Modelos

### Modelo Antigo (Legado)
- Preço variável por coleção
- Sem sistema de ciclos
- Entregas sem agendamento automático
- Sem peças bônus
- Cálculos sem considerar feriados

### Modelo Novo (Premium Club v2.0)
- Preço fixo por plano (Trimestral: R$ 1.350,00 | Semestral: R$ 2.700,00)
- Sistema de ciclos quinzenais automáticos
- Entregas agendadas automaticamente
- Peça bônus a cada 12 entregas (plano semestral)
- Todos os cálculos consideram dias úteis e feriados

## Estratégia de Migração

### Fase 1: Preparação (Completa)
- ✅ Implementação do novo sistema
- ✅ Testes completos (157 testes passando)
- ✅ Migrations de banco de dados
- ✅ Edge Functions
- ✅ Frontend refatorado

### Fase 2: Marcação de Assinaturas Legado
- ✅ Migration `20260301000004_mark_legacy_subscriptions.sql`
- Adiciona coluna `is_legacy` à tabela `subscriptions`
- Marca todas as assinaturas existentes como legado
- Cria views para facilitar consultas

### Fase 3: Criação de Ciclos Iniciais
- ✅ Migration `20260301000005_create_initial_cycles.sql`
- Cria ciclos para Março, Abril e Maio de 2026
- Calcula datas de envio automaticamente
- Define capacidade inicial de 500 assinaturas por ciclo

### Fase 4: Coexistência
- Assinaturas legado continuam funcionando normalmente
- Novas assinaturas usam o modelo Premium Club v2.0
- Sistema identifica automaticamente qual modelo usar

### Fase 5: Transição Gradual
- Comunicar mudanças aos clientes existentes
- Oferecer migração opcional para clientes legado
- Manter suporte ao modelo antigo por período definido

## Aplicando as Migrations

### Pré-requisitos
- Supabase CLI instalado
- Projeto linkado: `supabase link --project-ref <seu-project-ref>`
- Backup do banco de dados

### Comandos

```bash
# 1. Verificar status das migrations
supabase db diff

# 2. Aplicar migrations de marcação de legado
supabase db push --include-all

# 3. Verificar se foi aplicado corretamente
supabase db remote commit

# 4. Verificar ciclos criados
# No SQL Editor do Supabase:
SELECT * FROM cycles ORDER BY year, month, cycle_number;
```

### Rollback (Se Necessário)

```sql
-- Remover flag de legado
ALTER TABLE subscriptions DROP COLUMN IF EXISTS is_legacy;

-- Remover views
DROP VIEW IF EXISTS legacy_subscriptions;
DROP VIEW IF EXISTS premium_club_subscriptions;

-- Remover função de migração
DROP FUNCTION IF EXISTS migrate_subscription_to_premium_club;

-- Remover ciclos criados
DELETE FROM cycles WHERE year = 2026 AND month IN (3, 4, 5);
```

## Verificação Pós-Migração

### 1. Verificar Assinaturas Legado

```sql
SELECT COUNT(*) as total_legacy
FROM subscriptions
WHERE is_legacy = true;
```

### 2. Verificar Ciclos Criados

```sql
SELECT 
  cycle_number,
  month,
  year,
  status,
  capacity_current,
  capacity_max
FROM cycles
WHERE year = 2026
ORDER BY month, cycle_number;
```

### 3. Verificar Views

```sql
-- Assinaturas legado
SELECT COUNT(*) FROM legacy_subscriptions;

-- Assinaturas Premium Club
SELECT COUNT(*) FROM premium_club_subscriptions;
```

## Impacto nas Funcionalidades

### Funcionalidades Mantidas
- ✅ Assinaturas legado continuam funcionando
- ✅ Pagamentos processados normalmente
- ✅ Entregas existentes não são afetadas
- ✅ Histórico de assinaturas preservado

### Novas Funcionalidades (Apenas Premium Club v2.0)
- ✅ Sistema de ciclos automáticos
- ✅ Agendamento de entregas consecutivas
- ✅ Peças bônus
- ✅ Cálculo de dias úteis
- ✅ Mudança de personagem até 5 dias antes do envio

## Comunicação com Clientes

### Clientes Existentes (Legado)
- Suas assinaturas continuam funcionando normalmente
- Preços e condições mantidos
- Opção de migrar para novo modelo (opcional)

### Novos Clientes
- Apenas modelo Premium Club v2.0 disponível
- Preços fixos por plano
- Benefícios do novo sistema

## Monitoramento

### Métricas a Acompanhar
- Taxa de conversão de novas assinaturas
- Capacidade dos ciclos
- Performance das transições automáticas
- Erros no agendamento de entregas
- Taxa de mudança de personagem

### Alertas Configurados
- Ciclo atingindo 80% da capacidade
- Ciclo cheio (100%)
- Falha em transição de status
- Erro no cálculo de dias úteis

## Suporte

### Para Desenvolvedores
- Documentação completa em `/docs`
- Testes em `src/lib/services/__tests__`
- Edge Functions em `supabase/functions`

### Para Administradores
- Painel admin atualizado
- Gerenciamento de ciclos em `/admin/ciclos`
- Gerenciamento de feriados em `/admin/feriados`

## Próximos Passos

1. ✅ Aplicar migrations
2. ⏳ Deploy para staging
3. ⏳ Testes de aceitação
4. ⏳ Deploy para produção
5. ⏳ Monitoramento 24h
6. ⏳ Ajustes conforme necessário

## Contato

Para dúvidas ou problemas durante a migração, consulte:
- Documentação técnica: `/docs`
- Testes: `npm test`
- Logs: Supabase Dashboard > Logs
