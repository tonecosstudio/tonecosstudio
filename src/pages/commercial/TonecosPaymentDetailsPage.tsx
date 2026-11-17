import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AUTH_ROUTES, TONECOS_COMMERCIAL_ROUTES, loginReturnToPath } from "@/config/routes";
import { getTonecosCurrentUser } from "@/services/customer/tonecos-account-service";
import {
  getMySubscriptionPayment,
  resubmitSubscriptionPaymentVoucher,
  type SubscriptionCheckoutResult,
} from "@/services/subscriptions/subscription-checkout-service";
import {
  ALLOWED_PAYMENT_VOUCHER_TYPES,
  MAX_PAYMENT_VOUCHER_SIZE,
} from "@/services/payments/payment-voucher-storage-service";
import { CustomerPaymentDetails } from "@/components/customer/CustomerPaymentDetails";
import { CommercialPage, panelClass, secondaryClass } from "./CommercialPage";

type AccountState = "checking" | "authenticated" | "guest" | "error";

/** Reuse the existing RLS-scoped payment service and voucher uploader. */
export default function TonecosPaymentDetailsPage() {
  const { paymentId } = useParams<{ paymentId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [state, setState] = useState<AccountState>("checking");
  const [attempt, setAttempt] = useState(0);
  const [voucher, setVoucher] = useState<File | null>(null);
  const [retryError, setRetryError] = useState("");
  const [isRetrying, setIsRetrying] = useState(false);
  const [resubmitted, setResubmitted] = useState<SubscriptionCheckoutResult | null>(null);
  const subscriptionQuery = useQuery({
    queryKey: ["customer-subscription-payment", paymentId],
    queryFn: () => getMySubscriptionPayment(paymentId as string),
    enabled: state === "authenticated" && Boolean(paymentId),
  });

  useEffect(() => {
    let active = true;
    setState("checking");
    getTonecosCurrentUser()
      .then((user) => {
        if (active) setState(user ? "authenticated" : "guest");
      })
      .catch(() => {
        if (active) setState("error");
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  const submitReplacementVoucher = async () => {
    if (!paymentId || !subscriptionQuery.data || !voucher) return;
    setRetryError("");
    setIsRetrying(true);
    try {
      const result = await resubmitSubscriptionPaymentVoucher({
        subscriptionId: subscriptionQuery.data.id,
        voucher,
      });
      setResubmitted(result);
      await queryClient.invalidateQueries({ queryKey: ["customer-subscription-payment", paymentId] });
      await queryClient.invalidateQueries({ queryKey: ["payment-details", paymentId] });
    } catch (error) {
      setRetryError(error instanceof Error ? error.message : "Não foi possível enviar o novo comprovante.");
    } finally {
      setIsRetrying(false);
    }
  };

  if (state === "guest") {
    return (
      <Navigate
        to={loginReturnToPath(location.pathname + location.search)}
        replace
      />
    );
  }

  return (
    <CommercialPage
      title="Detalhes do pagamento"
      intro="Consulte o status, os comprovantes e o histórico do pagamento vinculado à sua conta."
    >
      {state === "checking" && (
        <p role="status" className={panelClass}>Verificando sua conta...</p>
      )}
      {state === "error" && (
        <div role="alert" className={panelClass}>
          <p className="mb-4">Não foi possível verificar sua conta.</p>
          <button
            type="button"
            className={secondaryClass}
            onClick={() => setAttempt((value) => value + 1)}
          >
            Tentar novamente
          </button>
        </div>
      )}
      {state === "authenticated" && paymentId && (
        <div className="space-y-5">
          <Link className={secondaryClass} to={AUTH_ROUTES.payments}>
            Voltar para pagamentos
          </Link>
          {subscriptionQuery.isLoading ? (
            <p role="status" className={panelClass}>Carregando informações da assinatura...</p>
          ) : resubmitted ? (
            <section className={panelClass}>
              <CheckCircle2 className="h-9 w-9 text-emerald-400" aria-hidden="true" />
              <h2 className="mt-3 text-xl font-semibold">Novo comprovante enviado</h2>
              <p className="mt-2 text-sm leading-6 text-white/65">
                O comprovante da mesma assinatura foi encaminhado para uma nova análise. Nenhuma cobrança adicional foi criada.
              </p>
              <p className="mt-4 text-sm">Referência: <strong className="font-mono">{resubmitted.referenceNumber}</strong></p>
              <Link className={secondaryClass + " mt-5"} to={AUTH_ROUTES.payments}>Ver pagamentos</Link>
            </section>
          ) : subscriptionQuery.data?.paymentStatus === "rejected" ? (
            <section className={panelClass}>
              <h2 className="text-xl font-semibold">Comprovante rejeitado</h2>
              <p className="mt-2 text-sm leading-6 text-white/65">
                {subscriptionQuery.data.rejectionReason || "Envie um comprovante legível do valor e do plano escolhido."}
              </p>
              <p className="mt-3 text-sm text-white/55">
                Valor do plano: R$ {subscriptionQuery.data.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}. O novo envio será anexado ao mesmo pagamento.
              </p>
              <label htmlFor="subscription-replacement-voucher" className="mt-5 flex cursor-pointer items-center gap-3 rounded-sm border border-dashed border-white/25 p-4 hover:border-[hsl(var(--gold-accent))]">
                <Upload className="h-5 w-5 shrink-0 text-[hsl(var(--gold-accent))]" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{voucher?.name ?? "Escolher novo comprovante"}</span>
                  <span className="mt-1 block text-xs text-white/50">JPG, PNG ou PDF · até {Math.round(MAX_PAYMENT_VOUCHER_SIZE / (1024 * 1024))} MB</span>
                </span>
              </label>
              <input
                id="subscription-replacement-voucher"
                type="file"
                className="sr-only"
                accept={ALLOWED_PAYMENT_VOUCHER_TYPES.join(",")}
                onChange={(event) => { setVoucher(event.currentTarget.files?.[0] ?? null); setRetryError(""); }}
              />
              {retryError && <p role="alert" className="mt-3 text-sm text-red-300">{retryError}</p>}
              <Button className="mt-5 w-full sm:w-auto" disabled={!voucher || isRetrying} onClick={() => void submitReplacementVoucher()}>
                {isRetrying ? "Enviando..." : "Enviar comprovante corrigido"}
              </Button>
            </section>
          ) : (
            <>
              {subscriptionQuery.isError && <p role="status" className="text-xs text-white/50">Não foi possível consultar o vínculo da assinatura. O histórico de pagamento continua disponível abaixo.</p>}
              <CustomerPaymentDetails
                paymentId={paymentId}
                onBack={() => navigate(AUTH_ROUTES.payments)}
                showHeader={false}
              />
            </>
          )}
        </div>
      )}
      {state === "authenticated" && !paymentId && (
        <div role="alert" className={panelClass}>
          <p>Pagamento não encontrado.</p>
          <Link
            className={secondaryClass + " mt-4"}
            to={TONECOS_COMMERCIAL_ROUTES.account + "/pagamentos"}
          >
            Abrir pagamentos
          </Link>
        </div>
      )}
    </CommercialPage>
  );
}
