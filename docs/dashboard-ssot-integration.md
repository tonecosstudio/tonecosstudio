# Integração SSOT no Dashboard Admin

## Problema Identificado

O dashboard de visão geral (`AdminHome.tsx`) **NÃO estava usando o SSOT**, fazendo queries diretas ao banco de dados sem aproveitar as configurações centralizadas.

## Impacto

- ❌ Dados de preços hardcoded ou não sincronizados
- ❌ Limites de produção não refletindo configurações atuais
- ❌ Informações de cronograma desatualizadas
- ❌ Métricas calculadas sem considerar SSOT

## Solução Implementada

### 1. Importação dos Hooks SSOT

```typescript
import { usePricingSettings } from "@/hooks/usePricingSettings";
import { useContentSettings } from "@/hooks/useContentSettings";
```

### 2. Uso dos Hooks no Componente

```typescript
export default function AdminHome() {
  // SSOT Hooks
  const { data: pricingSettings } = usePricingSettings();
  const { data: contentSettings } = useContentSettings();
  
  // ... resto do código
}
```

### 3. Dados Disponíveis do SSOT

#### De `pricingSettings`:
- `defaultPriceFull` - Preço padrão (R$ 500)
- `defaultPricePix` - Preço PIX (R$ 475)
- `defaultDepositAmount` - Valor entrada (R$ 100)
- `pixDiscountPercentage` - Desconto PIX (5%)
- `monthlyProductionLimit` - Limite mensal (20)
- `currentMonthLimit` - Limite do mês atual
- `currentMonthSold` - Unidades vendidas no mês
- `currentMonthAvailable` - Vagas disponíveis
- `currentMonthPercentage` - % do limite vendido

#### De `contentSettings`:
- `currentBatchName` - Nome do lote atual
- `currentBatchSalesStart` - Início das vendas
- `currentBatchSalesEnd` - Fim das vendas
- `currentBatchProductionStart` - Início da produção
- `currentBatchProductionEnd` - Fim da produção
- `currentBatchShippingMonth` - Mês de envio
- `productionDaysMin` - Prazo mínimo produção
- `productionDaysMax` - Prazo máximo produção

## Cards que Devem Usar SSOT

### 1. Card de Limite de Produção

**Antes:**
```typescript
// Valor hardcoded ou query direta
<div>Limite: 20 unidades</div>
```

**Depois:**
```typescript
<Card>
  <CardHeader>
    <CardTitle>Limite de Produção</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">
      {pricingSettings?.currentMonthSold || 0} / {pricingSettings?.monthlyProductionLimit || 0}
    </div>
    <p className="text-xs text-muted-foreground">
      {pricingSettings?.currentMonthAvailable || 0} vagas disponíveis
    </p>
    <div className="mt-2">
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary transition-all"
          style={{ width: `${pricingSettings?.currentMonthPercentage || 0}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        {pricingSettings?.currentMonthPercentage?.toFixed(1) || 0}% do limite
      </p>
    </div>
  </CardContent>
