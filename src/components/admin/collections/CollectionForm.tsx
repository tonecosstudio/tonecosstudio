/**
 * CollectionForm Component
 *
 * Formulário melhorado com sistema de tabs para criar/editar coleções
 * Inclui validações inteligentes e preview
 */

import React, { useState, useEffect } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import {
  Loader2,
  Info,
  CheckCircle2,
  AlertTriangle,
  Eye,
  FileText,
  Users,
  Settings
} from "lucide-react";
import { cn } from "@/lib/utils";
import ImageUpload from "../shared/ImageUpload";
import { CollectionTierAssignment } from "../pricing-tiers/CollectionTierAssignment";
import { CollectionCharactersManager, type CharacterData } from "./CollectionCharactersManager";
import { useCollectionFormPricingTiers } from "@/hooks/admin/useCollectionFormPricingTiers";
import { useCollectionTierAssignment } from "@/hooks/useCollectionTierAssignment";

// Zod validation schema
const collectionSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100, "Nome muito longo"),
  description: z.string().min(1, "Descrição é obrigatória").max(500, "Descrição muito longa"),
  image_url: z.string().url("URL da imagem inválida").or(z.literal("")),
  rotation_type: z.enum(["fixed", "odd_months", "even_months"]),
  tier_id: z.string().uuid("Selecione um nível de preço"),
  is_active: z.boolean(),
});

type CollectionFormData = z.infer<typeof collectionSchema>;

export interface CollectionFormDataWithCharacters extends CollectionFormData {
  characters: CharacterData[];
}

interface CollectionFormCollection {
  id: string;
  name: string;
  description: string;
  cover_image_url: string | null;
  rotation_type: "fixed" | "odd_months" | "even_months";
  is_active: boolean;
  is_price_custom?: boolean;
}

