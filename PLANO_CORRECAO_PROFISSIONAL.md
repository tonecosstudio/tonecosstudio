# Plano de Correção Profissional - ORDAX

## Data: 2026-02-28
## Análise Completa Realizada

---

## PRIORIDADE CRÍTICA (Segurança e Funcionalidade)

### 1. Corrigir RLS Policies Inconsistentes ⚠️ CRÍTICO
**Problema**: Migration `20260422000000_create_bonus_piece_catalog.sql` usa `auth.users.role` que não existe
**Impacto**: Políticas de segurança podem falhar, permitindo acesso não autorizado
**Solução**: Usar `public.has_role(auth.uid(), 'admin'::app_role)` consistentemente

### 2. Adicionar Validação de Falha de Liberação de Capacidade ⚠️ CRÍTICO
**Problema**: Pause continua mesmo se `release_capacity` falhar
**Impacto**: Cálculos de capacidade incorretos, overbooking possível
**Solução**: Falhar operação de pause se release_capacity falhar

### 3. Adicionar Tipos Deno nas Edge Functions 🔧 MÉDIO
**Problema**: Edge functions sem type definitions do Deno
**Impacto**: Falta de type safety, erros de compilação TypeScript
**Solução**: Adicionar `/// <reference lib="deno.window" />` e tipos corretos

---

## PRIORIDADE ALTA (Funcionalidade e Manutenibilidade)

### 4. Remover Parâmetro Não Utilizado 🧹 BAIXO
**Problema**: Parâmetro `reason` declarado mas nunca usado
**Impacto**: Code smell, confusão para desenvolvedores
**Solução**: Remover ou implementar uso do parâmetro

### 5. Implementar Notificações por Email 📧 MÉDIO
**Problema**: Console.log ao invés de envio real de emails
**Impacto**: Usuários não recebem notificações críticas
**Solução**: Integrar serviço de email real

### 6. Adicionar Validação de Entrada 🛡️ MÉDIO
**Problema**: Validação limitada em edge functions
**Impacto**: Possível XSS, dados inválidos
**Solução**: Adicionar validação robusta com limites de tamanho

---

## PRIORIDADE MÉDIA (Performance e Qualidade)

### 7. Regenerar Tipos Supabase 🔄 MÉDIO
**Problema**: Uso excessivo de `as any` type assertions
**Impacto**: Perda de type safety, bugs potenciais
**Solução**: Executar `npx supabase gen types typescript`

### 8. Adicionar Índices em Foreign Keys 📊 MÉDIO
**Problema**: Falta de índices em colunas de join
**Impacto**: Queries lentas, full table scans
**Solução**: Criar índices em foreign keys frequentemente usadas

### 9. Otimizar N+1 Queries 🚀 MÉDIO
**Problema**: Múltiplas queries quando uma seria suficiente
**Impacto**: Performance degradada
**Solução**: Usar joins ao invés de queries separadas

---

## EXECUÇÃO IMEDIATA

Vou corrigir os problemas críticos e de alta prioridade agora.
