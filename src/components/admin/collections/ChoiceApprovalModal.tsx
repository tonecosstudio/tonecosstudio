/**
 * Choice Approval Modal
 *
 * Modal component for reviewing and approving/rejecting customer character choices.
 * Features:
 * - Display customer name and order details
 * - Show chosen character with image
 * - Add "Approve" and "Reject" buttons
 * - Add rejection reason textarea
 * - Show character stock level
 * - Add "Suggest alternative" feature if out of stock
 */

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApproveChoice, useRejectChoice, type CharacterChoice } from "@/hooks/admin/useChoiceApproval";
import { useAlternativeCharacters, useCharacterStock } from "@/hooks/admin/useChoiceApprovalModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChoiceHistoryPanel } from "./ChoiceHistoryPanel";
import {
  User,
  Package,
  Image as ImageIcon,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Lightbulb,
  History
} from "lucide-react";

interface ChoiceApprovalModalProps {
  choice: CharacterChoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChoiceApprovalModal({ choice, open, onOpenChange }: ChoiceApprovalModalProps) {
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch character stock level
  const { data: characterStock } = useCharacterStock(choice?.characterId ?? undefined, open);

  // Fetch alternative characters from the same collection
  const { data: alternativeCharacters } = useAlternativeCharacters({
    collectionId: choice?.collectionId ?? undefined,
    characterId: choice?.characterId ?? undefined,
    enabled: open && showAlternatives,
  });

  // Approve mutation
  const approveMutationBase = useApproveChoice();
  const approveMutation = useMutation({
    mutationFn: (choiceId: string) => approveMutationBase.mutateAsync(choiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["character-choices"] });
      toast({
        title: "Escolha aprovada",
        description: "A escolha do personagem foi aprovada com sucesso.",
      });
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao aprovar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reject mutation
  const rejectMutationBase = useRejectChoice();
  const rejectMutation = useMutation({
    mutationFn: ({ choiceId, reason }: { choiceId: string; reason: string }) =>
      rejectMutationBase.mutateAsync({ choiceId, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["character-choices"] });
      toast({
        title: "Escolha rejeitada",
        description: "A escolha do personagem foi rejeitada.",
      });
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao rejeitar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setShowRejectForm(false);
    setRejectionReason("");
    setShowAlternatives(false);
    onOpenChange(false);
  };

  const handleApprove = () => {
    if (!choice) return;
    approveMutation.mutate(choice.id);
  };

  const handleReject = () => {
    if (!choice) return;
    if (!rejectionReason.trim()) {
      toast({
        title: "Motivo obrigatório",
        description: "Por favor, informe o motivo da rejeição.",
        variant: "destructive",
      });
      return;
    }
    rejectMutation.mutate({ choiceId: choice.id, reason: rejectionReason });
  };

  const availableStock = typeof characterStock === "number" ? characterStock : null;
  const isOutOfStock = availableStock !== null && availableStock <= 0;
  const isLowStock = availableStock !== null && availableStock > 0 && availableStock <= 5;

  if (!choice) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Revisar Escolha de Personagem</DialogTitle>
          <DialogDescription>
            Revise os detalhes da escolha e aprove ou rejeite conforme necessário.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tabs for Details and History */}
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Detalhes da Escolha</TabsTrigger>
              <TabsTrigger value="history">
                <History className="h-4 w-4 mr-2" />
                Histórico
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-6 mt-6">
              {/* Customer Information */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">Cliente</Label>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="font-medium text-gray-900">{choice.customerName}</div>
                    <div className="text-sm text-gray-500">{choice.customerEmail}</div>
                  </div>
                </div>
              </div>

              {/* Order Details */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">Detalhes do Pedido</Label>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Package className="h-5 w-5 text-gray-400" />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{choice.collectionName}</div>
                    <div className="text-sm text-gray-500">
                      Pedido: {choice.orderId.slice(0, 8)}... • Tipo:{" "}
                      {choice.orderType === "subscription_delivery" ? "Assinatura" : "Compra Avulsa"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Chosen Character */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">Personagem Escolhido</Label>
                <div className="border rounded-lg p-4">
                  {choice.characterImageUrl ? (
                    <div className="flex gap-4">
                      <img
                        src={choice.characterImageUrl}
                        alt={choice.characterName || "Character"}
                        className="w-32 h-32 object-cover rounded-lg"
                      />
                      <div className="flex-1 space-y-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {choice.characterName}
                        </h3>

                        {/* Stock Level */}
                        <div className="space-y-1">
                          <div className="text-sm text-gray-600">Estoque disponível:</div>
                          {availableStock !== null ? (
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  isOutOfStock
                                    ? "destructive"
                                    : isLowStock
                                    ? "secondary"
                                    : "default"
                                }
                              >
                                {availableStock} unidades
                              </Badge>
                              {isOutOfStock && (
                                <span className="text-sm text-red-600 font-medium">
                                  Sem estoque
                                </span>
                              )}
                              {isLowStock && !isOutOfStock && (
                                <span className="text-sm text-yellow-600 font-medium">
                                  Estoque baixo
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-400">Carregando...</div>
                          )}
                        </div>

                        {/* Out of Stock Alert */}
                        {isOutOfStock && (
                          <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              Este personagem está sem estoque. Considere rejeitar a escolha e
                              sugerir uma alternativa.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-gray-400">
                      <ImageIcon className="h-8 w-8" />
                      <div>
                        <div className="font-medium">{choice.characterName || "Sem imagem"}</div>
                        <div className="text-sm">Imagem não disponível</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Suggest Alternative Button */}
              {(isOutOfStock || isLowStock) && (
                <Button
                  variant="outline"
                  onClick={() => setShowAlternatives(!showAlternatives)}
                  className="w-full"
                >
                  <Lightbulb className="h-4 w-4 mr-2" />
                  {showAlternatives ? "Ocultar alternativas" : "Sugerir personagem alternativo"}
                </Button>
              )}

              {/* Alternative Characters */}
              {showAlternatives && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">
                    Personagens Alternativos Disponíveis
                  </Label>
                  {alternativeCharacters && alternativeCharacters.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                      {alternativeCharacters.map((char) => (
                        <div
                          key={char.id}
                          className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex gap-2">
                            {char.image_url && (
                              <img
                                src={char.image_url}
                                alt={char.name}
                                className="w-16 h-16 object-cover rounded"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm text-gray-900 truncate">
                                {char.name}
                              </div>
                              <Badge variant="default" className="mt-1">
                                {char.stock_quantity} em estoque
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 p-4 text-center border rounded-lg">
                      Nenhum personagem alternativo disponível no momento.
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    Nota: Você precisará entrar em contato com o cliente manualmente para sugerir
                    uma alternativa após rejeitar esta escolha.
                  </p>
                </div>
              )}

              {/* Rejection Form */}
              {showRejectForm && (
                <div className="space-y-2">
                  <Label htmlFor="rejection-reason" className="text-sm font-semibold text-foreground">
                    Motivo da Rejeição *
                  </Label>
                  <Textarea
                    id="rejection-reason"
                    placeholder="Ex: Personagem sem estoque, será necessário escolher outro..."
                    value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-gray-500">
                Este motivo será enviado ao cliente por email.
              </p>
            </div>
          )}
            </TabsContent>

            <TabsContent value="history" className="mt-6">
              <ChoiceHistoryPanel orderId={choice.orderId} />
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="gap-2">
          {!showRejectForm ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowRejectForm(true)}
                disabled={approveMutation.isPending}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Rejeitar
              </Button>
              <Button
                onClick={handleApprove}
                disabled={approveMutation.isPending || isOutOfStock}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {approveMutation.isPending ? "Aprovando..." : "Aprovar"}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectForm(false);
                  setRejectionReason("");
                }}
                disabled={rejectMutation.isPending}
              >
                Voltar
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={rejectMutation.isPending || !rejectionReason.trim()}
              >
                <XCircle className="h-4 w-4 mr-2" />
                {rejectMutation.isPending ? "Rejeitando..." : "Confirmar Rejeição"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
