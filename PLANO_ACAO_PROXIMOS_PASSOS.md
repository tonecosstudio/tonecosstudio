# PLANO DE AÇÃO - PRÓXIMOS PASSOS

**Data**: 28 de Fevereiro de 2026  
**Objetivo**: Aplicar as implementações de segurança e performance nas páginas restantes

---

## 🎯 VISÃO GERAL

Criamos uma base sólida de segurança e performance. Agora precisamos aplicar essas implementações sistematicamente em todas as páginas do projeto.

**Status Atual**:
- ✅ Ferramentas criadas e testadas
- ✅ Exemplos de uso documentados
- ✅ Login.tsx com sanitização aplicada
- ✅ Headers de segurança configurados
- ⏳ Demais páginas aguardando implementação

---

## 📋 TAREFAS PRIORITÁRIAS

### SPRINT 1: Sanitização de Formulários (2-3 dias)

#### 1.1 Profile.tsx - Dados Pessoais
**Prioridade**: 🔴 ALTA  
**Estimativa**: 2 horas

**Campos para sanitizar**:
- `fullName` → tipo: `text`
- `phone` → tipo: `text` + `sanitizePhoneNumber()`
- `whatsapp` → tipo: `text` + `sanitizePhoneNumber()`
- `cpf` → tipo: `text`
- `bio` → tipo: `html`

**Implementação**:
```typescript
// Substituir useState por useSanitizedForm
const { formData, setValue, getSanitizedData } = useSanitizedForm(
  { fullName: '', phone: '', whatsapp: '', cpf: '', bio: '' },
  { 
    fullName: 'text', 
    phone: 'text', 
    whatsapp: 'text', 
    cpf: 'text', 
    bio: 'html' 
  }
);

// No submit
const sanitized = getSanitizedData();
await upsertMyProfile({
  ...sanitized,
  phone: sanitizePhoneNumber(sanitized.phone),
  whatsapp: sanitizePhoneNumber(sanitized.whatsapp)
});
```

#### 1.2 Contact.tsx - Formulário de Contato
**Prioridade**: 🔴 ALTA  
**Estimativa**: 1 hora

**Campos para sanitizar**:
- `name` → tipo: `text`
- `email` → tipo: `email`
- `subject` → tipo: `text`
- `message` → tipo: `html`

#### 1.3 AdminUsers.tsx - Promover Usuário
**Prioridade**: 🟡 MÉDIA  
**Estimativa**: 30 minutos

**Campo para sanitizar**:
- `email` → tipo: `email`

```typescript
const [email, setEmail, sanitizedEmail] = useSanitizedInput("", "email");

// No submit
await supabase.functions.invoke("admin-promote", {
  body: { email: sanitizedEmail, role: "admin" }
});
```

#### 1.4 Demais Formulários Admin
**Prioridade**: 🟡 MÉDIA  
**Estimativa**: 4 horas

**Páginas**:
- AdminModels.tsx
- AdminCollections.tsx
- AdminFranchises.tsx
- AdminPlans.tsx
- AdminCoupons.tsx

---

### SPRINT 2: Paginação nas Listas Admin (3-4 dias)

#### 2.1 AdminUsers.tsx
**Prioridade**: 🔴 ALTA  
**Estimativa**: 3 horas

**Implementação**:
```typescript
const { 
  data: users, 
  pagination, 
  isLoading,
  goToPage 
} = usePaginatedQuery({
  queryKey: ['admin-users'],
  queryFn: async ({ page, pageSize }) => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;
    
    const { data, error, count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(start, end);
    
    if (error) throw error;
    
    return {
      data: data || [],
      pagination: {
        currentPage: page,
        pageSize,
        totalItems: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
        hasNextPage: end < (count || 0),
        hasPreviousPage: page > 1
      }
    };
  },
  pageSize: 20,
  cacheConfig: 'adminList'
});

// Substituir paginação manual por componente
<Pagination
  currentPage={pagination?.currentPage || 1}
  totalPages={pagination?.totalPages || 1}
  pageSize={pagination?.pageSize || 20}
  totalItems={pagination?.totalItems || 0}
  onPageChange={goToPage}
/>
```

**Benefícios**:
- ✅ Carregamento mais rápido (apenas 20 itens por vez)
- ✅ Menos memória utilizada
- ✅ Melhor UX com loading states
- ✅ Cache automático com React Query

#### 2.2 AdminModels.tsx
**Prioridade**: 🟡 MÉDIA  
**Estimativa**: 2 horas

