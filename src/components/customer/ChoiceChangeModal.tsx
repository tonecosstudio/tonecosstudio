/**
 * ChoiceChangeModal Component
 * 
 * Modal for customers to change their previously approved character choice.
 * Shows current choice, allows selecting a new character, requires a reason,
 * displays remaining changes allowed (max 3), and validates deadline/approval status.
 * 
 * Requirements: 2.2.5
 * Task: 3.2.3 Create ChoiceChangeModal component
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Package,
  AlertTriangle,
  XCircle,
  Edit
} from "lucide-react";
import { formatDistanceToNow, differenceInDays, differenceInHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { 
  getAvailableCharacters, 
  changeCharacterChoice,
  type Character 
} from "@/services/customer/choice-service";

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * CurrentChoiceDisplay - Shows the current character choice
 */
interface CurrentChoiceDisplayProps {
  name: string;
  imageUrl: string | null;
}

const CurrentChoiceDisplay: React.FC<CurrentChoiceDisplayProps> = ({ name, imageUrl }) => {
  return (
    <div className="p-4 border rounded-lg bg-card">
      <h3 className="text-sm font-medium text-muted-foreground mb-3">Escolha Atual</h3>
      <div className="flex items-center gap-3">
        {imageUrl && (
          <img
            src={imageUrl}
            alt={name}
            className="w-20 h-20 object-cover rounded"
          />
        )}
        <div className="flex-1">
          <p className="font-semibold text-lg">{name}</p>
          <p className="text-sm text-muted-foreground">Personagem atual</p>
        </div>
      </div>
    </div>
  );
};

/**
 * RemainingChangesAlert - Shows remaining changes counter
 */
interface RemainingChangesAlertProps {
  remaining: number;
}

const RemainingChangesAlert: React.FC<RemainingChangesAlertProps> = ({ remaining }) => {
  let variant: "default" | "destructive" = "default";
  let icon = <Edit className="h-4 w-4" />;
  
  if (remaining === 1) {
    variant = "destructive";
    icon = <AlertTriangle className="h-4 w-4" />;
  }
  
  return (
    <Alert variant={variant}>
      {icon}
      <AlertTitle>Alterações Restantes</AlertTitle>
      <AlertDescription>
        Você pode alterar sua escolha mais <strong>{remaining}</strong> {remaining === 1 ? 'vez' : 'vezes'}.
      </AlertDescription>
    </Alert>
  );
};

/**
 * CharacterCard - Individual character card for selection
 */
interface CharacterCardProps {
  character: Character;
  selected: boolean;
  isCurrent: boolean;
  onSelect: () => void;
}

const CharacterCard: React.FC<CharacterCardProps> = ({ character, selected, isCurrent, onSelect }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const isLowStock = character.stockLevel !== undefined && character.stockLevel > 0 && character.stockLevel <= 5;
  const isUnavailable = !character.isAvailable || (character.stockLevel !== undefined && character.stockLevel === 0);
  
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={isUnavailable || isCurrent}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "relative group w-full text-left rounded-lg border-2 transition-all duration-200",
        "hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        selected && "border-primary bg-primary/5 shadow-md",
        !selected && !isUnavailable && !isCurrent && "border-border hover:border-primary/50",
        (isUnavailable || isCurrent) && "opacity-50 cursor-not-allowed border-border",
        !isUnavailable && !isCurrent && "cursor-pointer"
      )}
    >
      <div className="relative aspect-square overflow-hidden rounded-t-md bg-muted">
        {character.imageUrl ? (
          <img
            src={character.imageUrl}
            alt={character.name}
            className={cn(
              "w-full h-full object-cover transition-transform duration-200",
              isHovered && !isUnavailable && !isCurrent && "scale-110"
            )}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        
        {selected && (
          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
            <div className="bg-primary text-primary-foreground rounded-full p-2">
              <CheckCircle2 className="h-8 w-8" />
            </div>
          </div>
        )}
        
        {isCurrent && (
          <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
            <Badge className="bg-blue-500">Escolha Atual</Badge>
          </div>
        )}
        
        {isUnavailable && !isCurrent && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <div className="text-white text-center">
              <XCircle className="h-8 w-8 mx-auto mb-1" />
              <p className="text-sm font-semibold">Indisponível</p>
            </div>
          </div>
        )}
        
        {isLowStock && !isUnavailable && !isCurrent && (
          <Badge variant="destructive" className="absolute top-2 right-2">
            Estoque Baixo
          </Badge>
        )}
      </div>
      
      <div className="p-3">
        <h3 className={cn(
          "font-semibold text-sm mb-1 line-clamp-1",
          selected && "text-primary"
        )}>
          {character.name}
        </h3>
        
        {character.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {character.description}
          </p>
        )}
        
        {character.stockLevel !== undefined && character.stockLevel > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            {character.stockLevel} {character.stockLevel === 1 ? 'unidade disponível' : 'unidades disponíveis'}
          </p>
        )}
      </div>
      
      {isHovered && !isUnavailable && !selected && !isCurrent && (
        <div className="absolute inset-0 border-2 border-primary rounded-lg pointer-events-none" />
      )}
    </button>
  );
};

