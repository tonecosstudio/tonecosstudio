/**
 * Standalone Purchase Page
 * 
 * UI page for creating standalone purchases (single piece purchases without subscription).
 * Displays collection details, deposit/balance breakdown, capacity status, and cutoff countdown.
 * 
 * Requirements: 4.1, 22.2
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
  ArrowRight, Info, XCircle, Sparkles, Crown
} from "lucide-react";
import { CutoffCountdown } from "@/components/CutoffCountdown";
import { createWithDeposit, canCreateStandalonePurchase } from "@/services/standalone-purchase-service";
import { getCapacityUsage } from "@/services/capacity-service";
import { PaymentVoucherUpload } from "@/components/PaymentVoucherUpload";

const DEPOSIT_AMOUNT = 100.00;

export default function StandalonePurchase() {
  const { collectionId } = useParams<{ collectionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [depositVoucherUrl, setDepositVoucherUrl] = useState<string | null>(null);
  const [cutoffPassed, setCutoffPassed] = useState(false);

  // Fetch collection details
  const { data: collection, isLoading: collectionLoading } = useQuery({
    queryKey: ["collection", collectionId],
    enabled: Boolean(collectionId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("*")
        .eq("id", collectionId)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  // Get current cycle
  const { data: currentCycle, isLoading: cycleLoading } = useQuery({
    queryKey: ["current-cycle"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_or_create_current_cycle' as any);
      if (error) throw error;
      return data;
    },
  });

  // Check if purchase can be created
  const { data: purchaseCheck, isLoading: checkLoading } = useQuery({
    queryKey: ["can-purchase", currentCycle?.id],
    enabled: Boolean(currentCycle?.id),
    queryFn: async () => {
      if (!currentCycle?.id) return { canCreate: false, reason: "Cycle not found" };
      return await canCreateStandalonePurchase(currentCycle.id);
    },
  });

  // Get capacity usage
  const { data: capacityUsage, isLoading: capacityLoading } = useQuery({
    queryKey: ["capacity-usage", currentCycle?.id],
    enabled: Boolean(currentCycle?.id),
    queryFn: async () => {
      if (!currentCycle?.id) return null;
      return await getCapacityUsage(currentCycle.id);
    },
  });

  // Calculate balance amount
  const balanceAmount = collection ? collection.price - DEPOSIT_AMOUNT : 0;

  // Handle voucher upload success
  const handleVoucherUploadSuccess = (url: string) => {
    setDepositVoucherUrl(url);
    toast({
      title: "Comprovante enviado",
      description: "Comprovante de depósito carregado com sucesso",
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

  // Create standalone purchase mutation
  const createPurchaseMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        navigate("/login");
        throw new Error("Faça login para continuar");
      }

      if (!collectionId || !currentCycle?.id) {
        throw new Error("Informações incompletas");
      }

      if (!depositVoucherUrl) {
        throw new Error("Envie o comprovante de pagamento do depósito");
      }

      // Create standalone purchase
      const purchase = await createWithDeposit({
        userId: user.id,
        collectionId,
        cycleId: currentCycle.id,
        depositVoucherUrl,
      });

      return purchase;
    },
    onSuccess: (purchase) => {
      toast({
        title: "Compra criada com sucesso!",
        description: "Seu depósito está em análise. Você será notificado quando a produção for concluída.",
      });
      navigate(`/minha-conta`);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar compra",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPurchaseMutation.mutate();
  };

  // Loading state
  if (collectionLoading || cycleLoading || checkLoading) {
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

  // Collection not found
  if (!collection) {
    return (
      <AppShell>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-6">
            <Package className="w-24 h-24 text-slate-300 mx-auto" />
            <h1 className="text-4xl font-bold">Coleção não encontrada</h1>
            <Button asChild size="lg" className="bg-amber-500 hover:bg-amber-600">
              <Link to="/colecoes">Explorar Coleções</Link>
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  const canPurchase = purchaseCheck?.canCreate ?? false;
  const purchaseReason = purchaseCheck?.reason;
  const isCapacityFull = purchaseReason?.includes("Capacity limit exceeded");
  const isCutoffPassed = purchaseReason?.includes("Cutoff has passed");

  return (
    <AppShell>
      <SEOHead
        title={`Compra Avulsa - ${collection.name}`}
        description={`Adquira uma peça avulsa da coleção ${collection.name} com sistema de depósito`}
        keywords={[collection.name, "compra avulsa", "depósito", "colecionável"]}
        type="website"
      />

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 py-12">
        <div className="container max-w-4xl mx-auto px-6">
          {/* Header */}
          <div className="mb-8">
            <Link 
              to={`/colecoes/${collection.slug}`}
              className="text-sm text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 flex items-center gap-2 mb-4"
            >
              ← Voltar para {collection.name}
            </Link>
            <h1 className="text-4xl font-bold text-slate-950 dark:text-white mb-2">
              Compra Avulsa
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Adquira uma peça individual com sistema de depósito
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left Column - Collection Info */}
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
                    {/* Price Breakdown */}
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Preço Total</span>
                        <span className="text-lg font-bold">R$ {collection.price.toFixed(2)}</span>
                      </div>
                      <div className="border-t border-slate-200 dark:border-slate-700 pt-3 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Depósito (agora)</span>
                          <span className="text-amber-600 dark:text-amber-400 font-bold">
                            R$ {DEPOSIT_AMOUNT.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Saldo (após produção)</span>
                          <span className="font-bold">R$ {balanceAmount.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Info Alert */}
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        <strong>Como funciona:</strong> Você paga R$ 100,00 de depósito agora para reservar sua peça. 
                        Após a produção ser concluída, você terá 5 dias úteis para pagar o saldo de R$ {balanceAmount.toFixed(2)}.
                      </AlertDescription>
                    </Alert>
                  </div>
                </CardContent>
              </Card>

              {/* Capacity Status */}
              {capacityUsage && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      Disponibilidade
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          Capacidade Utilizada
                        </span>
                        <Badge variant={capacityUsage.percentage >= 90 ? "destructive" : "secondary"}>
                          {capacityUsage.percentage}%
                        </Badge>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            capacityUsage.percentage >= 90
                              ? "bg-red-500"
                              : capacityUsage.percentage >= 70
                              ? "bg-orange-500"
                              : "bg-green-500"
                          }`}
                          style={{ width: `${capacityUsage.percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {capacityUsage.available} de {capacityUsage.max} vagas disponíveis
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column - Purchase Form */}
            <div className="space-y-6">
              {/* Cutoff Countdown */}
              <CutoffCountdown 
                variant="alert" 
                onCutoffChange={setCutoffPassed}
              />

              {/* Error Messages */}
              {!canPurchase && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {isCapacityFull && (
                      <>
                        <strong>Esgotado</strong>
                        <br />
                        A capacidade de produção para este ciclo foi atingida. 
                        Por favor, aguarde o próximo ciclo.
                      </>
                    )}
                    {isCutoffPassed && (
                      <>
                        <strong>Prazo encerrado</strong>
                        <br />
                        O prazo para compras deste ciclo já passou. A produção já foi iniciada.
                        Aguarde o próximo ciclo.
                      </>
                    )}
                    {!isCapacityFull && !isCutoffPassed && purchaseReason && (
                      <>
                        <strong>Compra não disponível</strong>
                        <br />
                        {purchaseReason}
                      </>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Purchase Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Finalizar Compra</CardTitle>
                  <CardDescription>
                    Envie o comprovante de pagamento do depósito
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Payment Instructions */}
                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-2">
                      <h3 className="font-semibold text-amber-900 dark:text-amber-100 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Dados para Pagamento
                      </h3>
                      <div className="text-sm text-amber-800 dark:text-amber-200 space-y-1">
                        <p><strong>Valor do Depósito:</strong> R$ {DEPOSIT_AMOUNT.toFixed(2)}</p>
                        <p><strong>PIX:</strong> [Chave PIX aqui]</p>
                        <p><strong>Banco:</strong> [Dados bancários aqui]</p>
                      </div>
                    </div>

                    {/* Voucher Upload */}
                    <PaymentVoucherUpload
                      onUploadSuccess={handleVoucherUploadSuccess}
                      onUploadError={handleVoucherUploadError}
                      userId={user?.id}
                      pathPrefix="deposit-vouchers"
                      disabled={!canPurchase}
                      label="Comprovante de Pagamento do Depósito *"
                      showPreview={true}
                    />

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      size="lg"
                      className="w-full"
                      disabled={
                        !canPurchase || 
                        !depositVoucherUrl || 
                        createPurchaseMutation.isPending ||
                        cutoffPassed
                      }
                    >
                      {createPurchaseMutation.isPending ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Processando...
                        </>
                      ) : cutoffPassed ? (
                        <>
                          <XCircle className="w-5 h-5 mr-2" />
                          Prazo Encerrado
                        </>
                      ) : !canPurchase ? (
                        <>
                          <XCircle className="w-5 h-5 mr-2" />
                          Compra Indisponível
                        </>
                      ) : (
                        <>
                          Confirmar Compra
                          <ArrowRight className="w-5 h-5 ml-2" />
                        </>
                      )}
                    </Button>

                    {/* Terms */}
                    <p className="text-xs text-slate-600 dark:text-slate-400 text-center">
                      Ao confirmar, você concorda com nossos{" "}
                      <Link to="/termos" className="text-amber-600 hover:underline">
                        termos de serviço
                      </Link>
                      . O depósito é não reembolsável caso você não pague o saldo no prazo.
                    </p>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
