import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Banknote,
  Building,
  CheckCircle,
  ChevronRight,
  Copy,
  CreditCard,
  ExternalLink,
  Loader2,
  QrCode,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { paymentDetailsPath } from "@/config/routes";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { listActivePaymentMethods } from "@/lib/payment-method-service";
import { createPayment } from "@/lib/payment-service";
import { openSafeExternalUrl } from "@/lib/security/safe-open";
import { cn, formatCurrency as formatConfiguredCurrency } from "@/lib/utils";
import type { PaymentMethod, PaymentType } from "@/types/manual-payment";

const ACCOUNT_DETAIL_LABELS: Record<string, string> = {
  bank: "Banco",
  agency: "Agencia",
  account: "Conta",
  account_type: "Tipo de conta",
  holder: "Titular",
  document: "Documento",
};

const cardClassName = "border-[hsl(0,0%,12%)] bg-[hsl(0,0%,6%)] text-white shadow-none";

function formatAccountDetailLabel(key: string): string {
  return ACCOUNT_DETAIL_LABELS[key] ?? key.replace(/_/g, " ");
}

function formatAccountDetailValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

interface PaymentInitiationFlowProps {
  quoteId?: string;
  subscriptionId?: string;
  amount: number;
  currency?: string;
  paymentType?: PaymentType;
  onSuccess?: (paymentId: string) => void;
  onCancel?: () => void;
}

