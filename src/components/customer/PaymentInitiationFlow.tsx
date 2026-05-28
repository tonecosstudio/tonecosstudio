/**
 * PaymentInitiationFlow Component
 *
 * Customer flow for initiating manual payments with active payment method selection.
 *
 * Requirements: 2.1-2.10
 * Task: 16.1 Criar componente PaymentInitiationFlow
 */

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import {
  CheckCircle,
  CreditCard,
  Banknote,
  QrCode,
  Building,
  Copy,
  ExternalLink,
  Loader2,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import type { PaymentMethod, PaymentType } from "@/types/manual-payment";
import { listActivePaymentMethods } from "@/lib/payment-method-service";
import { createPayment } from "@/lib/payment-service";
import { useAuth } from "@/lib/auth";
import { openSafeExternalUrl } from "@/lib/security/safe-open";
import { paymentDetailsPath } from "@/config/routes";

const ACCOUNT_DETAIL_LABELS: Record<string, string> = {
  bank: "Banco",
  agency: "Agencia",
  account: "Conta",
  account_type: "Tipo de conta",
  holder: "Titular",
  document: "Documento",
};

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

  // Fetch active payment methods
  const {
    data: paymentMethods = [],
    isLoading: methodsLoading,
    error: methodsError,
  } = useQuery({
    queryKey: ["active-payment-methods"],
    queryFn: listActivePaymentMethods,
  });

  // Create payment mutation
  const createPaymentMutation = useMutation({
    mutationFn: () => {
      if (!selectedMethodId || !user?.id) {
        throw new Error("Método de pagamento ou usuário não selecionado");
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
        description:
          "Seu pagamento foi registrado com sucesso. Agora você pode enviar o comprovante.",
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

  // Auto-select default method if available
  useEffect(() => {
    if (paymentMethods.length > 0 && !selectedMethodId) {
      const defaultMethod = paymentMethods.find((method) => method.is_default);
      if (defaultMethod) {
        setSelectedMethodId(defaultMethod.id);
      } else {
        setSelectedMethodId(paymentMethods[0].id);
      }
    }
  }, [paymentMethods, selectedMethodId]);

  // Get selected method details
  const selectedMethod = paymentMethods.find((method) => method.id === selectedMethodId);

  // Get method icon
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

  // Get method type label
  const getMethodTypeLabel = (method: PaymentMethod) => {
    switch (method.type) {
      case "pix":
        return "PIX";
      case "bank_transfer":
        return "Transferência Bancária";
      case "credit_card":
        return "Cartão de Crédito";
      default:
        return "Outro";
    }
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency,
    }).format(value);
  };

  // Handle method selection
  const handleMethodSelect = (methodId: string) => {
    setSelectedMethodId(methodId);
  };

  // Handle payment confirmation
  const handleConfirmPayment = () => {
    if (!selectedMethodId) {
      toast({
        title: "Selecione um método",
        description: "Por favor, selecione um método de pagamento.",
        variant: "destructive",
      });
      return;
    }

    createPaymentMutation.mutate();
  };

  // Handle copy to clipboard
  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast({
          title: "Copiado",
          description: "Texto copiado para a área de transferência.",
        });
      })
      .catch(() => {
        toast({
          title: "Erro ao copiar",
          description: "Não foi possível copiar o texto.",
          variant: "destructive",
        });
      });
  };

  // Handle open payment link
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
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (methodsError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Erro ao carregar métodos de pagamento</CardTitle>
          <CardDescription>
            Não foi possível carregar os métodos de pagamento disponíveis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{methodsError.message}</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>Por favor, tente novamente mais tarde.</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (paymentMethods.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nenhum método de pagamento disponível</CardTitle>
          <CardDescription>No momento não há métodos de pagamento configurados.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md bg-yellow-50 p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Entre em contato com o suporte
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>Por favor, entre em contato com nosso suporte para mais informações.</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Iniciar Pagamento</h1>
        <p className="text-muted-foreground">
          Selecione um método de pagamento e siga as instruções para concluir seu pagamento.
        </p>
      </div>

      {/* Payment Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo do Pagamento</CardTitle>
          <CardDescription>Detalhes do valor a ser pago</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Valor</span>
              <span className="text-2xl font-bold">{formatCurrency(amount)}</span>
            </div>

            {quoteId && (
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Orçamento</span>
                <Badge variant="outline">{quoteId}</Badge>
              </div>
            )}

            {subscriptionId && (
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Assinatura</span>
                <Badge variant="outline">{subscriptionId}</Badge>
              </div>
            )}

            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Tipo</span>
              <Badge variant="outline">
                {paymentType === "one_time" ? "Pagamento Único" : "Recorrente"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Selecione o Método de Pagamento</CardTitle>
          <CardDescription>Escolha como você deseja realizar o pagamento</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paymentMethods.map((method) => {
              const isSelected = method.id === selectedMethodId;
              const isDefault = method.is_default;

              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => handleMethodSelect(method.id)}
                  className={`relative p-4 border rounded-lg text-left transition-all hover:border-primary ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-gray-200 hover:shadow-sm"
                  }`}
                >
                  {isDefault && (
                    <Badge className="absolute -top-2 -right-2" variant="default">
                      Padrão
                    </Badge>
                  )}

                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-full ${
                        isSelected ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {getMethodIcon(method)}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{method.name}</h3>
                        {isSelected && <CheckCircle className="h-5 w-5 text-primary" />}
                      </div>

                      <div className="mt-1">
                        <Badge variant="outline" className="text-xs">
                          {getMethodTypeLabel(method)}
                        </Badge>
                      </div>

                      <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                        {method.instructions || "Sem instruções específicas."}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Method Instructions */}
      {selectedMethod && (
        <Card>
          <CardHeader>
            <CardTitle>Instruções de Pagamento</CardTitle>
            <CardDescription>Siga as instruções abaixo para realizar o pagamento</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Method-specific instructions */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-primary/10 text-primary">
                  {getMethodIcon(selectedMethod)}
                </div>
                <div>
                  <h3 className="font-semibold">{selectedMethod.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {getMethodTypeLabel(selectedMethod)}
                  </p>
                </div>
              </div>

              {selectedMethod.instructions && (
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-sm whitespace-pre-line">{selectedMethod.instructions}</p>
                </div>
              )}

              {/* PIX-specific instructions */}
              {selectedMethod.type === "pix" && selectedMethod.pix_key && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm mb-2">Chave PIX</h4>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-3 bg-gray-100 rounded-md text-sm font-mono break-all">
                        {selectedMethod.pix_key}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyToClipboard(selectedMethod.pix_key!)}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copiar
                      </Button>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Copie a chave PIX e utilize em seu aplicativo bancário.
                    </p>
                  </div>
                </div>
              )}

              {/* Payment link instructions */}
              {selectedMethod.payment_link && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm mb-2">Link de Pagamento</h4>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-3 bg-gray-100 rounded-md text-sm font-mono break-all truncate">
                        {selectedMethod.payment_link}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenPaymentLink(selectedMethod.payment_link!)}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Abrir
                      </Button>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Clique em "Abrir" para acessar a página de pagamento.
                    </p>
                  </div>
                </div>
              )}

              {/* Bank transfer instructions */}
              {selectedMethod.type === "bank_transfer" && selectedMethod.account_details && (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-sm mb-2">Dados Bancários</h4>
                    <dl className="rounded-lg bg-gray-50 p-4 text-sm">
                      {Object.entries(selectedMethod.account_details).map(([key, value]) => (
                        <div
                          key={key}
                          className="grid grid-cols-1 gap-1 border-b border-gray-200 py-2 last:border-b-0 sm:grid-cols-[140px_1fr]"
                        >
                          <dt className="font-medium text-gray-600">
                            {formatAccountDetailLabel(key)}
                          </dt>
                          <dd className="break-words font-mono text-gray-900">
                            {formatAccountDetailValue(value)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                    <p className="mt-2 text-xs text-gray-500">
                      Utilize os dados acima para realizar a transferência bancária.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Important notes */}
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-amber-800">Importante</h4>
                  <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
                    <li>Após realizar o pagamento, você precisará enviar o comprovante</li>
                    <li>Mantenha o comprovante em mãos para upload</li>
                    <li>O processamento pode levar até 24 horas úteis</li>
                    <li>Em caso de dúvidas, entre em contato com nosso suporte</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div>
          {onCancel && (
            <Button variant="outline" onClick={onCancel} disabled={createPaymentMutation.isPending}>
              Cancelar
            </Button>
          )}
        </div>

        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => {
              // Navigate back or show help
              toast({
                title: "Precisa de ajuda?",
                description: "Entre em contato com nosso suporte.",
              });
            }}
            disabled={createPaymentMutation.isPending}
          >
            Precisa de Ajuda?
          </Button>

          <Button
            onClick={handleConfirmPayment}
            disabled={!selectedMethodId || createPaymentMutation.isPending}
            className="min-w-[200px]"
          >
            {createPaymentMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Criando Pagamento...
              </>
            ) : (
              <>
                Confirmar Método de Pagamento
                <ChevronRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