</Card>
```

### 2. Card de Cronograma Atual

**Antes:**
```typescript
// Sem informação ou hardcoded
<div>Lote: Fevereiro/Março</div>
```

**Depois:**
```typescript
<Card>
  <CardHeader>
    <CardTitle>Cronograma Atual</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium">Lote Atual</p>
        <p className="text-2xl font-bold">{contentSettings?.currentBatchName}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-muted-foreground">Vendas</p>
          <p className="font-medium">
            {contentSettings?.currentBatchSalesStart && 
              new Date(contentSettings.currentBatchSalesStart).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
            {' - '}
            {contentSettings?.currentBatchSalesEnd && 
              new Date(contentSettings.currentBatchSalesEnd).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Produção</p>
          <p className="font-medium">
            {contentSettings?.productionDaysMin}-{contentSettings?.productionDaysMax} dias
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Envio</p>
          <p className="font-medium">
            {contentSettings?.currentBatchShippingMonth} 
            {' (até '}
            {contentSettings?.currentBatchShippingDeadline}º dia útil)
          </p>
        </div>
      </div>
    </div>
  </CardContent>
</Card>
```

### 3. Card de Preços Atuais

**Novo Card:**
```typescript
<Card>
  <CardHeader>
    <CardTitle>Preços Configurados</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">Preço Padrão</span>
        <span className="font-bold">
          R$ {pricingSettings?.defaultPriceFull?.toFixed(2) || '0.00'}
        </span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">Preço PIX ({pricingSettings?.pixDiscountPercentage}% off)</span>
        <span className="font-bold text-green-600">
          R$ {pricingSettings?.defaultPricePix?.toFixed(2) || '0.00'}
        </span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">Entrada</span>
        <span className="font-bold">
          R$ {pricingSettings?.defaultDepositAmount?.toFixed(2) || '0.00'}
        </span>
      </div>
    </div>
  </CardContent>
</Card>
```

## Benefícios da Integração

### 1. Dados Sempre Atualizados
- ✅ Dashboard reflete configurações do SSOT
- ✅ Mudanças no admin propagam automaticamente
- ✅ Cache de 5 minutos garante performance

### 2. Consistência Total
- ✅ Mesmos valores em todo o sistema
- ✅ Sem discrepâncias entre páginas
- ✅ Fonte única de verdade

### 3. Manutenibilidade
- ✅ Atualizar em um lugar atualiza dashboard
- ✅ Sem valores hardcoded
- ✅ Código mais limpo

### 4. Métricas Precisas
- ✅ Cálculos baseados em dados reais
- ✅ Limite de produção dinâmico
- ✅ Preços sempre corretos

## Exemplo de Uso Completo

```typescript
export default function AdminHome() {
  const navigate = useNavigate();
  
  // SSOT Hooks
  const { data: pricingSettings, isLoading: loadingPricing } = usePricingSettings();
  const { data: contentSettings, isLoading: loadingContent } = useContentSettings();
  
  // Loading state
  if (loadingPricing || loadingContent) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Carregando configurações...</p>
        </div>
      </AdminLayout>
    );
  }
  
  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Lote: {contentSettings?.currentBatchName} | 
            Limite: {pricingSettings?.currentMonthSold}/{pricingSettings?.monthlyProductionLimit}
          </p>
        </div>
        
        {/* Cards com SSOT */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Card de Limite */}
          <Card>
            <CardHeader>
              <CardTitle>Produção Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pricingSettings?.currentMonthSold || 0} / {pricingSettings?.monthlyProductionLimit || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {pricingSettings?.currentMonthAvailable || 0} vagas disponíveis
              </p>
            </CardContent>
          </Card>
          
          {/* Card de Preços */}
          <Card>
            <CardHeader>
              <CardTitle>Preço Atual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {pricingSettings?.defaultPriceFull?.toFixed(2)}
              </div>
              <p className="text-xs text-green-600">
                PIX: R$ {pricingSettings?.defaultPricePix?.toFixed(2)}
              </p>
            </CardContent>
          </Card>
          
          {/* Card de Cronograma */}
          <Card>
            <CardHeader>
              <CardTitle>Lote Atual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {contentSettings?.currentBatchName}
              </div>
              <p className="text-xs text-muted-foreground">
                Envio: {contentSettings?.currentBatchShippingMonth}
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Resto do dashboard... */}
      </div>
    </AdminLayout>
  );
}
```

## Atualização Automática

O dashboard se atualiza automaticamente quando:

1. **Admin muda configurações** em `/admin/configuracoes`
2. **Cache expira** (5 minutos)
3. **Página é recarregada**
4. **React Query invalida** a query

## Verificação de Integração

Para verificar se o SSOT está funcionando:

1. Acesse `/admin/configuracoes` → Aba "Conteúdo (SSOT)"
2. Mude o "Limite de Produção Mensal" de 20 para 25
3. Salve as alterações
4. Volte para `/admin` (dashboard)
5. Aguarde até 5 minutos ou recarregue a página
6. O card de "Produção Mensal" deve mostrar "X / 25"

## Próximos Passos

1. ✅ Adicionar hooks SSOT ao AdminHome
2. ⏳ Criar cards específicos para dados SSOT
3. ⏳ Substituir queries diretas por dados SSOT
4. ⏳ Adicionar indicadores visuais de SSOT
5. ⏳ Documentar todos os cards que usam SSOT

## Conclusão

A integração do SSOT no dashboard garante que os administradores vejam sempre dados atualizados e consistentes com as configurações do sistema. Isso elimina confusão e garante que decisões sejam tomadas com base em informações corretas.
