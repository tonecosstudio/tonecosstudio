/**
 * PhotoGalleryComponent
 *
 * Displays uploaded photos in a gallery format with lightbox functionality:
 * - Display photos in grid
 * - Click to view full-size
 * - Add lightbox for navigation
 * - Add delete button (admin only)
 * - Show upload date and uploader
 *
 * Task: 4.4.2 Create PhotoGalleryComponent
 */

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, ChevronLeft, ChevronRight, Trash2, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// Types
// ============================================================================

export interface PhotoItem {
  /** Photo URL */
  url: string;
  /** Upload timestamp */
  uploadedAt?: string;
  /** Uploader name */
  uploaderName?: string;
  /** Uploader ID */
  uploaderId?: string;
  /** Optional caption */
  caption?: string;
  /** Whether customers can see this photo */
  customerVisible?: boolean;
}

export interface PhotoGalleryComponentProps {
  /** Array of photo items to display */
  photos: PhotoItem[];
  /** Whether the current user can delete photos (admin only) */
  canDelete?: boolean;
  /** Callback when a photo is deleted */
  onPhotoDelete?: (photoUrl: string) => void;
  /** Optional CSS class name */
  className?: string;
  /** Number of columns in grid (responsive) */
  columns?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  /** Show photo metadata (date, uploader) */
  showMetadata?: boolean;
  /** Whether the current user is an admin (shows all photos) */
  isAdmin?: boolean;
  /** Filter to show only customer-visible photos (for customer view) */
  customerViewOnly?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export const PhotoGalleryComponent: React.FC<PhotoGalleryComponentProps> = ({
  photos,
  canDelete = false,
  onPhotoDelete,
  className,
  columns = { mobile: 2, tablet: 3, desktop: 4 },
  showMetadata = true,
  isAdmin = false,
  customerViewOnly = false,
}) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter photos based on permissions
  const filteredPhotos = React.useMemo(() => {
    if (isAdmin) {
      // Admins see all photos
      return photos;
    } else if (customerViewOnly) {
      // Customers see only customer-visible photos
      return photos.filter((photo) => photo.customerVisible === true);
    }
    // Default: show all photos (for backward compatibility)
    return photos;
  }, [photos, isAdmin, customerViewOnly]);

  // ============================================================================
  // Lightbox Handlers
  // ============================================================================

  const openLightbox = (index: number) => {
    setCurrentPhotoIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const goToPrevious = () => {
    setCurrentPhotoIndex((prev) => (prev > 0 ? prev - 1 : filteredPhotos.length - 1));
  };

  const goToNext = () => {
    setCurrentPhotoIndex((prev) => (prev < filteredPhotos.length - 1 ? prev + 1 : 0));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      goToPrevious();
    } else if (e.key === "ArrowRight") {
      goToNext();
    } else if (e.key === "Escape") {
      closeLightbox();
    }
  };

  // ============================================================================
  // Delete Handler
  // ============================================================================

