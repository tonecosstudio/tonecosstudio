/**
 * Reupload Subscription Voucher Page
 * 
 * Allows customers to re-upload payment vouchers for subscriptions that were rejected.
 * Displays rejection reason and provides interface for uploading new voucher.
 * 
 * Requirements: 25.8, 25.9
 * Task: 25.6
 */

import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import AppShell from "@/components/AppShell";
import SEOHead from "@/components/SEOHead";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Package, CheckCircle, Info } from "lucide-react";
import { VoucherRejectionAlert } from "@/components/VoucherRejectionAlert";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ReuploadSubscriptionVoucher() {
  const { subscriptionId } = useParams<{ subscriptionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch subscription details
  const { data: subscription, isLoading: subscriptionLoading, refetch } = useQuery({
    queryKey: ["subscription", subscriptionId],
    enabled: Boolean(subscriptionId),
    queryFn: async () => {
      if (!subscriptionId) throw new Error("Subscription ID is required");
      
      const { data, error } = await supabase
        .from("subscriptions")
        .select(`
          *,
          collections (
            id,
            name,
            slug,
            description,
            image_url
          )
        `)
        .eq("id", subscriptionId)
        .single();
      
      if (error) throw error;
      
      // Verify ownership
      if (data.user_id !== user?.id) {
        throw new Error("Unauthorized access to this subscription");
      }
      
      return data;
    },
  });

  // Handle voucher upload success
  const handleVoucherUploadSuccess = async (url: string) => {
    if (!subscriptionId) return;
    
    try {
      // Update subscription with new voucher URL and clear rejection reason
      const { error } = await supabase
        .from('subscriptions')
        .update({
          payment_voucher_url: url,
          payment_rejection_reason: null,
          status: 'pending_payment', // Reset to pending verification
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscriptionId);
      
      if (error) {
        throw error;
      }
      
      // Refetch subscription to update UI
      await refetch();
      
      toast({
        title: "Comprovante enviado com sucesso!",
        description: "Seu novo comprovante está em análise. Você será notificado quando for aprovado.",
      });
      
      // Navigate back to subscriptions page after a delay
      setTimeout(() => {
        navigate('/minhas-assinaturas');
      }, 2000);
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast({
        title: "Erro ao enviar comprovante",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  };

  // Handle voucher upload error
  const handleVoucherUploadError = (error: string) => {
    toast({
      title: "Erro no upload",
      description: error,
      variant: "destructive",
    });
  };

  // Loading state
  if (subscriptionLoading) {
    return (
      <AppShell>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-slate-600 dark:text-slate-400">Carregando informações...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  // Subscription not found
  if (!subscription) {
    return (
      <AppShell>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-6">
            <Package className="w-24 h-24 text-slate-300 mx-auto" />
            <h1 className="text-4xl font-bold">Assinatura não encontrada</h1>
            <Button asChild size="lg" className="bg-amber-500 hover:bg-amber-600">
              <Link to="/minhas-assinaturas">Voltar para Minhas Assinaturas</Link>
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  // Check if there's a rejection reason
  const hasRejection = Boolean(subscription.payment_rejection_reason);
  const isAlreadyActive = subscription.status === 'active';

  return (
    <AppShell>
      <SEOHead
        title={`Reenviar Comprovante - ${subscription.collections?.name || 'Assinatura'}`}
        description="Reenvie seu comprovante de pagamento"
        keywords={["assinatura", "pagamento", "comprovante"]}
        noindex={true}
      />

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 py-12">
        <div className="container max-w-4xl mx-auto px-6">
          {/* Header */}
          <div className="mb-8">
            <Link 
              to="/minhas-assinaturas"
              className="text-sm text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 flex items-center gap-2 mb-4"
            >
              ← Voltar para Minhas Assinaturas
            </Link>
            <h1 className="text-4xl font-bold text-slate-950 dark:text-white mb-2">
              Reenviar Comprovante de Pagamento
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Envie um novo comprovante para sua assinatura
            </p>
          </div>

          {/* Already Active Alert */}
          {isAlreadyActive && !hasRejection && (
            <Alert className="mb-6 border-green-200 bg-green-50 dark:bg-green-950/20">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <AlertDescription>
                <p className="font-semibold text-green-900 dark:text-green-100 mb-1">
                  Pagamento já aprovado
                </p>
                <p className="text-sm text-green-800 dark:text-green-200">
                  Sua assinatura já está ativa. Não é necessário enviar um novo comprovante.
                </p>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left Column - Subscription Info */}
            <div className="space-y-6">
              {/* Subscription Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-start gap-4">
                    {subscription.collections?.image_url && (
                      <img
                        src={subscription.collections.image_url}
                        alt={subscription.collections.name}
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1">
                      <CardTitle className="text-2xl mb-2">
                        {subscription.collections?.name || 'Assinatura'}
                      </CardTitle>
                      {subscription.collections?.description && (
                        <CardDescription>{subscription.collections.description}</CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Subscription Status */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Status</span>
                      <Badge variant={
                        subscription.status === 'active' ? "default" : 
                        subscription.status === 'pending_payment' ? "secondary" : 
                        "destructive"
                      }>
                        {subscription.status === 'active' && 'Ativa'}
                        {subscription.status === 'pending_payment' && 'Pagamento Pendente'}
                        {subscription.status === 'cancelled' && 'Cancelada'}
                        {subscription.status === 'paused' && 'Pausada'}
                      </Badge>
                    </div>

                    {/* Plan Info */}
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Plano</span>
                        <span className="text-lg font-bold capitalize">{subscription.plan_type}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Valor Pago</span>
                        <span className="text-green-600 dark:text-green-400 font-bold">
                          R$ {subscription.total_paid?.toFixed(2) || '0.00'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Data de Criação</span>
                        <span className="font-medium">
                          {format(new Date(subscription.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                      </div>
                    </div>

                    {/* Info Alert */}
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        Após enviar o novo comprovante, ele será analisado por nossa equipe. 
                        Você receberá uma notificação quando for aprovado.
                      </AlertDescription>
                    </Alert>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Voucher Upload */}
            <div className="space-y-6">
              {hasRejection ? (
                /* Show rejection alert with re-upload interface */
                <VoucherRejectionAlert
                  rejectionReason={subscription.payment_rejection_reason!}
                  onVoucherUpload={handleVoucherUploadSuccess}
                  onUploadError={handleVoucherUploadError}
                  userId={user?.id}
                  pathPrefix="subscription-vouchers"
                  disabled={isAlreadyActive}
                  voucherType="subscription"
                />
              ) : (
                /* Show info message if no rejection */
                <Card>
                  <CardHeader>
                    <CardTitle>Informação</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        {isAlreadyActive ? (
                          "Sua assinatura já está ativa. Não é necessário enviar um novo comprovante."
                        ) : (
                          "Seu comprovante está em análise. Você será notificado quando for aprovado ou se houver algum problema."
                        )}
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
