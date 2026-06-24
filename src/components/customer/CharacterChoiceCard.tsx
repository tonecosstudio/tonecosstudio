import { useState } from "react";
import { differenceInDays, differenceInHours, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Edit,
  Package,
  XCircle,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ChoiceStatusEntity } from "@/hooks/customer/useChoiceActions";
import { CharacterSelectionModal } from "./CharacterSelectionModal";
import { ChoiceChangeModal } from "./ChoiceChangeModal";

export interface CharacterChoiceCardProps {
  orderId: string;
  orderType: "subscription_delivery" | "standalone_purchase";
  collectionId: string;
  choiceStatus: ChoiceStatusEntity;
  choiceDeadline: string | null;
  choiceId?: string | null;
  characterId?: string | null;
  characterName: string | null;
  characterImageUrl: string | null;
  changesCount?: number;
  className?: string;
}

const STATUS_LABELS: Record<ChoiceStatusEntity, string> = {
  pending: "Aguardando escolha",
  submitted: "Aguardando aprovação",
  approved: "Aprovado",
  rejected: "Rejeitado",
  locked: "Bloqueado",
  expired: "Expirado",
};

const STATUS_BADGE_CLASSNAMES: Record<ChoiceStatusEntity, string> = {
  pending:
    "border-yellow-500/25 bg-yellow-500/12 text-yellow-200 hover:bg-yellow-500/12",
  submitted:
    "border-sky-500/25 bg-sky-500/12 text-sky-200 hover:bg-sky-500/12",
  approved:
    "border-emerald-500/25 bg-emerald-500/12 text-emerald-200 hover:bg-emerald-500/12",
  rejected: "border-red-500/25 bg-red-500/12 text-red-200 hover:bg-red-500/12",
  locked:
    "border-[hsl(0,0%,18%)] bg-[hsl(0,0%,10%)] text-[hsl(0,0%,80%)] hover:bg-[hsl(0,0%,10%)]",
  expired: "border-red-500/25 bg-red-500/12 text-red-200 hover:bg-red-500/12",
};

interface DeadlineCountdownProps {
  deadline: string;
}

