/**
 * DeliveryDetailModal
 *
 * Modal component for displaying comprehensive delivery details
 * Shows subscriber info, collection choice, address, payment status, and change history
 *
 * Requirements: 15.6
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Package,
  User,
  MapPin,
  CreditCard,
  History,
  Calendar,
  Truck,
  Hash,
  Save,
  AlertCircle,
  Gift
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useSanitizedInput } from '@/hooks/useSanitizedInput';
import { ValidationFeedback } from '@/components/ui/validation-feedback';
import { checkRateLimit } from '@/lib/security/rate-limiter';
import { FORM_RATE_LIMITS } from '@/lib/security/sanitization-config';
import {
  useDeliveryChangeHistory,
  useDeliveryDetail,
  useSubscriberAddress,
  useUpdateDeliveryStatus,
} from '@/hooks/admin/useDeliveryDetailData';

interface DeliveryDetailModalProps {
  deliveryId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileData?: {
    full_name: string | null;
    email: string | null;
  } | null;
}

export function DeliveryDetailModal({ deliveryId, open, onOpenChange, profileData }: DeliveryDetailModalProps) {
  const { toast } = useToast();

  // Estado local para controles de atualização
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [trackingCode, setTrackingCode] = useState<string>('');

  // Sanitized input for notes field (html type for rich text)
  const [notesRaw, setNotesRaw, notesSanitized] = useSanitizedInput('', 'html');

  const [isEditing, setIsEditing] = useState(false);

  // Validar formato do código de rastreamento
  const validateTrackingCode = (code: string): boolean => {
    if (!code) return true; // Código vazio é válido (opcional)
    // Formato brasileiro: 2 letras + 9 números + 2 letras (ex: BR123456789BR)
    const trackingRegex = /^[A-Z]{2}\d{9}[A-Z]{2}$/;
    return trackingRegex.test(code);
  };

  const isTrackingCodeValid = validateTrackingCode(trackingCode);

  // Fetch delivery details
  const { data: delivery, isLoading: isLoadingDelivery } = useDeliveryDetail(deliveryId, open);

  // Inicializar estado quando delivery carregar
  useEffect(() => {
    if (delivery) {
      setSelectedStatus(delivery.status);
      setTrackingCode(delivery.tracking_code || '');
    }
  }, [delivery]);

  // Fetch subscriber profile address
  const { data: profileAddress } = useSubscriberAddress(delivery?.subscriptions?.user_id, open);

  // Fetch status change history from order_status_history
  const { data: changeHistory } = useDeliveryChangeHistory(deliveryId, open);

  // Mutation para atualizar status
  const updateStatusMutation = useUpdateDeliveryStatus(deliveryId, () => {
    setIsEditing(false);
    setNotesRaw('');
  });

  useEffect(() => {
    if (!updateStatusMutation.isSuccess) return;
    toast({
      title: 'Status atualizado',
      description: 'O status da entrega foi atualizado com sucesso.',
    });
  }, [toast, updateStatusMutation.isSuccess]);

  useEffect(() => {
    if (!updateStatusMutation.error) return;
    toast({
      title: 'Erro ao atualizar status',
      description: updateStatusMutation.error.message,
      variant: 'destructive',
    });
  }, [toast, updateStatusMutation.error]);

  const handleUpdateStatus = () => {
    if (!deliveryId || !selectedStatus) return;

    // Check rate limit before submission
    const rateLimitKey = `admin-delivery-update:${deliveryId}`;
    const rateLimit = checkRateLimit(rateLimitKey, FORM_RATE_LIMITS.adminDeliveryUpdate);

    if (!rateLimit.allowed) {
      toast({
        title: 'Limite excedido',
        description: `Aguarde ${rateLimit.retryAfter}s antes de tentar novamente`,
        variant: 'destructive',
      });
      return;
    }

    updateStatusMutation.mutate({
      deliveryId,
      newStatus: selectedStatus,
      trackingCode: trackingCode || undefined,
      notes: notesSanitized || undefined,
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; label: string }> = {
      scheduled: { className: 'bg-gray-100 text-gray-800 border-gray-300', label: 'Agendado' },
      pending_choice: { className: 'bg-yellow-100 text-yellow-800 border-yellow-300', label: 'Aguardando Escolha' },
      confirmed: { className: 'bg-blue-100 text-blue-800 border-blue-300', label: 'Confirmado' },
      in_production: { className: 'bg-purple-100 text-purple-800 border-purple-300', label: 'Em Produção' },
      shipped: { className: 'bg-green-100 text-green-800 border-green-300', label: 'Enviado' },
      delivered: { className: 'bg-emerald-100 text-emerald-800 border-emerald-300', label: 'Entregue' },
    };

    const config = variants[status] || { className: 'bg-gray-100 text-gray-800 border-gray-300', label: status };
    return (
      <Badge className={config.className} variant="outline">
        {config.label}
      </Badge>
    );
  };

  const getChangeReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      manual: 'Alteração Manual',
      automatic_maintenance: 'Manutenção Automática',
      admin_override: 'Alteração Administrativa',
    };
    return labels[reason] || reason;
  };

  const getPlanTypeLabel = (planType: string) => {
    const labels: Record<string, string> = {
      trimestral: 'Trimestral (3 entregas)',
      semestral: 'Semestral (6 entregas)',
    };
    return labels[planType] || planType;
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      pix: 'PIX',
      credit_card: 'Cartão de Crédito',
      boleto: 'Boleto',
    };
    return labels[method] || method;
  };

  if (!deliveryId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Detalhes da Entrega
          </DialogTitle>
          <DialogDescription>
            Informações completas sobre a entrega e assinatura
          </DialogDescription>
        </DialogHeader>

        {isLoadingDelivery ? (
          <div className="py-8 text-center text-muted-foreground">
            Carregando detalhes...
          </div>
        ) : delivery ? (
          <div className="space-y-6">
            {/* Delivery Information */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Informações da Entrega
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">ID do Pedido:</span>
                  <p className="font-mono text-xs mt-1">{delivery.id}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Número da Entrega:</span>
                  <p className="font-medium mt-1">#{delivery.delivery_number}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <div className="mt-1">{getStatusBadge(delivery.status)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Ciclo:</span>
                  <p className="font-medium mt-1">
                    {delivery.cycles
                      ? `Ciclo ${delivery.cycles.cycle_number} - ${format(new Date(delivery.cycles.year, delivery.cycles.month - 1), 'MMM/yyyy', { locale: ptBR })}`
                      : '-'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Data Esperada:
                  </span>
                  <p className="font-medium mt-1">
                    {delivery.expected_delivery_date
                      ? format(new Date(delivery.expected_delivery_date), 'dd/MM/yyyy', { locale: ptBR })
                      : '-'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Truck className="h-3 w-3" />
                    Código de Rastreamento:
                  </span>
                  {delivery.tracking_code ? (
                    <div className="mt-1">
                      <p className="font-mono text-xs">{delivery.tracking_code}</p>
                      <a
                        href={`https://www2.correios.com.br/sistemas/rastreamento/resultado.cfm?objeto=${delivery.tracking_code}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800 underline flex items-center gap-1 mt-1"
                      >
                        Rastrear no site dos Correios
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  ) : (
                    <p className="font-mono text-xs mt-1 text-muted-foreground">-</p>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Status Update Controls */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  Atualizar Status da Entrega
                </h3>
                {!isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    Editar
                  </Button>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="status-select">Novo Status</Label>
                      <Select
                        value={selectedStatus}
                        onValueChange={setSelectedStatus}
                      >
                        <SelectTrigger id="status-select">
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="scheduled">Agendado</SelectItem>
                          <SelectItem value="pending_choice">Aguardando Escolha</SelectItem>
                          <SelectItem value="confirmed">Confirmado</SelectItem>
                          <SelectItem value="in_production">Em Produção</SelectItem>
                          <SelectItem value="shipped">Enviado</SelectItem>
                          <SelectItem value="delivered">Entregue</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="tracking-code">Código de Rastreamento</Label>
                      <Input
                        id="tracking-code"
                        value={trackingCode}
                        onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                        placeholder="Ex: BR123456789BR"
                        maxLength={13}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Formato: 2 letras + 9 números + 2 letras (ex: BR123456789BR)
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes">Observações (opcional)</Label>
                    <Textarea
                      id="notes"
                      value={notesRaw}
                      onChange={(e) => setNotesRaw(e.target.value)}
                      placeholder="Adicione observações sobre esta atualização..."
                      rows={3}
                    />
                    {notesRaw !== notesSanitized && (
                      <ValidationFeedback
                        info="Conteúdo HTML foi sanitizado para segurança"
                      />
                    )}
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm">
                    <p className="font-medium text-yellow-800 mb-1">
                      Máquina de Estados:
                    </p>
                    <p className="text-yellow-700 text-xs">
                      scheduled → pending_choice → confirmed → in_production → shipped → delivered
                    </p>
                    <p className="text-yellow-700 text-xs mt-2">
                      O sistema validará se a transição é permitida. Você pode avançar ou voltar um status.
                    </p>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false);
                        setSelectedStatus(delivery.status);
                        setTrackingCode(delivery.tracking_code || '');
                        setNotesRaw('');
                      }}
                      disabled={updateStatusMutation.isPending}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleUpdateStatus}
                      disabled={
                        updateStatusMutation.isPending ||
                        selectedStatus === delivery.status ||
                        !isTrackingCodeValid
                      }
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {updateStatusMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                  </div>

                  {!isTrackingCodeValid && trackingCode && (
                    <p className="text-xs text-red-600 mt-2">
                      Formato de código de rastreamento inválido. Use o formato: 2 letras + 9 números + 2 letras (ex: BR123456789BR)
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  <p>Status atual: <span className="font-semibold">{getStatusBadge(delivery.status)}</span></p>
                  <p className="mt-1">Clique em "Editar" para atualizar o status da entrega.</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Subscriber Information */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <User className="h-4 w-4" />
                Informações do Assinante
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Nome:</span>
                  <p className="font-medium mt-1">{profileData?.full_name || 'Não disponível'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Email:</span>
                  <p className="font-medium mt-1">{profileData?.email || 'Não disponível'}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Collection Choice */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Coleção Escolhida
              </h3>
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-base">
                      {delivery.collections?.name || delivery.subscriptions?.collections?.name || 'Não selecionada'}
                    </p>
                    {delivery.auto_maintained && (
                      <Badge variant="outline" className="mt-2 bg-blue-50 text-blue-700 border-blue-200">
                        Mantida Automaticamente
                      </Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Preço</p>
                    <p className="text-lg font-bold">
                      R$ {(delivery.collections?.price || delivery.subscriptions?.collections?.price || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bonus Piece - Only for 6th delivery of Semestral subscriptions */}
            {delivery.bonus_pieces && delivery.delivery_number === 6 && delivery.subscriptions?.plan_type === 'semestral' && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Gift className="h-4 w-4 text-purple-600" />
                    Peça Bônus Exclusiva
                  </h3>
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 p-4 rounded-lg">
                    <div className="flex items-start gap-4">
                      {delivery.bonus_pieces.image_url && (
                        <div className="flex-shrink-0">
                          <img
                            src={delivery.bonus_pieces.image_url}
                            alt="Peça Bônus"
                            className="w-20 h-20 object-cover rounded-lg border-2 border-purple-300"
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-purple-600 text-white">
                            Bônus Semestral
                          </Badge>
                          <Badge variant="outline" className={
                            delivery.bonus_pieces.status === 'shipped'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : delivery.bonus_pieces.status === 'prepared'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-gray-50 text-gray-700 border-gray-200'
                          }>
                            {delivery.bonus_pieces.status === 'shipped'
                              ? 'Enviado'
                              : delivery.bonus_pieces.status === 'prepared'
                              ? 'Preparado'
                              : 'Pendente'}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-purple-900 mb-1">
                          {delivery.bonus_pieces.description || 'Peça exclusiva para assinantes semestrais'}
                        </p>
                        <p className="text-xs text-purple-700">
                          Esta peça bônus exclusiva será enviada junto com a 6ª entrega como agradecimento pela assinatura semestral.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Collection Change History */}
            {changeHistory && changeHistory.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Histórico de Mudanças
                  </h3>
                  <div className="space-y-3">
                    {changeHistory.map((change) => (
                      <div key={change.id} className="border rounded-lg p-3 text-sm">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="font-medium">
                              {change.previous_collection_id
                                ? `${change.previous_collection?.name} → ${change.new_collection.name}`
                                : `Primeira escolha: ${change.new_collection.name}`}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {getChangeReasonLabel(change.change_reason)}
                              </Badge>
                              {change.changed_by_admin && (
                                <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                                  Alterado por Admin
                                </Badge>
                              )}
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                            {format(new Date(change.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Delivery Address */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Endereço de Entrega
              </h3>
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm whitespace-pre-line">
                  {profileAddress?.address || 'Endereço não cadastrado'}
                </p>
              </div>
            </div>

            <Separator />

            {/* Payment Status */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Status de Pagamento
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Plano:</span>
                  <p className="font-medium mt-1">
                    {delivery.subscriptions?.plan_type
                      ? getPlanTypeLabel(delivery.subscriptions.plan_type)
                      : '-'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Método de Pagamento:</span>
                  <p className="font-medium mt-1">
                    {delivery.subscriptions?.payment_method
                      ? getPaymentMethodLabel(delivery.subscriptions.payment_method)
                      : '-'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Valor Total Pago:</span>
                  <p className="font-bold text-lg mt-1">
                    R$ {(delivery.subscriptions?.total_paid || 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status da Assinatura:</span>
                  <div className="mt-1">
                    <Badge variant="outline" className={
                      delivery.subscriptions?.status === 'active'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-gray-50 text-gray-700 border-gray-200'
                    }>
                      {delivery.subscriptions?.status === 'active' ? 'Ativa' : delivery.subscriptions?.status || '-'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Entrega não encontrada
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
