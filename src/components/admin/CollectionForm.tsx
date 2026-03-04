// @ts-nocheck
/**
 * CollectionForm Component
 *
 * Form for creating and editing collections in admin interface.
 * Includes fields for rotation type, character revelation, and image uploads.
 *
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5
 * Task: 20.2 Create collection form component
 */

import React, { useState, useEffect } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { Loader2, CalendarIcon, RotateCw, Eye } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import ImageUpload from "./ImageUpload";
import { CollectionTierAssignment } from "./pricing-tiers/CollectionTierAssignment";
import type { Collection } from "@/services/collection-service";

// Zod validation schema
const collectionSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100, "Nome muito longo"),
  description: z.string().min(1, "Descrição é obrigatória").max(500, "Descrição muito longa"),
  price: z.number().min(0, "Preço deve ser maior ou igual a zero"),
  image_url: z.string().url("URL da imagem inválida").or(z.literal("")),
  rotation_type: z.enum(["fixed", "odd_months", "even_months"]),
  character_revelation_date: z.date().nullable(),
  character_name: z.string().max(100, "Nome do personagem muito longo").nullable(),
  character_image_url: z.string().url("URL da imagem do personagem inválida").or(z.literal("")).nullable(),
  is_active: z.boolean(),
});

type CollectionFormData = z.infer<typeof collectionSchema>;

interface CollectionFormProps {
  collection?: Collection | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CollectionFormData) => Promise<void>;
  isLoading?: boolean;
}

