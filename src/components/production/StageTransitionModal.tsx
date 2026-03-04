/**
 * StageTransitionModal Component
 *
 * Modal for transitioning between production stages with:
 * - Current and next stage display
 * - Notes textarea for stage completion
 * - Photo upload (up to 5 photos)
 * - Estimated time for next stage
 * - Complete & Move to Next Stage button
 *
 * Integrates with ProductionStageTracker and uses stage-service.ts backend
 */

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { Upload, X, Loader2, ChevronRight, Clock, AlertTriangle } from "lucide-react";
import {
  completeStage,
  uploadStagePhoto,
  type ProductionStageRecord,
  type StageType,
} from "@/services/admin/stage-service";
import { validateStageTransition } from "@/services/admin/stage-validation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";

// ============================================================================
// Types
// ============================================================================

interface StageTransitionModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentStage: ProductionStageRecord;
  nextStage: ProductionStageRecord | null;
  productionQueueId: string;
  onComplete?: (stage: ProductionStageRecord) => void;
}

interface PhotoUpload {
  file: File;
  preview: string;
  uploading: boolean;
  url?: string;
}

interface ValidationError {
  message: string;
  canOverride: boolean;
  requiresJustification: boolean;
}

// Stage display configuration
const STAGE_LABELS: Record<StageType, string> = {
  awaiting_choice: "Aguardando Escolha",
  design: "Design",
  production: "Produção",
  quality_check: "Controle de Qualidade",
  packaging: "Embalagem",
  shipped: "Enviado",
};

// ============================================================================
// Component
// ============================================================================