interface CollectionFormProps {
  collection?: CollectionFormCollection | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CollectionFormDataWithCharacters) => Promise<void>;
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

  // Tab state
  const [activeTab, setActiveTab] = useState("basic");

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [rotationType, setRotationType] = useState<"fixed" | "odd_months" | "even_months">("fixed");
  const [selectedTierId, setSelectedTierId] = useState<string>("");
  const [isActive, setIsActive] = useState(true);
  const [characters, setCharacters] = useState<CharacterData[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Pricing tiers
  const { data: pricingTiers = [] } = useCollectionFormPricingTiers(open);
  const { data: currentTierAssignment, isLoading: isTierAssignmentLoading } =
    useCollectionTierAssignment(open && collection?.id ? collection.id : null);

  // Validation state
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  // Reset form when collection changes
  useEffect(() => {
    if (collection) {
      setName(collection.name);
      setDescription(collection.description);
      setImageUrl(collection.cover_image_url || "");
      setRotationType((collection.rotation_type as "fixed" | "odd_months" | "even_months") || "fixed");
      setIsActive(collection.is_active);
      setCharacters([]);
      setSelectedTierId("");
    } else {
      setName("");
      setDescription("");
      setImageUrl("");
      setRotationType("fixed");
      setIsActive(true);
      setCharacters([]); // Começa sem personagens
      setSelectedTierId("");
    }
    setErrors({});
    setValidationWarnings([]);
    setActiveTab("basic");
  }, [collection, open]);

  useEffect(() => {
    if (!open || selectedTierId || pricingTiers.length === 0) return;

    if (collection && currentTierAssignment?.tier_id) {
      setSelectedTierId(currentTierAssignment.tier_id);
      return;
    }

    if (!collection || !isTierAssignmentLoading) {
      const defaultTier = pricingTiers.find((tier) => tier.is_default) || pricingTiers[0];
      setSelectedTierId(defaultTier.id);
    }
  }, [
    collection,
    currentTierAssignment,
    isTierAssignmentLoading,
    open,
    pricingTiers,
    selectedTierId,
  ]);

  // Validate characters for conflicts
  useEffect(() => {
    const warnings: string[] = [];

    // Check for duplicate release dates
    const dateMap = new Map<string, string[]>();
    characters.forEach(char => {
      if (char.name) {
        const dateKey = `${char.releaseYear}-${char.releaseMonth}`;
        if (!dateMap.has(dateKey)) {
          dateMap.set(dateKey, []);
        }
        dateMap.get(dateKey)!.push(char.name);
      }
    });

    dateMap.forEach((names) => {
      if (names.length > 1) {
        warnings.push(`${names.join(" e ")} têm o mesmo mês de lançamento`);
      }
    });

    // Check if characters without images
    const withoutImages = characters.filter(c => c.name && !c.imageUrl).length;
    if (withoutImages > 0) {
      warnings.push(`${withoutImages} personagem(ns) sem imagem`);
    }

    setValidationWarnings(warnings);
  }, [characters]);

  // Check if tab is complete
  const isTabComplete = (tab: string) => {
    switch (tab) {
      case "basic":
        return name.trim() && description.trim() && imageUrl;
      case "characters":
        return characters.length > 0 && characters.every(c => c.name.trim());
      case "settings":
        return true;
      default:
        return false;
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate tier selection
    if (!selectedTierId) {
      toast({
        title: "Nível de preço obrigatório",
        description: "Selecione um nível de preço na aba Configurações.",
        variant: "destructive",
      });
      setActiveTab("settings");
      return;
    }

    // Validate characters
    if (characters.length === 0) {
      toast({
        title: "Atenção",
        description: "Você está criando uma coleção sem personagens. Você pode adicionar personagens depois.",
        variant: "default",
      });
      // Não bloqueia, apenas avisa
    }

    const charactersWithNames = characters.filter(char => char.name.trim());

    // Se tem personagens, mas alguns sem nome, avisa mas não bloqueia
    if (characters.length > 0 && charactersWithNames.length < characters.length) {
      toast({
        title: "Atenção",
        description: `${characters.length - charactersWithNames.length} personagem(ns) sem nome serão ignorados.`,
        variant: "default",
      });
    }

    // Prepare form data - filtrar apenas personagens com nome
    const validCharacters = characters.filter(char => char.name.trim());

    const formData: CollectionFormDataWithCharacters = {
      name: name.trim(),
      description: description.trim(),
      image_url: imageUrl.trim(),
      rotation_type: rotationType,
      tier_id: selectedTierId,
      is_active: isActive,
      characters: validCharacters,
    };

    // Validate with Zod
    try {
      collectionSchema.parse(formData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.issues.forEach((err) => {
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

        // Navigate to appropriate tab based on error
        if (fieldErrors.tier_id) {
          setActiveTab("settings");
        } else {
          setActiveTab("basic");
        }
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
    } catch (error: unknown) {
      toast({
        title: isEditing ? "Erro ao atualizar coleção" : "Erro ao criar coleção",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao processar a solicitação.",
        variant: "destructive",
      });
    }
  };

  // Get rotation type label
  const getRotationLabel = (type: string) => {
    switch (type) {
      case "fixed":
        return "Fixa";
      case "odd_months":
        return "Meses Ímpares";
      case "even_months":
        return "Meses Pares";
      default:
        return type;
    }
  };

  const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {isEditing ? "Editar Coleção" : "Nova Coleção"}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? `Editando: ${collection?.name}` : "Preencha os dados para criar uma nova coleção"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic" className="relative">
                <FileText className="h-4 w-4 mr-2" />
                Básico
                {isTabComplete("basic") && (
                  <CheckCircle2 className="h-3 w-3 ml-2 text-green-500" />
                )}
              </TabsTrigger>
              <TabsTrigger value="characters" className="relative">
                <Users className="h-4 w-4 mr-2" />
                Personagens
                {isTabComplete("characters") && (
                  <CheckCircle2 className="h-3 w-3 ml-2 text-green-500" />
                )}
                {validationWarnings.length > 0 && (
                  <AlertTriangle className="h-3 w-3 ml-2 text-yellow-500" />
                )}
              </TabsTrigger>
              <TabsTrigger value="preview">
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Settings className="h-4 w-4 mr-2" />
                Config
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4 px-1">
              {/* Tab: Básico */}
              <TabsContent value="basic" className="space-y-4 mt-0">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome da Coleção *</Label>
                    <Input
                      id="name"
                      placeholder="Ex: Heróis da Marvel"
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
                    <Label htmlFor="description">Descrição *</Label>
                    <Textarea
                      id="description"
                      placeholder="Descreva a coleção..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={isLoading}
                      rows={3}
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
                      bucket="models"
                      folder="collections"
                      onUploadComplete={setImageUrl}
                      maxSizeMB={5}
                      acceptedFormats={["image/png", "image/jpeg", "image/jpg", "image/webp"]}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="rotation-type">Tipo de Rotação *</Label>
                    <Select
                      value={rotationType}
                      onValueChange={(value: "fixed" | "odd_months" | "even_months") => setRotationType(value)}
                      disabled={isLoading}
                    >
                      <SelectTrigger id="rotation-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixa (Todos os meses)</SelectItem>
                        <SelectItem value="odd_months">Meses Ímpares (Jan, Mar, Mai, Jul, Set, Nov)</SelectItem>
                        <SelectItem value="even_months">Meses Pares (Fev, Abr, Jun, Ago, Out, Dez)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Define em quais meses a coleção estará disponível
                    </p>
                  </div>

                  {rotationType !== "fixed" && (
                    <div className="rounded-lg border border-border bg-muted/30 p-4">
                      <div className="grid grid-cols-6 gap-2">
                        {MONTHS.map((month, index) => {
                          const isActive =
                            rotationType === "odd_months"
                              ? (index + 1) % 2 === 1
                              : (index + 1) % 2 === 0;
                          return (
                            <div
                              key={month}
                              className={cn(
                                "flex items-center justify-center rounded-md p-2 text-center text-xs transition-colors",
                                isActive
                                  ? "bg-primary text-primary-foreground font-medium"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              {month}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Tab: Personagens */}
              <TabsContent value="characters" className="mt-0">
                {validationWarnings.length > 0 && (
                  <Alert className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Avisos</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc list-inside space-y-1">
                        {validationWarnings.map((warning, i) => (
                          <li key={i} className="text-sm">{warning}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                <CollectionCharactersManager
                  characters={characters}
                  onChange={setCharacters}
                  rotationType={rotationType}
                  disabled={isLoading}
                />
              </TabsContent>

              {/* Tab: Preview */}
              <TabsContent value="preview" className="mt-0">
                <div className="space-y-4">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Preview da Coleção</AlertTitle>
                    <AlertDescription>
                      Veja como a coleção aparecerá para os usuários
                    </AlertDescription>
                  </Alert>

                  <div className="rounded-lg border border-border p-6 space-y-4">
                    {imageUrl && (
                      <div className="aspect-video w-full overflow-hidden rounded-lg bg-muted">
                        <img
                          src={imageUrl}
                          alt={name || "Preview"}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <div>
                      <h3 className="text-2xl font-bold">{name || "Nome da Coleção"}</h3>
                      <Badge variant="outline" className="mt-2">
                        {getRotationLabel(rotationType)}
                      </Badge>
                    </div>

                    <p className="text-muted-foreground">
                      {description || "Descrição da coleção"}
                    </p>

                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">
                        R$ {pricingTiers.find(t => t.id === selectedTierId)?.price_full?.toFixed(2) || "0,00"}
                      </span>
                      <span className="text-sm text-muted-foreground">/mês</span>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-3">
                        Personagens ({characters.filter(c => c.name).length})
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {characters.filter(c => c.name).map((char) => (
                          <div key={char.id} className="rounded-lg border border-border p-3 space-y-2">
                            {char.imageUrl && (
                              <div className="aspect-square w-full overflow-hidden rounded-md bg-muted">
                                <img
                                  src={char.imageUrl}
                                  alt={char.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-sm">{char.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {MONTHS[char.releaseMonth - 1]}/{char.releaseYear}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Tab: Configurações */}
              <TabsContent value="settings" className="space-y-4 mt-0">
                {/* Pricing Tier Selection */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="tier-select">Nível de Preço *</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Selecione o nível de preço para esta coleção
                    </p>
                  </div>

                  <div className="grid gap-3">
                    {pricingTiers.map((tier) => (
                      <Card
                        key={tier.id}
                        className={cn(
                          "cursor-pointer transition-all hover:shadow-md",
                          selectedTierId === tier.id && "border-primary border-2 bg-primary/5"
                        )}
                        onClick={() => !isLoading && setSelectedTierId(tier.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold">{tier.name}</h4>
                                {tier.is_default && (
                                  <Badge variant="secondary" className="text-xs">Padrão</Badge>
                                )}
                                {selectedTierId === tier.id && (
                                  <CheckCircle2 className="h-4 w-4 text-primary" />
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-3">
                                {tier.description}
                              </p>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Preço Cheio:</span>
                                  <span className="ml-2 font-medium">R$ {tier.price_full?.toFixed(2)}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Entrada:</span>
                                  <span className="ml-2 font-medium">R$ {tier.deposit_amount?.toFixed(2)}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Preço PIX:</span>
                                  <span className="ml-2 font-medium text-green-600">
                                    R$ {tier.price_pix?.toFixed(2)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Desconto:</span>
                                  <span className="ml-2 font-medium">{tier.pix_discount_percentage}%</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {pricingTiers.length === 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Nenhum nível de preço disponível</AlertTitle>
                      <AlertDescription>
                        Configure os níveis de preço no painel administrativo antes de criar coleções.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                <Separator />

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

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Nota</AlertTitle>
                  <AlertDescription>
                    Coleções inativas não aparecerão para os assinantes, mas os dados serão preservados no sistema.
                  </AlertDescription>
                </Alert>

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
              </TabsContent>
            </div>
          </Tabs>

          <DialogFooter className="mt-4">
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
