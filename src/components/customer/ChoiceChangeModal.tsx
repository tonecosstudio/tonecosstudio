import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Edit,
  Package,
  XCircle,
} from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import {
  changeCharacterChoiceAction,
  getAvailableCharactersAction,
  type CharacterEntity,
} from "@/hooks/customer/useChoiceActions";
import { cn } from "@/lib/utils";

export interface ChoiceChangeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  choiceId: string;
  orderId: string;
  collectionId: string;
  currentCharacterId: string;
  currentCharacterName: string;
  currentCharacterImageUrl: string | null;
  deadline: string | null;
  changesCount: number;
  isApproved: boolean;
  onSuccess?: () => void;
}

interface CurrentChoiceDisplayProps {
  name: string;
  imageUrl: string | null;
}

function CurrentChoiceDisplay({ name, imageUrl }: CurrentChoiceDisplayProps) {
  return (
    <div className="rounded-sm border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,7%)] p-4">
      <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-[hsl(0,0%,48%)]">
        Escolha Atual
      </h3>
      <div className="flex items-center gap-3">
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="h-20 w-20 rounded-sm object-cover" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-sm border border-[hsl(0,0%,14%)] bg-[hsl(0,0%,10%)]">
            <Package className="h-8 w-8 text-[hsl(0,0%,42%)]" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold text-white">{name}</p>
          <p className="text-sm text-[hsl(0,0%,58%)]">Personagem atual</p>
        </div>
      </div>
    </div>
  );
}

function RemainingChangesAlert({ remaining }: { remaining: number }) {
  const isLast = remaining === 1;

  return (
    <Alert
      className={cn(
        isLast
          ? "border-yellow-500/20 bg-yellow-500/10 text-yellow-100"
          : "border-sky-500/20 bg-sky-500/10 text-sky-100"
      )}
    >
      {isLast ? (
        <AlertTriangle className="h-4 w-4 text-yellow-300" />
      ) : (
        <Edit className="h-4 w-4 text-sky-300" />
      )}
      <AlertTitle>Alterações restantes</AlertTitle>
      <AlertDescription>
        Você pode alterar sua escolha mais <strong>{remaining}</strong>{" "}
        {remaining === 1 ? "vez." : "vezes."}
      </AlertDescription>
    </Alert>
  );
}

interface CharacterCardProps {
  character: CharacterEntity;
  selected: boolean;
  isCurrent: boolean;
  onSelect: () => void;
}

