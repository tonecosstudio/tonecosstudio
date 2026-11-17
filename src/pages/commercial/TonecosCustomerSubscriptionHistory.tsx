import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { CalendarClock, PackageCheck, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadSubscriptionCatalogModels } from "@/services/subscriptions/subscription-catalog-service";
import {
  changeMyTonartPlanDeliveryModel,
  listMyTonartPlanHistory,
  type TonartPlanDelivery,
  type TonartPlanHistoryEntry,
} from "@/services/customer/subscriber-dashboard-service";
import { canChangeScheduledModel } from "@/services/commercial/tonart-commerce-rules";
import { PUBLIC_ROUTES } from "@/config/routes";
import { actionClass, CommercialPage, panelClass, secondaryClass } from "./CommercialPage";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateFormat = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" });
const coinFormat = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function parseLocalShippingDate(value: string | null): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
  return Number.isNaN(date.getTime()) ? null : date;
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending_payment: "Aguardando confirmação do pagamento",
    active: "Pagamento confirmado",
    cancelled: "Cancelado",
    suspended: "Suspenso",
    expired: "Encerrado",
    scheduled: "Programado",
    pending_choice: "Aguardando escolha",
    confirmed: "Confirmado",
    in_production: "Em produção",
    shipped: "Enviado",
    delivered: "Entregue",
  };
  return labels[status] ?? status;
}

function deliveryDate(delivery: TonartPlanDelivery): Date | null {
  return parseLocalShippingDate(
    delivery.shippingDate ?? delivery.deliveryDate ?? delivery.expectedDeliveryDate,
  );
}

