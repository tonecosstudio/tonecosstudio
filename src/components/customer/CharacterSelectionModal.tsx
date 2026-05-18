/**
 * CharacterSelectionModal Component
 * 
 * Modal for customers to select their character from available options.
 * Displays characters in a grid with images, names, descriptions, and stock indicators.
 * Shows deadline countdown prominently and handles character selection submission.
 * 
 * Requirements: 2.2.2, 2.4.3
 * Task: 3.2.1 Create CharacterSelectionModal component
 */

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Package,
  AlertTriangle,
  XCircle
} from "lucide-react";
import { formatDistanceToNow, differenceInDays, differenceInHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import {
  useAvailableCharacters,
  submitCharacterChoiceAction,
  type CharacterEntity,
} from "@/hooks/customer/useChoiceActions";

// ============================================================================
// Types
// ============================================================================

export interface CharacterSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  collectionId: string;
  deadline: string | null;
  onSuccess?: () => void;
}

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * DeadlineAlert - Prominent deadline countdown at the top
 */
interface DeadlineAlertProps {
  deadline: string;
}

const DeadlineAlert: React.FC<DeadlineAlertProps> = ({ deadline }) => {
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const daysRemaining = differenceInDays(deadlineDate, now);
  const hoursRemaining = differenceInHours(deadlineDate, now);
  
  // Determine urgency level
  let variant: "default" | "destructive" = "default";
  let icon = <Clock className="h-4 w-4" />;
  let title = "Prazo para Escolha";
  
  if (hoursRemaining < 24) {
    variant = "destructive";
    icon = <AlertCircle className="h-4 w-4" />;
    title = "Prazo Urgente!";
  } else if (daysRemaining <= 3) {
    icon = <AlertTriangle className="h-4 w-4" />;
  }
  
  return (
    <Alert variant={variant} className="mb-4">
      {icon}
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        Você tem <strong>{formatDistanceToNow(deadlineDate, { locale: ptBR })}</strong> para escolher seu personagem.
      </AlertDescription>
    </Alert>
  );
};

/**
 * CharacterCard - Individual character card with hover preview
 */
interface CharacterCardProps {
  character: CharacterEntity;
  selected: boolean;
  onSelect: () => void;
}

const CharacterCard: React.FC<CharacterCardProps> = ({ character, selected, onSelect }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  // Determine availability status
  const isLowStock = character.stockLevel !== undefined && character.stockLevel > 0 && character.stockLevel <= 5;
  const isUnavailable = !character.isAvailable || (character.stockLevel !== undefined && character.stockLevel === 0);
  
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={isUnavailable}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "relative group w-full text-left rounded-lg border-2 transition-all duration-200",
        "hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        selected && "border-primary bg-primary/5 shadow-md",
        !selected && !isUnavailable && "border-border hover:border-primary/50",
        isUnavailable && "opacity-50 cursor-not-allowed border-border",
        !isUnavailable && "cursor-pointer"
      )}
    >
      {/* Character Image */}
      <div className="relative aspect-square overflow-hidden rounded-t-md bg-muted">
        {character.imageUrl ? (
          <img
            src={character.imageUrl}
            alt={character.name}
            className={cn(
              "w-full h-full object-cover transition-transform duration-200",
              isHovered && !isUnavailable && "scale-110"
            )}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        
        {/* Selected Indicator */}
        {selected && (
          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
            <div className="bg-primary text-primary-foreground rounded-full p-2">
              <CheckCircle2 className="h-8 w-8" />
            </div>
          </div>
        )}
        
        {/* Unavailable Overlay */}
        {isUnavailable && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <div className="text-white text-center">
              <XCircle className="h-8 w-8 mx-auto mb-1" />
              <p className="text-sm font-semibold">Indisponível</p>
            </div>
          </div>
        )}
        
        {/* Low Stock Badge */}
        {isLowStock && !isUnavailable && (
          <Badge 
            variant="destructive" 
            className="absolute top-2 right-2"
          >
            Estoque Baixo
          </Badge>
        )}
      </div>
      
      {/* Character Info */}
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
        
        {/* Stock Level */}
        {character.stockLevel !== undefined && character.stockLevel > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            {character.stockLevel} {character.stockLevel === 1 ? 'unidade disponível' : 'unidades disponíveis'}
          </p>
        )}
      </div>
      
      {/* Hover Preview Border */}
      {isHovered && !isUnavailable && !selected && (
        <div className="absolute inset-0 border-2 border-primary rounded-lg pointer-events-none" />
      )}
    </button>
  );
};

