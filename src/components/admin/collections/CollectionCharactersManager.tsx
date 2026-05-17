/**
 * CollectionCharactersManager Component
 *
 * Gerencia os personagens de uma coleção com cards compactos e dinâmicos
 * Clique no card para editar, organização automática por mês
 */

import React, { useMemo, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Users, RotateCw, Edit2, Calendar, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import ImageUpload from "../shared/ImageUpload";

export interface CharacterData {
  id: string;
  name: string;
  description: string;
  releaseMonth: number; // 1-12
  releaseYear: number;
  imageUrl: string;
  releaseOrder: number;
}

interface CollectionCharactersManagerProps {
  characters: CharacterData[];
  onChange: (characters: CharacterData[]) => void;
  rotationType: 'fixed' | 'odd_months' | 'even_months';
  disabled?: boolean;
}

type ToastInvoker = (params: { title: string; description: string }) => void;

const MONTHS = [
  { value: 1, label: "Janeiro", short: "Jan" },
  { value: 2, label: "Fevereiro", short: "Fev" },
  { value: 3, label: "Março", short: "Mar" },
  { value: 4, label: "Abril", short: "Abr" },
  { value: 5, label: "Maio", short: "Mai" },
  { value: 6, label: "Junho", short: "Jun" },
  { value: 7, label: "Julho", short: "Jul" },
  { value: 8, label: "Agosto", short: "Ago" },
  { value: 9, label: "Setembro", short: "Set" },
  { value: 10, label: "Outubro", short: "Out" },
  { value: 11, label: "Novembro", short: "Nov" },
  { value: 12, label: "Dezembro", short: "Dez" },
];

const YEARS = [2026, 2027, 2028, 2029, 2030];

export function CollectionCharactersManager({
  characters,
  onChange,
  rotationType,
  disabled = false,
}: CollectionCharactersManagerProps) {
  const [editingCharacter, setEditingCharacter] = useState<CharacterData | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Adiciona um novo personagem
  const addCharacter = () => {
    const newCharacter: CharacterData = {
      id: `temp-${Date.now()}`,
      name: "",
      description: "",
      releaseMonth: 1,
      releaseYear: 2026,
      imageUrl: "",
      releaseOrder: characters.length + 1,
    };

    const newCharacters = [...characters, newCharacter];
    onChange(newCharacters);

    // Abre o modal de edição automaticamente
    setEditingCharacter(newCharacter);
    setIsEditDialogOpen(true);
  };

  // Abre o modal de edição
  const handleEditCharacter = (character: CharacterData) => {
    setEditingCharacter({ ...character });
    setIsEditDialogOpen(true);
  };

  // Salva as alterações do personagem
  const handleSaveCharacter = () => {
    if (!editingCharacter) return;

    const newCharacters = characters.map(char =>
      char.id === editingCharacter.id ? editingCharacter : char
    );

    // Reordena automaticamente por data
    const sorted = sortCharactersByDate(newCharacters);
    onChange(sorted);
    setIsEditDialogOpen(false);
    setEditingCharacter(null);

    // Mostra toast de sucesso
    if (typeof window !== 'undefined') {
      const toast = (window as Window & { toast?: ToastInvoker }).toast;
      if (toast) {
        toast({
          title: "Personagem atualizado",
          description: "Personagens reordenados automaticamente por data",
        });
      }
    }
  };

  // Remove um personagem
  const handleRemoveCharacter = (id: string) => {
    const newCharacters = characters.filter(char => char.id !== id);
    // Reordena
    const reordered = newCharacters.map((char, i) => ({
      ...char,
      releaseOrder: i + 1,
    }));
    onChange(reordered);
  };

  // Adiciona um novo personagem

  // Ordena personagens por data
  const sortCharactersByDate = useCallback((chars: CharacterData[]) => {
    return chars.sort((a, b) => {
      const dateA = a.releaseYear * 100 + a.releaseMonth;
      const dateB = b.releaseYear * 100 + b.releaseMonth;
      return dateA - dateB;
    }).map((char, index) => ({
      ...char,
      releaseOrder: index + 1,
    }));
  }, []);

  // Sugere distribuição automática de meses
  const suggestMonthDistribution = () => {
    const availableMonths = getAvailableMonths();
    const newCharacters = [...characters];

    // Distribui os personagens uniformemente pelos meses disponíveis
    newCharacters.forEach((char, index) => {
      const monthIndex = index % availableMonths.length;
      const selectedMonth = availableMonths[monthIndex];
      char.releaseMonth = selectedMonth.value;

      // Calcula o ano baseado no ciclo
      const yearOffset = Math.floor(index / availableMonths.length);
      char.releaseYear = 2026 + yearOffset;
    });

    // Ordena automaticamente
    const sorted = sortCharactersByDate(newCharacters);
    onChange(sorted);

    // Mostra toast de sucesso
    if (typeof window !== 'undefined') {
      const toast = (window as Window & { toast?: ToastInvoker }).toast;
      if (toast) {
        toast({
          title: "Distribuição aplicada",
          description: `${characters.length} personagens distribuídos e ordenados`,
        });
      }
    }
  };

  // Filtra meses disponíveis baseado no tipo de rotação
  const getAvailableMonths = () => {
    if (rotationType === 'fixed') {
      return MONTHS;
    } else if (rotationType === 'odd_months') {
      return MONTHS.filter(m => m.value % 2 === 1);
    } else {
      return MONTHS.filter(m => m.value % 2 === 0);
    }
  };

  const availableMonths = getAvailableMonths();
  const characterDateSignature = useMemo(
    () => characters.map((c) => `${c.id}-${c.releaseYear}-${c.releaseMonth}`).join(','),
    [characters]
  );

  // Ordena personagens automaticamente quando mudam as datas
  useEffect(() => {
    // Só reordena se houver personagens com datas definidas
    const hasValidDates = characters.some(c => c.releaseMonth && c.releaseYear);
    if (!hasValidDates) return;

    const sorted = sortCharactersByDate([...characters]);
    const needsReorder = JSON.stringify(sorted) !== JSON.stringify(characters);

    if (needsReorder) {
      onChange(sorted);
    }
  }, [characterDateSignature, characters, onChange, sortCharactersByDate]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Personagens da Coleção</h3>
        <Badge variant="secondary" className="ml-auto">
          {characters.length} {characters.length === 1 ? 'personagem' : 'personagens'}
        </Badge>
      </div>

      {/* Botão para adicionar primeiro personagem ou mais personagens */}
      {characters.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h4 className="text-lg font-medium mb-2">Nenhum personagem adicionado</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Adicione personagens à coleção. Você pode fazer isso agora ou depois.
          </p>
          <Button
            type="button"
            onClick={addCharacter}
            disabled={disabled}
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Primeiro Personagem
          </Button>
        </div>
      ) : (
        <>
          {/* Controles quando já tem personagens */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={addCharacter}
              disabled={disabled || characters.length >= 12}
              className="flex-1"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Personagem
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={suggestMonthDistribution}
              disabled={disabled || characters.length === 0}
              title="Distribuir personagens automaticamente pelos meses disponíveis"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            📅 Os personagens são ordenados automaticamente por data de lançamento. Clique nos cards para editar.
          </p>

          <Separator />

          {/* Grid de Cards Compactos - só mostra se tiver personagens */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {characters.map((character) => (
          <Card
            key={character.id}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md hover:scale-105",
              !character.name && "border-dashed border-2 opacity-60"
            )}
            onClick={() => !disabled && handleEditCharacter(character)}
          >
            <CardContent className="p-3 space-y-2">
              {/* Imagem ou Placeholder */}
              <div className="aspect-square w-full overflow-hidden rounded-md bg-muted relative">
                {character.imageUrl ? (
                  <img
                    src={character.imageUrl}
                    alt={character.name || `Personagem ${character.releaseOrder}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground opacity-30" />
                  </div>
                )}
                {/* Badge de Ordem - destaque maior */}
                <Badge
                  variant="default"
                  className="absolute top-2 left-2 text-sm font-bold px-2 py-1 bg-primary"
                >
                  #{character.releaseOrder}
                </Badge>
              </div>

              {/* Nome */}
              <div className="min-h-[2.5rem]">
                <p className="font-medium text-sm line-clamp-2">
                  {character.name || `Personagem ${character.releaseOrder}`}
                </p>
              </div>

              {/* Data */}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>
                  {MONTHS.find(m => m.value === character.releaseMonth)?.short}/{character.releaseYear}
                </span>
              </div>

              {/* Botão de Editar (visível no hover) */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditCharacter(character);
                }}
              >
                <Edit2 className="h-3 w-3 mr-1" />
                Editar
              </Button>
            </CardContent>
          </Card>
        ))}

        {/* Card para Adicionar - só mostra se já tiver personagens e não chegou no limite */}
        {characters.length > 0 && characters.length < 12 && (
          <Card
            className="cursor-pointer border-dashed border-2 hover:border-primary transition-colors"
            onClick={() => !disabled && addCharacter()}
          >
            <CardContent className="p-3 h-full flex flex-col items-center justify-center min-h-[200px]">
              <Plus className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground text-center">
                Adicionar Personagem
              </p>
            </CardContent>
          </Card>
        )}
          </div>
        </>
      )}

      {rotationType !== 'fixed' && (
        <div className="rounded-md bg-blue-50 p-3 border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>📅 Ordenação Automática:</strong> Os personagens são organizados automaticamente do mais antigo para o mais recente. Ao definir ou alterar uma data, a ordem é atualizada instantaneamente.
          </p>
        </div>
      )}

      {/* Dialog de Edição */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Editar Personagem #{editingCharacter?.releaseOrder}
            </DialogTitle>
            <DialogDescription>
              Configure os detalhes do personagem
            </DialogDescription>
          </DialogHeader>

          {editingCharacter && (
            <div className="space-y-4">
              {/* Nome */}
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome do Personagem *</Label>
                <Input
                  id="edit-name"
                  placeholder="Ex: Homem-Aranha"
                  value={editingCharacter.name}
                  onChange={(e) =>
                    setEditingCharacter({ ...editingCharacter, name: e.target.value })
                  }
                />
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <Label htmlFor="edit-desc">Descrição (opcional)</Label>
                <Textarea
                  id="edit-desc"
                  placeholder="Breve descrição do personagem"
                  value={editingCharacter.description}
                  onChange={(e) =>
                    setEditingCharacter({ ...editingCharacter, description: e.target.value })
                  }
                  rows={2}
                />
              </div>

              {/* Mês e Ano */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-month">Mês de Lançamento *</Label>
                  <Select
                    value={editingCharacter.releaseMonth.toString()}
                    onValueChange={(value) =>
                      setEditingCharacter({ ...editingCharacter, releaseMonth: parseInt(value) })
                    }
                  >
                    <SelectTrigger id="edit-month">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMonths.map((month) => (
                        <SelectItem key={month.value} value={month.value.toString()}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-year">Ano *</Label>
                  <Select
                    value={editingCharacter.releaseYear.toString()}
                    onValueChange={(value) =>
                      setEditingCharacter({ ...editingCharacter, releaseYear: parseInt(value) })
                    }
                  >
                    <SelectTrigger id="edit-year">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {YEARS.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Imagem */}
              <div className="space-y-2">
                <ImageUpload
                  label="Imagem do Personagem"
                  description="Imagem do personagem (PNG, JPG, WEBP - máx. 5MB)"
                  currentImageUrl={editingCharacter.imageUrl}
                  bucket="images"
                  folder="characters"
                  onUploadComplete={(url) =>
                    setEditingCharacter({ ...editingCharacter, imageUrl: url })
                  }
                  maxSizeMB={5}
                  acceptedFormats={["image/png", "image/jpeg", "image/jpg", "image/webp"]}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {editingCharacter && characters.length > 1 && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  handleRemoveCharacter(editingCharacter.id);
                  setIsEditDialogOpen(false);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remover
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={handleSaveCharacter}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
