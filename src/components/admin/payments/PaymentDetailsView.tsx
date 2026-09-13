/**
 * Admin payment details.
 *
 * The timeline is assembled by the authenticated server boundary and contains
 * sanitized payment events. Internal actor identifiers are intentionally not
 * exposed through this view.
 */

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  DollarSign,
  Download,
  ExternalLink,
  File,
  FileText,
  Hash,
  History,
  Image as ImageIcon,
  MessageSquare,
  Package,
  Receipt,
  User,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { adminSupportConversationPath } from "@/config/routes";
import { toast } from "@/hooks/use-toast";
import { fileUploadService } from "@/lib/file-upload-service";
import { log } from "@/lib/logger";
import {
  exportPaymentDetailsToCsv,
  formatPaymentCurrency,
  formatPaymentDate,
  getPaymentStatusConfig,
} from "@/lib/payment-dashboard-utils";
import { getPaymentById } from "@/lib/payment-service";
import { sanitizeURL } from "@/lib/security/input-sanitizer";
import type { PaymentFile, PaymentTimelineAction } from "@/types/manual-payment";
import { PaymentActionButtons } from "./PaymentActionButtons";
import { getPaymentStatusIcon } from "./payment-status-icons";

interface PaymentDetailsViewProps {
  paymentId: string;
  onBack?: () => void;
  onStatusChange?: () => void;
}

function getSafeHttpUrl(url?: string | null): string | null {
  if (!url) return null;

  try {
    return sanitizeURL(url, ["http", "https"]);
  } catch {
    return null;
  }
}

function getTimelineActionLabel(action: PaymentTimelineAction): string {
  switch (action) {
    case "created":
      return "Pagamento criado";
    case "status_changed":
      return "Status alterado";
    case "file_uploaded":
      return "Comprovante enviado";
    case "approved":
      return "Pagamento aprovado";
    case "rejected":
      return "Pagamento rejeitado";
    case "info_requested":
      return "Informações solicitadas";
  }
}

