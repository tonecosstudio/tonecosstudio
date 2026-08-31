/**
 * Collection Detail Modal Component
 * 
 * Displays detailed information about a collection including:
 * - Large image
 * - Full description
 * - Character revelation status
 * - Rotation schedule
 * - "Select This Collection" button
 * 
 * Requirements: 28.3, 28.4, 28.5
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Eye, EyeOff, Sparkles } from "lucide-react";
import { ASSETS } from "@/config/constants";

type RotationType = 'fixed' | 'odd_months' | 'even_months';

interface CollectionDetail {
  id: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  rotation_type?: RotationType | string | null;
  revealed?: boolean | null;
  character_name?: string | null;
  character_image_url?: string | null;
  price_full?: number | null;
}

interface CollectionDetailModalProps {
  collection?: CollectionDetail | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (collectionId: string) => void;
  isSelected?: boolean;
  isDisabled?: boolean;
}

/**
 * Get rotation schedule display text
 */
function getRotationSchedule(rotationType: string): string {
  if (rotationType === 'fixed') {
    return 'Disponível todos os meses';
  } else if (rotationType === 'odd_months') {
    return 'Disponível: Jan, Mar, Mai, Jul, Set, Nov';
  } else if (rotationType === 'even_months') {
    return 'Disponível: Fev, Abr, Jun, Ago, Out, Dez';
  }
  return 'Disponível todos os meses';
}

export function CollectionDetailModal({
  collection,
  isOpen,
  onOpenChange,
  onSelect,
  isSelected = false,
  isDisabled = false,
}: CollectionDetailModalProps) {
  if (!collection) return null;

  const rotationSchedule = getRotationSchedule(collection.rotation_type || 'fixed');
  const isRevealed = collection.revealed || false;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{collection.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Large Image */}
          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
            <img
              src={collection.image_url || ASSETS.FALLBACK_IMAGE_URL}
              alt={collection.name}
              className="w-full h-full object-cover"
            />
            
            {/* Revelation Status Badge */}
            <div className="absolute top-4 right-4">
              {isRevealed ? (
                <Badge className="bg-green-500 text-white">
                  <Eye className="w-3 h-3 mr-1" />
                  Personagem Revelado
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <EyeOff className="w-3 h-3 mr-1" />
                  Personagem Mistério
                </Badge>
              )}
            </div>
          </div>

          {/* Character Information (if revealed) */}
          {isRevealed && collection.character_name && (
            <div className="p-4 rounded-lg border bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h3 className="font-semibold text-lg">Personagem Revelado</h3>
              </div>
              <p className="text-lg font-medium text-purple-900 dark:text-purple-100">
                {collection.character_name}
              </p>
              {collection.character_image_url && (
                <div className="mt-3 rounded-lg overflow-hidden">
                  <img
                    src={collection.character_image_url}
                    alt={collection.character_name}
                    className="w-full h-48 object-cover"
                  />
                </div>
              )}
            </div>
          )}

          {/* Full Description */}
          <div>
            <h3 className="font-semibold mb-2">Descrição</h3>
            <p className="text-muted-foreground leading-relaxed">
              {collection.description || 'Sem descrição disponível.'}
            </p>
          </div>

          {/* Rotation Schedule */}
          <div className="p-4 rounded-lg border bg-muted/50">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Disponibilidade</h3>
            </div>
            <p className="text-sm text-muted-foreground">{rotationSchedule}</p>
          </div>

          {/* Price (if applicable) */}
          {collection.price_full && (
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <span className="font-medium">Preço</span>
              <span className="text-2xl font-bold">
                R$ {collection.price_full.toFixed(2)}
              </span>
            </div>
          )}

          {/* Select Button */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Fechar
            </Button>
            <Button
              onClick={() => {
                onSelect(collection.id);
                onOpenChange(false);
              }}
              disabled={isDisabled || isSelected}
              className="flex-1"
            >
              {isSelected ? 'Coleção Selecionada' : 'Selecionar Esta Coleção'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