export function CollectionForm({
  collection,
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
}: CollectionFormProps) {
  const isEditing = !!collection;

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [rotationType, setRotationType] = useState<"fixed" | "odd_months" | "even_months">("fixed");
  const [characterRevelationDate, setCharacterRevelationDate] = useState<Date | undefined>(undefined);
  const [characterName, setCharacterName] = useState("");
  const [characterImageUrl, setCharacterImageUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when collection changes
  useEffect(() => {
    if (collection) {
      setName(collection.name);
      setDescription(collection.description);
      setPrice(collection.priceMonthly?.toString() || "0");
      setImageUrl(collection.coverImage || "");
      setRotationType(collection.rotation_type || "fixed");
      setCharacterRevelationDate(
        collection.character_revelation_date
          ? new Date(collection.character_revelation_date)
          : undefined
      );
      setCharacterName(collection.character_name || "");
      setCharacterImageUrl(collection.character_image_url || "");
      setIsActive(collection.is_active);
    } else {
      // Reset to defaults for new collection
      setName("");
      setDescription("");
      setPrice("");
      setImageUrl("");
      setRotationType("fixed");
      setCharacterRevelationDate(undefined);
      setCharacterName("");
      setCharacterImageUrl("");
      setIsActive(true);
    }
    setErrors({});
  }, [collection, open]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Parse price
    const priceValue = parseFloat(price);
    if (isNaN(priceValue)) {
      setErrors({ price: "Preço inválido" });
      return;
    }

    // Prepare form data
    const formData: CollectionFormData = {
      name: name.trim(),
      description: description.trim(),
      price: priceValue,
      image_url: imageUrl.trim(),
      rotation_type: rotationType,
      character_revelation_date: characterRevelationDate || null,
      character_name: characterName.trim() || null,
      character_image_url: characterImageUrl.trim() || null,
      is_active: isActive,
    };

    // Validate with Zod
    try {
      collectionSchema.parse(formData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(fieldErrors);
        toast({
          title: "Erro de validação",
          description: "Por favor, corrija os erros no formulário.",
          variant: "destructive",
        });
        return;
      }
    }

    // Submit form
    try {
      await onSubmit(formData);
      toast({
        title: isEditing ? "Coleção atualizada" : "Coleção criada",
        description: `A coleção "${name}" foi ${isEditing ? "atualizada" : "criada"} com sucesso.`,
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: isEditing ? "Erro ao atualizar coleção" : "Erro ao criar coleção",
        description: error.message || "Ocorreu um erro ao processar a solicitação.",
        variant: "destructive",
      });
    }
  };

  // Get rotation type label
  const getRotationLabel = (type: string) => {
    switch (type) {
      case "fixed":
        return "Fixa (Todos os meses)";
      case "odd_months":
        return "Meses Ímpares (Jan, Mar, Mai, Jul, Set, Nov)";
      case "even_months":
        return "Meses Pares (Fev, Abr, Jun, Ago, Out, Dez)";
      default:
        return type;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Coleção" : "Nova Coleção"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? `Editando: ${collection?.name}`
              : "Configure uma nova coleção para o sistema."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Informações Básicas</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Coleção Marvel"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                  className={cn(errors.name && "border-destructive")}
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Preço (R$) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  disabled={isLoading}
                  className={cn(errors.price && "border-destructive")}
                />
                {errors.price && (
                  <p className="text-xs text-destructive">{errors.price}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição *</Label>
              <Textarea
                id="description"
                placeholder="Descreva a coleção..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                disabled={isLoading}
                className={cn(errors.description && "border-destructive")}
              />
              {errors.description && (
                <p className="text-xs text-destructive">{errors.description}</p>
              )}
            </div>

            <div className="space-y-2">
              <ImageUpload
                label="Imagem da Coleção *"
                description="Imagem principal da coleção (PNG, JPG, WEBP - máx. 5MB)"
                currentImageUrl={imageUrl}
                bucket="images"
                folder="collections"
                onUploadComplete={setImageUrl}
                maxSizeMB={5}
                acceptedFormats={["image/png", "image/jpeg", "image/jpg", "image/webp"]}
              />
              {errors.image_url && (
                <p className="text-xs text-destructive">{errors.image_url}</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Rotation Configuration */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <RotateCw className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Configuração de Rotação</h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rotation-type">Tipo de Rotação *</Label>
              <Select
                value={rotationType}
                onValueChange={(value: "fixed" | "odd_months" | "even_months") =>
                  setRotationType(value)
                }
                disabled={isLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o tipo de rotação">
                    {getRotationLabel(rotationType)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">
                    <div className="flex flex-col">
                      <span>Fixa (Todos os meses)</span>
                      <span className="text-xs text-muted-foreground">
                        Disponível em todos os meses
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="odd_months">
                    <div className="flex flex-col">
                      <span>Meses Ímpares</span>
                      <span className="text-xs text-muted-foreground">
                        Jan, Mar, Mai, Jul, Set, Nov
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="even_months">
                    <div className="flex flex-col">
                      <span>Meses Pares</span>
                      <span className="text-xs text-muted-foreground">
                        Fev, Abr, Jun, Ago, Out, Dez
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Define em quais meses a coleção estará disponível para seleção
              </p>
            </div>

            {/* Rotation Schedule Preview */}
            {rotationType !== "fixed" && (
              <div className="space-y-2">
                <Label>Visualização do Calendário de Rotação</Label>
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {[
                      { month: 1, name: "Jan" },
                      { month: 2, name: "Fev" },
                      { month: 3, name: "Mar" },
                      { month: 4, name: "Abr" },
                      { month: 5, name: "Mai" },
                      { month: 6, name: "Jun" },
                      { month: 7, name: "Jul" },
                      { month: 8, name: "Ago" },
                      { month: 9, name: "Set" },
                      { month: 10, name: "Out" },
                      { month: 11, name: "Nov" },
                      { month: 12, name: "Dez" },
                    ].map(({ month, name }) => {
                      const isActive =
                        rotationType === "odd_months"
                          ? month % 2 === 1
                          : month % 2 === 0;
                      return (
                        <div
                          key={month}
                          className={cn(
                            "flex flex-col items-center justify-center rounded-md p-3 text-center transition-colors",
                            isActive
                              ? "bg-primary text-primary-foreground font-medium shadow-sm"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          <span className="text-sm">{name}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded bg-primary" />
                      <span>Meses Ativos</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded bg-muted" />
                      <span>Meses Inativos</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {rotationType === "odd_months"
                    ? "Esta coleção estará disponível nos meses ímpares (Janeiro, Março, Maio, Julho, Setembro, Novembro)"
                    : "Esta coleção estará disponível nos meses pares (Fevereiro, Abril, Junho, Agosto, Outubro, Dezembro)"}
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Character Revelation */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Revelação de Personagem</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="character-name">Nome do Personagem</Label>
                <Input
                  id="character-name"
                  placeholder="Ex: Homem-Aranha"
                  value={characterName}
                  onChange={(e) => setCharacterName(e.target.value)}
                  disabled={isLoading}
                  className={cn(errors.character_name && "border-destructive")}
                />
                {errors.character_name && (
                  <p className="text-xs text-destructive">{errors.character_name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Data de Revelação</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !characterRevelationDate && "text-muted-foreground"
                      )}
                      disabled={isLoading}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {characterRevelationDate ? (
                        format(characterRevelationDate, "PPP", { locale: ptBR })
                      ) : (
                        <span>Selecione uma data</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={characterRevelationDate}
                      onSelect={setCharacterRevelationDate}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">
                  Data em que o personagem será revelado aos assinantes
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <ImageUpload
                label="Imagem do Personagem"
                description="Imagem revelada após a data de revelação (PNG, JPG, WEBP - máx. 5MB)"
                currentImageUrl={characterImageUrl}
                bucket="images"
                folder="characters"
                onUploadComplete={setCharacterImageUrl}
                maxSizeMB={5}
                acceptedFormats={["image/png", "image/jpeg", "image/jpg", "image/webp"]}
              />
              {errors.character_image_url && (
                <p className="text-xs text-destructive">{errors.character_image_url}</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Configurações</h3>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is-active">Coleção Ativa</Label>
                <p className="text-xs text-muted-foreground">
                  Coleção disponível para seleção pelos assinantes
                </p>
              </div>
              <Switch
                id="is-active"
                checked={isActive}
                onCheckedChange={setIsActive}
                disabled={isLoading}
              />
            </div>

            <div className="rounded-md bg-blue-50 p-3 border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Nota:</strong> Coleções inativas não aparecerão para os assinantes,
                mas os dados serão preservados no sistema.
              </p>
            </div>
          </div>

          {/* Pricing Tier Assignment - Only show when editing */}
          {isEditing && collection && (
            <>
              <Separator />
              <CollectionTierAssignment
                collectionId={collection.id}
                isCustomPricing={collection.is_price_custom || false}
              />
            </>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Salvar Alterações" : "Criar Coleção"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