#### 2.3 AdminCollections.tsx
**Prioridade**: 🟡 MÉDIA  
**Estimativa**: 2 horas

#### 2.4 AdminSubscriptions.tsx
**Prioridade**: 🟡 MÉDIA  
**Estimativa**: 2 horas

#### 2.5 AdminPayments.tsx
**Prioridade**: 🟡 MÉDIA  
**Estimativa**: 2 horas

---

### SPRINT 3: Lazy Loading e Code Splitting (2 dias)

#### 3.1 App.tsx - Rotas Lazy
**Prioridade**: 🔴 ALTA  
**Estimativa**: 4 horas

**Implementação**:
```typescript
import { lazy, Suspense } from 'react';
import { LazyAdminPages, LazyCustomerPages } from '@/lib/performance/lazy-loading';

// Substituir imports diretos por lazy
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminModels = lazy(() => import('./pages/admin/AdminModels'));
// ... etc

// Ou usar os componentes pré-configurados
function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/admin/users" element={<LazyAdminPages.Users />} />
        <Route path="/admin/models" element={<LazyAdminPages.Models />} />
        {/* ... */}
      </Routes>
    </Suspense>
  );
}
```

**Benefícios**:
- ✅ Bundle size reduzido em ~60%
- ✅ First load mais rápido
- ✅ Melhor score no Lighthouse

#### 3.2 Lazy Loading de Imagens
**Prioridade**: 🟡 MÉDIA  
**Estimativa**: 3 horas

**Páginas com muitas imagens**:
- Catalog.tsx
- Collections.tsx
- ModelDetails.tsx
- CollectionDetails.tsx

**Implementação**:
```typescript
import { LazyImage } from '@/lib/performance/lazy-loading';

<LazyImage
  src={model.image_url}
  alt={model.name}
  width={400}
  height={400}
  className="rounded-lg"
/>
```

---

### SPRINT 4: Upload Seguro de Arquivos (2 dias)

#### 4.1 Identificar Componentes de Upload
**Prioridade**: 🟡 MÉDIA  
**Estimativa**: 2 horas

**Buscar por**:
- `<input type="file">`
- `supabase.storage.upload`
- Componentes de upload de imagem

#### 4.2 Aplicar useSecureFileUpload
**Prioridade**: 🟡 MÉDIA  
**Estimativa**: 4 horas

**Exemplo**:
```typescript
const { uploadFiles, isUploading, progress } = useSecureFileUpload({
  userId: user?.id,
  maxFiles: 5,
  processingOptions: {
    maxWidth: 2048,
    maxHeight: 2048,
    quality: 85,
    format: 'webp'
  },
  onSuccess: (files) => {
    // Upload para Supabase Storage
    files.forEach(async (file) => {
      await supabase.storage
        .from('models')
        .upload(`${user.id}/${file.name}`, file);
    });
  }
});

<input
  type="file"
  multiple
  accept="image/*"
  onChange={(e) => {
    if (e.target.files) {
      uploadFiles(e.target.files);
    }
  }}
  disabled={isUploading}
/>

{isUploading && (
  <div>Processando: {progress}%</div>
)}
```

---

### SPRINT 5: Otimização de Imagens (2 dias)

#### 5.1 Implementar Srcset Responsivo
**Prioridade**: 🟢 BAIXA  
**Estimativa**: 4 horas

**Páginas**:
- Home.tsx (hero images)
- Catalog.tsx (thumbnails)
- ModelDetails.tsx (galeria)

**Implementação**:
```typescript
import { generateResponsiveSrcSet } from '@/lib/performance/image-optimization';

const srcset = generateResponsiveSrcSet(
  model.image_url,
  [400, 800, 1200, 1600]
);

<img
  src={model.image_url}
  srcSet={srcset}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  alt={model.name}
/>
```

#### 5.2 Implementar WebP com Fallback
**Prioridade**: 🟢 BAIXA  
**Estimativa**: 3 horas

---

## 📊 MÉTRICAS DE SUCESSO

### Objetivos por Sprint

| Sprint | Métrica | Antes | Meta | Impacto |
|--------|---------|-------|------|---------|
| 1 | Formulários Sanitizados | 10% | 100% | 🔴 Crítico |
| 2 | Listas Paginadas | 0% | 100% | 🔴 Crítico |
| 3 | Bundle Size | 2.6MB | <1MB | 🟡 Alto |
| 4 | Uploads Seguros | 0% | 100% | 🟡 Alto |
| 5 | Imagens Otimizadas | 0% | 80% | 🟢 Médio |

