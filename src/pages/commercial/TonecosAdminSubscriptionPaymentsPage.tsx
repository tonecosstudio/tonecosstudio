import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, ExternalLink, FileSearch, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  listAdminSubscriptionVouchers,
  reviewAdminSubscriptionVoucher,
  type AdminSubscriptionVoucher,
} from "@/services/admin/payments/admin-subscription-voucher-service";
import { CommercialPage, panelClass, secondaryClass } from "./CommercialPage";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const date = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" });

function VoucherCard({
  item,
  disabled,
  onReview,
}: {
  item: AdminSubscriptionVoucher;
  disabled: boolean;
  onReview: (input: { subscriptionId: string; approved: boolean; rejectionReason?: string }) => void;
}) {
  const [reason, setReason] = useState("");
  const [localError, setLocalError] = useState("");
  const paymentMethodLabel = item.paymentMethod === "credit_card"
    ? "Cartão"
    : item.paymentMethod === "pix"
      ? "PIX"
      : "Não informado";
  return (
    <article className={panelClass}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-white/45">Assinatura #{item.id.slice(0, 8)}</p>
          <h2 className="mt-1 text-lg font-semibold">{item.collectionName}</h2>
          <p className="mt-1 text-sm text-white/60">Plano {item.planType} · {paymentMethodLabel} · {currency.format(item.totalPaid)}</p>
        </div>
        <span className="border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs text-[hsl(var(--gold-accent))]">
          {item.paymentStatus === "under_review" ? "Em análise" : "Aguardando conferência"}
        </span>
      </div>

      <dl className="mt-5 grid gap-4 border-t border-white/10 pt-4 text-sm sm:grid-cols-2">
        <div><dt className="text-xs uppercase tracking-wider text-white/45">Cliente</dt><dd className="mt-1">{item.customerName}</dd></div>
        <div><dt className="text-xs uppercase tracking-wider text-white/45">Contato</dt><dd className="mt-1 break-all">{item.customerEmail}</dd></div>
        <div><dt className="text-xs uppercase tracking-wider text-white/45">Enviado em</dt><dd className="mt-1">{date.format(new Date(item.createdAt))}</dd></div>
        <div><dt className="text-xs uppercase tracking-wider text-white/45">Status da assinatura</dt><dd className="mt-1">{item.status}</dd></div>
      </dl>

      {item.modelSlugs.length > 0 && (
        <section className="mt-4 rounded-md border border-white/10 bg-black/10 p-3" aria-label="Modelos escolhidos pelo cliente">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/45">
            Modelos selecionados ({item.modelSlugs.length})
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {item.modelSlugs.map((slug) => (
              <li key={slug}>
                <code className="rounded bg-white/5 px-2 py-1 text-xs text-white/75">{slug}</code>
              </li>
            ))}
          </ul>
        </section>
      )}

      {item.voucherUrl ? (
        <a
          href={item.voucherUrl}
          target="_blank"
          rel="noreferrer"
          className={secondaryClass + " mt-5"}
        >
          <FileSearch className="mr-2 h-4 w-4" />
          Abrir comprovante <ExternalLink className="ml-2 h-3.5 w-3.5" />
        </a>
      ) : (
        <p role="alert" className="mt-5 flex items-start gap-2 text-sm text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          O comprovante está registrado, mas não foi possível gerar um link seguro para visualização.
        </p>
      )}

      {item.rejectionReason && <p className="mt-4 text-sm text-white/60">Motivo anterior: {item.rejectionReason}</p>}
      <div className="mt-6 border-t border-white/10 pt-5">
        <label htmlFor={`reason-${item.id}`} className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/55">
          Motivo da rejeição (obrigatório para rejeitar)
        </label>
        <textarea
          id={`reason-${item.id}`}
          value={reason}
          maxLength={500}
          rows={3}
          onChange={(event) => { setReason(event.target.value); setLocalError(""); }}
          className="min-h-20 w-full resize-y rounded-sm border border-white/20 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-[hsl(var(--gold-accent))]"
          placeholder="Ex.: valor não corresponde ao plano selecionado"
          disabled={disabled}
        />
        {localError && <p role="alert" className="mt-2 text-sm text-red-300">{localError}</p>}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => {
              if (!reason.trim()) {
                setLocalError("Informe o motivo para que o cliente possa corrigir o envio.");
                return;
              }
              onReview({ subscriptionId: item.id, approved: false, rejectionReason: reason });
            }}
          >
            <XCircle className="mr-2 h-4 w-4" />Rejeitar comprovante
          </Button>
          <Button
            type="button"
            disabled={disabled || !item.voucherUrl}
            onClick={() => onReview({ subscriptionId: item.id, approved: true })}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />Confirmar pagamento
          </Button>
        </div>
      </div>
    </article>
  );
}

export default function TonecosAdminSubscriptionPaymentsPage() {
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState("");
  const vouchersQuery = useQuery({
    queryKey: ["admin-subscription-vouchers"],
    queryFn: listAdminSubscriptionVouchers,
    staleTime: 30_000,
  });
  const reviewMutation = useMutation({
    mutationFn: reviewAdminSubscriptionVoucher,
    onSuccess: async () => {
      setActionError("");
      await queryClient.invalidateQueries({ queryKey: ["admin-subscription-vouchers"] });
      await queryClient.invalidateQueries({ queryKey: ["payment-details"] });
    },
    onError: (error) => setActionError(error instanceof Error ? error.message : "Não foi possível concluir a revisão."),
  });

  return (
    <CommercialPage
      title="Comprovantes de assinatura"
      intro="Revise comprovantes PIX e confirmações de cartão. A aprovação ativa a assinatura; a rejeição informa ao cliente o que precisa corrigir."
    >
      {actionError && <p role="alert" className={panelClass + " mb-5 border-red-500/40 text-red-200"}>{actionError}</p>}

      {vouchersQuery.isLoading && <p role="status" className={panelClass}>Carregando comprovantes...</p>}
      {vouchersQuery.isError && (
        <div role="alert" className={panelClass}>
          <p className="text-sm text-red-200">{vouchersQuery.error instanceof Error ? vouchersQuery.error.message : "Não foi possível carregar a fila."}</p>
          <Button className="mt-4" variant="outline" onClick={() => void vouchersQuery.refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />Tentar novamente
          </Button>
        </div>
      )}
      {!vouchersQuery.isLoading && !vouchersQuery.isError && (vouchersQuery.data?.length ?? 0) === 0 && (
        <div className={panelClass + " text-center"}>
          <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-400" />
          <h2 className="mt-3 font-semibold">Nenhum comprovante aguardando revisão</h2>
          <p className="mt-2 text-sm text-white/55">Novas solicitações aparecerão aqui após o envio pelo cliente.</p>
          <Button className="mt-5" variant="outline" onClick={() => void vouchersQuery.refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />Atualizar fila
          </Button>
        </div>
      )}
      <div className="space-y-5">
        {vouchersQuery.data?.map((item) => (
          <VoucherCard
            key={item.id}
            item={item}
            disabled={reviewMutation.isPending}
            onReview={(input) => { setActionError(""); reviewMutation.mutate(input); }}
          />
        ))}
      </div>
    </CommercialPage>
  );
}