function ContractCard({ contract, userId }: { contract: TonartPlanHistoryEntry; userId: string }) {
  const snapshot = contract.snapshot;
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const modelQuery = useQuery({
    queryKey: ["tonart-contract-catalog-models", contract.collectionModelSlugs],
    queryFn: ({ signal }) => loadSubscriptionCatalogModels(contract.collectionModelSlugs, signal),
    enabled: contract.collectionModelSlugs.length > 0,
    staleTime: 5 * 60 * 1000,
  });
  const modelBySlug = useMemo(
    () => new Map((modelQuery.data ?? []).map((model) => [model.slug, model])),
    [modelQuery.data],
  );
  const changeMutation = useMutation({
    mutationFn: changeMyTonartPlanDeliveryModel,
    onSuccess: async () => {
      setError("");
      setNotice("A escolha desta entrega foi atualizada.");
      await queryClient.invalidateQueries({ queryKey: ["tonart-my-plan-history", userId] });
    },
    onError: (cause: Error) => {
      const message = cause.message;
      setNotice("");
      setError(message.includes("CUTOFF_PASSED") || message.includes("CUTOFF")
        ? "O prazo para trocar este modelo terminou."
        : message.includes("PRODUCTION") || message.includes("LOCKED")
          ? "Esta peça já entrou em produção e não pode mais ser alterada."
          : "Não foi possível confirmar a troca. Atualize o histórico antes de tentar novamente.");
    },
  });

  const usedByOtherDeliveries = new Set(
    contract.deliveries.map((delivery) => delivery.modelSlug).filter((slug): slug is string => Boolean(slug)),
  );
  const pixBonusTotal = snapshot
    ? Math.min(snapshot.coinBonusPerShipment * snapshot.pieceCount, snapshot.coinBonusCap)
    : 0;

  return (
    <article className={panelClass + " space-y-5"}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--gold-accent))]">
            {contract.collectionName ?? "Coleção contratada"}
          </p>
          <h2 className="mt-2 text-xl font-semibold">{snapshot?.planName ?? contract.planName}</h2>
          <p className="mt-1 text-sm text-white/60">
            {snapshot ? (
              <>{snapshot.pieceCount} peças · {currency.format(snapshot.totalPriceBrl)} · compra do plano</>
            ) : (
              <>
                {contract.pieceCount ? `${contract.pieceCount} entregas registradas · ` : ""}
                {contract.totalPaid === null ? "valor histórico não disponível" : `total registrado: ${currency.format(contract.totalPaid)}`}
                {" · registro anterior"}
              </>
            )}
          </p>
        </div>
        <span className="rounded-sm border border-white/20 px-3 py-2 text-xs text-white/75">
          {statusLabel(contract.status)}
        </span>
      </header>

      {pixBonusTotal > 0 && snapshot?.paymentMethod === "pix" && (
        <p className="border-l-2 border-[hsl(var(--gold-accent))] pl-3 text-sm text-white/70">
          Até {coinFormat.format(pixBonusTotal)} Coins, após confirmação do PIX integral e cada envio real.
        </p>
      )}

      {contract.deliveries.length === 0 ? (
        <p className="rounded-sm border border-dashed border-white/20 p-4 text-sm text-white/60">
          As datas de envio serão exibidas quando a equipe programar os ciclos de entrega.
        </p>
      ) : (
        <ol className="space-y-3" aria-label={`Entregas de ${snapshot?.planName ?? contract.planName}`}>
          {contract.deliveries.map((delivery) => {
            const plannedDate = deliveryDate(delivery);
            const canChange = snapshot !== null && contract.status === "active" && Boolean(delivery.modelSlug) && plannedDate
              ? canChangeScheduledModel({
                  now: new Date(),
                  plannedShippingAt: plannedDate,
                  cutoffDays: snapshot.modelChangeCutoffDays,
                  status: delivery.status,
                  productionStartedAt: delivery.productionStartedAt ? new Date(delivery.productionStartedAt) : null,
                })
              : false;
            const currentModel = delivery.modelSlug ? modelBySlug.get(delivery.modelSlug) : null;
            const usedSlugs = new Set([...usedByOtherDeliveries].filter((slug) => slug !== delivery.modelSlug));
            const availableModels = (modelQuery.data ?? []).filter(
              (model) => model.slug === delivery.modelSlug || !usedSlugs.has(model.slug),
            );
            const cutoffDate = plannedDate
              ? new Date(plannedDate.getFullYear(), plannedDate.getMonth(), plannedDate.getDate() - (snapshot?.modelChangeCutoffDays ?? 0), 12)
              : null;

            return (
              <li key={delivery.id} className="grid gap-3 rounded-sm border border-white/10 p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                <PackageCheck className="h-5 w-5 text-[hsl(var(--gold-accent))]" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="font-medium">Peça {delivery.deliveryNumber} · {statusLabel(delivery.status)}</p>
                  <p className="mt-1 break-words text-sm text-white/65">
                    {currentModel?.name ?? delivery.modelSlug ?? (snapshot ? "Modelo aguardando programação" : "Modelo do histórico anterior")}
                    {plannedDate ? ` · envio previsto em ${dateFormat.format(plannedDate)}` : " · data ainda não definida"}
                  </p>
                  {delivery.trackingCode && <p className="mt-1 text-xs text-white/50">Rastreio: {delivery.trackingCode}</p>}
                  {canChange && cutoffDate && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-white/50">
                      <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                      Troca disponível até {dateFormat.format(cutoffDate)}.
                    </p>
                  )}
                </div>
                {canChange && (
                  <label className="flex min-w-0 flex-col gap-1 text-xs text-white/60">
                    <span className="sr-only">Trocar modelo da peça {delivery.deliveryNumber}</span>
                    <select
                      aria-label={`Trocar modelo da peça ${delivery.deliveryNumber}`}
                      className="min-h-11 max-w-full rounded-sm border border-white/20 bg-black px-3 text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[hsl(var(--gold-accent))]"
                      value={delivery.modelSlug ?? ""}
                      disabled={changeMutation.isPending || modelQuery.isLoading || availableModels.length === 0}
                      onChange={(event) => {
                        setNotice("");
                        setError("");
                        changeMutation.mutate({ deliveryId: delivery.id, modelSlug: event.target.value });
                      }}
                    >
                      {availableModels.map((model) => (
                        <option key={model.slug} value={model.slug}>{model.name}</option>
                      ))}
                    </select>
                  </label>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {modelQuery.isError && <p className="text-xs text-amber-200">Não foi possível consultar os nomes do catálogo agora; os slugs do contrato continuam preservados.</p>}
      {notice && <p role="status" className="text-sm text-emerald-200">{notice}</p>}
      {error && <p role="alert" className="text-sm text-red-200">{error}</p>}
    </article>
  );
}

export default function TonecosCustomerSubscriptionHistory({ userId }: { userId: string }) {
  const historyQuery = useQuery({
    queryKey: ["tonart-my-plan-history", userId],
    queryFn: () => listMyTonartPlanHistory(userId),
    enabled: Boolean(userId),
  });

  return (
    <CommercialPage
      title="Meus planos e entregas"
      intro="Acompanhe as peças contratadas, os ciclos de envio e as escolhas do seu plano. O pagamento compra as peças; Coins aparecem separadamente como bônus elegível."
    >
      {historyQuery.isLoading ? (
        <p role="status" className={panelClass}>Carregando seus planos e entregas...</p>
      ) : historyQuery.isError ? (
        <div role="alert" className={panelClass + " space-y-3"}>
          <p>Não foi possível consultar o histórico de planos. Seus dados não foram substituídos por uma prévia.</p>
          <Button variant="outline" onClick={() => void historyQuery.refetch()} disabled={historyQuery.isFetching}>
            <RefreshCw className="mr-2 h-4 w-4" />Atualizar histórico
          </Button>
        </div>
      ) : historyQuery.data?.length ? (
        <div className="space-y-4">
          {historyQuery.data.map((contract) => (
            <ContractCard key={contract.id} contract={contract} userId={userId} />
          ))}
        </div>
      ) : (
        <div className={panelClass + " space-y-4"}>
          <h2 className="text-lg font-semibold">Nenhum plano contratado</h2>
          <p className="text-sm text-white/65">Quando você contratar um plano de coleção, os pagamentos e as entregas aparecerão aqui.</p>
          <Link className={actionClass} to={PUBLIC_ROUTES.plans}>Ver planos</Link>
        </div>
      )}
      <div className="mt-6">
        <Link className={secondaryClass} to={PUBLIC_ROUTES.catalog}>Explorar catálogo</Link>
      </div>
    </CommercialPage>
  );
}