### KPIs Finais

- **Security Score**: 95/100 → 98/100
- **Performance Score**: 65 → 90+
- **First Load**: 8s → <3s
- **Bundle Size**: 2.6MB → <1MB
- **Type Safety**: 100%

---

## 🛠️ FERRAMENTAS E RECURSOS

### Hooks Disponíveis
- ✅ `useSanitizedInput` - Sanitização de inputs
- ✅ `useSanitizedForm` - Sanitização de formulários
- ✅ `usePaginatedQuery` - Paginação com React Query
- ✅ `useSecureFileUpload` - Upload seguro

### Componentes Disponíveis
- ✅ `PaginationControls` - Controles de paginação
- ✅ `Pagination` - Paginação completa
- ✅ `LazyImage` - Imagem com lazy loading
- ✅ `SecureUserForm` - Exemplo de formulário seguro

### Bibliotecas Disponíveis
- ✅ `input-sanitizer.ts` - Sanitização
- ✅ `image-processor.ts` - Processamento de imagens
- ✅ `rate-limiter.ts` - Rate limiting
- ✅ `csp-config.ts` - Segurança
- ✅ `pagination.ts` - Paginação
- ✅ `cache-config.ts` - Cache
- ✅ `lazy-loading.tsx` - Lazy loading
- ✅ `image-optimization.ts` - Otimização

---

## 📝 CHECKLIST DE IMPLEMENTAÇÃO

### Antes de Começar
- [ ] Ler documentação completa
- [ ] Entender exemplos de uso
- [ ] Configurar ambiente de desenvolvimento
- [ ] Criar branch de feature

### Durante a Implementação
- [ ] Seguir padrões estabelecidos
- [ ] Manter type safety 100%
- [ ] Adicionar comentários quando necessário
- [ ] Testar cada implementação

### Após Implementação
- [ ] Executar testes
- [ ] Verificar diagnostics (getDiagnostics)
- [ ] Code review
- [ ] Atualizar documentação
- [ ] Merge para main

---

## 🚀 COMANDOS ÚTEIS

### Verificar Erros TypeScript
```bash
npm run type-check
```

### Executar Testes
```bash
npm run test
```

### Build de Produção
```bash
npm run build
```

### Analisar Bundle Size
```bash
npm run build -- --analyze
```

### Verificar Security Headers
```bash
curl -I https://ordax.com.br
```

---

## 📚 DOCUMENTAÇÃO DE REFERÊNCIA

1. **FASE3_APLICACAO_PRATICA_CONCLUIDA.md** - Status atual e exemplos
2. **APLICACAO_PRATICA_IMPLEMENTACOES.md** - Guia detalhado de uso
3. **IMPLEMENTACAO_SEGURANCA_PERFORMANCE.md** - Documentação técnica
4. **ANALISE_PROFUNDA_E_CORRECOES_2026.md** - Análise inicial

---

## 💡 DICAS E BOAS PRÁTICAS

### Sanitização
- ✅ Sempre sanitizar inputs do usuário
- ✅ Usar tipo correto (text, html, email)
- ✅ Validar no backend também
- ❌ Nunca confiar apenas no frontend

### Paginação
- ✅ Usar pageSize adequado (10-50 itens)
- ✅ Implementar loading states
- ✅ Cache com React Query
- ❌ Não carregar todos os dados de uma vez

### Lazy Loading
- ✅ Lazy load rotas pesadas
- ✅ Lazy load imagens abaixo da dobra
- ✅ Prefetch on hover para melhor UX
- ❌ Não lazy load componentes críticos

### Upload de Arquivos
- ✅ Validar tipo e tamanho
- ✅ Processar imagens (resize, compress)
- ✅ Remover metadados EXIF
- ❌ Nunca confiar no tipo MIME

---

## 🎯 CONCLUSÃO

Este plano de ação fornece um roteiro claro para aplicar todas as implementações de segurança e performance no projeto ORDAX. Seguindo este plano, você terá:

✅ **Sistema 100% Seguro**: Proteção contra XSS, SQL injection, clickjacking  
✅ **Performance Otimizada**: Bundle reduzido, lazy loading, cache inteligente  
✅ **Código Profissional**: Type-safe, documentado, testado  
✅ **Experiência do Usuário**: Rápido, responsivo, confiável  

**Tempo Estimado Total**: 11-14 dias de desenvolvimento  
**Impacto**: Transformação completa da segurança e performance do sistema

---

**Pronto para começar? Escolha uma tarefa da Sprint 1 e mãos à obra!** 🚀