/**
 * LoadingSkeleton - Loading state
 */
const LoadingSkeleton: React.FC = () => (
  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="space-y-2">
        <Skeleton className="aspect-square w-full rounded-md" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    ))}
  </div>
);

// ============================================================================
// Main Component
// ============================================================================

export const ChoiceChangeModal: React.FC<ChoiceChangeModalProps> = ({
  open,
  onOpenChange,
  choiceId,
  orderId,
  collectionId,
  currentCharacterId,
  currentCharacterName,
  currentCharacterImageUrl,
  deadline,
  changesCount,
  isApproved,
  onSuccess,
}) => {
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [changeReason, setChangeReason] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const queryClient = useQueryClient();
  
  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setSelectedCharacterId(null);
      setChangeReason("");
      setShowConfirmation(false);
    }
  }, [open]);
  
  // Calculate remaining changes
  const remainingChanges = 3 - changesCount;
  
  // Check if deadline has passed
  const deadlineDate = deadline ? new Date(deadline) : null;
  const isDeadlinePassed = deadlineDate ? deadlineDate < new Date() : false;
  
  // Check if changes are allowed
  const canChange = isApproved && remainingChanges > 0 && !isDeadlinePassed;
  
  // Fetch available characters
  const { 
    data: characters, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ["available-characters", collectionId],
    queryFn: () => getAvailableCharacters(collectionId),
    enabled: open && !!collectionId && canChange,
  });
  
  // Submit change mutation
  const changeMutation = useMutation({
    mutationFn: () => {
      if (!selectedCharacterId) {
        throw new Error("Nenhum personagem selecionado");
      }
      return changeCharacterChoice(choiceId, selectedCharacterId, changeReason);
    },
    onSuccess: () => {
      toast({
        title: "Escolha Alterada!",
        description: "Sua nova escolha foi enviada com sucesso e está aguardando aprovação.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["customer-order-progress"] });
      queryClient.invalidateQueries({ queryKey: ["character-choice"] });
      
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao Alterar Escolha",
        description: error.message || "Não foi possível alterar sua escolha. Tente novamente.",
        variant: "destructive",
      });
    },
  });
  
  // Handle character selection
  const handleSelectCharacter = (characterId: string) => {
    if (characterId === currentCharacterId) {
      return; // Can't select current character
    }
    setSelectedCharacterId(characterId);
  };
  
  // Handle submit
  const handleSubmit = () => {
    if (!selectedCharacterId) {
      toast({
        title: "Nenhum Personagem Selecionado",
        description: "Por favor, selecione um novo personagem.",
        variant: "destructive",
      });
      return;
    }
    
    if (!changeReason.trim()) {
      toast({
        title: "Motivo Obrigatório",
        description: "Por favor, informe o motivo da alteração.",
        variant: "destructive",
      });
      return;
    }
    
    setShowConfirmation(true);
  };
  
  // Handle confirmation
  const handleConfirm = () => {
    changeMutation.mutate();
  };
  
  // Get selected character
  const selectedCharacter = characters?.find(c => c.id === selectedCharacterId);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Alterar Escolha de Personagem
          </DialogTitle>
          <DialogDescription>
            Selecione um novo personagem e informe o motivo da alteração.
          </DialogDescription>
        </DialogHeader>
        
        {/* Validation Alerts */}
        {!isApproved && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Alteração Não Permitida</AlertTitle>
            <AlertDescription>
              Sua escolha ainda não foi aprovada. Aguarde a aprovação antes de solicitar alterações.
            </AlertDescription>
          </Alert>
        )}
        
        {isDeadlinePassed && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Prazo Expirado</AlertTitle>
            <AlertDescription>
              O prazo para alterar a escolha expirou. Entre em contato com o suporte.
            </AlertDescription>
          </Alert>
        )}
        
        {remainingChanges === 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Limite Atingido</AlertTitle>
            <AlertDescription>
              Você já atingiu o limite de 3 alterações. Entre em contato com o suporte para mais informações.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Content - Only show if changes are allowed */}
        {canChange && (
          <div className="flex-1 min-h-0 space-y-4">
            {/* Current Choice */}
            <CurrentChoiceDisplay
              name={currentCharacterName}
              imageUrl={currentCharacterImageUrl}
            />
            
            {/* Remaining Changes */}
            <RemainingChangesAlert remaining={remainingChanges} />
            
            {/* Loading State */}
            {isLoading && <LoadingSkeleton />}
            
            {/* Error State */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erro ao Carregar Personagens</AlertTitle>
                <AlertDescription>
                  {error instanceof Error ? error.message : "Não foi possível carregar os personagens disponíveis."}
                </AlertDescription>
              </Alert>
            )}
            
            {/* Characters Grid or Confirmation */}
            {!isLoading && !error && characters && (
              <>
                {showConfirmation && selectedCharacter ? (
                  // Confirmation View
                  <div className="space-y-4">
                    <Alert>
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertTitle>Confirme Sua Nova Escolha</AlertTitle>
                      <AlertDescription>
                        Você está alterando sua escolha para o personagem abaixo.
                      </AlertDescription>
                    </Alert>
                    
                    <div className="flex items-center gap-4 p-4 border rounded-lg bg-card">
                      {selectedCharacter.imageUrl && (
                        <img
                          src={selectedCharacter.imageUrl}
                          alt={selectedCharacter.name}
                          className="w-24 h-24 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{selectedCharacter.name}</h3>
                        {selectedCharacter.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {selectedCharacter.description}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="p-3 border rounded-lg bg-muted">
                      <p className="text-sm font-medium mb-1">Motivo da Alteração:</p>
                      <p className="text-sm text-muted-foreground">{changeReason}</p>
                    </div>
                    
                    <Alert className="bg-blue-50 border-blue-200">
                      <AlertCircle className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-900">
                        Após a confirmação, sua nova escolha será enviada para aprovação da equipe de produção.
                      </AlertDescription>
                    </Alert>
                  </div>
                ) : (
                  // Selection View
                  <>
                    {/* Character Selection Grid */}
                    <div>
                      <Label className="text-sm font-medium mb-2 block">
                        Selecione o Novo Personagem
                      </Label>
                      <ScrollArea className="h-[300px] pr-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
                    
                    {/* Reason Textarea */}
                    <div>
                      <Label htmlFor="change-reason" className="text-sm font-medium mb-2 block">
                        Motivo da Alteração <span className="text-destructive">*</span>
                      </Label>
                      <Textarea
                        id="change-reason"
                        placeholder="Explique por que você deseja alterar sua escolha..."
                        value={changeReason}
                        onChange={(e) => setChangeReason(e.target.value)}
                        rows={3}
                        className="resize-none"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Mínimo de 10 caracteres
                      </p>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}
        
        {/* Footer */}
        <DialogFooter>
          {showConfirmation ? (
            <>
              <Button
                variant="outline"
                onClick={() => setShowConfirmation(false)}
                disabled={changeMutation.isPending}
              >
                Voltar
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={changeMutation.isPending}
              >
                {changeMutation.isPending ? "Enviando..." : "Confirmar Alteração"}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
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
};

export default ChoiceChangeModal;