  const handleDelete = async (photoUrl: string) => {
    if (!canDelete || !onPhotoDelete) return;

    const confirmed = window.confirm("Tem certeza que deseja excluir esta foto?");
    if (!confirmed) return;

    setIsDeleting(true);

    try {
      // Extract file path from URL
      const url = new URL(photoUrl);
      const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
      
      if (pathMatch) {
        const filePath = pathMatch[1];
        const bucket = "production-photos"; // Default bucket

        // Delete from Supabase Storage
        const { error: deleteError } = await supabase.storage
          .from(bucket)
          .remove([filePath]);

        if (deleteError) {
          throw new Error(`Erro ao excluir do storage: ${deleteError.message}`);
        }
      }

      // Call parent callback to update state
      onPhotoDelete(photoUrl);

      toast({
        title: "Foto Excluída",
        description: "A foto foi removida com sucesso.",
      });

      // Close lightbox if we deleted the current photo
      if (lightboxOpen && filteredPhotos[currentPhotoIndex]?.url === photoUrl) {
        if (filteredPhotos.length === 1) {
          closeLightbox();
        } else {
          // Move to next photo or previous if we're at the end
          setCurrentPhotoIndex((prev) => (prev >= filteredPhotos.length - 1 ? prev - 1 : prev));
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      toast({
        title: "Erro ao Excluir",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // ============================================================================
  // Download Handler
  // ============================================================================

  const handleDownload = async (photoUrl: string) => {
    try {
      const response = await fetch(photoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `photo-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Download Iniciado",
        description: "A foto está sendo baixada.",
      });
    } catch (error) {
      toast({
        title: "Erro no Download",
        description: "Não foi possível baixar a foto.",
        variant: "destructive",
      });
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  if (filteredPhotos.length === 0) {
    return (
      <div className={cn("text-center py-8 text-muted-foreground", className)}>
        <p>Nenhuma foto disponível</p>
      </div>
    );
  }

  const currentPhoto = filteredPhotos[currentPhotoIndex];

  const gridColsClass = cn(
    `grid gap-3`,
    `grid-cols-${columns.mobile || 2}`,
    `sm:grid-cols-${columns.tablet || 3}`,
    `md:grid-cols-${columns.desktop || 4}`
  );

  return (
    <>
      {/* Photo Grid */}
      <div className={cn(gridColsClass, className)}>
        {filteredPhotos.map((photo, index) => (
          <div
            key={`${photo.url}-${index}`}
            className="relative aspect-square rounded-lg overflow-hidden border bg-muted group cursor-pointer"
            onClick={() => openLightbox(index)}
          >
            {/* Image */}
            <img
              src={photo.url}
              alt={photo.caption || `Foto ${index + 1}`}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />

            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm font-medium">
                Ver Imagem
              </div>
            </div>

            {/* Metadata Overlay */}
            {showMetadata && (photo.uploadedAt || photo.uploaderName) && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {photo.uploaderName && (
                  <p className="text-xs text-white truncate">{photo.uploaderName}</p>
                )}
                {photo.uploadedAt && (() => {
                  try {
                    return (
                      <p className="text-xs text-white/80">
                        {format(new Date(photo.uploadedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                    );
                  } catch {
                    return null;
                  }
                })()}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox Dialog */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent
          className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none"
          onKeyDown={handleKeyDown}
        >
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Close Button */}
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Previous Button */}
            {filteredPhotos.length > 1 && (
              <button
                onClick={goToPrevious}
                className="absolute left-4 z-50 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                aria-label="Foto anterior"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}

            {/* Next Button */}
            {filteredPhotos.length > 1 && (
              <button
                onClick={goToNext}
                className="absolute right-4 z-50 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                aria-label="Próxima foto"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}

            {/* Image */}
            <div className="w-full h-[80vh] flex items-center justify-center p-4">
              <img
                src={currentPhoto.url}
                alt={currentPhoto.caption || `Foto ${currentPhotoIndex + 1}`}
                className="max-w-full max-h-full object-contain"
              />
            </div>

            {/* Bottom Bar with Actions and Info */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
              <div className="flex items-center justify-between text-white">
                {/* Photo Info */}
                <div className="flex-1">
                  {currentPhoto.caption && (
                    <p className="text-sm font-medium mb-1">{currentPhoto.caption}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-white/80">
                    {currentPhoto.uploaderName && <span>{currentPhoto.uploaderName}</span>}
                    {currentPhoto.uploadedAt && (() => {
                      try {
                        return (
                          <span>
                            {format(new Date(currentPhoto.uploadedAt), "dd/MM/yyyy 'às' HH:mm", {
                              locale: ptBR,
                            })}
                          </span>
                        );
                      } catch {
                        return null;
                      }
                    })()}
                    <span>
                      {currentPhotoIndex + 1} / {filteredPhotos.length}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  {/* Download Button */}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDownload(currentPhoto.url)}
                    className="text-white hover:bg-white/20"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Baixar
                  </Button>

                  {/* Delete Button (Admin Only) */}
                  {canDelete && onPhotoDelete && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(currentPhoto.url)}
                      disabled={isDeleting}
                      className="text-destructive hover:bg-destructive/20"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {isDeleting ? "Excluindo..." : "Excluir"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PhotoGalleryComponent;
