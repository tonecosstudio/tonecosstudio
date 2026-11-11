# Fase 2 - Passo 3: Implementar Logger Profissional

**Data:** 11 de Março de 2026
**Status:** 🔄 Em Progresso

---

## ✅ Logger Implementado

Criado `src/lib/logger.ts` com Winston:

### Características
- ✅ Níveis de log: error, warn, info, debug
- ✅ Environment-aware (produção vs desenvolvimento)
- ✅ Formato estruturado com timestamps
- ✅ Cores no console (desenvolvimento)
- ✅ Apenas errors/warnings em produção

### API Simples
```typescript
import log from '@/lib/logger';

log.error('Erro crítico', { userId: '123' });
log.warn('Aviso importante');
log.info('Informação útil'); // Apenas dev
log.debug('Debug detalhado'); // Apenas dev
```

---

## 📊 Console.log Encontrados

### Frontend (src/)
- **Services:** ~30 ocorrências
  - delivery-service.ts
  - delivery-scheduling-service.ts
  - capacity-service.ts
  - audit-trail-service.ts
  - production-service.ts
  - stage-service.ts
  - stage-validation.ts
  - orders-service.ts
  - notification-preferences-service.ts

- **Email Templates:** ~15 ocorrências
  - template-loader.ts
  - example-usage.ts

- **Testes:** ~50 ocorrências (manter)

### Backend (supabase/functions/)
- **Shared:** ~20 ocorrências
  - supabase.ts (assertAdmin)
  - delivery-scheduling.ts
  - cron-logger.ts
  - ai-vision.ts

- **Functions:** ~40 ocorrências
  - send-email/index.ts
  - send-group-emails-batch/index.ts
  - cron-* functions
  - email-delivery-webhook/index.ts

**Total:** ~155 ocorrências (excluindo testes)

---

## 🎯 Estratégia de Substituição

### Prioridade 1: Services de Produção (Frontend)
1. ✅ Logger criado
2. ⏳ Substituir console.error → log.error
3. ⏳ Substituir console.warn → log.warn
4. ⏳ Substituir console.log → log.info/debug
5. ⏳ Remover console.log desnecessários

### Prioridade 2: Backend Functions
- Manter console.log em Supabase Functions (necessário para logs do Supabase)
- Adicionar prefixos estruturados: `[ERROR]`, `[WARN]`, `[INFO]`

### Prioridade 3: Email Templates
- Remover console.log de example-usage.ts (apenas exemplos)
- Manter console.warn em template-loader.ts (avisos importantes)

---

## 📝 Arquivos a Modificar (Frontend)

### Services (9 arquivos)
1. ⏳ `src/services/delivery-service.ts` - 6 console
2. ⏳ `src/services/delivery-scheduling-service.ts` - 4 console
3. ⏳ `src/services/capacity-service.ts` - 3 console
4. ⏳ `src/services/audit-trail-service.ts` - 3 console
5. ⏳ `src/services/admin/production-service.ts` - 8 console
6. ⏳ `src/services/admin/stage-service.ts` - 1 console
7. ⏳ `src/services/admin/stage-validation.ts` - 2 console
8. ⏳ `src/services/admin/orders-service.ts` - 5 console
9. ⏳ `src/services/customer/notification-preferences-service.ts` - 3 console

### Email Templates (2 arquivos)
10. ⏳ `src/services/notifications/email-templates/template-loader.ts` - 2 console
11. ⏳ `src/services/notifications/email-templates/example-usage.ts` - 13 console

**Total:** 11 arquivos, ~50 substituições

---

## ⏱️ Tempo Estimado

- Logger criado: ✅ 15 min
- Substituir services: ⏳ 45 min (9 arquivos)
- Limpar email templates: ⏳ 15 min (2 arquivos)
- Testar e validar: ⏳ 15 min
- **Total:** ~1h 30min

---

## 🚀 Próximos Passos

1. Substituir console em services (prioridade)
2. Limpar email templates
3. Validar build
4. Testar em desenvolvimento
5. Atualizar documentação

---

**Última atualização:** 11 de Março de 2026 - 03:30
