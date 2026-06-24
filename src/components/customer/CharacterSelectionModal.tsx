import { useEffect, useState } from "react";
import { differenceInDays, differenceInHours, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Package,
  XCircle,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import {
  submitCharacterChoiceAction,
  type CharacterEntity,
  useAvailableCharacters,
} from "@/hooks/customer/useChoiceActions";
import { cn } from "@/lib/utils";

export interface CharacterSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  collectionId: string;
  deadline: string | null;
  onSuccess?: () => void;
}

interface DeadlineAlertProps {
  deadline: string;
}

function DeadlineAlert({ deadline }: DeadlineAlertProps) {
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const daysRemaining = differenceInDays(deadlineDate, now);
  const hoursRemaining = differenceInHours(deadlineDate, now);

  let toneClassName = "border-emerald-500/20 bg-emerald-500/10 text-emerald-100";
  let icon = <Clock className="h-4 w-4 text-emerald-300" />;
  let title = "Prazo para escolha";

  if (hoursRemaining < 24) {
    toneClassName = "border-red-500/20 bg-red-500/10 text-red-100";
    icon = <AlertCircle className="h-4 w-4 text-red-300" />;
    title = "Prazo urgente";
  } else if (daysRemaining <= 3) {
    toneClassName = "border-yellow-500/20 bg-yellow-500/10 text-yellow-100";
    icon = <AlertTriangle className="h-4 w-4 text-yellow-300" />;
  }

  return (
    <Alert className={cn("mb-4", toneClassName)}>
      {icon}
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        Você tem{" "}
        <strong>{formatDistanceToNow(deadlineDate, { locale: ptBR })}</strong>{" "}
        para escolher seu personagem.
      </AlertDescription>
    </Alert>
  );
}

interface CharacterCardProps {
  character: CharacterEntity;
  selected: boolean;
  onSelect: () => void;
}

function CharacterCard({ character, selected, onSelect }: CharacterCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isLowStock =
    character.stockLevel !== undefined &&
    character.stockLevel > 0 &&
    character.stockLevel <= 5;
  const isUnavailable =
    !character.isAvailable ||
    (character.stockLevel !== undefined && character.stockLevel === 0);

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={isUnavailable}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "group relative w-full overflow-hidden rounded-sm border text-left transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-[hsl(var(--gold-accent))] focus:ring-offset-2 focus:ring-offset-[hsl(0,0%,4%)]",
        selected && "border-[hsl(var(--gold-accent))] bg-[hsl(var(--gold-accent)/0.08)]",
        !selected && !isUnavailable && "border-[hsl(0,0%,14%)] bg-[hsl(0,0%,7%)] hover:border-[hsl(var(--gold-accent)/0.45)]",
        isUnavailable && "cursor-not-allowed border-[hsl(0,0%,12%)] bg-[hsl(0,0%,7%)] opacity-55",
        !isUnavailable && "cursor-pointer"
      )}
    >
      <div className="relative aspect-square overflow-hidden bg-[hsl(0,0%,10%)]">
        {character.imageUrl ? (
          <img
            src={character.imageUrl}
            alt={character.name}
            className={cn(
              "h-full w-full object-cover transition-transform duration-200",
              isHovered && !isUnavailable && "scale-105"
            )}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="h-12 w-12 text-[hsl(0,0%,38%)]" />
          </div>
        )}

        {selected ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[hsl(var(--gold-accent)/0.18)]">
            <div className="rounded-full bg-[hsl(var(--gold-accent))] p-2 text-[hsl(0,0%,7%)]">
              <CheckCircle2 className="h-8 w-8" />
            </div>
          </div>
        ) : null}

        {isUnavailable ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <div className="text-center text-white">
              <XCircle className="mx-auto mb-1 h-8 w-8" />
              <p className="text-sm font-semibold">Indisponível</p>
            </div>
          </div>
        ) : null}

        {isLowStock && !isUnavailable ? (
          <Badge variant="destructive" className="absolute right-2 top-2">
            Estoque baixo
          </Badge>
        ) : null}
      </div>

      <div className="p-3">
        <h3
          className={cn(
            "mb-1 line-clamp-1 text-sm font-semibold text-white",
            selected && "text-[hsl(var(--gold-accent))]"
          )}
        >
          {character.name}
        </h3>

        {character.description ? (
          <p className="line-clamp-2 text-xs text-[hsl(0,0%,58%)]">
            {character.description}
          </p>
        ) : null}

        {character.stockLevel !== undefined && character.stockLevel > 0 ? (
          <p className="mt-2 text-xs text-[hsl(0,0%,48%)]">
            {character.stockLevel}{" "}
            {character.stockLevel === 1 ? "unidade disponível" : "unidades disponíveis"}
          </p>
        ) : null}
      </div>
    </button>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="space-y-2">
          <Skeleton className="aspect-square w-full rounded-sm bg-[hsl(0,0%,12%)]" />
          <Skeleton className="h-4 w-3/4 bg-[hsl(0,0%,12%)]" />
          <Skeleton className="h-3 w-1/2 bg-[hsl(0,0%,12%)]" />
        </div>
      ))}
    </div>
  );
}

