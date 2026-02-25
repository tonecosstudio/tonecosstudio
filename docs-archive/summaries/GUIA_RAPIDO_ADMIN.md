# 🚀 Guia Rápido - Painel Admin

Guia de início rápido para desenvolvedores que vão trabalhar no painel admin.

**Última Atualização:** 24/02/2026

---

## 📚 Documentação Essencial

### Leia Primeiro (5 min)

1. **[Resumo Executivo](./RESUMO_EXECUTIVO_ADMIN_FINAL.md)** - Visão geral completa
2. **[Índice Atualizado](./INDICE_ADMIN_ATUALIZADO.md)** - Navegação rápida

### Entenda a Estrutura (10 min)

3. **[Mesclagem Completa](./MESCLAGEM_COMPLETA_FINAL.md)** - Como as páginas foram organizadas
4. **[Componentes Criados](./COMPONENTES_ADMIN_CRIADOS.md)** - Biblioteca de componentes

### Consulte Quando Necessário

5. **[Checklist](./CHECKLIST_ADMIN.md)** - Progresso e tarefas
6. **[Analytics Implementado](./ANALYTICS_AVANCADO_IMPLEMENTADO.md)** - Componentes de analytics

---

## 🗂️ Estrutura de Arquivos

### Páginas Admin

```
src/pages/admin/
├── AdminHome.tsx              # Dashboard principal
├── AdminSettings.tsx          # Hub de configurações (5→1)
├── AdminPaymentHub.tsx        # Hub de pagamentos (3→1)
├── AdminCommunication.tsx     # Hub de comunicação (4→1)
└── ...outras páginas
```

### Componentes Reutilizáveis

```
src/components/admin/
├── AdminLayout.tsx            # Layout base com sidebar
├── PeriodFilter.tsx           # Filtro de período
├── MetricComparison.tsx       # Cards com comparação
├── ExportButton.tsx           # Exportação de dados
├── RealtimeIndicator.tsx      # Indicador ao vivo
├── DataTable.tsx              # Tabela avançada
├── RevenueChart.tsx           # Gráfico de receita
├── ConversionFunnel.tsx       # Funil de conversão
├── SubscriptionMetrics.tsx    # Métricas de assinaturas
└── FranchiseAnalytics.tsx     # Análise por franquia
```

---

## 🎯 Componentes Principais

### 1. AdminLayout

**Uso:**

```tsx
import { AdminLayout } from "@/components/admin/AdminLayout";

export default function MinhaPageAdmin() {
  return (
    <AdminLayout>
      <h1>Minha Página</h1>
      {/* Conteúdo */}
    </AdminLayout>
  );
}
```

**Features:**

- Sidebar automática
- Navegação integrada
- Responsivo

---

### 2. PeriodFilter

**Uso:**

```tsx
import { PeriodFilter, DateRange } from "@/components/admin/PeriodFilter";

const [dateRange, setDateRange] = useState<DateRange>({
  from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  to: new Date(),
});

<PeriodFilter
  value={dateRange}
  onChange={setDateRange}
  persistKey="minha-pagina-period" // Opcional
/>;
```

**Features:**

- Presets (Hoje, 7 dias, 30 dias, 1 ano)
- Período customizado
- Persistência automática

---

### 3. MetricComparison

**Uso:**

```tsx
import { MetricComparison } from "@/components/admin/MetricComparison";
import { DollarSign } from "lucide-react";

<MetricComparison
  title="Receita Total"
  value={15000}
  previousValue={12000}
  format="currency"
  icon={DollarSign}
/>;
```

**Features:**

- Comparação automática
- Indicadores visuais (↑↓)
- Cores semânticas
- Múltiplos formatos

---

### 4. ExportButton

**Uso:**

```tsx
import { ExportButton } from "@/components/admin/ExportButton";

<ExportButton
  data={metricsData}
  filename="dashboard-metrics"
  onExport={async (format) => {
    // Lógica customizada opcional
  }}
/>;
```

**Features:**

- CSV e JSON
- Excel (em desenvolvimento)
- Loading states
- Validação automática

---

### 5. RevenueChart

**Uso:**

```tsx
import { RevenueChart } from "@/components/admin/RevenueChart";

<RevenueChart
  data={[
    { month: "Jan", receita: 15000, orcamentos: 45 },
    { month: "Fev", receita: 18000, orcamentos: 52 },
    // ...
  ]}
  showGoal={true}
/>;
```

