/**
 * CustomerPaymentDetails Component
 * 
 * Component for customers to view payment details, upload proof, and track status.
 * 
 * Requirements: 13.1-13.15
 * Task: 18.2 Criar componente CustomerPaymentDetails
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Eye,
  Download,
  Upload,
  MessageSquare,
  FileText,
  ArrowLeft,
  ExternalLink,
  CreditCard,
  FileCheck,
  History,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { getPaymentById } from '@/lib/payment-service';
import type { ManualPayment, PaymentStatus } from '@/types/manual-payment';

// Import placeholder components
const FileUploadComponent = ({ paymentId, onUploadComplete, onError }: any) => (
  <div className="border rounded-lg p-4">
    <div className="flex items-center gap-2 mb-4">
      <Upload className="h-5 w-5" />
      <h3 className="font-medium">Enviar Comprovante</h3>
    </div>
    <p className="text-sm text-muted-foreground mb-4">
      Faça upload do comprovante de pagamento. Formatos aceitos: JPG, PNG, PDF (máx. 5MB).
    </p>
    <Button onClick={() => onUploadComplete?.([{ id: 'temp-file', name: 'comprovante.jpg' }])}>
      <Upload className="h-4 w-4 mr-2" />
      Selecionar Arquivo
    </Button>
  </div>
);

const UploadedFilesList = ({ paymentId, files }: any) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2">
      <FileText className="h-5 w-5" />
      <h3 className="font-medium">Comprovantes Enviados</h3>
    </div>
    {files && files.length > 0 ? (
      <div className="space-y-2">
        {files.map((file: any) => (
          <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">{file.file_name}</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(file.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-sm text-muted-foreground italic">Nenhum comprovante enviado ainda.</p>
    )}
  </div>
);

interface CustomerPaymentDetailsProps {
  paymentId: string;
  userId?: string;
  onBack?: () => void;
}

export function CustomerPaymentDetails({ 
  paymentId, 
  userId,
  onBack 
}: CustomerPaymentDetailsProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch payment data
  const { 
    data: payment, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['payment-details', paymentId],
    queryFn: () => getPaymentById(paymentId),
    enabled: !!paymentId,
  });

  // Handle file upload
  const handleFileUploadComplete = (files: any[]) => {
    toast({
      title: 'Arquivos enviados com sucesso',
      description: 'Seus comprovantes foram enviados para análise.',
    });
    refetch();
  };

  const handleFileUploadError = (error: Error) => {
    toast({
      title: 'Erro no upload',
      description: error.message,
      variant: 'destructive',
    });
  };

  // Get status badge color and icon
  const getStatusConfig = (status: PaymentStatus) => {
    switch (status) {
      case 'pending':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: <Clock className="h-4 w-4" />,
          label: 'Pendente',
          guidance: 'Envie o comprovante de pagamento para iniciar a análise.'
        };
      case 'under_review':
        return {
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: <Eye className="h-4 w-4" />,
          label: 'Em Análise',
          guidance: 'Comprovante recebido e em análise. Tempo médio: 24 horas úteis.'
        };
      case 'requires_info':
        return {
          color: 'bg-orange-100 text-orange-800 border-orange-200',
          icon: <AlertCircle className="h-4 w-4" />,
          label: 'Precisa de Informações',
          guidance: 'Envie as informações solicitadas pelo administrador.'
        };
      case 'approved':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: <CheckCircle className="h-4 w-4" />,
          label: 'Aprovado',
          guidance: 'Pagamento aprovado com sucesso. Baixe o recibo para seus registros.'
        };
      case 'rejected':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: <XCircle className="h-4 w-4" />,
          label: 'Rejeitado',
          guidance: 'Verifique o motivo da rejeição e envie um novo comprovante se necessário.'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: <Info className="h-4 w-4" />,
          label: 'Desconhecido',
          guidance: ''
        };
    }
  };

  // Check if file upload is allowed
  const isUploadAllowed = payment?.status && ['pending', 'rejected', 'requires_info'].includes(payment.status);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Meus Pagamentos
          </Button>
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Meus Pagamentos
        </Button>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro ao carregar pagamento</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'Ocorreu um erro ao carregar os detalhes do pagamento.'}
          </AlertDescription>
        </Alert>
        
        <Button onClick={() => refetch()}>
          Tentar Novamente
        </Button>
      </div>
    );
  }

  // No payment found
  if (!payment) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Meus Pagamentos
        </Button>
        
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Pagamento não encontrado</AlertTitle>
          <AlertDescription>
            O pagamento solicitado não foi encontrado ou você não tem permissão para visualizá-lo.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const statusConfig = getStatusConfig(payment.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Meus Pagamentos
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Pagamento {payment.reference_number}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={statusConfig.color}>
                {statusConfig.icon}
                <span className="ml-1">{statusConfig.label}</span>
              </Badge>
              <span className="text-sm text-muted-foreground">
                Criado em {format(new Date(payment.created_at), 'dd/MM/yyyy', { locale: ptBR })}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {payment.status === 'approved' && (
            <Button>
              <Download className="h-4 w-4 mr-2" />
              Baixar Recibo
            </Button>
          )}
          {payment.conversation && (
            <Button variant="outline">
              <MessageSquare className="h-4 w-4 mr-2" />
              Conversa de Suporte
              <ExternalLink className="h-3 w-3 ml-2" />
            </Button>
          )}
        </div>
      </div>

      {/* Status guidance */}
      <Alert>
        {statusConfig.icon}
        <AlertTitle>Orientação</AlertTitle>
        <AlertDescription>
          {statusConfig.guidance}
          {payment.status === 'requires_info' && payment.audit_logs?.[0]?.notes && (
            <div className="mt-2 p-3 bg-muted rounded">
              <strong>Mensagem do Administrador:</strong> {payment.audit_logs[0].notes}
            </div>
          )}
          {payment.status === 'rejected' && payment.rejection_reason && (
            <div className="mt-2 p-3 bg-destructive/10 rounded">
              <strong>Motivo da Rejeição:</strong> {payment.rejection_reason}
            </div>
          )}
        </AlertDescription>
      </Alert>

      {/* Main content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="files">Comprovantes</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        {/* Overview tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Payment information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Informações do Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Número de Referência</span>
                    <span className="font-medium">{payment.reference_number}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Data de Criação</span>
                    <span className="font-medium">
                      {format(new Date(payment.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Valor</span>
                    <span className="font-medium">
                      R$ {payment.amount.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Método de Pagamento</span>
                    <span className="font-medium">{payment.payment_method?.name || 'Não especificado'}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Tipo</span>
                    <span className="font-medium">
                      {payment.payment_type === 'one_time' ? 'Pagamento Único' : 'Assinatura'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment instructions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5" />
                  Instruções de Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {payment.payment_method?.instructions ? (
                  <div className="prose prose-sm max-w-none">
                    <p>{payment.payment_method.instructions}</p>
                    {payment.payment_method.pix_key && (
                      <div className="mt-4 p-3 bg-primary/10 rounded-lg">
                        <p className="font-medium mb-1">Chave PIX:</p>
                        <code className="text-lg font-bold">{payment.payment_method.pix_key}</code>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Nenhuma instrução específica fornecida.</p>
                )}
                
                {isUploadAllowed && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-3">
                      Após realizar o pagamento, faça upload do comprovante na aba "Comprovantes".
                    </p>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setActiveTab('files')}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Ir para Comprovantes
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Status timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Linha do Tempo
              </CardTitle>
              <CardDescription>
                Histórico de status e eventos deste pagamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              {payment.audit_logs && payment.audit_logs.length > 0 ? (
                <div className="space-y-4">
                  {payment.audit_logs.slice().reverse().map((log: any) => (
                    <div key={log.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-primary mt-1" />
                        <div className="w-px h-full bg-border mt-2" />
                      </div>
                      <div className="pb-4 flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">
                              {log.action_type === 'status_changed' && 'Status alterado'}
                              {log.action_type === 'rejected' && 'Pagamento rejeitado'}
                              {log.action_type === 'info_requested' && 'Informação solicitada'}
                              {log.action_type === 'approved' && 'Pagamento aprovado'}
                              {log.action_type === 'file_uploaded' && 'Comprovante enviado'}
                            </p>
                            {log.old_status && log.new_status && (
                              <p className="text-sm text-muted-foreground">
                                De <span className="font-medium">{log.old_status}</span> para{' '}
                                <span className="font-medium">{log.new_status}</span>
                              </p>
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </span>
                        </div>
                        {log.notes && (
                          <p className="text-sm mt-2 p-2 bg-muted rounded">{log.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground italic">Nenhum evento registrado ainda.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Files tab */}
        <TabsContent value="files" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* File upload section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Enviar Comprovante
                </CardTitle>
                <CardDescription>
                  Faça upload do comprovante de pagamento
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isUploadAllowed ? (
                  <FileUploadComponent
                    paymentId={paymentId}
                    onUploadComplete={handleFileUploadComplete}
                    onError={handleFileUploadError}
                  />
                ) : (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Upload não disponível</AlertTitle>
                    <AlertDescription>
                      O upload de comprovantes não está disponível para pagamentos com status "{statusConfig.label}".
                      {payment.status === 'approved' && ' O pagamento já foi aprovado.'}
                      {payment.status === 'under_review' && ' O comprovante já está em análise.'}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Uploaded files */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Comprovantes Enviados
                </CardTitle>
                <CardDescription>
                  Arquivos enviados para este pagamento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UploadedFilesList 
                  paymentId={paymentId}
                  files={payment.files}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* History tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Histórico Completo
              </CardTitle>
              <CardDescription>
                Registros de auditoria e eventos detalhados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {payment.audit_logs && payment.audit_logs.length > 0 ? (
                <div className="space-y-4">
                  {payment.audit_logs.map((log: any) => (
                    <Card key={log.id} className="overflow-hidden">
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                {log.action_type}
                              </Badge>
                              {log.admin_id && (
                                <span className="text-sm text-muted-foreground">
                                  por Admin {log.admin_id.substring(0, 8)}
                                </span>
                              )}
                            </div>
                            <h4 className="font-medium mt-2">
                              {log.action_type === 'status_changed' && 'Status Alterado'}
                              {log.action_type === 'rejected' && 'Pagamento Rejeitado'}
                              {log.action_type === 'info_requested' && 'Informação Solicitada'}
                              {log.action_type === 'approved' && 'Pagamento Aprovado'}
                              {log.action_type === 'file_uploaded' && 'Comprovante Enviado'}
                            </h4>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                          </span>
                        </div>
                        
                        {log.old_status && log.new_status && (
                          <div className="flex items-center gap-2 text-sm mb-2">
                            <span className="text-muted-foreground">Status:</span>
                            <Badge variant="outline" className="bg-muted">
                              {log.old_status}
                            </Badge>
                            <ArrowLeft className="h-3 w-3 text-muted-foreground" />
                            <Badge variant="outline" className={getStatusConfig(log.new_status as PaymentStatus).color}>
                              {log.new_status}
                            </Badge>
                          </div>
                        )}
                        
                        {log.notes && (
                          <div className="mt-3 p-3 bg-muted rounded">
                            <p className="text-sm font-medium mb-1">Notas:</p>
                            <p className="text-sm">{log.notes}</p>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground italic">Nenhum registro de auditoria encontrado.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}