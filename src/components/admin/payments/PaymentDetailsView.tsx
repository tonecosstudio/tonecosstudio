/**
 * PaymentDetailsView Component
 *
 * Admin view for displaying detailed payment information including:
 * - Payment information (reference, customer, amount, method, status)
 * - Payment history timeline with status changes
 * - Linked quote or subscription details
 * - All uploaded payment proof files
 * - Image gallery for proof images with thumbnails
 * - PDF viewer/download for PDF proofs
 * - Audit log with admin actions
 *
 * Requirements: 6.1-6.10
 * Task: 13.1 Criar componente PaymentDetailsView
 */

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import {
  Eye,
  Download,
  FileText,
  Image as ImageIcon,
  Calendar,
  User,
  CreditCard,
  DollarSign,
  Hash,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  ExternalLink,
  ChevronRight,
  File,
  History,
  Shield,
  Package,
  Receipt,
} from "lucide-react";
import type { PaymentFile } from "@/types/manual-payment";
import { getPaymentById } from "@/lib/payment-service";
import { fileUploadService } from "@/lib/file-upload-service";
import {
  formatPaymentCurrency,
  formatPaymentDate,
  getPaymentStatusConfig,
} from "@/lib/payment-dashboard-utils";
import { PaymentActionButtons } from "./PaymentActionButtons";
import { getPaymentStatusIcon } from "./payment-status-icons";

interface PaymentDetailsViewProps {
  paymentId: string;
  onBack?: () => void;
  onStatusChange?: () => void;
}

