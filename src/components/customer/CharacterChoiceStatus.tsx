import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertCircle, CheckCircle, Clock, Edit, Package } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCharacterChoice } from "@/hooks/customer/useCharacterChoice";
import { CharacterSelectionModal } from "./CharacterSelectionModal";
import { ChoiceChangeModal } from "./ChoiceChangeModal";

interface CharacterChoiceStatusProps {
  orderId: string;
  collectionId: string;
  collectionName: string;
  orderType: "subscription_delivery" | "standalone_purchase";
}

const cardClassName = "border-[hsl(0,0%,12%)] bg-[hsl(0,0%,6%)] text-white shadow-none";
const softPanelClassName = "rounded-lg border border-[hsl(0,0%,14%)] bg-white/[0.03] p-3";

export function CharacterChoiceStatus({
  orderId,
  collectionId,
  collectionName,
  orderType: _orderType,
}: CharacterChoiceStatusProps) {
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const [showChangeModal, setShowChangeModal] = useState(false);
  const { data: choice, isLoading, refetch } = useCharacterChoice(orderId);

  const handleCharacterSelected = () => {
    setShowSelectionModal(false);
    refetch();
  };

  const handleChoiceChanged = () => {
    setShowChangeModal(false);
    refetch();
  };

  const renderCharacterPanel = (
    title: string,
    tone: "default" | "approved" | "rejected" = "default"
  ) => {
    if (!choice?.characterName) {
      return null;
    }

    return (
      <div
        className={
          tone === "rejected"
            ? "flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3"
            : softPanelClassName
        }
      >
        {choice.characterImageUrl && (
          <img
            src={choice.characterImageUrl}
            alt={choice.characterName}
            className={`h-16 w-16 rounded object-cover ${tone === "rejected" ? "opacity-60" : ""}`}
          />
        )}
        <div className="min-w-0 flex-1">
          <div className={tone === "rejected" ? "font-medium text-red-100" : "font-medium text-white"}>
            {choice.characterName}
          </div>
          <div className={tone === "rejected" ? "text-xs text-red-200" : "text-xs text-zinc-400"}>
            {title}
          </div>
        </div>
        {tone === "approved" && (
          <Badge className="bg-emerald-500 text-white">
            <CheckCircle className="mr-1 h-3 w-3" />
            Aprovado
          </Badge>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className={cardClassName}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-[hsl(42,100%,55%)]" />
            Escolha de personagem
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-4 w-full bg-white/10" />
            <Skeleton className="h-10 w-full bg-white/10" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!choice) {
    return (
      <>
        <Card className={cardClassName}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-[hsl(42,100%,55%)]" />
              Escolha de personagem
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Selecione seu personagem favorito da colecao.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-100">
              <AlertCircle className="h-4 w-4 text-amber-300" />
              <AlertDescription>
                Voce precisa escolher um personagem para este pedido. Abra a selecao para ver os
                personagens disponiveis.
              </AlertDescription>
            </Alert>
            <Button
              onClick={() => setShowSelectionModal(true)}
              className="w-full bg-[hsl(42,100%,50%)] text-black hover:bg-[hsl(42,100%,58%)]"
            >
              <Package className="mr-2 h-4 w-4" />
              Escolher personagem
            </Button>
          </CardContent>
        </Card>

        <CharacterSelectionModal
          open={showSelectionModal}
          onOpenChange={setShowSelectionModal}
          orderId={orderId}
          collectionId={collectionId}
          deadline={null}
          onSuccess={handleCharacterSelected}
        />
      </>
    );
  }

  const isPending = choice.status === "pending";
  const isSubmitted = choice.status === "submitted";
  const isApproved = choice.status === "approved";
  const isRejected = choice.status === "rejected";
  const isLocked = choice.status === "locked";
  const deadlineDate = choice.deadline ? new Date(choice.deadline) : null;
  const isDeadlinePassed = deadlineDate ? deadlineDate < new Date() : false;
  const canChange = !isApproved && !isLocked && !isDeadlinePassed && choice.changeCount < 3;

  return (
    <>
      <Card className={cardClassName}>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-[hsl(42,100%,55%)]" />
                Escolha de personagem
              </CardTitle>
              <CardDescription className="text-zinc-400">{collectionName}</CardDescription>
            </div>

            {isApproved && (
              <Badge className="w-fit bg-emerald-500 text-white">
                <CheckCircle className="mr-1 h-3 w-3" />
                Aprovado
              </Badge>
            )}
            {isSubmitted && (
              <Badge className="w-fit border-sky-500/30 bg-sky-500/10 text-sky-100">
                <Clock className="mr-1 h-3 w-3" />
                Aguardando aprovacao
              </Badge>
            )}
            {isRejected && (
              <Badge variant="destructive" className="w-fit">
                <AlertCircle className="mr-1 h-3 w-3" />
                Rejeitado
              </Badge>
            )}
            {isLocked && (
              <Badge className="w-fit border-zinc-500/30 bg-zinc-500/10 text-zinc-100">
                <CheckCircle className="mr-1 h-3 w-3" />
                Bloqueado
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {isPending && (
            <>
              <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-100">
                <AlertCircle className="h-4 w-4 text-amber-300" />
                <AlertDescription>
                  Voce ainda nao escolheu um personagem. Faca sua escolha antes do prazo.
                </AlertDescription>
              </Alert>
              {deadlineDate && !isDeadlinePassed && (
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <Clock className="h-4 w-4" />
                  <span>
                    Prazo: {formatDistanceToNow(deadlineDate, { addSuffix: true, locale: ptBR })}
                  </span>
                </div>
              )}
              <Button
                onClick={() => setShowSelectionModal(true)}
                className="w-full bg-[hsl(42,100%,50%)] text-black hover:bg-[hsl(42,100%,58%)]"
              >
                <Package className="mr-2 h-4 w-4" />
                Escolher personagem
              </Button>
            </>
          )}

          {isSubmitted && (
            <>
              <Alert className="border-sky-500/30 bg-sky-500/10 text-sky-100">
                <Clock className="h-4 w-4 text-sky-300" />
                <AlertDescription>
                  <strong>Escolha enviada - aguardando aprovacao</strong>
                  <br />
                  Sua escolha foi enviada e esta aguardando aprovacao da equipe de producao.
                </AlertDescription>
              </Alert>
              {renderCharacterPanel("Personagem escolhido")}
              {canChange && (
                <Button
                  variant="outline"
                  onClick={() => setShowChangeModal(true)}
                  className="w-full border-[hsl(0,0%,18%)] bg-[hsl(0,0%,8%)] text-zinc-100 hover:bg-[hsl(0,0%,10%)]"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Alterar escolha ({3 - choice.changeCount} alteracoes restantes)
                </Button>
              )}
            </>
          )}

          {isApproved && (
            <>
              <Alert className="border-emerald-500/30 bg-emerald-500/10 text-emerald-100">
                <CheckCircle className="h-4 w-4 text-emerald-300" />
                <AlertDescription>
                  <strong>Escolha aprovada</strong>
                  <br />
                  Sua escolha foi aprovada. A producao do seu personagem sera iniciada em breve.
                </AlertDescription>
              </Alert>
              {renderCharacterPanel("Personagem aprovado", "approved")}
              {choice.approvedAt && (
                <div className="text-xs text-zinc-500">
                  Aprovado{" "}
                  {formatDistanceToNow(new Date(choice.approvedAt), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </div>
              )}
            </>
          )}

          {isRejected && (
            <>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Escolha rejeitada</strong>
                  <br />
                  {choice.rejectionReason ||
                    "Sua escolha foi rejeitada. Selecione outro personagem para continuar."}
                </AlertDescription>
              </Alert>
              {renderCharacterPanel("Escolha rejeitada", "rejected")}
              {canChange && (
                <Button
                  onClick={() => setShowSelectionModal(true)}
                  className="w-full bg-[hsl(42,100%,50%)] text-black hover:bg-[hsl(42,100%,58%)]"
                >
                  <Package className="mr-2 h-4 w-4" />
                  Escolher outro personagem
                </Button>
              )}
            </>
          )}

          {isLocked && (
            <>
              <Alert className="border-zinc-500/30 bg-zinc-500/10 text-zinc-100">
                <CheckCircle className="h-4 w-4 text-zinc-300" />
                <AlertDescription>
                  <strong>Escolha bloqueada</strong>
                  <br />A producao foi iniciada e sua escolha nao pode mais ser alterada.
                </AlertDescription>
              </Alert>
              {renderCharacterPanel("Em producao")}
            </>
          )}

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

      <CharacterSelectionModal
        open={showSelectionModal}
        onOpenChange={setShowSelectionModal}
        orderId={orderId}
        collectionId={collectionId}
        deadline={choice.deadline}
        onSuccess={handleCharacterSelected}
      />

      <ChoiceChangeModal
        open={showChangeModal}
        onOpenChange={setShowChangeModal}
        choiceId={choice.id}
        orderId={orderId}
        collectionId={collectionId}
        currentCharacterId={choice.characterId ?? ""}
        currentCharacterName={choice.characterName ?? "Personagem nao selecionado"}
        currentCharacterImageUrl={choice.characterImageUrl}
        deadline={choice.deadline}
        changesCount={choice.changeCount}
        isApproved={choice.status === "approved"}
        onSuccess={handleChoiceChanged}
      />
    </>
  );
}