export function PaymentInitiationFlow({
  quoteId,
  subscriptionId,
  amount,
  currency = "BRL",
  paymentType = "one_time",
  onSuccess,
  onCancel,
}: PaymentInitiationFlowProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);

  const {
    data: paymentMethods = [],
    isLoading: methodsLoading,
    error: methodsError,
  } = useQuery({
    queryKey: ["active-payment-methods"],
    queryFn: listActivePaymentMethods,
  });

  const createPaymentMutation = useMutation({
    mutationFn: () => {
      if (!selectedMethodId || !user?.id) {
        throw new Error("Metodo de pagamento ou usuario nao selecionado");
      }

      return createPayment({
        payment_method_id: selectedMethodId,
        amount,
        currency,
        payment_type: paymentType,
        quote_id: quoteId,
        subscription_id: subscriptionId,
      });
    },
    onSuccess: (payment) => {
      toast({
        title: "Pagamento criado",
        description: "Seu pagamento foi registrado. Agora envie o comprovante para validacao.",
      });

      if (onSuccess) {
        onSuccess(payment.id);
      } else {
        navigate(paymentDetailsPath(payment.id));
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar pagamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (paymentMethods.length > 0 && !selectedMethodId) {
      const defaultMethod = paymentMethods.find((method) => method.is_default);
      setSelectedMethodId((defaultMethod ?? paymentMethods[0]).id);
    }
  }, [paymentMethods, selectedMethodId]);

  const selectedMethod = paymentMethods.find((method) => method.id === selectedMethodId);

  const getMethodIcon = (method: PaymentMethod) => {
    switch (method.type) {
      case "pix":
        return <QrCode className="h-5 w-5" />;
      case "bank_transfer":
        return <Building className="h-5 w-5" />;
      case "credit_card":
        return <CreditCard className="h-5 w-5" />;
      default:
        return <Banknote className="h-5 w-5" />;
    }
  };

  const getMethodTypeLabel = (method: PaymentMethod) => {
    switch (method.type) {
      case "pix":
        return "PIX";
      case "bank_transfer":
        return "Transferencia bancaria";
      case "credit_card":
        return "Cartao de credito";
      default:
        return "Outro";
    }
  };

  const formatCurrency = (value: number) => formatConfiguredCurrency(value, { currency });

  const handleConfirmPayment = () => {
    if (!selectedMethodId) {
      toast({
        title: "Selecione um metodo",
        description: "Selecione um metodo de pagamento para continuar.",
        variant: "destructive",
      });
      return;
    }

    createPaymentMutation.mutate();
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast({
          title: "Copiado",
          description: "Texto copiado para a area de transferencia.",
        });
      })
      .catch(() => {
        toast({
          title: "Erro ao copiar",
          description: "Nao foi possivel copiar o texto.",
          variant: "destructive",
        });
      });
  };

  const handleOpenPaymentLink = (url: string) => {
    try {
      openSafeExternalUrl(url);
    } catch {
      toast({
        title: "Link de pagamento invalido",
        description: "O link configurado para este metodo de pagamento nao e seguro.",
        variant: "destructive",
      });
    }
  };

  if (methodsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 bg-white/10" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[...Array(3)].map((_, index) => (
            <Skeleton key={index} className="h-32 w-full bg-white/10" />
          ))}
        </div>
      </div>
    );
  }

  if (methodsError) {
    return (
      <Card className={cardClassName}>
        <CardHeader>
          <CardTitle>Erro ao carregar metodos de pagamento</CardTitle>
          <CardDescription className="text-zinc-400">
            Nao foi possivel carregar os metodos disponiveis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-300" />
              <div>
                <h3 className="text-sm font-medium text-red-100">{methodsError.message}</h3>
                <p className="mt-2 text-sm text-red-200">Tente novamente mais tarde.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (paymentMethods.length === 0) {
    return (
      <Card className={cardClassName}>
        <CardHeader>
          <CardTitle>Nenhum metodo de pagamento disponivel</CardTitle>
          <CardDescription className="text-zinc-400">
            No momento nao ha metodos de pagamento configurados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-amber-300" />
              <div>
                <h3 className="text-sm font-medium text-amber-100">Entre em contato com o suporte</h3>
                <p className="mt-2 text-sm text-amber-200">
                  O suporte pode orientar a melhor forma de concluir o pagamento.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Iniciar pagamento</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Escolha um metodo e siga as instrucoes para concluir seu pagamento.
        </p>
      </div>

      <Card className={cardClassName}>
        <CardHeader>
          <CardTitle>Resumo do pagamento</CardTitle>
          <CardDescription className="text-zinc-400">Detalhes do valor a ser pago.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium text-zinc-300">Valor</span>
              <span className="text-2xl font-semibold text-[hsl(42,100%,55%)]">
                {formatCurrency(amount)}
              </span>
            </div>

            {quoteId && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium text-zinc-300">Orcamento</span>
                <Badge variant="outline" className="border-[hsl(0,0%,18%)] text-zinc-200">
                  {quoteId}
                </Badge>
              </div>
            )}

            {subscriptionId && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium text-zinc-300">Assinatura</span>
                <Badge variant="outline" className="border-[hsl(0,0%,18%)] text-zinc-200">
                  {subscriptionId}
                </Badge>
              </div>
            )}

            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium text-zinc-300">Tipo</span>
              <Badge variant="outline" className="border-[hsl(0,0%,18%)] text-zinc-200">
                {paymentType === "one_time" ? "Pagamento unico" : "Recorrente"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={cardClassName}>
        <CardHeader>
          <CardTitle>Selecione o metodo de pagamento</CardTitle>
          <CardDescription className="text-zinc-400">Escolha como voce deseja pagar.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {paymentMethods.map((method) => {
              const isSelected = method.id === selectedMethodId;

              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setSelectedMethodId(method.id)}
                  className={cn(
                    "relative rounded-lg border p-4 text-left transition-all hover:border-[hsl(42,100%,55%)] hover:bg-white/[0.03]",
                    isSelected
                      ? "border-[hsl(42,100%,55%)] bg-[hsl(42,100%,55%)]/10 ring-2 ring-[hsl(42,100%,55%)]/20"
                      : "border-[hsl(0,0%,14%)] bg-[hsl(0,0%,8%)]"
                  )}
                >
                  {method.is_default && (
                    <Badge className="absolute -right-2 -top-2 bg-[hsl(42,100%,50%)] text-black">
                      Padrao
                    </Badge>
                  )}

                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "rounded-full p-2",
                        isSelected
                          ? "bg-[hsl(42,100%,55%)]/15 text-[hsl(42,100%,55%)]"
                          : "bg-white/[0.06] text-zinc-300"
                      )}
                    >
                      {getMethodIcon(method)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-white">{method.name}</h3>
                        {isSelected && <CheckCircle className="h-5 w-5 text-[hsl(42,100%,55%)]" />}
                      </div>

                      <Badge variant="outline" className="mt-2 border-[hsl(0,0%,18%)] text-xs text-zinc-300">
                        {getMethodTypeLabel(method)}
                      </Badge>

                      <p className="mt-2 line-clamp-2 text-sm text-zinc-400">
                        {method.instructions || "Sem instrucoes especificas."}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {selectedMethod && (
        <Card className={cardClassName}>
          <CardHeader>
            <CardTitle>Instrucoes de pagamento</CardTitle>
            <CardDescription className="text-zinc-400">
              Siga as orientacoes abaixo antes de confirmar o metodo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-[hsl(42,100%,55%)]/15 p-2 text-[hsl(42,100%,55%)]">
                  {getMethodIcon(selectedMethod)}
                </div>
                <div>
                  <h3 className="font-semibold text-white">{selectedMethod.name}</h3>
                  <p className="text-sm text-zinc-400">{getMethodTypeLabel(selectedMethod)}</p>
                </div>
              </div>

              {selectedMethod.instructions && (
                <div className="rounded-lg border border-[hsl(0,0%,14%)] bg-white/[0.03] p-4">
                  <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-200">
                    {selectedMethod.instructions}
                  </p>
                </div>
              )}

              {selectedMethod.type === "pix" && selectedMethod.pix_key && (
                <div>
                  <h4 className="mb-2 text-sm font-medium text-zinc-200">Chave PIX</h4>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <code className="flex-1 break-all rounded-md border border-[hsl(0,0%,14%)] bg-black/30 p-3 font-mono text-sm text-zinc-100">
                      {selectedMethod.pix_key}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyToClipboard(selectedMethod.pix_key!)}
                      className="border-[hsl(0,0%,18%)] bg-[hsl(0,0%,8%)] text-zinc-100 hover:bg-[hsl(0,0%,10%)]"
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-zinc-500">
                    Copie a chave PIX e utilize no seu aplicativo bancario.
                  </p>
                </div>
              )}

              {selectedMethod.payment_link && (
                <div>
                  <h4 className="mb-2 text-sm font-medium text-zinc-200">Link de pagamento</h4>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <code className="flex-1 truncate rounded-md border border-[hsl(0,0%,14%)] bg-black/30 p-3 font-mono text-sm text-zinc-100">
                      {selectedMethod.payment_link}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenPaymentLink(selectedMethod.payment_link!)}
                      className="border-[hsl(0,0%,18%)] bg-[hsl(0,0%,8%)] text-zinc-100 hover:bg-[hsl(0,0%,10%)]"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Abrir
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-zinc-500">
                    Abra o link somente se reconhecer o provedor de pagamento.
                  </p>
                </div>
              )}

              {selectedMethod.type === "bank_transfer" && selectedMethod.account_details && (
                <div>
                  <h4 className="mb-2 text-sm font-medium text-zinc-200">Dados bancarios</h4>
                  <dl className="rounded-lg border border-[hsl(0,0%,14%)] bg-white/[0.03] p-4 text-sm">
                    {Object.entries(selectedMethod.account_details).map(([key, value]) => (
                      <div
                        key={key}
                        className="grid grid-cols-1 gap-1 border-b border-[hsl(0,0%,14%)] py-2 last:border-b-0 sm:grid-cols-[140px_1fr]"
                      >
                        <dt className="font-medium text-zinc-400">{formatAccountDetailLabel(key)}</dt>
                        <dd className="break-words font-mono text-zinc-100">
                          {formatAccountDetailValue(value)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-2 text-xs text-zinc-500">
                    Use os dados acima para realizar a transferencia bancaria.
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 text-amber-300" />
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-amber-100">Importante</h4>
                  <ul className="list-inside list-disc space-y-1 text-sm text-amber-200">
                    <li>Apos pagar, envie o comprovante na pagina do pagamento.</li>
                    <li>Mantenha o comprovante salvo para upload.</li>
                    <li>A validacao pode levar ate 24 horas uteis.</li>
                    <li>Em caso de duvida, entre em contato com o suporte.</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
        <div>
          {onCancel && (
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={createPaymentMutation.isPending}
              className="border-[hsl(0,0%,18%)] bg-[hsl(0,0%,8%)] text-zinc-100 hover:bg-[hsl(0,0%,10%)]"
            >
              Cancelar
            </Button>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => {
              toast({
                title: "Precisa de ajuda?",
                description: "Entre em contato com nosso suporte.",
              });
            }}
            disabled={createPaymentMutation.isPending}
            className="border-[hsl(0,0%,18%)] bg-[hsl(0,0%,8%)] text-zinc-100 hover:bg-[hsl(0,0%,10%)]"
          >
            Precisa de ajuda?
          </Button>

          <Button
            onClick={handleConfirmPayment}
            disabled={!selectedMethodId || createPaymentMutation.isPending}
            className="min-w-[200px] bg-[hsl(42,100%,50%)] text-black hover:bg-[hsl(42,100%,58%)]"
          >
            {createPaymentMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Criando pagamento...
              </>
            ) : (
              <>
                Confirmar metodo de pagamento
                <ChevronRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