export function PaymentDetailsView({ paymentId, onBack, onStatusChange }: PaymentDetailsViewProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [pdfUrls, setPdfUrls] = useState<Record<string, string>>({});

  // Fetch payment details
  const {
    data: payment,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["payment-details", paymentId],
    queryFn: () => getPaymentById(paymentId),
    enabled: !!paymentId,
  });

  // Load signed URLs for images and PDFs
  useEffect(() => {
    if (payment?.files) {
      const loadUrls = async () => {
        const newImageUrls: Record<string, string> = {};
        const newPdfUrls: Record<string, string> = {};

        for (const file of payment.files) {
          try {
            const url = await fileUploadService.getSignedUrl(file.file_path, 3600); // 1 hour expiration
            if (file.file_type.startsWith("image/")) {
              newImageUrls[file.id] = url;
            } else if (file.file_type === "application/pdf") {
              newPdfUrls[file.id] = url;
            }
          } catch (error) {
            console.error(`Failed to load URL for file ${file.id}:`, error);
          }
        }

        setImageUrls(newImageUrls);
        setPdfUrls(newPdfUrls);
      };

      loadUrls();
    }
  }, [payment?.files]);

  // Format date for timeline
  const formatTimelineDate = (dateString: string) => {
    return format(new Date(dateString), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR });
  };

  // Get action label for audit log
  const getActionLabel = (action: string) => {
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
      default:
        return action;
    }
  };

  // Handle file download
  const handleDownloadFile = async (file: PaymentFile) => {
    try {
      let url: string;
      if (file.file_type.startsWith("image/") && imageUrls[file.id]) {
        url = imageUrls[file.id];
      } else if (file.file_type === "application/pdf" && pdfUrls[file.id]) {
        url = pdfUrls[file.id];
      } else {
        url = await fileUploadService.getSignedUrl(file.file_path, 3600);
      }

      const a = document.createElement("a");
      a.href = url;
      a.download = file.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast({
        title: "Download iniciado",
        description: `Arquivo "${file.file_name}" está sendo baixado.`,
      });
    } catch (error) {
      console.error("Failed to download file:", error);
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar o arquivo. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Handle view image in full screen
  const handleViewImage = (index: number) => {
    setSelectedImageIndex(index);
  };

  // Handle close image viewer
  const handleCloseImageViewer = () => {
    setSelectedImageIndex(null);
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Detalhes do Pagamento</CardTitle>
          <CardDescription>Erro ao carregar informações do pagamento</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Erro ao carregar pagamento</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error.message}</p>
                </div>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
                  Tentar novamente
                </Button>
                {onBack && (
                  <Button variant="ghost" size="sm" className="mt-2 ml-2" onClick={onBack}>
                    Voltar
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !payment) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              Voltar
            </Button>
          )}
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const statusConfig = getPaymentStatusConfig(payment.status);
  const statusIcon = getPaymentStatusIcon(payment.status, "h-4 w-4");
  const imageFiles = payment.files.filter((file) => file.file_type.startsWith("image/"));
  const pdfFiles = payment.files.filter((file) => file.file_type === "application/pdf");
  const sortedAuditLogs = [...payment.audit_logs].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              Voltar
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Detalhes do Pagamento</h1>
            <div className="flex items-center gap-2 mt-1">
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

        <div className="flex items-center gap-2">
          <PaymentActionButtons
            paymentId={paymentId}
            currentStatus={payment.status}
            onActionComplete={() => {
              refetch();
              onStatusChange?.();
            }}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Overview and Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Payment Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Informações do Pagamento
              </CardTitle>
              <CardDescription>
                Detalhes completos do pagamento e informações do cliente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Hash className="h-4 w-4" />
                    <span>Referência</span>
                  </div>
                  <div className="font-medium">{payment.reference_number}</div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Data de Criação</span>
                  </div>
                  <div className="font-medium">{formatPaymentDate(payment.created_at)}</div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>Cliente</span>
                  </div>
                  <div className="font-medium">
                    {payment.customer_name || "Não disponível"}
                    {payment.customer_email && (
                      <div className="text-sm text-muted-foreground">{payment.customer_email}</div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CreditCard className="h-4 w-4" />
                    <span>Método de Pagamento</span>
                  </div>
                  <div className="font-medium">
                    {payment.payment_method?.name || "Não disponível"}
                    {payment.payment_method?.type && (
                      <div className="text-sm text-muted-foreground capitalize">
                        {payment.payment_method.type.replace("_", " ")}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <span>Valor</span>
                  </div>
                  <div className="font-medium text-lg">
                    {formatPaymentCurrency(payment.amount, payment.currency)}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Receipt className="h-4 w-4" />
                    <span>Tipo de Pagamento</span>
                  </div>
                  <div className="font-medium capitalize">
                    {payment.payment_type === "one_time" ? "Pagamento Único" : "Recorrente"}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Linked Entity */}
              {(payment.quote_id || payment.subscription_id) && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Package className="h-4 w-4" />
                      <span>
                        {payment.quote_id ? "Orçamento Vinculado" : "Assinatura Vinculada"}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      ID: {payment.quote_id || payment.subscription_id}
                    </div>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Ver {payment.quote_id ? "Orçamento" : "Assinatura"}
                    </Button>
                  </div>
                  <Separator />
                </>
              )}

              {/* Payment Instructions */}
              {payment.payment_method?.instructions && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <FileText className="h-4 w-4" />
                    <span>Instruções do Método de Pagamento</span>
                  </div>
                  <div className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap">
                    {payment.payment_method.instructions}
                  </div>
                  {payment.payment_method.payment_link && (
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={payment.payment_method.payment_link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Acessar Link de Pagamento
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabs for Files, Timeline, and Audit Log */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="files">
                <File className="h-4 w-4 mr-2" />
                Comprovantes ({payment.files.length})
              </TabsTrigger>
              <TabsTrigger value="timeline">
                <History className="h-4 w-4 mr-2" />
                Histórico
              </TabsTrigger>
              <TabsTrigger value="audit">
                <Shield className="h-4 w-4 mr-2" />
                Log de Auditoria
              </TabsTrigger>
            </TabsList>

            {/* Files Tab */}
            <TabsContent value="files" className="space-y-6">
              {/* Image Gallery */}
              {imageFiles.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ImageIcon className="h-5 w-5" />
                      Imagens de Comprovante ({imageFiles.length})
                    </CardTitle>
                    <CardDescription>
                      Clique em uma imagem para visualizar em tamanho completo
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {imageFiles.map((file, index) => (
                        <div
                          key={file.id}
                          className="group relative cursor-pointer"
                          onClick={() => handleViewImage(index)}
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
                              <div className="flex h-full items-center justify-center">
                                <Skeleton className="h-full w-full" />
                              </div>
                            )}
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Eye className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground truncate">
                            {file.file_name}
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadFile(file);
                              }}
                            >
                              <Download className="h-3 w-3 mr-1" />
                              <span className="hidden sm:inline">Baixar</span>
                            </Button>
                            <span className="text-xs text-muted-foreground">
                              {(file.file_size / 1024 / 1024).toFixed(2)} MB
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* PDF Files */}
              {pdfFiles.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      PDFs de Comprovante ({pdfFiles.length})
                    </CardTitle>
                    <CardDescription>
                      Clique para visualizar ou baixar os arquivos PDF
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {pdfFiles.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="h-8 w-8 text-red-500" />
                            <div>
                              <div className="font-medium">{file.file_name}</div>
                              <div className="text-sm text-muted-foreground">
                                {(file.file_size / 1024 / 1024).toFixed(2)} MB • Enviado em{" "}
                                {formatPaymentDate(file.created_at)}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadFile(file)}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Baixar
                            </Button>
                            {pdfUrls[file.id] && (
                              <Button variant="outline" size="sm" asChild>
                                <a
                                  href={pdfUrls[file.id]}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Visualizar
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* No Files */}
              {payment.files.length === 0 && (
                <Card>
                  <CardContent className="py-8 text-center">
                    <File className="h-12 w-12 mx-auto text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">Nenhum comprovante enviado</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      O cliente ainda não enviou comprovantes de pagamento.
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Timeline Tab */}
            <TabsContent value="timeline">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Linha do Tempo do Pagamento
                  </CardTitle>
                  <CardDescription>
                    Histórico completo de mudanças de status e eventos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-muted" />

                    {/* Timeline items */}
                    <div className="space-y-8">
                      {sortedAuditLogs.map((log) => {
                        const isStatusChange = log.action_type === "status_changed";
                        const isFileUpload = log.action_type === "file_uploaded";
                        const isApproval = log.action_type === "approved";
                        const isRejection = log.action_type === "rejected";

                        let icon = <Clock className="h-4 w-4" />;
                        let bgColor = "bg-gray-100";
                        let textColor = "text-gray-600";

                        if (isStatusChange) {
                          icon = <History className="h-4 w-4" />;
                          bgColor = "bg-blue-100";
                          textColor = "text-blue-600";
                        } else if (isFileUpload) {
                          icon = <File className="h-4 w-4" />;
                          bgColor = "bg-green-100";
                          textColor = "text-green-600";
                        } else if (isApproval) {
                          icon = <CheckCircle className="h-4 w-4" />;
                          bgColor = "bg-green-100";
                          textColor = "text-green-600";
                        } else if (isRejection) {
                          icon = <XCircle className="h-4 w-4" />;
                          bgColor = "bg-red-100";
                          textColor = "text-red-600";
                        }

                        return (
                          <div key={log.id} className="relative flex items-start">
                            {/* Timeline dot */}
                            <div
                              className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-full ${bgColor} ${textColor}`}
                            >
                              {icon}
                            </div>

                            {/* Content */}
                            <div className="ml-6 flex-1">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium">{getActionLabel(log.action_type)}</h4>
                                <span className="text-sm text-muted-foreground">
                                  {formatTimelineDate(log.created_at)}
                                </span>
                              </div>

                              {isStatusChange && log.old_status && log.new_status && (
                                <div className="mt-2 flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {log.old_status}
                                  </Badge>
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  <Badge variant="outline" className="text-xs">
                                    {log.new_status}
                                  </Badge>
                                </div>
                              )}

                              {log.notes && (
                                <div className="mt-2 text-sm text-muted-foreground bg-muted p-3 rounded-md">
                                  {log.notes}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Audit Log Tab */}
            <TabsContent value="audit">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Log de Auditoria
                  </CardTitle>
                  <CardDescription>
                    Registro completo de todas as ações administrativas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {sortedAuditLogs.map((log) => (
                      <div key={log.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{getActionLabel(log.action_type)}</Badge>
                            {log.admin_id && (
                              <span className="text-sm text-muted-foreground">
                                por Admin ID: {log.admin_id}
                              </span>
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {formatPaymentDate(log.created_at)}
                          </span>
                        </div>

                        {(log.old_status || log.new_status) && (
                          <div className="mt-2 flex items-center gap-2">
                            {log.old_status && (
                              <>
                                <span className="text-sm">Status anterior:</span>
                                <Badge variant="outline" className="text-xs">
                                  {log.old_status}
                                </Badge>
                              </>
                            )}
                            {log.new_status && (
                              <>
                                <span className="text-sm">Novo status:</span>
                                <Badge variant="outline" className="text-xs">
                                  {log.new_status}
                                </Badge>
                              </>
                            )}
                          </div>
                        )}

                        {log.notes && (
                          <div className="mt-2">
                            <div className="text-sm font-medium">Notas:</div>
                            <div className="text-sm text-muted-foreground mt-1">{log.notes}</div>
                          </div>
                        )}
                      </div>
                    ))}

                    {sortedAuditLogs.length === 0 && (
                      <div className="text-center py-8">
                        <Shield className="h-12 w-12 mx-auto text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-semibold">Nenhum registro de auditoria</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Ainda não foram realizadas ações administrativas neste pagamento.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Actions and Conversation */}
        <div className="space-y-6">
          {/* Conversation Card */}
          {payment.conversation && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Conversa de Suporte
                </CardTitle>
                <CardDescription>Comunicação relacionada a este pagamento</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm font-medium">Assunto</div>
                  <div className="text-sm text-muted-foreground">
                    {payment.conversation.subject}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium">Status</div>
                  <Badge variant="outline" className="mt-1">
                    {payment.conversation.status}
                  </Badge>
                </div>
                <Button variant="outline" className="w-full" asChild>
                  <a
                    href={`/admin/support/conversations/${payment.conversation.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir Conversa
                  </a>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Rejection Reason */}
          {payment.status === "rejected" && payment.rejection_reason && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <XCircle className="h-5 w-5" />
                  Motivo da Rejeição
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm bg-red-50 p-3 rounded-md border border-red-200">
                  {payment.rejection_reason}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Approval Info */}
          {payment.status === "approved" && payment.approved_at && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  Aprovação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <div className="text-sm font-medium">Data de Aprovação</div>
                  <div className="text-sm text-muted-foreground">
                    {formatPaymentDate(payment.approved_at)}
                  </div>
                </div>
                {payment.approved_by && (
                  <div>
                    <div className="text-sm font-medium">Aprovado por</div>
                    <div className="text-sm text-muted-foreground">
                      Admin ID: {payment.approved_by}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start" asChild>
                <a
                  href={`/admin/payments/${paymentId}/export`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Detalhes
                </a>
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <FileText className="h-4 w-4 mr-2" />
                Gerar Recibo
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <MessageSquare className="h-4 w-4 mr-2" />
                Enviar Mensagem
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Image Viewer Modal */}
      {selectedImageIndex !== null && imageFiles[selectedImageIndex] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="relative max-w-4xl max-h-[90vh]">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-10 bg-white/10 hover:bg-white/20 text-white"
              onClick={handleCloseImageViewer}
            >
              <XCircle className="h-6 w-6" />
            </Button>
            <img
              src={imageUrls[imageFiles[selectedImageIndex].id]}
              alt={`Comprovante ${selectedImageIndex + 1}`}
              className="max-w-full max-h-[90vh] object-contain"
            />
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                onClick={() => handleDownloadFile(imageFiles[selectedImageIndex])}
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar
              </Button>
              <div className="flex items-center gap-2">
                {selectedImageIndex > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                    onClick={() => setSelectedImageIndex(selectedImageIndex - 1)}
                  >
                    Anterior
                  </Button>
                )}
                <span className="text-white text-sm">
                  {selectedImageIndex + 1} / {imageFiles.length}
                </span>
                {selectedImageIndex < imageFiles.length - 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                    onClick={() => setSelectedImageIndex(selectedImageIndex + 1)}
                  >
                    Próxima
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