export const StageTransitionModal: React.FC<StageTransitionModalProps> = ({
  isOpen,
  onOpenChange,
  currentStage,
  nextStage,
  productionQueueId,
  onComplete,
}) => {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<PhotoUpload[]>([]);
  const [validationError, setValidationError] = useState<ValidationError | null>(null);
  const [enableOverride, setEnableOverride] = useState(false);
  const [overrideJustification, setOverrideJustification] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  // Complete stage mutation
  const completeCurrentStageMutation = useMutation({
    mutationFn: async () => {
      // Validate stage transition first (unless override is enabled)
      if (!enableOverride) {
        setIsValidating(true);
        const validation = await validateStageTransition(productionQueueId, currentStage.id);
        setIsValidating(false);

        if (!validation.isValid) {
          setValidationError({
            message: validation.error || "Validation failed",
            canOverride: validation.canOverride,
            requiresJustification: validation.requiresJustification,
          });
          throw new Error(validation.error || "Validation failed");
        }
      } else {
        // If override is enabled, check justification
        if (!overrideJustification.trim()) {
          throw new Error("Justification is required for admin override");
        }
      }

      // Upload all photos first
      const uploadedUrls: string[] = [];
      
      for (const photo of photos) {
        if (!photo.url) {
          try {
            const url = await uploadStagePhoto(currentStage.id, photo.file);
            uploadedUrls.push(url);
          } catch (error) {
            throw new Error(`Erro ao fazer upload da foto: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
          }
        } else {
          uploadedUrls.push(photo.url);
        }
      }

      // Complete stage with notes and photo URLs
      return completeStage(
        currentStage.id,
        notes || undefined,
        uploadedUrls.length > 0 ? uploadedUrls : undefined,
        enableOverride,
        enableOverride ? overrideJustification : undefined
      );
    },
    onSuccess: (updatedStage) => {
      toast({
        title: "Estágio Completado",
        description: `${STAGE_LABELS[updatedStage.stageName]} foi marcado como completo.`,
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["production-stages", productionQueueId] });
      queryClient.invalidateQueries({ queryKey: ["production-queue"] });

      // Call callback if provided
      if (onComplete) {
        onComplete(updatedStage);
      }

      // Reset form and close modal
      resetForm();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao Completar Estágio",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    // Check if adding these files would exceed the limit
    if (photos.length + files.length > 5) {
      toast({
        title: "Limite de Fotos Excedido",
        description: "Você pode adicionar no máximo 5 fotos.",
        variant: "destructive",
      });
      return;
    }

    // Process each file
    Array.from(files).forEach((file) => {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Tipo de Arquivo Inválido",
          description: "Apenas arquivos de imagem são permitidos.",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (5MB max)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        toast({
          title: "Arquivo Muito Grande",
          description: "O tamanho máximo por foto é 5MB.",
          variant: "destructive",
        });
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotos((prev) => [
          ...prev,
          {
            file,
            preview: reader.result as string,
            uploading: false,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    event.target.value = "";
  };

  // Remove photo
  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Reset form
  const resetForm = () => {
    setNotes("");
    setPhotos([]);
    setValidationError(null);
    setEnableOverride(false);
    setOverrideJustification("");
    setIsValidating(false);
  };

  // Handle modal close
  const handleOpenChange = (open: boolean) => {
    if (!open && !completeCurrentStageMutation.isPending) {
      resetForm();
    }
    onOpenChange(open);
  };

  // Format duration
  const formatDuration = (hours: number): string => {
    if (hours < 1) {
      return `${Math.round(hours * 60)} minutos`;
    } else if (hours < 24) {
      return `${Math.round(hours)} horas`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = Math.round(hours % 24);
      return remainingHours > 0 ? `${days} dias e ${remainingHours} horas` : `${days} dias`;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Completar Estágio de Produção</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Validation Error Alert */}
          {validationError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Validation Error</AlertTitle>
              <AlertDescription>
                <p className="mb-2">{validationError.message}</p>
                {validationError.canOverride && (
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="enable-override"
                        checked={enableOverride}
                        onCheckedChange={(checked) => {
                          setEnableOverride(checked as boolean);
                          if (!checked) {
                            setOverrideJustification("");
                          }
                        }}
                      />
                      <label
                        htmlFor="enable-override"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Enable Admin Override
                      </label>
                    </div>
                    {enableOverride && validationError.requiresJustification && (
                      <div className="space-y-2">
                        <Label htmlFor="override-justification">
                          Justification (Required) <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                          id="override-justification"
                          placeholder="Explain why you need to skip this validation..."
                          value={overrideJustification}
                          onChange={(e) => setOverrideJustification(e.target.value)}
                          rows={3}
                          className="resize-none"
                        />
                        <p className="text-xs text-muted-foreground">
                          This justification will be logged in the audit trail.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Current and Next Stage Display */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex-1">
              <div className="text-sm text-muted-foreground mb-1">Estágio Atual</div>
              <div className="font-semibold text-lg">
                {STAGE_LABELS[currentStage.stageName]}
              </div>
            </div>

            <ChevronRight className="h-6 w-6 text-muted-foreground mx-4" />

            <div className="flex-1 text-right">
              <div className="text-sm text-muted-foreground mb-1">Próximo Estágio</div>
              <div className="font-semibold text-lg">
                {nextStage ? STAGE_LABELS[nextStage.stageName] : "Concluído"}
              </div>
            </div>
          </div>

          {/* Estimated Time for Next Stage */}
          {nextStage && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <div>
                <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Tempo Estimado para o Próximo Estágio
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  {formatDuration(nextStage.estimatedDuration)}
                </div>
              </div>
            </div>
          )}

          {/* Notes Textarea */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              Notas (Opcional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Adicione observações sobre este estágio..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Adicione informações relevantes sobre a conclusão deste estágio.
            </p>
          </div>

          {/* Photo Upload */}
          <div className="space-y-3">
            <Label>
              Fotos (Opcional - Máximo 5)
            </Label>

            {/* Photo Grid */}
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {photos.map((photo, index) => (
                  <div
                    key={index}
                    className="relative aspect-square rounded-lg overflow-hidden border bg-muted group"
                  >
                    <img
                      src={photo.preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {photo.uploading && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-white" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(index)}
                      className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      disabled={completeCurrentStageMutation.isPending}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Button */}
            {photos.length < 5 && (
              <div>
                <input
                  type="file"
                  id="photo-upload"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={completeCurrentStageMutation.isPending}
                />
                <label htmlFor="photo-upload">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={completeCurrentStageMutation.isPending}
                    onClick={() => document.getElementById("photo-upload")?.click()}
                    asChild
                  >
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      Adicionar Fotos ({photos.length}/5)
                    </span>
                  </Button>
                </label>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Adicione fotos do progresso ou resultado deste estágio. Máximo 5MB por foto.
            </p>
          </div>

          {/* Current Stage Info */}
          <div className="p-4 border rounded-lg bg-muted/50">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm font-medium mb-1">Informações do Estágio</div>
                {currentStage.assignedToName && (
                  <div className="text-sm text-muted-foreground">
                    Atribuído a: {currentStage.assignedToName}
                  </div>
                )}
                {currentStage.startedAt && (
                  <div className="text-sm text-muted-foreground">
                    Iniciado em: {new Date(currentStage.startedAt).toLocaleString("pt-BR")}
                  </div>
                )}
              </div>
              <Badge variant="secondary">
                Estágio {currentStage.stageOrder} de 6
              </Badge>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={completeCurrentStageMutation.isPending || isValidating}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => completeCurrentStageMutation.mutate()}
            disabled={
              completeCurrentStageMutation.isPending ||
              isValidating ||
              currentStage.isBlocked ||
              (enableOverride && !overrideJustification.trim())
            }
          >
            {completeCurrentStageMutation.isPending || isValidating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {isValidating ? "Validating..." : "Processando..."}
              </>
            ) : (
              <>
                <ChevronRight className="h-4 w-4 mr-2" />
                {enableOverride ? "Override & Complete Stage" : "Completar & Avançar para Próximo Estágio"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StageTransitionModal;
