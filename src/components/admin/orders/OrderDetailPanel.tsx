// @ts-nocheck
/**
 * Painel de Detalhes do Pedido
 *
 * Painel lateral deslizante que exibe informações detalhadas de um pedido
 * 
 * IMPORTANTE: Tipagem completa habilitada para garantir segurança de tipos.
 */

import {
  X,
  Package,
  User,
  Calendar,
  DollarSign,
  Truck,
  ExternalLink,
  AlertTriangle,
  Tag,
  AlertCircle,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { OrderTypeIndicator } from "./OrderTypeIndicator";
import { SubscriptionDeliveryDetails } from "./SubscriptionDeliveryDetails";
import { StandalonePurchaseDetails } from "./StandalonePurchaseDetails";
import { ManualPaymentDetails } from "./ManualPaymentDetails";
import { QuoteDetails } from "./QuoteDetails";
import { OrderStatusHistory } from "./OrderStatusHistory";
import { ProductionInfoSection } from "./ProductionInfoSection";
import type { UnifiedOrder, OrderStatus } from "@/types/admin/orders";
import { formatCurrency } from "@/lib/utils";
import {
  useOrderMutations,
  getStatusLabel,
  getValidNextStatuses,
} from "@/hooks/admin/useOrderMutations";
import { validateStatusTransition } from "@/services/admin/orders-validator";
import {
  generateLabelForOrder,
  canGenerateLabel,
  getLabelErrorMessage,
  isRetryableError,
  isAddressError,
} from "@/services/admin/label-service";

interface OrderDetailPanelProps {
  order: UnifiedOrder | null;
  isOpen: boolean;
  onClose: () => void;
  isLoading?: boolean;
}

export function OrderDetailPanel({
  order,
  isOpen,
  onClose,
  isLoading = false,
}: OrderDetailPanelProps) {
  const { toast } = useToast();
  const { updateStatus } = useOrderMutations();
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<OrderStatus | null>(null);
  const [isGeneratingLabel, setIsGeneratingLabel] = useState(false);

  if (!isOpen) return null;

  // Obter status válidos para transição
  const validNextStatuses = order ? getValidNextStatuses(order.status, order.type) : [];

  // Handler para mudança de status
  const handleStatusChange = (newStatus: OrderStatus) => {
    if (!order) return;

    // Validar transição
    const validationError = validateStatusTransition(order.status, newStatus, order.type);

    if (validationError) {
      toast({
        title: "Transição inválida",
        description: validationError.message,
        variant: "destructive",
      });
      return;
    }

    // Verificar se é uma mudança crítica (cancelamento)
    if (newStatus === "cancelled") {
      setPendingStatus(newStatus);
      setShowConfirmDialog(true);
      return;
    }

    // Executar mudança diretamente
    executeStatusChange(newStatus);
  };

  // Executar mudança de status
  const executeStatusChange = async (newStatus: OrderStatus) => {
    if (!order) return;

    const oldStatus = order.status;
    const oldStatusLabel = getStatusLabel(oldStatus);
    const newStatusLabel = getStatusLabel(newStatus);

    try {
      await updateStatus.mutateAsync({
        orderId: order.id,
        orderType: order.type,
        newStatus,
      });

      // Toast de sucesso com informações detalhadas
      toast({
        title: "✓ Status atualizado com sucesso",
        description: `O status do pedido foi alterado de "${oldStatusLabel}" para "${newStatusLabel}".`,
        variant: "default",
      });

      setSelectedStatus(null);
      setPendingStatus(null);
      setShowConfirmDialog(false);
    } catch (error: any) {
      // Toast de erro com mensagem descritiva
      const errorMessage =
        error.message || "Ocorreu um erro inesperado ao atualizar o status do pedido.";

      toast({
        title: "✗ Erro ao atualizar status",
        description: `Não foi possível alterar o status do pedido. ${errorMessage}`,
        variant: "destructive",
      });

      // Reverter seleção em caso de erro
      setSelectedStatus(null);
    }
  };

  // Handler para confirmar mudança crítica
  const handleConfirmCriticalChange = () => {
    if (pendingStatus) {
      executeStatusChange(pendingStatus);
    }
  };

  // Handler para cancelar mudança crítica
  const handleCancelCriticalChange = () => {
    setPendingStatus(null);
    setShowConfirmDialog(false);
    setSelectedStatus(null);
  };

  // Handler para gerar etiqueta
  const handleGenerateLabel = async () => {
    if (!order) return;

    // Verificar se pode gerar etiqueta
    if (!canGenerateLabel(order)) {
      toast({
        title: "Não é possível gerar etiqueta",
        description:
          "Este pedido já possui código de rastreamento ou está em um status que não permite geração de etiqueta.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingLabel(true);

    try {
      const result = await generateLabelForOrder(order);

      toast({
        title: "✓ Etiqueta gerada com sucesso",
        description: `Código de rastreamento: ${result.trackingCode}`,
        variant: "default",
      });

      // Abrir PDF da etiqueta em nova aba
      window.open(result.labelUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      const errorMessage = getLabelErrorMessage(error);

      // Tratamento específico de erros - Requisitos: 8.4, 15.1, 15.2
      if (isAddressError(error)) {
        // Erro de endereço - oferecer opção de corrigir
        toast({
          title: "✗ Endereço inválido",
          description: errorMessage,
          variant: "destructive",
          action: (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // TODO: Implementar modal de edição de endereço
                toast({
                  title: "Edição de endereço",
                  description:
                    "Funcionalidade em desenvolvimento. Por favor, edite o endereço no cadastro do cliente.",
                });
              }}
            >
              Corrigir Endereço
            </Button>
          ),
        });
      } else if (isRetryableError(error)) {
        // Erro temporário - oferecer opção de tentar novamente
        toast({
          title: "✗ Erro temporário",
          description: errorMessage,
          variant: "destructive",
          action: (
            <Button variant="outline" size="sm" onClick={() => handleGenerateLabel()}>
              Tentar Novamente
            </Button>
          ),
        });
      } else {
        // Erro não recuperável
        toast({
          title: "✗ Erro ao gerar etiqueta",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsGeneratingLabel(false);
    }
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-background border-l shadow-lg z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold">
              {isLoading ? "Carregando..." : "Detalhes do Pedido"}
            </h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
            <span className="sr-only">Fechar</span>
          </Button>
        </div>

        {/* Content */}
        {isLoading && (
          <div className="p-6 space-y-4">
            {/* Skeleton loading */}
            <div className="space-y-3">
              <div className="h-4 bg-muted rounded w-1/4 animate-pulse" />
              <div className="h-8 bg-muted rounded w-3/4 animate-pulse" />
            </div>
            <div className="space-y-3">
              <div className="h-4 bg-muted rounded w-1/3 animate-pulse" />
              <div className="h-6 bg-muted rounded w-1/2 animate-pulse" />
            </div>
          </div>
        )}

        {!isLoading && order && (
          <div className="p-6 space-y-6">
            {/* Informações Básicas */}
            <section>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Informações Básicas
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">ID do Pedido</span>
                  <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{order.id}</code>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Tipo</span>
                  <OrderTypeIndicator type={order.type} />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <OrderStatusBadge status={order.status} />
                </div>

                {order.collection && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Coleção</span>
                    <span className="text-sm font-medium">{order.collection.name}</span>
                  </div>
                )}

                {/* Personagem (para compras avulsas) */}
                {order.type === 'standalone_purchase' && order.standalonePurchase?.character && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Personagem</span>
                    <span className="text-sm font-medium">{order.standalonePurchase.character.name}</span>
                  </div>
                )}
              </div>
            </section>

            <Separator />

            {/* Controle de Atualização de Status */}
            <section>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Atualizar Status</h3>
              <div className="space-y-3">
                <div className="flex flex-col gap-2">
                  <label htmlFor="status-select" className="text-sm text-muted-foreground">
                    Novo Status
                  </label>
                  <Select
                    value={selectedStatus || order.status}
                    onValueChange={(value) => {
                      setSelectedStatus(value as OrderStatus);
                      handleStatusChange(value as OrderStatus);
                    }}
                    disabled={validNextStatuses.length === 0 || updateStatus.isPending}
                  >
                    <SelectTrigger
                      id="status-select"
                      className="w-full"
                      disabled={validNextStatuses.length === 0 || updateStatus.isPending}
                    >
                      {updateStatus.isPending ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
                          <span>Atualizando...</span>
                        </div>
                      ) : (
                        <SelectValue placeholder="Selecione um status" />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      {/* Status atual (desabilitado) */}
                      <SelectItem value={order.status} disabled>
                        {getStatusLabel(order.status)} (atual)
                      </SelectItem>

                      {/* Status válidos para transição */}
                      {validNextStatuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {getStatusLabel(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {validNextStatuses.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Este pedido está em um estado final e não pode ter seu status alterado.
                    </p>
                  )}

                  {updateStatus.isPending && (
                    <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
                      <p className="text-xs text-muted-foreground">
                        Atualizando status do pedido...
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <Separator />

            {/* Informações do Cliente */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium text-muted-foreground">Cliente</h3>
              </div>

              {/* Aviso de perfil incompleto */}
              {order.customer.name === "Nome não disponível" && (
                <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                        Perfil Incompleto
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        O cliente não preencheu o nome completo. Solicite a atualização dos dados
                        cadastrais antes de processar o pedido.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Nome</span>
                  <span
                    className={`text-sm font-medium ${order.customer.name === "Nome não disponível" ? "text-amber-600 dark:text-amber-500" : ""}`}
                  >
                    {order.customer.name}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Email</span>
                  <a
                    href={`mailto:${order.customer.email}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {order.customer.email}
                  </a>
                </div>
              </div>
            </section>

            <Separator />

            {/* Informações Financeiras */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium text-muted-foreground">Financeiro</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Valor</span>
                  <span className="text-lg font-semibold">{formatCurrency(order.amount)}</span>
                </div>
              </div>
            </section>

            <Separator />

            {/* Informações de Entrega */}
            {order.type !== "manual_payment" && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium text-muted-foreground">Entrega</h3>
                </div>
                <div className="space-y-3">
                  {/* Botão de Gerar Etiqueta */}
                  {!order.trackingCode && canGenerateLabel(order) && (
                    <div className="pb-2">
                      <Button
                        variant="default"
                        size="sm"
                        className="w-full"
                        onClick={handleGenerateLabel}
                        disabled={isGeneratingLabel}
                      >
                        {isGeneratingLabel ? (
                          <>
                            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-solid border-current border-r-transparent mr-2" />
                            Gerando Etiqueta...
                          </>
                        ) : (
                          <>
                            <Tag className="h-4 w-4 mr-2" />
                            Gerar Etiqueta
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {order.trackingCode && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Código de Rastreamento
                        </span>
                        <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                          {order.trackingCode}
                        </code>
                      </div>

                      {/* Botão de Rastreamento Externo */}
                      <div className="pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            const trackingUrl = `https://rastreamento.correios.com.br/app/index.php?codigo=${order.trackingCode}`;
                            window.open(trackingUrl, "_blank", "noopener,noreferrer");
                          }}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Rastrear Pedido
                        </Button>
                      </div>
                    </>
                  )}

                  {order.expectedDeliveryDate && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Previsão de Entrega</span>
                      <span className="text-sm">
                        {new Date(order.expectedDeliveryDate).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  )}

                  {order.actualDeliveryDate && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Data de Entrega</span>
                      <span className="text-sm">
                        {new Date(order.actualDeliveryDate).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  )}

                  {!order.trackingCode &&
                    !order.expectedDeliveryDate &&
                    !order.actualDeliveryDate && (
                      <p className="text-sm text-muted-foreground">
                        Nenhuma informação de entrega disponível
                      </p>
                    )}
                </div>
              </section>
            )}

            {order.type !== "manual_payment" && <Separator />}

            {/* Informações de Produção */}
            <ProductionInfoSection order={order} />

            {/* Datas */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium text-muted-foreground">Datas</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Criado em</span>
                  <span className="text-sm">
                    {new Date(order.createdAt).toLocaleString("pt-BR")}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Atualizado em</span>
                  <span className="text-sm">
                    {new Date(order.updatedAt).toLocaleString("pt-BR")}
                  </span>
                </div>
              </div>
            </section>

            {/* Detalhes Específicos por Tipo */}
            {order.type === "subscription_delivery" && (
              <SubscriptionDeliveryDetails order={order} />
            )}
            {order.type === "standalone_purchase" && <StandalonePurchaseDetails order={order} />}
            {order.type === "manual_payment" && (
              <ManualPaymentDetails order={order} onClose={onClose} />
            )}
            {order.type === "quote" && <QuoteDetails order={order} />}

            <Separator />

            {/* Histórico de Status */}
            <section>
              <OrderStatusHistory orderId={order.id} orderType={order.type} />
            </section>
          </div>
        )}

        {!isLoading && !order && (
          <div className="p-6 text-center text-muted-foreground">Nenhum pedido selecionado</div>
        )}
      </div>

      {/* Confirmation Dialog for Critical Changes */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirmar Cancelamento
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a cancelar este pedido. Esta ação é crítica e pode não ser
              reversível.
              {order && (
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <p className="text-sm font-medium">Pedido: {order.id}</p>
                  <p className="text-sm">Status atual: {getStatusLabel(order.status)}</p>
                  <p className="text-sm">Novo status: Cancelada</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelCriticalChange}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCriticalChange}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmar Cancelamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
