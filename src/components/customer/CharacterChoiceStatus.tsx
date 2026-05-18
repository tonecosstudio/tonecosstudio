/**
 * CharacterChoiceStatus Component
 *
 * Displays character choice status in customer order views.
 * Shows appropriate buttons and status messages based on choice state.
 *
 * Requirements: 2.2.2, 2.4.3
 * Task: 3.2.4 Add choice status to customer order view
 */

import { useState } from "react";
import { Package, CheckCircle, Clock, AlertCircle, Edit } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useCharacterChoice, type CharacterChoiceEntity } from "@/hooks/customer/useCharacterChoice";
import { CharacterSelectionModal } from "./CharacterSelectionModal";
import { ChoiceChangeModal } from "./ChoiceChangeModal";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CharacterChoiceStatusProps {
  orderId: string;
  collectionId: string;
  collectionName: string;
  orderType: "subscription_delivery" | "standalone_purchase";
}

export function CharacterChoiceStatus({
  orderId,
  collectionId,
  collectionName,
  orderType: _orderType,
}: CharacterChoiceStatusProps) {
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [showChangeModal, setShowChangeModal] = useState(false);

  // Fetch character choice for this order
  const { data: choice, isLoading, refetch } = useCharacterChoice(orderId);

  const handleCharacterSelected = () => {
    setShowSelectionModal(false);
    refetch();
  };

  const handleChoiceChanged = () => {
    setShowChangeModal(false);
    refetch();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Escolha de Personagem
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // No choice record exists yet - show "Choose Character" button
  if (!choice) {
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Escolha de Personagem
            </CardTitle>
            <CardDescription>Selecione seu personagem favorito da coleção</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Você precisa escolher um personagem para este pedido. Clique no botão abaixo para
                ver os personagens disponíveis.
              </AlertDescription>
            </Alert>
            <Button onClick={() => setShowSelectionModal(true)} className="w-full">
              <Package className="h-4 w-4 mr-2" />
              Escolher Personagem
            </Button>
          </CardContent>
        </Card>

        <CharacterSelectionModal
          open={showSelectionModal}
          onOpenChange={setShowSelectionModal}
          orderId={orderId}
          collectionId={collectionId}
          collectionName={collectionName}
          deadline={null}
          onCharacterSelected={handleCharacterSelected}
        />
      </>
    );
  }

  // Choice exists - determine status and display appropriate UI
  const isPending = choice.status === "pending";
  const isSubmitted = choice.status === "submitted";
  const isApproved = choice.status === "approved";
  const isRejected = choice.status === "rejected";
  const isLocked = choice.status === "locked";

  const deadlineDate = choice.deadline ? new Date(choice.deadline) : null;
  const isDeadlinePassed = deadlineDate ? deadlineDate < new Date() : false;
  const canChange =
    !isApproved && !isLocked && !isDeadlinePassed && choice.changeCount < 3;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Escolha de Personagem
              </CardTitle>
              <CardDescription>{collectionName}</CardDescription>
            </div>
            {isApproved && (
              <Badge className="bg-green-500">
                <CheckCircle className="h-3 w-3 mr-1" />
                Aprovado
              </Badge>
            )}
            {isSubmitted && (
              <Badge variant="secondary">
                <Clock className="h-3 w-3 mr-1" />
                Aguardando Aprovação
              </Badge>
            )}
            {isRejected && (
              <Badge variant="destructive">
                <AlertCircle className="h-3 w-3 mr-1" />
                Rejeitado
              </Badge>
            )}
            {isLocked && (
              <Badge variant="secondary">
                <CheckCircle className="h-3 w-3 mr-1" />
                Bloqueado
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Pending Status */}
          {isPending && (
            <>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Você ainda não escolheu um personagem. Por favor, faça sua escolha antes do prazo.
                </AlertDescription>
              </Alert>
              {deadlineDate && !isDeadlinePassed && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    Prazo:{" "}
                    {formatDistanceToNow(deadlineDate, { addSuffix: true, locale: ptBR })}
                  </span>
                </div>
              )}
              <Button onClick={() => setShowSelectionModal(true)} className="w-full">
                <Package className="h-4 w-4 mr-2" />
                Escolher Personagem
              </Button>
            </>
          )}

          {/* Submitted Status */}
          {isSubmitted && (
            <>
              <Alert className="bg-blue-50 border-blue-200">
                <Clock className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  <strong>Escolha Enviada - Aguardando Aprovação</strong>
                  <br />
                  Sua escolha foi enviada e está aguardando aprovação da equipe de produção.
                </AlertDescription>
              </Alert>
              {choice.characterName && (
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                  {choice.characterImageUrl && (
                    <img
                      src={choice.characterImageUrl}
                      alt={choice.characterName}
                      className="w-16 h-16 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <div className="font-medium">{choice.characterName}</div>
                    <div className="text-xs text-muted-foreground">Personagem escolhido</div>
                  </div>
                </div>
              )}
              {canChange && (
                <Button
                  variant="outline"
                  onClick={() => setShowChangeModal(true)}
                  className="w-full"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Alterar Escolha ({3 - choice.changeCount} alterações restantes)
                </Button>
              )}
            </>
          )}

          {/* Approved Status */}
          {isApproved && (
            <>
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-900">
                  <strong>Escolha Aprovada</strong>
                  <br />
                  Sua escolha foi aprovada! A produção do seu personagem será iniciada em breve.
                </AlertDescription>
              </Alert>
              {choice.characterName && (
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                  {choice.characterImageUrl && (
                    <img
                      src={choice.characterImageUrl}
                      alt={choice.characterName}
                      className="w-16 h-16 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <div className="font-medium">{choice.characterName}</div>
                    <div className="text-xs text-muted-foreground">Personagem aprovado</div>
                  </div>
                  <Badge className="bg-green-500">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Aprovado
                  </Badge>
                </div>
              )}
              {choice.approvedAt && (
                <div className="text-xs text-muted-foreground">
                  Aprovado{" "}
                  {formatDistanceToNow(new Date(choice.approvedAt), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </div>
              )}
            </>
          )}

          {/* Rejected Status */}
          {isRejected && (
            <>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Escolha Rejeitada</strong>
                  <br />
                  {choice.rejectionReason || "Sua escolha foi rejeitada. Por favor, escolha outro personagem."}
                </AlertDescription>
              </Alert>
              {choice.characterName && (
                <div className="flex items-center gap-3 p-3 rounded-lg border border-red-200 bg-red-50">
                  {choice.characterImageUrl && (
                    <img
                      src={choice.characterImageUrl}
                      alt={choice.characterName}
                      className="w-16 h-16 object-cover rounded opacity-50"
                    />
                  )}
                  <div className="flex-1">
                    <div className="font-medium text-red-900">{choice.characterName}</div>
                    <div className="text-xs text-red-700">Escolha rejeitada</div>
                  </div>
                </div>
              )}
              {canChange && (
                <Button onClick={() => setShowSelectionModal(true)} className="w-full">
                  <Package className="h-4 w-4 mr-2" />
                  Escolher Outro Personagem
                </Button>
              )}
            </>
          )}

          {/* Locked Status */}
          {isLocked && (
            <>
              <Alert className="bg-gray-50 border-gray-200">
                <CheckCircle className="h-4 w-4 text-gray-600" />
                <AlertDescription className="text-gray-900">
                  <strong>Escolha Bloqueada</strong>
                  <br />
                  A produção foi iniciada e sua escolha não pode mais ser alterada.
                </AlertDescription>
              </Alert>
              {choice.characterName && (
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                  {choice.characterImageUrl && (
                    <img
                      src={choice.characterImageUrl}
                      alt={choice.characterName}
                      className="w-16 h-16 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <div className="font-medium">{choice.characterName}</div>
                    <div className="text-xs text-muted-foreground">Em produção</div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Deadline warning */}
          {isDeadlinePassed && !isApproved && !isLocked && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                O prazo para escolher o personagem expirou. Entre em contato com o suporte.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <CharacterSelectionModal
        open={showSelectionModal}
        onOpenChange={setShowSelectionModal}
        orderId={orderId}
        collectionId={collectionId}
        collectionName={collectionName}
        deadline={choice.deadline}
        onCharacterSelected={handleCharacterSelected}
      />

      {choice && (
        <ChoiceChangeModal
          open={showChangeModal}
          onOpenChange={setShowChangeModal}
          choiceId={choice.id}
          orderId={orderId}
          collectionId={collectionId}
          collectionName={collectionName}
          currentChoice={choice as CharacterChoiceEntity}
          onChoiceChanged={handleChoiceChanged}
        />
      )}
    </>
  );
}
