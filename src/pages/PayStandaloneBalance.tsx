// @ts-nocheck
/**
 * Pay Standalone Balance Page
 * 
 * UI page for paying the balance of a standalone purchase after production is complete.
 * Displays purchase details, balance amount, due date countdown, and payment voucher upload.
 * 
 * Requirements: 4.4, 4.5
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import AppShell from "@/components/AppShell";
import SEOHead from "@/components/SEOHead";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { 
  Package, AlertCircle, CheckCircle, Clock, Upload, 
  ArrowRight, Info, XCircle, AlertTriangle, Calendar
} from "lucide-react";
import { PaymentVoucherUpload } from "@/components/PaymentVoucherUpload";
import { VoucherRejectionAlert } from "@/components/VoucherRejectionAlert";
import { CharacterChoiceStatus } from "@/components/customer/CharacterChoiceStatus";
import { getStandalonePurchase } from "@/services/standalone-purchase-service";
import { formatDistanceToNow, isPast, differenceInDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PayStandaloneBalance() {
  const { purchaseId } = useParams<{ purchaseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [balanceVoucherUrl, setBalanceVoucherUrl] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [isDeadlinePassed, setIsDeadlinePassed] = useState(false);
  const [daysUntilDeadline, setDaysUntilDeadline] = useState<number>(0);

  // Fetch purchase details
  const { data: purchase, isLoading: purchaseLoading, refetch } = useQuery({
    queryKey: ["standalone-purchase", purchaseId],
    enabled: Boolean(purchaseId),
    queryFn: async () => {
      if (!purchaseId) throw new Error("Purchase ID is required");
      const purchase = await getStandalonePurchase(purchaseId);
      if (!purchase) throw new Error("Purchase not found");
      
      // Verify ownership
      if (purchase.user_id !== user?.id) {
        throw new Error("Unauthorized access to this purchase");
      }
      
      return purchase;
    },
  });

  // Fetch collection details
  const { data: collection, isLoading: collectionLoading } = useQuery({
    queryKey: ["collection", purchase?.collection_id],
    enabled: Boolean(purchase?.collection_id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("*")
        .eq("id", purchase!.collection_id)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  // Update countdown timer
  useEffect(() => {
    if (!purchase?.balance_due_date) return;

    const updateCountdown = () => {
      const dueDate = new Date(purchase.balance_due_date!);
      const now = new Date();
      
      setIsDeadlinePassed(isPast(dueDate));
      setDaysUntilDeadline(differenceInDays(dueDate, now));
      
      if (isPast(dueDate)) {
        setTimeRemaining("Prazo expirado");
      } else {
        setTimeRemaining(formatDistanceToNow(dueDate, { 
          addSuffix: true, 
          locale: ptBR 
        }));
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [purchase?.balance_due_date]);

  // Handle voucher upload success
  const handleVoucherUploadSuccess = async (url: string) => {
    setBalanceVoucherUrl(url);
    
    // Clear rejection reason when new voucher is uploaded
    if (purchase?.balance_rejection_reason && purchaseId) {
      try {
        const { error } = await supabase
          .from('standalone_purchases')
          .update({
            payment_voucher_balance_url: url,
            balance_rejection_reason: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', purchaseId);
        
        if (error) {
          console.error('Error clearing rejection reason:', error);
        } else {
          // Refetch purchase to update UI
          refetch();
        }
      } catch (error) {
        console.error('Error updating purchase:', error);
      }
    }
    
    toast({
      title: "Comprovante enviado",
      description: "Comprovante de saldo carregado com sucesso",
    });
  };

  // Handle voucher upload error
  const handleVoucherUploadError = (error: string) => {
    toast({
      title: "Erro no upload",
      description: error,
      variant: "destructive",
    });
  };

  // Pay balance mutation
  const payBalanceMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        navigate("/login");
        throw new Error("Faça login para continuar");
      }

      if (!purchaseId) {
        throw new Error("Purchase ID is required");
      }

      if (!balanceVoucherUrl) {
        throw new Error("Envie o comprovante de pagamento do saldo");
      }

      // Call pay-standalone-balance edge function
      const { data, error } = await supabase.functions.invoke('pay-standalone-balance', {
        body: {
          purchaseId,
          balanceVoucherUrl,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to process balance payment');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Pagamento processado com sucesso!",
        description: `Seu pedido será enviado em breve. Código de rastreamento: ${data.trackingCode}`,
      });
      refetch();
      navigate(`/minha-conta`);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao processar pagamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    payBalanceMutation.mutate();
  };

  // Loading state
  if (purchaseLoading || collectionLoading) {
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

  // Purchase not found
  if (!purchase || !collection) {
    return (
      <AppShell>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-6">
            <Package className="w-24 h-24 text-slate-300 mx-auto" />
            <h1 className="text-4xl font-bold">Compra não encontrada</h1>
            <Button asChild size="lg" className="bg-amber-500 hover:bg-amber-600">
              <Link to="/minha-conta">Voltar para Minha Conta</Link>
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  // Check if purchase is in correct status
  const canPayBalance = purchase.status === 'awaiting_balance' && !isDeadlinePassed;
  const isPaid = purchase.status === 'balance_paid' || purchase.status === 'shipped' || purchase.status === 'delivered';
  const isCancelled = purchase.status === 'cancelled';

  // Determine alert variant based on days remaining
  const getAlertVariant = () => {
    if (isDeadlinePassed) return "destructive";
    if (daysUntilDeadline <= 1) return "destructive";
    if (daysUntilDeadline <= 2) return "default";
    return "default";
  };

  return (
    <AppShell>
      <SEOHead
        title={`Pagar Saldo - ${collection.name}`}
        description={`Finalize o pagamento da sua compra avulsa da coleção ${collection.name}`}
        keywords={[collection.name, "pagamento", "saldo", "compra avulsa"]}
        type="website"
      />

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 py-12">
        <div className="container max-w-4xl mx-auto px-6">
          {/* Header */}
          <div className="mb-8">
            <Link 
              to="/minha-conta"
              className="text-sm text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 flex items-center gap-2 mb-4"
            >
              ← Voltar para Minha Conta
            </Link>
            <h1 className="text-4xl font-bold text-slate-950 dark:text-white mb-2">
              Pagamento do Saldo
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Finalize o pagamento da sua compra avulsa
            </p>
          </div>

          {/* Status Alerts */}
          {isPaid && (
            <Alert className="mb-6 border-green-200 bg-green-50 dark:bg-green-950/20">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                <strong>Pagamento confirmado!</strong>
                <br />
                Seu pedido será enviado em breve. Código de rastreamento: {purchase.tracking_code}
              </AlertDescription>
            </Alert>
          )}

          {isCancelled && (
            <Alert variant="destructive" className="mb-6">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Pedido cancelado</strong>
                <br />
                {purchase.cancellation_reason || "Este pedido foi cancelado."}
              </AlertDescription>
            </Alert>
          )}

          {!isPaid && !isCancelled && isDeadlinePassed && (
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Prazo expirado</strong>
                <br />
                O prazo para pagamento do saldo expirou. O depósito foi retido como arras confirmatórias conforme os termos de serviço.
              </AlertDescription>
            </Alert>
          )}

          {!isPaid && !isCancelled && !isDeadlinePassed && daysUntilDeadline <= 2 && (
            <Alert variant="destructive" className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Atenção: Prazo próximo!</strong>
                <br />
                Você tem apenas {daysUntilDeadline} dia{daysUntilDeadline !== 1 ? 's' : ''} para pagar o saldo. 
                Após o prazo, o pedido será cancelado e o depósito será retido.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left Column - Purchase Info */}
            <div className="space-y-6">
              {/* Collection Card */}
              <Card>
                <CardHeader>
                  <div className="flex items-start gap-4">
                    {collection.image_url && (
                      <img
                        src={collection.image_url}
                        alt={collection.name}
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1">
                      <CardTitle className="text-2xl mb-2">{collection.name}</CardTitle>
                      {collection.description && (
                        <CardDescription>{collection.description}</CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Purchase Status */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Status</span>
                      <Badge variant={
                        isPaid ? "default" : 
                        isCancelled ? "destructive" : 
                        isDeadlinePassed ? "destructive" : 
                        "secondary"
                      }>
                        {purchase.status === 'awaiting_balance' && 'Aguardando Saldo'}
                        {purchase.status === 'balance_paid' && 'Saldo Pago'}
                        {purchase.status === 'shipped' && 'Enviado'}
                        {purchase.status === 'delivered' && 'Entregue'}
                        {purchase.status === 'cancelled' && 'Cancelado'}
                      </Badge>
                    </div>

                    {/* Price Breakdown */}
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Preço Total</span>
                        <span className="text-lg font-bold">R$ {purchase.total_amount.toFixed(2)}</span>
                      </div>
                      <div className="border-t border-slate-200 dark:border-slate-700 pt-3 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Depósito (pago)</span>
                          <span className="text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" />
                            R$ {purchase.deposit_amount.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Saldo a pagar</span>
                          <span className="text-amber-600 dark:text-amber-400 font-bold text-lg">
                            R$ {purchase.balance_amount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Linha do Tempo
                      </h4>
                      <div className="space-y-2 text-sm">
                        {purchase.deposit_paid_at && (
                          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span>Depósito pago em {format(new Date(purchase.deposit_paid_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                          </div>
                        )}
                        {purchase.production_complete_at && (
                          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span>Produção concluída em {format(new Date(purchase.production_complete_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                          </div>
                        )}
                        {purchase.balance_paid_at && (
                          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span>Saldo pago em {format(new Date(purchase.balance_paid_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                          </div>
                        )}
                        {purchase.shipped_at && (
                          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span>Enviado em {format(new Date(purchase.shipped_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Character Choice Status */}
              {purchase.collection_id && (
                <CharacterChoiceStatus
                  orderId={purchase.id}
                  collectionId={purchase.collection_id}
                  collectionName={collection.name}
                  orderType="standalone_purchase"
                />
              )}

              {/* Deadline Card */}
              {purchase.balance_due_date && !isPaid && !isCancelled && (
                <Card className={
                  isDeadlinePassed ? "border-red-300 dark:border-red-800" :
                  daysUntilDeadline <= 2 ? "border-orange-300 dark:border-orange-800" :
                  "border-amber-300 dark:border-amber-800"
                }>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Prazo de Pagamento
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          Vencimento
                        </span>
                        <span className="font-bold">
                          {format(new Date(purchase.balance_due_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          Tempo restante
                        </span>
                        <Badge variant={
                          isDeadlinePassed ? "destructive" :
                          daysUntilDeadline <= 1 ? "destructive" :
                          daysUntilDeadline <= 2 ? "default" :
                          "secondary"
                        }>
                          {timeRemaining}
                        </Badge>
                      </div>
                      {!isDeadlinePassed && (
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertDescription className="text-sm">
                            Você tem até {format(new Date(purchase.balance_due_date), "dd/MM/yyyy", { locale: ptBR })} para pagar o saldo. 
                            Após este prazo, o pedido será cancelado e o depósito será retido como arras confirmatórias.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column - Payment Form */}
            <div className="space-y-6">
              {canPayBalance && (
                <>
                  {/* Payment Form */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Pagar Saldo</CardTitle>
                      <CardDescription>
                        Envie o comprovante de pagamento do saldo
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Payment Instructions */}
                        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-2">
                          <h3 className="font-semibold text-amber-900 dark:text-amber-100 flex items-center gap-2">
                            <Info className="w-4 h-4" />
                            Dados para Pagamento
                          </h3>
                          <div className="text-sm text-amber-800 dark:text-amber-200 space-y-1">
                            <p><strong>Valor do Saldo:</strong> R$ {purchase.balance_amount.toFixed(2)}</p>
                            <p><strong>PIX:</strong> [Chave PIX aqui]</p>
                            <p><strong>Banco:</strong> [Dados bancários aqui]</p>
                          </div>
                        </div>

                        {/* Rejection Alert - Show if voucher was rejected */}
                        {purchase.balance_rejection_reason ? (
                          <VoucherRejectionAlert
                            rejectionReason={purchase.balance_rejection_reason}
                            onVoucherUpload={handleVoucherUploadSuccess}
                            onUploadError={handleVoucherUploadError}
                            userId={user?.id}
                            pathPrefix="balance-vouchers"
                            disabled={isDeadlinePassed}
                            voucherType="balance"
                          />
                        ) : (
                          /* Voucher Upload - Show if no rejection */
                          <PaymentVoucherUpload
                            onUploadSuccess={handleVoucherUploadSuccess}
                            onUploadError={handleVoucherUploadError}
                            userId={user?.id}
                            pathPrefix="balance-vouchers"
                            disabled={isDeadlinePassed}
                            label="Comprovante de Pagamento do Saldo *"
                            showPreview={true}
                          />
                        )}

                        {/* Submit Button */}
                        <Button
                          type="submit"
                          size="lg"
                          className="w-full"
                          disabled={
                            !balanceVoucherUrl || 
                            payBalanceMutation.isPending ||
                            isDeadlinePassed
                          }
                        >
                          {payBalanceMutation.isPending ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                              Processando...
                            </>
                          ) : isDeadlinePassed ? (
                            <>
                              <XCircle className="w-5 h-5 mr-2" />
                              Prazo Expirado
                            </>
                          ) : (
                            <>
                              Confirmar Pagamento
                              <ArrowRight className="w-5 h-5 ml-2" />
                            </>
                          )}
                        </Button>

                        {/* Terms */}
                        <p className="text-xs text-slate-600 dark:text-slate-400 text-center">
                          Ao confirmar, você concorda que o pagamento será verificado manualmente 
                          e o envio será processado após a aprovação.
                        </p>
                      </form>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* Already Paid Message */}
              {isPaid && (
                <Card className="border-green-200 dark:border-green-800">
                  <CardHeader>
                    <CardTitle className="text-green-700 dark:text-green-300 flex items-center gap-2">
                      <CheckCircle className="w-6 h-6" />
                      Pagamento Confirmado
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p className="text-slate-600 dark:text-slate-400">
                        Seu pagamento foi confirmado e seu pedido será enviado em breve.
                      </p>
                      {purchase.tracking_code && (
                        <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                            Código de Rastreamento
                          </p>
                          <p className="font-mono font-bold text-lg">
                            {purchase.tracking_code}
                          </p>
                        </div>
                      )}
                    </div>
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
