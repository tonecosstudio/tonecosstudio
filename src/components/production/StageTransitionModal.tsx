import React, { useRef, useState } from "react";
import { AlertTriangle, ChevronRight, Clock, Loader2, Upload, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import {
  ProductionStageValidationError,
  useCompleteProductionStage,
  type ProductionStageRecord,
  type StageType,
} from "@/hooks/admin/useProductionStages";

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
}

interface ValidationError {
  message: string;
  canOverride: boolean;
  requiresJustification: boolean;
}

const STAGE_LABELS: Record<StageType, string> = {
  awaiting_payment: "Aguardando pagamento",
  payment_confirmed: "Pagamento confirmado",
  awaiting_choice: "Aguardando escolha",
  model_preparation: "Preparacao do modelo",
  printing: "Impressao 3D",
  post_processing: "Limpeza e preparacao",
  painting: "Pintura artesanal",
  quality_check: "Controle de qualidade",
  packaging: "Embalagem",
  ready_to_ship: "Pronto para envio",
  shipped: "Enviado",
  delivered: "Entregue",
};

export const StageTransitionModal: React.FC<StageTransitionModalProps> = ({
  isOpen,
  onOpenChange,
  currentStage,
  nextStage,
  productionQueueId,
  onComplete,
}) => {
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const completeStageMutation = useCompleteProductionStage();
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<PhotoUpload[]>([]);
  const [validationError, setValidationError] = useState<ValidationError | null>(null);
  const [enableOverride, setEnableOverride] = useState(false);
  const [overrideJustification, setOverrideJustification] = useState("");

  const isSubmitting = completeStageMutation.isPending;

  const resetForm = () => {
    setNotes("");
    setPhotos([]);
    setValidationError(null);
    setEnableOverride(false);
    setOverrideJustification("");
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isSubmitting) {
      resetForm();
    }

    onOpenChange(open);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (selectedFiles.length === 0) return;

    if (photos.length + selectedFiles.length > 5) {
      toast({
        title: "Limite de fotos excedido",
        description: "Voce pode adicionar no maximo 5 fotos.",
        variant: "destructive",
      });
      return;
    }

    selectedFiles.forEach((file) => {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Tipo de arquivo invalido",
          description: "Apenas arquivos de imagem sao permitidos.",
          variant: "destructive",
        });
        return;
      }

      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        toast({
          title: "Arquivo muito grande",
          description: "O tamanho maximo por foto e 5MB.",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotos((currentPhotos) => [
          ...currentPhotos,
          {
            file,
            preview: reader.result as string,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((currentPhotos) => currentPhotos.filter((_, photoIndex) => photoIndex !== index));
  };

  const handleCompleteStage = () => {
    setValidationError(null);

    completeStageMutation.mutate(
      {
        productionQueueId,
        stageId: currentStage.id,
        notes: notes.trim() || undefined,
        photos: photos.map((photo) => photo.file),
        enableOverride,
        overrideJustification: enableOverride ? overrideJustification.trim() : undefined,
      },
      {
        onSuccess: (updatedStage) => {
          toast({
            title: "Estagio completado",
            description: `${STAGE_LABELS[updatedStage.stageName]} foi marcado como completo.`,
          });

          onComplete?.(updatedStage);
          resetForm();
          onOpenChange(false);
        },
        onError: (error: Error) => {
          if (error instanceof ProductionStageValidationError) {
            setValidationError({
              message: error.message,
              canOverride: error.validation.canOverride,
              requiresJustification: error.validation.requiresJustification,
            });
          }

          toast({
            title: "Erro ao completar estagio",
            description: error.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  const formatDuration = (hours: number): string => {
    if (hours < 1) return `${Math.round(hours * 60)} minutos`;
    if (hours < 24) return `${Math.round(hours)} horas`;

    const days = Math.floor(hours / 24);
    const remainingHours = Math.round(hours % 24);
    return remainingHours > 0 ? `${days} dias e ${remainingHours} horas` : `${days} dias`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Completar estagio de producao</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {validationError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Validacao bloqueada</AlertTitle>
              <AlertDescription>
                <p className="mb-2">{validationError.message}</p>
                {validationError.canOverride && (
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="enable-override"
                        checked={enableOverride}
                        onCheckedChange={(checked) => {
                          const shouldEnableOverride = checked === true;
                          setEnableOverride(shouldEnableOverride);
                          if (!shouldEnableOverride) {
                            setOverrideJustification("");
                          }
                        }}
                      />
                      <label
                        htmlFor="enable-override"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Autorizar override administrativo
                      </label>
                    </div>

                    {enableOverride && validationError.requiresJustification && (
                      <div className="space-y-2">
                        <Label htmlFor="override-justification">
                          Justificativa <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                          id="override-justification"
                          placeholder="Explique por que esta validacao precisa ser ignorada."
                          value={overrideJustification}
                          onChange={(event) => setOverrideJustification(event.target.value)}
                          rows={3}
                          className="resize-none"
                        />
                        <p className="text-xs text-muted-foreground">
                          A justificativa sera registrada na trilha de auditoria.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-between rounded-lg bg-muted p-4">
            <div className="flex-1">
              <div className="mb-1 text-sm text-muted-foreground">Estagio atual</div>
              <div className="text-lg font-semibold">{STAGE_LABELS[currentStage.stageName]}</div>
            </div>

            <ChevronRight className="mx-4 h-6 w-6 text-muted-foreground" />

            <div className="flex-1 text-right">
              <div className="mb-1 text-sm text-muted-foreground">Proximo estagio</div>
              <div className="text-lg font-semibold">
                {nextStage ? STAGE_LABELS[nextStage.stageName] : "Concluido"}
              </div>
            </div>
          </div>

          {nextStage && (
            <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <div>
                <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Tempo estimado para o proximo estagio
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  {formatDuration(nextStage.estimatedDuration)}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notas opcionais</Label>
            <Textarea
              id="notes"
              placeholder="Adicione observacoes sobre este estagio."
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Registre informacoes relevantes sobre a conclusao deste estagio.
            </p>
          </div>

          <div className="space-y-3">
            <Label>Fotos opcionais ({photos.length}/5)</Label>

            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {photos.map((photo, index) => (
                  <div
                    key={`${photo.file.name}-${index}`}
                    className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
                  >
                    <img
                      src={photo.preview}
                      alt={`Preview ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(index)}
                      className="absolute right-2 top-2 rounded-full bg-destructive p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                      disabled={isSubmitting}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {photos.length < 5 && (
              <div>
                <input
                  ref={photoInputRef}
                  type="file"
                  id="photo-upload"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isSubmitting}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={isSubmitting}
                  onClick={() => photoInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Adicionar fotos
                </Button>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Fotos do progresso ou resultado deste estagio. Maximo 5MB por foto.
            </p>
          </div>

          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="mb-1 text-sm font-medium">Informacoes do estagio</div>
                {currentStage.assignedToName && (
                  <div className="text-sm text-muted-foreground">
                    Atribuido a: {currentStage.assignedToName}
                  </div>
                )}
                {currentStage.startedAt && (
                  <div className="text-sm text-muted-foreground">
                    Iniciado em: {new Date(currentStage.startedAt).toLocaleString("pt-BR")}
                  </div>
                )}
              </div>
              <Badge variant="secondary">Estagio {currentStage.stageOrder}</Badge>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleCompleteStage}
            disabled={
              isSubmitting ||
              currentStage.isBlocked ||
              (enableOverride && !overrideJustification.trim())
            }
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <ChevronRight className="mr-2 h-4 w-4" />
                {enableOverride ? "Concluir com override" : "Completar e avancar"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StageTransitionModal;
