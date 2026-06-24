import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Clock,
  CreditCard,
  Eye,
  FileCheck,
  History,
  Info,
  Upload,
  XCircle,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUploadComponent } from "@/components/customer/FileUploadComponent";
import { UploadedFilesList } from "@/components/customer/UploadedFilesList";
import { useToast } from "@/hooks/use-toast";
import { getMyPaymentById } from "@/lib/payment-service";
import type { PaymentAuditLog, PaymentDetails, PaymentFile, PaymentStatus } from "@/types/manual-payment";

interface CustomerPaymentDetailsProps {
  paymentId: string;
  userId?: string;
  onBack?: () => void;
  showHeader?: boolean;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function getStatusConfig(status: PaymentStatus) {
  switch (status) {
    case "pending":
      return {
        badgeClass:
          "border-[hsl(var(--gold-accent)/0.28)] bg-[hsl(var(--gold-accent)/0.1)] text-[hsl(var(--gold-accent))]",
        icon: <Clock className="h-4 w-4" />,
        label: "Pendente",
        guidance: "Envie o comprovante para iniciar a analise do pagamento.",
      };
    case "under_review":
      return {
        badgeClass: "border-sky-500/25 bg-sky-500/10 text-sky-300",
        icon: <Eye className="h-4 w-4" />,
        label: "Em analise",
        guidance: "Comprovante recebido. A equipe esta revisando o pagamento.",
      };
    case "requires_info":
      return {
        badgeClass: "border-amber-500/25 bg-amber-500/10 text-amber-300",
        icon: <AlertCircle className="h-4 w-4" />,
        label: "Precisa de informacoes",
        guidance: "A equipe solicitou contexto adicional para concluir a verificacao.",
      };
    case "approved":
      return {
        badgeClass: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
        icon: <CheckCircle className="h-4 w-4" />,
        label: "Aprovado",
        guidance: "Pagamento aprovado com sucesso e registrado na conta.",
      };
    case "rejected":
      return {
        badgeClass: "border-red-500/25 bg-red-500/10 text-red-300",
        icon: <XCircle className="h-4 w-4" />,
        label: "Rejeitado",
        guidance: "Revise o motivo da rejeicao e envie um novo comprovante, se necessario.",
      };
    default:
      return {
        badgeClass: "border-[hsl(0,0%,18%)] bg-[hsl(0,0%,10%)] text-[hsl(0,0%,78%)]",
        icon: <Info className="h-4 w-4" />,
        label: "Desconhecido",
        guidance: "",
      };
  }
}

function getTimelineActionLabel(actionType: PaymentAuditLog["action_type"]) {
  switch (actionType) {
    case "status_changed":
      return "Status alterado";
    case "rejected":
      return "Pagamento rejeitado";
    case "info_requested":
      return "Informacao solicitada";
    case "approved":
      return "Pagamento aprovado";
    case "file_uploaded":
      return "Comprovante enviado";
    case "created":
      return "Pagamento criado";
    default:
      return actionType;
  }
}

export function CustomerPaymentDetails({
  paymentId,
  userId: _userId,
  onBack,
  showHeader = true,
}: CustomerPaymentDetailsProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  const {
    data: payment,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["payment-details", paymentId],
    queryFn: async (): Promise<PaymentDetails> => {
      const result = await getMyPaymentById(paymentId);
      if (!result) {
        throw new Error("Pagamento nao encontrado");
      }
      return result;
    },
    enabled: Boolean(paymentId),
  });

  const handleFileUploadComplete = (_files: PaymentFile[]) => {
    toast({
      title: "Arquivos enviados com sucesso",
      description: "Seus comprovantes foram enviados para analise.",
    });
    void refetch();
  };

