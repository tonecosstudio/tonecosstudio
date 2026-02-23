/**
 * DashboardMetrics Component Example
 * 
 * Este arquivo demonstra o uso do componente DashboardMetrics
 * que exibe métricas e SLA do sistema de chat de suporte.
 * 
 * Funcionalidades:
 * - Calcula e exibe 8 métricas principais em tempo real
 * - Atualiza automaticamente via Supabase Realtime
 * - Destaca métricas críticas (SLA excedido, riscos, promessas atrasadas)
 * - Usa componentes shadcn/ui (Card, Badge)
 * 
 * Métricas calculadas:
 * 1. open_count - Conversas aguardando resposta do admin
 * 2. waiting_customer_count - Conversas aguardando resposta do cliente
 * 3. resolved_today_count - Conversas resolvidas hoje
 * 4. total_count - Total de conversas
 * 5. overdue_24h_count - Conversas abertas há mais de 24h (SLA alert)
 * 6. avg_first_response_minutes - Tempo médio de primeira resposta (últimos 7 dias)
 * 7. conversations_with_risk - Conversas com flags de risco
 * 8. conversations_overdue_promise - Conversas com promessas atrasadas
 * 
 * Integração:
 * O componente já está integrado no AdminSupportV2.tsx no topo da página.
 * 
 * Nota sobre campos do banco:
 * - Os campos risk_flags e promised_date serão adicionados pela migration
 *   20260221000004_update_support_conversations.sql
 * - Até lá, essas métricas retornarão 0
 */

import { DashboardMetrics } from "./DashboardMetrics";

export function DashboardMetricsExample() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Dashboard de Métricas - Exemplo</h1>
        <p className="text-muted-foreground">
          Visualização das métricas e SLA do sistema de chat de suporte
        </p>
      </div>

      {/* Componente DashboardMetrics */}
      <DashboardMetrics />

      {/* Documentação */}
      <div className="mt-8 space-y-4">
        <h2 className="text-xl font-semibold">Descrição das Métricas</h2>
        
        <div className="grid gap-4">
          <MetricDescription
            title="Aguardando Resposta"
            description="Número de conversas com status 'waiting_admin' que precisam de atenção imediata."
            variant="warning"
          />
          
          <MetricDescription
            title="Aguardando Cliente"
            description="Número de conversas com status 'waiting_customer' onde o admin já respondeu."
            variant="default"
          />
          
          <MetricDescription
            title="Resolvidas Hoje"
            description="Número de conversas marcadas como resolvidas no dia atual."
            variant="success"
          />
          
          <MetricDescription
            title="Total de Conversas"
            description="Número total de conversas no sistema."
            variant="default"
          />
          
          <MetricDescription
            title="SLA: Atrasadas (>24h)"
            description="Conversas abertas há mais de 24 horas sem resposta. Destaque em vermelho quando > 0."
            variant="danger"
            sla
          />
          
          <MetricDescription
            title="Tempo Médio Resposta"
            description="Tempo médio entre criação da conversa e primeira resposta do admin (últimos 7 dias)."
            variant="default"
            sla
          />
          
          <MetricDescription
            title="Conversas com Risco"
            description="Conversas marcadas com flags de risco (cliente_conflito, atraso_critico, pagamento_problema)."
            variant="danger"
          />
          
          <MetricDescription
            title="Promessas Atrasadas"
            description="Conversas com data prometida (promised_date) no passado e ainda não resolvidas."
            variant="danger"
          />
        </div>
      </div>

      {/* Nota sobre Realtime */}
      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <span>⚡</span>
          Atualização em Tempo Real
        </h3>
        <p className="text-sm text-muted-foreground">
          As métricas são atualizadas automaticamente via Supabase Realtime sempre que
          houver mudanças na tabela support_conversations. Não é necessário recarregar
          a página para ver as atualizações.
        </p>
      </div>

      {/* Nota sobre Migration */}
      <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <span>⚠️</span>
          Campos Pendentes de Migration
        </h3>
        <p className="text-sm text-muted-foreground">
          Os campos <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">risk_flags</code> e{" "}
          <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">promised_date</code> serão
          adicionados pela migration <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">
          20260221000004_update_support_conversations.sql</code>. Até que a migration seja aplicada,
          as métricas "Conversas com Risco" e "Promessas Atrasadas" retornarão 0.
        </p>
      </div>
    </div>
  );
}

interface MetricDescriptionProps {
  title: string;
  description: string;
  variant: "default" | "success" | "warning" | "danger";
  sla?: boolean;
}

function MetricDescription({ title, description, variant, sla }: MetricDescriptionProps) {
  const variantColors = {
    default: "border-gray-200 dark:border-gray-800",
    success: "border-green-200 dark:border-green-800",
    warning: "border-yellow-200 dark:border-yellow-800",
    danger: "border-red-200 dark:border-red-800",
  };

  return (
    <div className={`p-4 rounded-lg border ${variantColors[variant]}`}>
      <div className="flex items-start gap-2">
        <h3 className="font-semibold">
          {title}
          {sla && <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 px-2 py-0.5 rounded">SLA</span>}
        </h3>
      </div>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </div>
  );
}
