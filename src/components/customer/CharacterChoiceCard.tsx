/**
 * CharacterChoiceCard Component
 * 
 * Displays character choice status and actions for customer order progress view.
 * Shows deadline countdown, chosen character, approval status, and change options.
 * 
 * Requirements: 2.2.2, 2.4.3
 * Task: 5.1.4 Create CharacterChoiceCard component
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Package, Clock, CheckCircle2, AlertCircle, XCircle, Edit } from "lucide-react";
import { formatDistanceToNow, differenceInDays, differenceInHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { ChoiceStatus } from "@/services/customer/choice-service";
import { CharacterSelectionModal } from "./CharacterSelectionModal";
import { ChoiceChangeModal } from "./ChoiceChangeModal";

// ============================================================================
// Types
// ============================================================================

export interface CharacterChoiceCardProps {
  orderId: string;
  orderType: "subscription_delivery" | "standalone_purchase";
  collectionId: string;
  choiceStatus: ChoiceStatus;
  choiceDeadline: string | null;
  choiceId?: string | null;
  characterId?: string | null;
  characterName: string | null;
  characterImageUrl: string | null;
  changesCount?: number;
  className?: string;
}

// Status labels in Portuguese
const STATUS_LABELS: Record<ChoiceStatus, string> = {
  pending: "Aguardando Escolha",
  submitted: "Aguardando Aprovação",
  approved: "Aprovado",
  rejected: "Rejeitado",
  locked: "Bloqueado",
};

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * DeadlineCountdown - Shows deadline with color-coded urgency
 */
interface DeadlineCountdownProps {
  deadline: string;
}

const DeadlineCountdown: React.FC<DeadlineCountdownProps> = ({ deadline }) => {
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const daysRemaining = differenceInDays(deadlineDate, now);
  const hoursRemaining = differenceInHours(deadlineDate, now);
  
  // Determine urgency level
  let urgencyColor = "text-green-600";
  let bgColor = "bg-green-50 border-green-200";
  let icon = <Clock className="h-4 w-4" />;
  
  if (hoursRemaining < 24) {
    urgencyColor = "text-red-600";
    bgColor = "bg-red-50 border-red-200";
    icon = <AlertCircle className="h-4 w-4" />;
  } else if (daysRemaining <= 3) {
    urgencyColor = "text-yellow-600";
    bgColor = "bg-yellow-50 border-yellow-200";
    icon = <Clock className="h-4 w-4" />;
  }
  
  return (
    <div className={cn("flex items-center gap-2 p-3 rounded-lg border", bgColor)}>
      <div className={urgencyColor}>{icon}</div>
      <div className="flex-1">
        <p className="text-sm font-medium">Prazo para escolha</p>
        <p className={cn("text-sm font-semibold", urgencyColor)}>
          {formatDistanceToNow(deadlineDate, { addSuffix: true, locale: ptBR })}
        </p>
      </div>
    </div>
  );
};

/**
 * CharacterDisplay - Shows chosen character with image
 */
interface CharacterDisplayProps {
  name: string;
  imageUrl: string | null;
  status: ChoiceStatus;
}