  const handleFileUploadError = (uploadError: Error) => {
    toast({
      title: "Erro no upload",
      description: uploadError.message,
      variant: "destructive",
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6" role="status" aria-label="Carregando detalhes do pagamento">
        {showHeader ? (
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={onBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para pagamentos
            </Button>
            <Skeleton className="h-8 w-52" />
          </div>
        ) : null}
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-80 w-full rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        {showHeader ? (
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para pagamentos
          </Button>
        ) : null}

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro ao carregar pagamento</AlertTitle>
          <AlertDescription>
            {error instanceof Error
              ? error.message
              : "Ocorreu um erro ao carregar os detalhes do pagamento."}
          </AlertDescription>
        </Alert>

        <Button onClick={() => void refetch()}>Tentar novamente</Button>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="space-y-4">
        {showHeader ? (
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para pagamentos
          </Button>
        ) : null}

        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Pagamento nao encontrado</AlertTitle>
          <AlertDescription>
            O pagamento solicitado nao foi encontrado ou nao esta disponivel para esta conta.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const statusConfig = getStatusConfig(payment.status);
  const isUploadAllowed = ["pending", "rejected", "requires_info"].includes(payment.status);

  return (
    <div className="space-y-6">
      {showHeader ? (
        <div className="flex flex-col justify-between gap-4 rounded-lg border border-[hsl(0,0%,14%)] bg-[hsl(0,0%,7%)] p-5 sm:flex-row sm:items-start">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                Pagamento {payment.reference_number}
              </h1>
              <Badge variant="outline" className={statusConfig.badgeClass}>
                {statusConfig.icon}
                <span className="ml-1">{statusConfig.label}</span>
              </Badge>
            </div>
            <p className="mt-2 text-sm text-zinc-400">
              Criado em {format(new Date(payment.created_at), "dd/MM/yyyy", { locale: ptBR })}
            </p>
          </div>

          <Button variant="outline" size="sm" onClick={onBack} className="self-start">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para pagamentos
          </Button>
        </div>
      ) : null}

      <Alert className="border-[hsl(0,0%,14%)] bg-[hsl(0,0%,7%)]">
        {statusConfig.icon}
        <AlertTitle>Orientacao</AlertTitle>
        <AlertDescription>
          {statusConfig.guidance}
          {payment.status === "requires_info" && payment.audit_logs?.[0]?.notes ? (
            <div className="mt-3 rounded-lg border border-[hsl(0,0%,14%)] bg-white/[0.03] p-3">
              <strong>Mensagem da equipe:</strong> {payment.audit_logs[0].notes}
            </div>
          ) : null}
          {payment.status === "rejected" && payment.rejection_reason ? (
            <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
              <strong>Motivo da rejeicao:</strong> {payment.rejection_reason}
            </div>
          ) : null}
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 border border-[hsl(0,0%,14%)] bg-[hsl(0,0%,8%)]">
          <TabsTrigger value="overview">Visao geral</TabsTrigger>
          <TabsTrigger value="files">Comprovantes</TabsTrigger>
          <TabsTrigger value="history">Historico</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card className="border-[hsl(0,0%,14%)] bg-[hsl(0,0%,7%)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Informacoes do pagamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-zinc-400">Numero de referencia</span>
                    <span className="text-right font-medium">{payment.reference_number}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-zinc-400">Data de criacao</span>
                    <span className="text-right font-medium">
                      {format(new Date(payment.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-zinc-400">Valor</span>
                    <span className="text-right font-medium">{formatCurrency(payment.amount)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-zinc-400">Metodo de pagamento</span>
                    <span className="text-right font-medium">
                      {payment.payment_method?.name || "Nao especificado"}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-zinc-400">Tipo</span>
                    <span className="text-right font-medium">
                      {payment.payment_type === "one_time" ? "Pagamento unico" : "Assinatura"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-[hsl(0,0%,14%)] bg-[hsl(0,0%,7%)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5" />
                  Instrucoes de pagamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {payment.payment_method?.instructions ? (
                  <div className="space-y-3 text-sm leading-relaxed">
                    <p className="text-zinc-400">{payment.payment_method.instructions}</p>
                    {payment.payment_method.pix_key ? (
                      <div className="rounded-lg border border-[hsl(var(--gold-accent)/0.2)] bg-[hsl(var(--gold-accent)/0.08)] p-3">
                        <p className="mb-1 font-medium">Chave PIX</p>
                        <code className="text-base font-bold">{payment.payment_method.pix_key}</code>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-400">
                    Nenhuma instrucao especifica fornecida.
                  </p>
                )}

                {isUploadAllowed ? (
                  <div className="border-t pt-4">
                    <p className="mb-3 text-sm text-zinc-400">
                      Apos realizar o pagamento, envie o comprovante na aba "Comprovantes".
                    </p>
                    <Button
                      variant="outline"
                      className="w-full border-[hsl(0,0%,18%)] bg-[hsl(0,0%,8%)] text-zinc-100 hover:bg-[hsl(0,0%,10%)]"
                      onClick={() => setActiveTab("files")}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Ir para comprovantes
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <Card className="border-[hsl(0,0%,14%)] bg-[hsl(0,0%,7%)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Linha do tempo
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Historico de status e eventos deste pagamento.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {payment.audit_logs.length > 0 ? (
                <div className="space-y-4">
                  {payment.audit_logs
                    .slice()
                    .reverse()
                    .map((log) => (
                      <div key={log.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="mt-1 h-3 w-3 rounded-full bg-[hsl(var(--gold-accent))]" />
                          <div className="mt-2 h-full w-px bg-[hsl(0,0%,16%)]" />
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="font-medium">{getTimelineActionLabel(log.action_type)}</p>
                              {log.old_status && log.new_status ? (
                                <p className="text-sm text-zinc-400">
                                  De <span className="font-medium">{log.old_status}</span> para{" "}
                                  <span className="font-medium">{log.new_status}</span>
                                </p>
                              ) : null}
                            </div>
                            <span className="text-sm text-zinc-400">
                              {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                          {log.notes ? (
                            <div className="mt-3 rounded-lg border border-[hsl(0,0%,14%)] bg-white/[0.03] p-3 text-sm">
                              {log.notes}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="italic text-zinc-500">Nenhum evento registrado ainda.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {isUploadAllowed ? (
              <FileUploadComponent
                paymentId={paymentId}
                onUploadComplete={handleFileUploadComplete}
                onError={handleFileUploadError}
              />
            ) : (
              <Alert className="border-[hsl(0,0%,14%)] bg-[hsl(0,0%,8%)]">
                <Info className="h-4 w-4" />
                <AlertTitle>Upload nao disponivel</AlertTitle>
                <AlertDescription>
                  O upload de comprovantes nao esta disponivel para pagamentos com status "
                  {statusConfig.label}".
                  {payment.status === "approved" ? " O pagamento ja foi aprovado." : ""}
                  {payment.status === "under_review" ? " O comprovante ja esta em analise." : ""}
                </AlertDescription>
              </Alert>
            )}

            <UploadedFilesList paymentId={paymentId} files={payment.files} />
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card className="border-[hsl(0,0%,14%)] bg-[hsl(0,0%,7%)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Historico completo
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Registros de auditoria e eventos detalhados.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {payment.audit_logs.length > 0 ? (
                <div className="space-y-4">
                  {payment.audit_logs.map((log) => (
                    <Card key={log.id} className="overflow-hidden border-[hsl(0,0%,14%)] bg-[hsl(0,0%,8%)]">
                      <div className="p-4">
                        <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="border-[hsl(0,0%,18%)] text-zinc-200">
                                {log.action_type}
                              </Badge>
                              {log.admin_id ? (
                                <span className="text-sm text-zinc-400">
                                  por Admin {log.admin_id.substring(0, 8)}
                                </span>
                              ) : null}
                            </div>
                            <h4 className="mt-2 font-medium">{getTimelineActionLabel(log.action_type)}</h4>
                          </div>
                          <span className="text-sm text-zinc-400">
                            {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                          </span>
                        </div>

                        {log.old_status && log.new_status ? (
                          <div className="mb-2 flex items-center gap-2 text-sm">
                            <span className="text-zinc-400">Status:</span>
                            <Badge variant="outline" className="border-[hsl(0,0%,18%)] bg-white/[0.03] text-zinc-200">
                              {log.old_status}
                            </Badge>
                            <ArrowLeft className="h-3 w-3 text-zinc-500" />
                            <Badge variant="outline" className={getStatusConfig(log.new_status as PaymentStatus).badgeClass}>
                              {log.new_status}
                            </Badge>
                          </div>
                        ) : null}

                        {log.notes ? (
                          <div className="mt-3 rounded-lg border border-[hsl(0,0%,14%)] bg-white/[0.03] p-3">
                            <p className="mb-1 text-sm font-medium">Notas</p>
                            <p className="text-sm">{log.notes}</p>
                          </div>
                        ) : null}
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="italic text-zinc-500">
                  Nenhum registro de auditoria encontrado.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