function DeadlineCountdown({ deadline }: DeadlineCountdownProps) {
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const daysRemaining = differenceInDays(deadlineDate, now);
  const hoursRemaining = differenceInHours(deadlineDate, now);

  let toneClassName =
    "border-emerald-500/20 bg-emerald-500/10 text-emerald-100";
  let iconClassName = "text-emerald-300";
  let icon = <Clock className="h-4 w-4" />;

  if (hoursRemaining < 24) {
    toneClassName = "border-red-500/20 bg-red-500/10 text-red-100";
    iconClassName = "text-red-300";
    icon = <AlertCircle className="h-4 w-4" />;
  } else if (daysRemaining <= 3) {
    toneClassName = "border-yellow-500/20 bg-yellow-500/10 text-yellow-100";
    iconClassName = "text-yellow-300";
  }

  return (
    <div className={cn("flex items-start gap-3 rounded-sm border p-4", toneClassName)}>
      <div className={cn("mt-0.5", iconClassName)}>{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-current/80">
          Prazo para escolha
        </p>
        <p className="mt-1 text-sm font-semibold">
          {formatDistanceToNow(deadlineDate, { addSuffix: true, locale: ptBR })}
        </p>
      </div>
    </div>
  );
}

interface CharacterDisplayProps {
  name: string;
  imageUrl: string | null;
  status: ChoiceStatusEntity;
}

function CharacterDisplay({ name, imageUrl, status }: CharacterDisplayProps) {
  const isRejected = status === "rejected";

  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-sm border p-4",
        isRejected
          ? "border-red-500/20 bg-red-500/8"
          : "border-[hsl(0,0%,12%)] bg-[hsl(0,0%,7%)]"
      )}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={name}
          className={cn(
            "h-16 w-16 rounded-sm object-cover",
            isRejected && "opacity-60 saturate-50"
          )}
        />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-sm border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,9%)]">
          <Package className="h-5 w-5 text-[hsl(0,0%,50%)]" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className={cn("font-semibold", isRejected ? "text-red-100" : "text-white")}>
          {name}
        </p>
        <p
          className={cn(
            "mt-1 text-xs",
            isRejected ? "text-red-200/80" : "text-[hsl(0,0%,58%)]"
          )}
        >
          {isRejected ? "Escolha rejeitada pela equipe" : "Personagem vinculado ao pedido"}
        </p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ChoiceStatusEntity }) {
  const iconClassName = "mr-1 h-3 w-3";

  return (
    <Badge variant="outline" className={cn("capitalize", STATUS_BADGE_CLASSNAMES[status])}>
      {status === "pending" && <Clock className={iconClassName} />}
      {status === "submitted" && <Clock className={iconClassName} />}
      {status === "approved" && <CheckCircle2 className={iconClassName} />}
      {status === "rejected" && <XCircle className={iconClassName} />}
      {status === "locked" && <CheckCircle2 className={iconClassName} />}
      {status === "expired" && <AlertCircle className={iconClassName} />}
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export function CharacterChoiceCard({
  orderId,
  orderType: _orderType,
  collectionId,
  choiceStatus,
  choiceDeadline,
  choiceId,
  characterId,
  characterName,
  characterImageUrl,
  changesCount = 0,
  className,
}: CharacterChoiceCardProps) {
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [showChangeModal, setShowChangeModal] = useState(false);

  const isPending = choiceStatus === "pending";
  const isSubmitted = choiceStatus === "submitted";
  const isApproved = choiceStatus === "approved";
  const isRejected = choiceStatus === "rejected";
  const isLocked = choiceStatus === "locked";
  const isExpired = choiceStatus === "expired";

  const deadlineDate = choiceDeadline ? new Date(choiceDeadline) : null;
  const isDeadlinePassed = deadlineDate ? deadlineDate < new Date() : false;
  const canChange = isApproved && changesCount < 3 && !isDeadlinePassed;
  const changesRemaining = 3 - changesCount;

  return (
    <Card
      className={cn(
        "border-[hsl(0,0%,12%)] bg-[hsl(0,0%,6%)] text-white shadow-none",
        className
      )}
    >
      <CardHeader className="space-y-4 border-b border-[hsl(0,0%,12%)] pb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="h-5 w-5 text-[hsl(var(--gold-accent))]" />
              Escolha de Personagem
            </CardTitle>
            <CardDescription className="mt-2 text-sm text-[hsl(0,0%,58%)]">
              Gerencie a escolha vinculada a este pedido e acompanhe a aprovação da equipe.
            </CardDescription>
          </div>
          <StatusBadge status={choiceStatus} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-6">
        {isPending && (
          <>
            {choiceDeadline && !isDeadlinePassed ? <DeadlineCountdown deadline={choiceDeadline} /> : null}

            <Alert className="border-yellow-500/20 bg-yellow-500/10 text-yellow-100">
              <AlertCircle className="h-4 w-4 text-yellow-300" />
              <AlertDescription>
                Você precisa escolher um personagem para liberar o andamento deste pedido.
              </AlertDescription>
            </Alert>

            <Button
              onClick={() => setShowSelectionModal(true)}
              className="w-full"
              disabled={isDeadlinePassed}
            >
              <Package className="mr-2 h-4 w-4" />
              Escolher Personagem
            </Button>

            {isDeadlinePassed ? (
              <Alert variant="destructive" className="border-red-500/20 bg-red-500/10">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Prazo expirado</AlertTitle>
                <AlertDescription>
                  O prazo para escolher o personagem expirou. Entre em contato com o suporte.
                </AlertDescription>
              </Alert>
            ) : null}
          </>
        )}

        {isSubmitted && (
          <>
            <Alert className="border-sky-500/20 bg-sky-500/10 text-sky-100">
              <Clock className="h-4 w-4 text-sky-300" />
              <AlertDescription>
                Sua escolha foi enviada e está aguardando aprovação da equipe de produção.
              </AlertDescription>
            </Alert>

            {characterName ? (
              <CharacterDisplay
                name={characterName}
                imageUrl={characterImageUrl}
                status={choiceStatus}
              />
            ) : null}

            {choiceDeadline && !isDeadlinePassed ? <DeadlineCountdown deadline={choiceDeadline} /> : null}
          </>
        )}

        {isApproved && (
          <>
            <Alert className="border-emerald-500/20 bg-emerald-500/10 text-emerald-100">
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              <AlertTitle>Escolha aprovada</AlertTitle>
              <AlertDescription>
                Sua escolha foi aprovada e a produção seguirá com este personagem.
              </AlertDescription>
            </Alert>

            {characterName ? (
              <CharacterDisplay
                name={characterName}
                imageUrl={characterImageUrl}
                status={choiceStatus}
              />
            ) : null}

            {canChange ? (
              <Button
                variant="outline"
                onClick={() => setShowChangeModal(true)}
                className="w-full border-[hsl(0,0%,18%)] bg-transparent text-white hover:bg-[hsl(0,0%,10%)]"
              >
                <Edit className="mr-2 h-4 w-4" />
                Alterar Escolha ({changesRemaining}{" "}
                {changesRemaining === 1 ? "alteração restante" : "alterações restantes"})
              </Button>
            ) : null}

            {changesCount >= 3 ? (
              <p className="text-center text-xs text-[hsl(0,0%,58%)]">
                Você atingiu o limite de 3 alterações.
              </p>
            ) : null}
          </>
        )}

        {isRejected && (
          <>
            <Alert variant="destructive" className="border-red-500/20 bg-red-500/10">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Escolha rejeitada</AlertTitle>
              <AlertDescription>
                Sua escolha foi rejeitada. Envie um novo personagem para seguir com o pedido.
              </AlertDescription>
            </Alert>

            {characterName ? (
              <CharacterDisplay
                name={characterName}
                imageUrl={characterImageUrl}
                status={choiceStatus}
              />
            ) : null}

            {!isDeadlinePassed ? (
              <Button onClick={() => setShowSelectionModal(true)} className="w-full">
                <Package className="mr-2 h-4 w-4" />
                Escolher Outro Personagem
              </Button>
            ) : null}

            {isDeadlinePassed ? (
              <Alert variant="destructive" className="border-red-500/20 bg-red-500/10">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Prazo expirado</AlertTitle>
                <AlertDescription>
                  O prazo para escolher o personagem expirou. Entre em contato com o suporte.
                </AlertDescription>
              </Alert>
            ) : null}
          </>
        )}

        {isLocked && (
          <>
            <Alert className="border-[hsl(0,0%,16%)] bg-[hsl(0,0%,9%)] text-[hsl(0,0%,88%)]">
              <CheckCircle2 className="h-4 w-4 text-[hsl(var(--gold-accent))]" />
              <AlertTitle>Escolha bloqueada</AlertTitle>
              <AlertDescription>
                A produção já foi iniciada e esta escolha não pode mais ser alterada.
              </AlertDescription>
            </Alert>

            {characterName ? (
              <CharacterDisplay
                name={characterName}
                imageUrl={characterImageUrl}
                status={choiceStatus}
              />
            ) : null}
          </>
        )}

        {isExpired ? (
          <Alert variant="destructive" className="border-red-500/20 bg-red-500/10">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Prazo expirado</AlertTitle>
            <AlertDescription>
              O prazo para escolher o personagem expirou. Entre em contato com o suporte.
            </AlertDescription>
          </Alert>
        ) : null}
      </CardContent>

      {showSelectionModal ? (
        <CharacterSelectionModal
          open={showSelectionModal}
          onOpenChange={setShowSelectionModal}
          orderId={orderId}
          collectionId={collectionId}
          deadline={choiceDeadline}
        />
      ) : null}

      {showChangeModal && choiceId && characterId && characterName ? (
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
      ) : null}
    </Card>
  );
}

export default CharacterChoiceCard;
