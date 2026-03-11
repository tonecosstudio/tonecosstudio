import { Page } from "@/components/layouts/Page";
import { ArcadeHero, ArcadeCard, ArcadeSectionTitle } from "@/components/arcade/ArcadeLayout";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { listPaymentsByUser } from "@/lib/payment-service";
import { toast } from "@/hooks/use-toast";
import {
  Clock, CheckCircle, XCircle, AlertCircle, Eye, Search, FileText, Filter
} from "lucide-react";
import { Input } from "@/components/ui/input";
import type { PaymentStatus } from "@/types/manual-payment";

const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
  pending: { icon: Clock, color: "text-yellow-400", label: "PENDENTE" },
  under_review: { icon: Eye, color: "text-blue-400", label: "EM ANÁLISE" },
  requires_info: { icon: AlertCircle, color: "text-orange-400", label: "PRECISA INFO" },
  approved: { icon: CheckCircle, color: "text-green-400", label: "APROVADO" },
  rejected: { icon: XCircle, color: "text-red-400", label: "REJEITADO" },
};

export default function MyPaymentsArcade() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: payments = [], isLoading, refetch } = useQuery({
    queryKey: ["user-payments", user?.id, statusFilter, searchQuery],
    queryFn: () => {
      if (!user?.id) throw new Error("Não autenticado");
      const filters: any = {};
      if (statusFilter !== "all") filters.status = [statusFilter];
      if (searchQuery) filters.search = searchQuery;
      return listPaymentsByUser(user.id, filters);
    },
    enabled: !!user?.id,
  });

  // Realtime
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel('payments-arcade')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'manual_payments', filter: `user_id=eq.${user.id}` }, () => refetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, refetch]);

  const formatCurrency = (amount: number) => `R$ ${amount.toFixed(2)}`;

  const pendingCount = payments.filter((p: any) => p.status === "pending").length;
  const approvedCount = payments.filter((p: any) => p.status === "approved").length;

  return (
    <Page title="Meus Pagamentos | ORDAX" description="Acompanhe seus pagamentos">
      <ArcadeHero
        badge="PAYMENT LOG"
        title="PAGAMENTOS"
        subtitle="HISTÓRICO DE TRANSAÇÕES"
        stats={[
          { value: payments.length, label: "Total" },
          { value: pendingCount, label: "Pendentes" },
          { value: approvedCount, label: "Aprovados" },
        ]}
      />

      <section className="max-w-6xl mx-auto px-6 pb-16">
        {/* Filters */}
        <ArcadeCard hover={false} className="p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(0,0%,30%)]" />
              <Input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar referência..."
                className="pl-10 bg-[hsl(0,0%,8%)] border-[hsl(0,0%,15%)] text-[hsl(0,0%,90%)] font-mono text-xs"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {["all", "pending", "under_review", "approved", "rejected"].map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`font-mono text-[9px] px-3 py-1.5 tracking-[0.15em] uppercase border transition-colors ${
                    statusFilter === s
                      ? "border-[hsl(var(--gold-accent))] text-[hsl(var(--gold-accent))] bg-[hsl(var(--gold-accent)/0.1)]"
                      : "border-[hsl(0,0%,15%)] text-[hsl(0,0%,45%)] hover:text-[hsl(0,0%,70%)]"
                  }`}
                >
                  {s === "all" ? "TODOS" : (statusConfig[s]?.label || s)}
                </button>
              ))}
            </div>
          </div>
        </ArcadeCard>

        {/* Results */}
        {isLoading ? (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-2 border-[hsl(var(--gold-accent))] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="font-mono text-xs text-[hsl(0,0%,40%)] tracking-wider">CARREGANDO...</p>
          </div>
        ) : payments.length === 0 ? (
          <ArcadeCard className="p-12 text-center">
            <FileText className="w-12 h-12 text-[hsl(0,0%,20%)] mx-auto mb-4" />
            <p className="font-mono text-xs text-[hsl(0,0%,45%)] tracking-wider">NENHUM PAGAMENTO ENCONTRADO</p>
          </ArcadeCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {payments.map((payment: any) => {
              const cfg = statusConfig[payment.status] || statusConfig.pending;
              const Icon = cfg.icon;
              return (
                <ArcadeCard
                  key={payment.id}
                  className="p-4 cursor-pointer"
                  hover
                >
                  <div onClick={() => navigate(`/pagamentos/${payment.id}`)}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono text-xs text-[hsl(0,0%,60%)] truncate">{payment.reference_number || "—"}</span>
                      <div className={`flex items-center gap-1 ${cfg.color}`}>
                        <Icon className="w-3 h-3" />
                        <span className="font-mono text-[8px] tracking-[0.15em] uppercase">{cfg.label}</span>
                      </div>
                    </div>
                    <p className="text-xl font-bold text-[hsl(var(--gold-accent))] font-mono tabular-nums mb-1">
                      {formatCurrency(payment.amount)}
                    </p>
                    <p className="font-mono text-[10px] text-[hsl(0,0%,35%)]">
                      {format(new Date(payment.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </ArcadeCard>
              );
            })}
          </div>
        )}
      </section>
    </Page>
  );
}