export function CharacterSelectionModal({
  open,
  onOpenChange,
  orderId,
  collectionId,
  deadline,
  onSuccess,
}: CharacterSelectionModalProps) {
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      setSelectedCharacterId(null);
      setShowConfirmation(false);
    }
  }, [open]);

  const { data: characters, isLoading, error } = useAvailableCharacters(collectionId, open);

  const submitMutation = useMutation({
    mutationFn: (characterId: string) => submitCharacterChoiceAction(orderId, characterId),
    onSuccess: () => {
      toast({
        title: "Escolha enviada",
        description: "Sua escolha foi enviada e está aguardando aprovação da equipe.",
      });

      queryClient.invalidateQueries({ queryKey: ["customer-order-progress"] });
      queryClient.invalidateQueries({ queryKey: ["character-choice"] });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao enviar escolha",
        description: error.message || "Não foi possível enviar sua escolha. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!selectedCharacterId) {
      toast({
        title: "Nenhum personagem selecionado",
        description: "Selecione um personagem antes de continuar.",
        variant: "destructive",
      });
      return;
    }

    setShowConfirmation(true);
  };

  const selectedCharacter = characters?.find((character) => character.id === selectedCharacterId);
  const deadlineDate = deadline ? new Date(deadline) : null;
  const isDeadlinePassed = deadlineDate ? deadlineDate < new Date() : false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col border-[hsl(0,0%,12%)] bg-[hsl(0,0%,5%)] text-white">
        <DialogHeader className="border-b border-[hsl(0,0%,12%)] pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-[hsl(var(--gold-accent))]" />
            Escolha Seu Personagem
          </DialogTitle>
          <DialogDescription className="text-[hsl(0,0%,58%)]">
            Selecione o personagem que você deseja receber neste pedido.
          </DialogDescription>
        </DialogHeader>

        {deadline && !isDeadlinePassed ? <DeadlineAlert deadline={deadline} /> : null}

        {isDeadlinePassed ? (
          <Alert variant="destructive" className="border-red-500/20 bg-red-500/10">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Prazo expirado</AlertTitle>
            <AlertDescription>
              O prazo para escolher o personagem expirou. Entre em contato com o suporte.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="min-h-0 flex-1">
          {isLoading ? <LoadingSkeleton /> : null}

          {error ? (
            <Alert variant="destructive" className="border-red-500/20 bg-red-500/10">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro ao carregar personagens</AlertTitle>
              <AlertDescription>
                {error instanceof Error
                  ? error.message
                  : "Não foi possível carregar os personagens disponíveis."}
              </AlertDescription>
            </Alert>
          ) : null}

          {!isLoading && !error && characters ? (
            <>
              {characters.length === 0 ? (
                <Alert className="border-[hsl(0,0%,16%)] bg-[hsl(0,0%,8%)] text-[hsl(0,0%,88%)]">
                  <AlertCircle className="h-4 w-4 text-[hsl(var(--gold-accent))]" />
                  <AlertTitle>Nenhum personagem disponível</AlertTitle>
                  <AlertDescription>
                    Não há personagens disponíveis para esta coleção no momento.
                  </AlertDescription>
                </Alert>
              ) : showConfirmation && selectedCharacter ? (
                <div className="space-y-4">
                  <Alert className="border-emerald-500/20 bg-emerald-500/10 text-emerald-100">
                    <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                    <AlertTitle>Confirme sua escolha</AlertTitle>
                    <AlertDescription>
                      Você selecionou o personagem abaixo. Confirme para enviar à produção.
                    </AlertDescription>
                  </Alert>

                  <div className="flex items-center gap-4 rounded-sm border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,7%)] p-4">
                    {selectedCharacter.imageUrl ? (
                      <img
                        src={selectedCharacter.imageUrl}
                        alt={selectedCharacter.name}
                        className="h-24 w-24 rounded-sm object-cover"
                      />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-semibold">{selectedCharacter.name}</h3>
                      {selectedCharacter.description ? (
                        <p className="mt-1 text-sm text-[hsl(0,0%,58%)]">
                          {selectedCharacter.description}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <Alert className="border-sky-500/20 bg-sky-500/10 text-sky-100">
                    <AlertCircle className="h-4 w-4 text-sky-300" />
                    <AlertDescription>
                      Após a confirmação, sua escolha será enviada para aprovação da equipe.
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                <ScrollArea className="h-[400px] pr-4">
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                    {characters.map((character) => (
                      <CharacterCard
                        key={character.id}
                        character={character}
                        selected={selectedCharacterId === character.id}
                        onSelect={() => setSelectedCharacterId(character.id)}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </>
          ) : null}
        </div>

        <DialogFooter className="border-t border-[hsl(0,0%,12%)] pt-4">
          {showConfirmation ? (
            <>
              <Button
                variant="outline"
                onClick={() => setShowConfirmation(false)}
                disabled={submitMutation.isPending}
                className="border-[hsl(0,0%,18%)] bg-transparent text-white hover:bg-[hsl(0,0%,10%)]"
              >
                Voltar
              </Button>
              <Button
                onClick={() => selectedCharacterId && submitMutation.mutate(selectedCharacterId)}
                disabled={submitMutation.isPending}
              >
                {submitMutation.isPending ? "Enviando..." : "Confirmar Escolha"}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-[hsl(0,0%,18%)] bg-transparent text-white hover:bg-[hsl(0,0%,10%)]"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!selectedCharacterId || isDeadlinePassed || isLoading}
              >
                Continuar
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CharacterSelectionModal;