function CharacterCard({ character, selected, isCurrent, onSelect }: CharacterCardProps) {
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
      disabled={isUnavailable || isCurrent}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "group relative w-full overflow-hidden rounded-sm border text-left transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-[hsl(var(--gold-accent))] focus:ring-offset-2 focus:ring-offset-[hsl(0,0%,4%)]",
        selected && "border-[hsl(var(--gold-accent))] bg-[hsl(var(--gold-accent)/0.08)]",
        !selected && !isUnavailable && !isCurrent && "border-[hsl(0,0%,14%)] bg-[hsl(0,0%,7%)] hover:border-[hsl(var(--gold-accent)/0.45)]",
        (isUnavailable || isCurrent) && "cursor-not-allowed border-[hsl(0,0%,12%)] bg-[hsl(0,0%,7%)] opacity-55",
        !isUnavailable && !isCurrent && "cursor-pointer"
      )}
    >
      <div className="relative aspect-square overflow-hidden bg-[hsl(0,0%,10%)]">
        {character.imageUrl ? (
          <img
            src={character.imageUrl}
            alt={character.name}
            className={cn(
              "h-full w-full object-cover transition-transform duration-200",
              isHovered && !isUnavailable && !isCurrent && "scale-105"
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

        {isCurrent ? (
          <div className="absolute inset-0 flex items-center justify-center bg-sky-500/18">
            <Badge className="bg-sky-500 text-white">Escolha Atual</Badge>
          </div>
        ) : null}

        {isUnavailable && !isCurrent ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <div className="text-center text-white">
              <XCircle className="mx-auto mb-1 h-8 w-8" />
              <p className="text-sm font-semibold">Indisponível</p>
            </div>
          </div>
        ) : null}

        {isLowStock && !isUnavailable && !isCurrent ? (
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

export function ChoiceChangeModal({
  open,
  onOpenChange,
  choiceId,
  orderId: _orderId,
  collectionId,
  currentCharacterId,
  currentCharacterName,
  currentCharacterImageUrl,
  deadline,
  changesCount,
  isApproved,
  onSuccess,
}: ChoiceChangeModalProps) {
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [changeReason, setChangeReason] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) {
      setSelectedCharacterId(null);
      setChangeReason("");
      setShowConfirmation(false);
    }
  }, [open]);

  const remainingChanges = 3 - changesCount;
  const deadlineDate = deadline ? new Date(deadline) : null;
  const isDeadlinePassed = deadlineDate ? deadlineDate < new Date() : false;
  const canChange = isApproved && remainingChanges > 0 && !isDeadlinePassed;

  const { data: characters, isLoading, error } = useQuery({
    queryKey: ["available-characters", collectionId],
    queryFn: () => getAvailableCharactersAction(collectionId),
    enabled: open && Boolean(collectionId) && canChange,
  });

  const changeMutation = useMutation({
    mutationFn: () => {
      if (!selectedCharacterId) {
        throw new Error("Nenhum personagem selecionado");
      }
      return changeCharacterChoiceAction(choiceId, selectedCharacterId, changeReason);
    },
    onSuccess: () => {
      toast({
        title: "Escolha alterada",
        description: "Sua nova escolha foi enviada e está aguardando aprovação.",
      });

      queryClient.invalidateQueries({ queryKey: ["customer-order-progress"] });
      queryClient.invalidateQueries({ queryKey: ["character-choice"] });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao alterar escolha",
        description: error.message || "Não foi possível alterar sua escolha. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleSelectCharacter = (characterId: string) => {
    if (characterId === currentCharacterId) return;
    setSelectedCharacterId(characterId);
  };

  const handleSubmit = () => {
    if (!selectedCharacterId) {
      toast({
        title: "Nenhum personagem selecionado",
        description: "Selecione um novo personagem.",
        variant: "destructive",
      });
      return;
    }

    if (!changeReason.trim()) {
      toast({
        title: "Motivo obrigatório",
        description: "Informe o motivo da alteração.",
        variant: "destructive",
      });
      return;
    }

    setShowConfirmation(true);
  };

  const selectedCharacter = characters?.find((character) => character.id === selectedCharacterId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col border-[hsl(0,0%,12%)] bg-[hsl(0,0%,5%)] text-white">
        <DialogHeader className="border-b border-[hsl(0,0%,12%)] pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5 text-[hsl(var(--gold-accent))]" />
            Alterar Escolha de Personagem
          </DialogTitle>
          <DialogDescription className="text-[hsl(0,0%,58%)]">
            Selecione um novo personagem e informe o motivo da alteração.
          </DialogDescription>
        </DialogHeader>

        {!isApproved ? (
          <Alert variant="destructive" className="border-red-500/20 bg-red-500/10">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Alteração não permitida</AlertTitle>
            <AlertDescription>
              Sua escolha ainda não foi aprovada. Aguarde a aprovação antes de solicitar alterações.
            </AlertDescription>
          </Alert>
        ) : null}

        {isDeadlinePassed ? (
          <Alert variant="destructive" className="border-red-500/20 bg-red-500/10">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Prazo expirado</AlertTitle>
            <AlertDescription>
              O prazo para alterar a escolha expirou. Entre em contato com o suporte.
            </AlertDescription>
          </Alert>
        ) : null}

        {remainingChanges === 0 ? (
          <Alert variant="destructive" className="border-red-500/20 bg-red-500/10">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Limite atingido</AlertTitle>
            <AlertDescription>
              Você já atingiu o limite de 3 alterações. Entre em contato com o suporte para mais informações.
            </AlertDescription>
          </Alert>
        ) : null}

        {canChange ? (
          <div className="min-h-0 flex-1 space-y-4">
            <CurrentChoiceDisplay name={currentCharacterName} imageUrl={currentCharacterImageUrl} />
            <RemainingChangesAlert remaining={remainingChanges} />

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
                {showConfirmation && selectedCharacter ? (
                  <div className="space-y-4">
                    <Alert className="border-emerald-500/20 bg-emerald-500/10 text-emerald-100">
                      <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                      <AlertTitle>Confirme sua nova escolha</AlertTitle>
                      <AlertDescription>
                        Você está alterando sua escolha para o personagem abaixo.
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

                    <div className="rounded-sm border border-[hsl(0,0%,12%)] bg-[hsl(0,0%,7%)] p-4">
                      <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[hsl(0,0%,48%)]">
                        Motivo da alteração
                      </p>
                      <p className="text-sm text-[hsl(0,0%,72%)]">{changeReason}</p>
                    </div>

                    <Alert className="border-sky-500/20 bg-sky-500/10 text-sky-100">
                      <AlertCircle className="h-4 w-4 text-sky-300" />
                      <AlertDescription>
                        Após a confirmação, sua nova escolha será enviada para aprovação da equipe.
                      </AlertDescription>
                    </Alert>
                  </div>
                ) : (
                  <>
                    <div>
                      <Label className="mb-2 block text-sm font-medium text-white">
                        Selecione o Novo Personagem
                      </Label>
                      <ScrollArea className="h-[300px] pr-4">
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                          {characters.map((character) => (
                            <CharacterCard
                              key={character.id}
                              character={character}
                              selected={selectedCharacterId === character.id}
                              isCurrent={character.id === currentCharacterId}
                              onSelect={() => handleSelectCharacter(character.id)}
                            />
                          ))}
                        </div>
                      </ScrollArea>
                    </div>

                    <div>
                      <Label htmlFor="change-reason" className="mb-2 block text-sm font-medium text-white">
                        Motivo da alteração <span className="text-red-300">*</span>
                      </Label>
                      <Textarea
                        id="change-reason"
                        placeholder="Explique por que você deseja alterar sua escolha..."
                        value={changeReason}
                        onChange={(event) => setChangeReason(event.target.value)}
                        rows={3}
                        className="resize-none border-[hsl(0,0%,16%)] bg-[hsl(0,0%,7%)] text-white placeholder:text-[hsl(0,0%,42%)]"
                      />
                      <p className="mt-1 text-xs text-[hsl(0,0%,48%)]">
                        Mínimo de 10 caracteres
                      </p>
                    </div>
                  </>
                )}
              </>
            ) : null}
          </div>
        ) : null}

        <DialogFooter className="border-t border-[hsl(0,0%,12%)] pt-4">
          {showConfirmation ? (
            <>
              <Button
                variant="outline"
                onClick={() => setShowConfirmation(false)}
                disabled={changeMutation.isPending}
                className="border-[hsl(0,0%,18%)] bg-transparent text-white hover:bg-[hsl(0,0%,10%)]"
              >
                Voltar
              </Button>
              <Button onClick={() => changeMutation.mutate()} disabled={changeMutation.isPending}>
                {changeMutation.isPending ? "Enviando..." : "Confirmar Alteração"}
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
                disabled={!canChange || !selectedCharacterId || changeReason.trim().length < 10 || isLoading}
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

export default ChoiceChangeModal;