function timelineIcon(action: PaymentTimelineAction) {
  switch (action) {
    case "approved":
      return <CheckCircle className="h-4 w-4 text-emerald-600" />;
    case "rejected":
      return <XCircle className="h-4 w-4 text-red-600" />;
    case "file_uploaded":
      return <File className="h-4 w-4 text-emerald-600" />;
    case "status_changed":
    case "info_requested":
      return <History className="h-4 w-4 text-sky-600" />;
    case "created":
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

export function PaymentDetailsView({ paymentId, onBack, onStatusChange }: PaymentDetailsViewProps) {
  const [activeTab, setActiveTab] = useState("files");
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [pdfUrls, setPdfUrls] = useState<Record<string, string>>({});

  const {
    data: payment,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["payment-details", paymentId],
    queryFn: () => getPaymentById(paymentId),
    enabled: Boolean(paymentId),
  });

  useEffect(() => {
    let cancelled = false;

    if (!payment?.files) {
      setImageUrls({});
      setPdfUrls({});
      return () => {
        cancelled = true;
      };
    }

    const loadUrls = async () => {
      const newImageUrls: Record<string, string> = {};
      const newPdfUrls: Record<string, string> = {};

      for (const file of payment.files) {
        try {
          const signedUrl = await fileUploadService.getSignedUrl(file.file_path, 3600);
          const safeUrl = getSafeHttpUrl(signedUrl);

          if (!safeUrl) {
            log.warn("Blocked unsafe payment file URL", {
              fileId: file.id,
              filePath: file.file_path,
            });
            continue;
          }

          if (file.file_type.startsWith("image/")) {
            newImageUrls[file.id] = safeUrl;
          } else if (file.file_type === "application/pdf") {
            newPdfUrls[file.id] = safeUrl;
          }
        } catch (loadError) {
          log.error("Failed to load payment file URL", {
            error: loadError,
            fileId: file.id,
            filePath: file.file_path,
          });
        }
      }

      if (!cancelled) {
        setImageUrls(newImageUrls);
        setPdfUrls(newPdfUrls);
      }
    };

    void loadUrls();
    return () => {
      cancelled = true;
    };
  }, [payment?.files]);

  const handleDownloadFile = async (file: PaymentFile) => {
    try {
      const cachedUrl = file.file_type.startsWith("image/")
        ? imageUrls[file.id]
        : pdfUrls[file.id];
      const url =
        cachedUrl ??
        getSafeHttpUrl(await fileUploadService.getSignedUrl(file.file_path, 3600));

      if (!url) {
        throw new Error("Unsafe file URL");
      }

      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.file_name;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);

      toast({
        title: "Download iniciado",
        description: `Arquivo "${file.file_name}" está sendo baixado.`,
      });
    } catch (downloadError) {
      log.error("Failed to download payment file", {
        error: downloadError,
        fileId: file.id,
        filePath: file.file_path,
      });
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar o arquivo. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Detalhes do Pagamento</CardTitle>
          <CardDescription>Erro ao carregar informações do pagamento</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : "Falha ao carregar o pagamento."}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Tentar novamente
            </Button>
            {onBack ? (
              <Button variant="ghost" size="sm" onClick={onBack}>
                Voltar
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !payment) {
    return (
      <div className="space-y-6" role="status" aria-label="Carregando detalhes do pagamento">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Skeleton className="h-96 w-full lg:col-span-2" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    );
  }

  const statusConfig = getPaymentStatusConfig(payment.status);
  const statusIcon = getPaymentStatusIcon(payment.status, "h-4 w-4");
  const imageFiles = payment.files.filter((file) => file.file_type.startsWith("image/"));
  const pdfFiles = payment.files.filter((file) => file.file_type === "application/pdf");
  const safePaymentMethodLink = getSafeHttpUrl(payment.payment_method?.payment_link);
  const sortedTimeline = [...payment.timeline].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          {onBack ? (
            <Button variant="ghost" size="sm" onClick={onBack}>
              Voltar
            </Button>
          ) : null}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Detalhes do Pagamento</h1>
            <div className="mt-1 flex items-center gap-2">
              <Badge
                variant={statusConfig.variant}
                className={`${statusConfig.bgColor} ${statusConfig.color} flex items-center gap-1`}
              >
                {statusIcon}
                {statusConfig.label}
              </Badge>
              <span className="text-sm text-muted-foreground">{payment.reference_number}</span>
            </div>
          </div>
        </div>

        <PaymentActionButtons
          paymentId={paymentId}
          currentStatus={payment.status}
          onActionComplete={() => {
            void refetch();
            onStatusChange?.();
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Informações do Pagamento
              </CardTitle>
              <CardDescription>Dados financeiros e vínculo comercial</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <InfoField icon={<Hash className="h-4 w-4" />} label="Referência">
                  {payment.reference_number}
                </InfoField>
                <InfoField icon={<Calendar className="h-4 w-4" />} label="Data de criação">
                  {formatPaymentDate(payment.created_at)}
                </InfoField>
                <InfoField icon={<User className="h-4 w-4" />} label="Cliente">
                  {payment.customer_name || "Não disponível"}
                  {payment.customer_email ? (
                    <div className="text-sm text-muted-foreground">{payment.customer_email}</div>
                  ) : null}
                </InfoField>
                <InfoField icon={<CreditCard className="h-4 w-4" />} label="Método">
                  {payment.payment_method?.name || "Não disponível"}
                </InfoField>
                <InfoField icon={<DollarSign className="h-4 w-4" />} label="Valor">
                  <span className="text-lg">
                    {formatPaymentCurrency(payment.amount, payment.currency)}
                  </span>
                </InfoField>
                <InfoField icon={<Receipt className="h-4 w-4" />} label="Tipo">
                  {payment.payment_type === "one_time" ? "Pagamento único" : "Recorrente"}
                </InfoField>
              </div>

              {(payment.quote_id || payment.subscription_id) ? (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Package className="h-4 w-4" />
                      {payment.quote_id ? "Orçamento vinculado" : "Assinatura vinculada"}
                    </div>
                    <p className="break-all text-sm text-muted-foreground">
                      {payment.quote_id || payment.subscription_id}
                    </p>
                  </div>
                </>
              ) : null}

              {payment.payment_method?.instructions ? (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <FileText className="h-4 w-4" />
                      Instruções do método
                    </div>
                    <div className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">
                      {payment.payment_method.instructions}
                    </div>
                    {safePaymentMethodLink ? (
                      <Button variant="outline" size="sm" asChild>
                        <a href={safePaymentMethodLink} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Abrir link de pagamento
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="files">
                <File className="mr-2 h-4 w-4" />
                Comprovantes ({payment.files.length})
              </TabsTrigger>
              <TabsTrigger value="timeline">
                <History className="mr-2 h-4 w-4" />
                Linha do tempo ({payment.timeline.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="files" className="space-y-6">
              {imageFiles.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ImageIcon className="h-5 w-5" />
                      Imagens ({imageFiles.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                      {imageFiles.map((file, index) => (
                        <button
                          type="button"
                          key={file.id}
                          className="group text-left"
                          onClick={() => setSelectedImageIndex(index)}
                        >
                          <div className="aspect-square overflow-hidden rounded-lg border bg-muted">
                            {imageUrls[file.id] ? (
                              <img
                                src={imageUrls[file.id]}
                                alt={`Comprovante ${index + 1}`}
                                className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                loading="lazy"
                              />
                            ) : (
                              <Skeleton className="h-full w-full" />
                            )}
                          </div>
                          <div className="mt-2 truncate text-xs text-muted-foreground">
                            {file.file_name}
                          </div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {pdfFiles.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      PDFs ({pdfFiles.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {pdfFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex flex-col justify-between gap-3 rounded-lg border p-3 sm:flex-row sm:items-center"
                      >
                        <div>
                          <div className="font-medium">{file.file_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {(file.file_size / 1024 / 1024).toFixed(2)} MB · {formatPaymentDate(file.created_at)}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => void handleDownloadFile(file)}>
                            <Download className="mr-2 h-4 w-4" />
                            Baixar
                          </Button>
                          {pdfUrls[file.id] ? (
                            <Button variant="outline" size="sm" asChild>
                              <a href={pdfUrls[file.id]} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Abrir
                              </a>
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : null}

              {payment.files.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center">
                    <File className="mx-auto h-10 w-10 text-muted-foreground" />
                    <h3 className="mt-3 font-semibold">Nenhum comprovante enviado</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      O cliente ainda não enviou comprovantes para este pagamento.
                    </p>
                  </CardContent>
                </Card>
              ) : null}
            </TabsContent>

            <TabsContent value="timeline">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Linha do tempo do pagamento
                  </CardTitle>
                  <CardDescription>
                    Eventos sanitizados e mudanças de status confirmadas pelo backend
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {sortedTimeline.length > 0 ? (
                    <div className="space-y-4">
                      {sortedTimeline.map((event) => (
                        <div key={event.id} className="rounded-lg border p-4">
                          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                            <div className="flex items-center gap-2">
                              {timelineIcon(event.action_type)}
                              <Badge variant="outline">
                                {getTimelineActionLabel(event.action_type)}
                              </Badge>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(event.created_at), "dd 'de' MMMM 'às' HH:mm", {
                                locale: ptBR,
                              })}
                            </span>
                          </div>

                          {(event.old_status || event.new_status) ? (
                            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                              {event.old_status ? (
                                <Badge variant="secondary">{event.old_status}</Badge>
                              ) : null}
                              {event.old_status && event.new_status ? <span>→</span> : null}
                              {event.new_status ? (
                                <Badge variant="secondary">{event.new_status}</Badge>
                              ) : null}
                            </div>
                          ) : null}

                          {event.notes ? (
                            <div className="mt-3 whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">
                              {event.notes}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-10 text-center text-sm text-muted-foreground">
                      Nenhum evento disponível.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          {payment.conversation ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Conversa de suporte
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-sm font-medium">Assunto</div>
                  <div className="text-sm text-muted-foreground">{payment.conversation.subject}</div>
                </div>
                <Badge variant="outline">{payment.conversation.status}</Badge>
                <Button variant="outline" className="w-full" asChild>
                  <a
                    href={adminSupportConversationPath(payment.conversation.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Abrir conversa
                  </a>
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {payment.status === "rejected" && payment.rejection_reason ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <XCircle className="h-5 w-5" />
                  Motivo da rejeição
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm">
                  {payment.rejection_reason}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {payment.status === "approved" && payment.approved_at ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle className="h-5 w-5" />
                  Aprovação
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                Registrada em {formatPaymentDate(payment.approved_at)}.
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Ações rápidas</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full justify-start" onClick={() => {
                exportPaymentDetailsToCsv(payment);
                toast({
                  title: "Exportação concluída",
                  description: `O pagamento ${payment.reference_number} foi exportado em CSV.`,
                });
              }}>
                <Download className="mr-2 h-4 w-4" />
                Exportar detalhes
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {selectedImageIndex !== null && imageFiles[selectedImageIndex] ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="relative max-h-[90vh] max-w-4xl">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-3 top-3 z-10 bg-black/40 text-white hover:bg-black/60"
              onClick={() => setSelectedImageIndex(null)}
              aria-label="Fechar visualização"
            >
              <XCircle className="h-6 w-6" />
            </Button>
            <img
              src={imageUrls[imageFiles[selectedImageIndex].id]}
              alt={`Comprovante ${selectedImageIndex + 1}`}
              className="max-h-[90vh] max-w-full object-contain"
            />
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
              {selectedImageIndex > 0 ? (
                <Button size="sm" variant="secondary" onClick={() => setSelectedImageIndex(selectedImageIndex - 1)}>
                  Anterior
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void handleDownloadFile(imageFiles[selectedImageIndex])}
              >
                <Download className="mr-2 h-4 w-4" />
                Baixar
              </Button>
              {selectedImageIndex < imageFiles.length - 1 ? (
                <Button size="sm" variant="secondary" onClick={() => setSelectedImageIndex(selectedImageIndex + 1)}>
                  Próxima
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function InfoField({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="font-medium">{children}</div>
    </div>
  );
}