**Features:**

- Gráfico de área
- Tendência automática
- Tooltip detalhado
- Suporte a metas

---

## 🔄 Padrões de Código

### Queries com React Query

```tsx
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const { data, isLoading, error } = useQuery({
  queryKey: ["minha-query", filtros],
  queryFn: async () => {
    const { data, error } = await supabase.from("tabela").select("*").eq("campo", valor);

    if (error) throw error;
    return data;
  },
  staleTime: 30000, // 30 segundos
});
```

### Formatação de Valores

```tsx
// Moeda
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

// Percentual
const formatPercent = (value: number) => {
  return `${value.toFixed(1)}%`;
};

// Número
const formatNumber = (value: number) => {
  return value.toLocaleString("pt-BR");
};
```

### Cálculo de Comparativos

```tsx
const calculateChange = (current: number, previous: number) => {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
};

const change = calculateChange(15000, 12000); // 25%
```

---

## 🎨 Estilização

### Tailwind CSS

```tsx
// Classes comuns
<div className="space-y-4">           {/* Espaçamento vertical */}
<div className="grid gap-4 md:grid-cols-2"> {/* Grid responsivo */}
<Card className="border-2">           {/* Card com borda */}
<Badge variant="default">             {/* Badge padrão */}
```

### Cores Semânticas

```tsx
// Sucesso/Crescimento
className = "text-green-600 bg-green-50";

// Erro/Queda
className = "text-red-600 bg-red-50";

// Atenção
className = "text-amber-600 bg-amber-50";

// Informação
className = "text-blue-600 bg-blue-50";
```

---

## 🧪 Testes

### Verificar Erros

```bash
# TypeScript
npm run type-check

# Linting
npm run lint

# Build
npm run build
```

### Testar Componente

```tsx
// Teste manual no AdminHome
import { MeuComponente } from "@/components/admin/MeuComponente";

<MeuComponente data={testData} onAction={(result) => console.log(result)} />;
```

---

## 🐛 Debugging

### React Query Devtools

```tsx
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

<QueryClientProvider client={queryClient}>
  <App />
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>;
```

### Console Logs

```tsx
// Desenvolvimento
if (process.env.NODE_ENV === "development") {
  console.log("Debug:", data);
}
```

---

## 📋 Checklist para Nova Feature

- [ ] Criar componente em `src/components/admin/`
- [ ] Adicionar TypeScript types
- [ ] Implementar loading states
- [ ] Adicionar error handling
- [ ] Testar responsividade
- [ ] Verificar acessibilidade
- [ ] Documentar uso
- [ ] Testar compilação
- [ ] Atualizar checklist
- [ ] Commit com mensagem clara

---

## 🔗 Links Úteis

### Documentação

- [Índice Completo](./INDICE_ADMIN_ATUALIZADO.md)
- [Checklist](./CHECKLIST_ADMIN.md)
- [Roadmap](./ROADMAP_MELHORIAS_ADMIN.md)

### Código

- [AdminLayout](../src/components/admin/AdminLayout.tsx)
- [AdminHome](../src/pages/admin/AdminHome.tsx)

### Bibliotecas

- [React Query](https://tanstack.com/query/latest)
- [Recharts](https://recharts.org/)
- [Shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)

---

## 💡 Dicas

### Performance

- Use `React.memo` para componentes pesados
- Implemente lazy loading quando possível
- Evite re-renders desnecessários
- Use `useMemo` e `useCallback`

### UX

- Sempre mostre loading states
- Trate erros graciosamente
- Forneça feedback visual
- Mantenha consistência

### Código

- Siga os padrões existentes
- Documente código complexo
- Use TypeScript strict
- Escreva código limpo

---

## 🆘 Precisa de Ajuda?

1. **Consulte a documentação** - 90% das dúvidas estão documentadas
2. **Veja exemplos** - Componentes existentes são bons exemplos
3. **Teste localmente** - Sempre teste antes de commitar
4. **Peça ajuda** - Se ainda tiver dúvidas, pergunte!

---

## 🎯 Próximos Passos

Agora que você leu este guia:

1. ✅ Explore os componentes existentes
2. ✅ Leia a documentação relevante
3. ✅ Faça um teste local
4. ✅ Comece a desenvolver!

**Boa sorte! 🚀**

---

**Última Atualização:** 24/02/2026
**Versão:** 1.2