const CharacterDisplay: React.FC<CharacterDisplayProps> = ({ name, imageUrl, status }) => {
  const isRejected = status === "rejected";
  
  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-lg border",
      isRejected ? "border-red-200 bg-red-50" : "bg-card"
    )}>
      {imageUrl && (
        <img
          src={imageUrl}
          alt={name}
          className={cn(
            "w-16 h-16 object-cover rounded",
            isRejected && "opacity-50"
          )}
        />
      )}
      <div className="flex-1">
        <p className={cn(
          "font-medium",
          isRejected && "text-red-900"
        )}>
          {name}
        </p>
        <p className={cn(
          "text-xs",
          isRejected ? "text-red-700" : "text-muted-foreground"
        )}>
          {isRejected ? "Escolha rejeitada" : "Personagem escolhido"}
        </p>
      </div>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const CharacterChoiceCard: React.FC<CharacterChoiceCardProps> = ({
  orderId,
  orderType: _orderType, // Part of interface contract, reserved for future use
  collectionId,
  choiceStatus,
  choiceDeadline,
  choiceId,
  characterId,
  characterName,
  characterImageUrl,
  changesCount = 0,
  className,
}) => {
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [showChangeModal, setShowChangeModal] = useState(false);

  // Determine status flags
  const isPending = choiceStatus === "pending";
  const isSubmitted = choiceStatus === "submitted";
  const isApproved = choiceStatus === "approved";
  const isRejected = choiceStatus === "rejected";
  const isLocked = choiceStatus === "locked";
  
  // Check if deadline has passed
  const deadlineDate = choiceDeadline ? new Date(choiceDeadline) : null;
  const isDeadlinePassed = deadlineDate ? deadlineDate < new Date() : false;
  
  // Determine if changes are allowed
  const canChange = isApproved && changesCount < 3 && !isDeadlinePassed;
  const changesRemaining = 3 - changesCount;

  // Get status badge
  const getStatusBadge = () => {
    switch (choiceStatus) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            {STATUS_LABELS.pending}
          </Badge>
        );
      case "submitted":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            <Clock className="h-3 w-3 mr-1" />
            {STATUS_LABELS.submitted}
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {STATUS_LABELS.approved}
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            {STATUS_LABELS.rejected}
          </Badge>
        );
      case "locked":
        return (
          <Badge variant="secondary">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {STATUS_LABELS.locked}
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Escolha de Personagem
            </CardTitle>
            <CardDescription>
              Selecione seu personagem favorito
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Pending Status - Show "Choose Character" button */}
        {isPending && (
          <>
            {choiceDeadline && !isDeadlinePassed && (
              <DeadlineCountdown deadline={choiceDeadline} />
            )}
            
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Você precisa escolher um personagem para este pedido.
              </AlertDescription>
            </Alert>

            <Button 
              onClick={() => setShowSelectionModal(true)} 
              className="w-full"
              disabled={isDeadlinePassed}
            >
              <Package className="h-4 w-4 mr-2" />
              Escolher Personagem
            </Button>

            {isDeadlinePassed && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Prazo Expirado</AlertTitle>
                <AlertDescription>
                  O prazo para escolher o personagem expirou. Entre em contato com o suporte.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        {/* Submitted Status - Show chosen character and waiting message */}
        {isSubmitted && (
          <>
            <Alert className="bg-blue-50 border-blue-200">
              <Clock className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900">
                Sua escolha foi enviada e está aguardando aprovação da equipe de produção.
              </AlertDescription>
            </Alert>

            {characterName && (
              <CharacterDisplay
                name={characterName}
                imageUrl={characterImageUrl}
                status={choiceStatus}
              />
            )}

            {choiceDeadline && !isDeadlinePassed && (
              <DeadlineCountdown deadline={choiceDeadline} />
            )}
          </>
        )}

        {/* Approved Status - Show approved character */}
        {isApproved && (
          <>
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-900">Escolha Aprovada</AlertTitle>
              <AlertDescription className="text-green-900">
                Sua escolha foi aprovada! A produção será iniciada em breve.
              </AlertDescription>
            </Alert>

            {characterName && (
              <CharacterDisplay
                name={characterName}
                imageUrl={characterImageUrl}
                status={choiceStatus}
              />
            )}

            {canChange && (
              <Button
                variant="outline"
                onClick={() => setShowChangeModal(true)}
                className="w-full"
              >
                <Edit className="h-4 w-4 mr-2" />
                Alterar Escolha ({changesRemaining} {changesRemaining === 1 ? 'alteração restante' : 'alterações restantes'})
              </Button>
            )}

            {changesCount >= 3 && (
              <p className="text-xs text-muted-foreground text-center">
                Você atingiu o limite de 3 alterações.
              </p>
            )}
          </>
        )}

        {/* Rejected Status - Show rejection and allow new choice */}
        {isRejected && (
          <>
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Escolha Rejeitada</AlertTitle>
              <AlertDescription>
                Sua escolha foi rejeitada. Por favor, escolha outro personagem.
              </AlertDescription>
            </Alert>

            {characterName && (
              <CharacterDisplay
                name={characterName}
                imageUrl={characterImageUrl}
                status={choiceStatus}
              />
            )}

            {!isDeadlinePassed && (
              <Button 
                onClick={() => setShowSelectionModal(true)} 
                className="w-full"
              >
                <Package className="h-4 w-4 mr-2" />
                Escolher Outro Personagem
              </Button>
            )}

            {isDeadlinePassed && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Prazo Expirado</AlertTitle>
                <AlertDescription>
                  O prazo para escolher o personagem expirou. Entre em contato com o suporte.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        {/* Locked Status - Show locked character */}
        {isLocked && (
          <>
            <Alert className="bg-gray-50 border-gray-200">
              <CheckCircle2 className="h-4 w-4 text-gray-600" />
              <AlertTitle className="text-gray-900">Escolha Bloqueada</AlertTitle>
              <AlertDescription className="text-gray-900">
                A produção foi iniciada e sua escolha não pode mais ser alterada.
              </AlertDescription>
            </Alert>

            {characterName && (
              <CharacterDisplay
                name={characterName}
                imageUrl={characterImageUrl}
                status={choiceStatus}
              />
            )}
          </>
        )}
      </CardContent>

      {/* Character Selection Modal - Only render when open to avoid test issues */}
      {showSelectionModal && (
        <CharacterSelectionModal
          open={showSelectionModal}
          onOpenChange={setShowSelectionModal}
          orderId={orderId}
          collectionId={collectionId}
          deadline={choiceDeadline}
        />
      )}

      {/* Choice Change Modal */}
      {showChangeModal && choiceId && characterId && characterName && (
        <ChoiceChangeModal
          open={showChangeModal}
          onOpenChange={setShowChangeModal}
          choiceId={choiceId}
          orderId={orderId}
          collectionId={collectionId}
          currentCharacterId={characterId}
          currentCharacterName={characterName}
          currentCharacterImageUrl={characterImageUrl}
          deadline={choiceDeadline}
          changesCount={changesCount}
          isApproved={isApproved}
        />
      )}
    </Card>
  );
};

export default CharacterChoiceCard;