/**
 * LoadingSkeleton - Loading state for character grid
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

export const CharacterSelectionModal: React.FC<CharacterSelectionModalProps> = ({
  open,
  onOpenChange,
  orderId,
  collectionId,
  deadline,
  onSuccess,
}) => {
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const queryClient = useQueryClient();
  
  // Reset selection when modal opens
  useEffect(() => {
    if (open) {
      setSelectedCharacterId(null);
      setShowConfirmation(false);
    }
  }, [open]);
  
  // Fetch available characters
  const { 
    data: characters, 
    isLoading, 
    error 
  } = useAvailableCharacters(collectionId, open);
  
  // Submit character choice mutation
  const submitMutation = useMutation({
    mutationFn: (characterId: string) => submitCharacterChoiceAction(orderId, characterId),
    onSuccess: () => {
      toast({
        title: "Escolha Enviada!",
        description: "Sua escolha de personagem foi enviada com sucesso e está aguardando aprovação.",
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["customer-order-progress"] });
      queryClient.invalidateQueries({ queryKey: ["character-choice"] });
      
      // Call success callback
      onSuccess?.();
      
      // Close modal
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao Enviar Escolha",
        description: error.message || "Não foi possível enviar sua escolha. Tente novamente.",
        variant: "destructive",
      });
    },
  });
  
  // Handle character selection
  const handleSelectCharacter = (characterId: string) => {
    setSelectedCharacterId(characterId);
  };
  
  // Handle submit button click
  const handleSubmit = () => {
    if (!selectedCharacterId) {
      toast({
        title: "Nenhum Personagem Selecionado",
        description: "Por favor, selecione um personagem antes de continuar.",
        variant: "destructive",
      });
      return;
    }
    
    setShowConfirmation(true);
  };
  
  // Handle confirmation
  const handleConfirm = () => {
    if (selectedCharacterId) {
      submitMutation.mutate(selectedCharacterId);
    }
  };
  
  // Get selected character
  const selectedCharacter = characters?.find(c => c.id === selectedCharacterId);
  
  // Check if deadline has passed
  const deadlineDate = deadline ? new Date(deadline) : null;
  const isDeadlinePassed = deadlineDate ? deadlineDate < new Date() : false;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Escolha Seu Personagem
          </DialogTitle>
          <DialogDescription>
            Selecione o personagem que você deseja receber neste pedido.
          </DialogDescription>
        </DialogHeader>
        
        {/* Deadline Alert */}
        {deadline && !isDeadlinePassed && (
          <DeadlineAlert deadline={deadline} />
        )}
        
        {/* Deadline Passed Alert */}
        {isDeadlinePassed && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Prazo Expirado</AlertTitle>
            <AlertDescription>
              O prazo para escolher o personagem expirou. Entre em contato com o suporte.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Content */}
        <div className="flex-1 min-h-0">
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
          
          {/* Characters Grid */}
          {!isLoading && !error && characters && (
            <>
              {characters.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Nenhum Personagem Disponível</AlertTitle>
                  <AlertDescription>
                    Não há personagens disponíveis para esta coleção no momento.
                  </AlertDescription>
                </Alert>
              ) : showConfirmation && selectedCharacter ? (
                // Confirmation View
                <div className="space-y-4">
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>Confirme Sua Escolha</AlertTitle>
                    <AlertDescription>
                      Você selecionou o personagem abaixo. Deseja confirmar?
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
                  
                  <Alert className="bg-blue-50 border-blue-200">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-900">
                      Após a confirmação, sua escolha será enviada para aprovação da equipe de produção.
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                // Character Selection Grid
                <ScrollArea className="h-[400px] pr-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {characters.map((character) => (
                      <CharacterCard
                        key={character.id}
                        character={character}
                        selected={selectedCharacterId === character.id}
                        onSelect={() => handleSelectCharacter(character.id)}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </>
          )}
        </div>
        
        {/* Footer */}
        <DialogFooter>
          {showConfirmation ? (
            <>
              <Button
                variant="outline"
                onClick={() => setShowConfirmation(false)}
                disabled={submitMutation.isPending}
              >
                Voltar
              </Button>
              <Button
                onClick={handleConfirm}
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
};

export default CharacterSelectionModal;
