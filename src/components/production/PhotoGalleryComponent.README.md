# PhotoGalleryComponent

## Overview

The `PhotoGalleryComponent` displays uploaded photos in a responsive grid layout with lightbox functionality for viewing full-size images. It provides navigation between photos, download capability, and admin-only delete functionality.

## Features

- **Responsive Grid Layout**: Displays photos in a configurable grid (2/3/4 columns)
- **Lightbox View**: Click any photo to view full-size in a modal
- **Navigation**: Navigate between photos using arrow buttons or keyboard (←/→)
- **Photo Metadata**: Shows upload date and uploader name
- **Download**: Download photos to local device
- **Delete (Admin Only)**: Remove photos from storage and gallery
- **Keyboard Support**: Use arrow keys to navigate, Escape to close

## Usage

### Basic Usage

```tsx
import { PhotoGalleryComponent } from "@/components/production/PhotoGalleryComponent";

function MyComponent() {
  const photos = [
    {
      url: "https://example.com/photo1.jpg",
      uploadedAt: "2024-01-15T10:30:00Z",
      uploaderName: "João Silva",
    },
    {
      url: "https://example.com/photo2.jpg",
      uploadedAt: "2024-01-15T11:00:00Z",
      uploaderName: "Maria Santos",
      caption: "Produto finalizado",
    },
  ];

  return <PhotoGalleryComponent photos={photos} />;
}
```

### With Delete Functionality (Admin)

```tsx
import { PhotoGalleryComponent } from "@/components/production/PhotoGalleryComponent";

function AdminComponent() {
  const [photos, setPhotos] = useState([...]);

  const handlePhotoDelete = (photoUrl: string) => {
    // Update state to remove the deleted photo
    setPhotos((prev) => prev.filter((p) => p.url !== photoUrl));
    
    // Optionally update database
    // await updateStagePhotos(stageId, photos.filter(p => p.url !== photoUrl));
  };

  return (
    <PhotoGalleryComponent
      photos={photos}
      canDelete={true}
      onPhotoDelete={handlePhotoDelete}
    />
  );
}
```

### Custom Grid Layout

```tsx
<PhotoGalleryComponent
  photos={photos}
  columns={{
    mobile: 1,    // 1 column on mobile
    tablet: 2,    // 2 columns on tablet
    desktop: 3,   // 3 columns on desktop
  }}
/>
```

### Without Metadata

```tsx
<PhotoGalleryComponent
  photos={photos}
  showMetadata={false}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `photos` | `PhotoItem[]` | **Required** | Array of photo items to display |
| `canDelete` | `boolean` | `false` | Whether the current user can delete photos (admin only) |
| `onPhotoDelete` | `(photoUrl: string) => void` | `undefined` | Callback when a photo is deleted |
| `className` | `string` | `undefined` | Optional CSS class name for the container |
| `columns` | `object` | `{ mobile: 2, tablet: 3, desktop: 4 }` | Number of columns in grid for each breakpoint |
| `showMetadata` | `boolean` | `true` | Show photo metadata (date, uploader) |

### PhotoItem Type

```typescript
interface PhotoItem {
  /** Photo URL (required) */
  url: string;
  /** Upload timestamp (ISO 8601 format) */
  uploadedAt?: string;
  /** Uploader name */
  uploaderName?: string;
  /** Uploader ID */
  uploaderId?: string;
  /** Optional caption */
  caption?: string;
}
```

## Integration with Production Stages

### Example: Display Stage Photos

```tsx
import { PhotoGalleryComponent } from "@/components/production/PhotoGalleryComponent";
import { getStageHistory } from "@/services/admin/production/stage-service";

function StagePhotosView({ productionQueueId }: { productionQueueId: string }) {
  const [stages, setStages] = useState([]);

  useEffect(() => {
    async function loadStages() {
      const stageHistory = await getStageHistory(productionQueueId);
      setStages(stageHistory);
    }
    loadStages();
  }, [productionQueueId]);

  return (
    <div>
      {stages.map((stage) => (
        <div key={stage.id}>
          <h3>{stage.stageName}</h3>
          <PhotoGalleryComponent
            photos={stage.photos.map((url) => ({
              url,
              uploadedAt: stage.completedAt,
              uploaderName: stage.assignedToName,
            }))}
            canDelete={true}
            onPhotoDelete={(photoUrl) => {
              // Update stage photos in database
              const updatedPhotos = stage.photos.filter((p) => p !== photoUrl);
              // Call API to update stage
            }}
          />
        </div>
      ))}
    </div>
  );
}
```

## Lightbox Features

### Keyboard Navigation

- **Arrow Left (←)**: Previous photo
- **Arrow Right (→)**: Next photo
- **Escape**: Close lightbox

### Mouse Navigation

- **Click photo**: Open lightbox
- **Click arrows**: Navigate between photos
- **Click X or outside**: Close lightbox

### Actions in Lightbox

- **Download**: Downloads the current photo to the user's device
- **Delete** (Admin only): Removes the photo from storage and gallery with confirmation

## Styling

The component uses Tailwind CSS classes and follows the existing design system. The lightbox has a dark background (`bg-black/95`) for better photo visibility.

### Grid Hover Effects

- Photos scale slightly on hover (`scale-105`)
- Dark overlay appears with "Ver Imagem" text
- Metadata slides up from bottom

### Lightbox Styling

- Full-screen modal with dark background
- Photos are centered and scaled to fit viewport
- Navigation buttons have semi-transparent backgrounds
- Bottom bar shows photo info and actions

## Accessibility

- **Keyboard Navigation**: Full keyboard support for navigation
- **ARIA Labels**: Buttons have descriptive aria-labels
- **Alt Text**: Images use captions or fallback alt text
- **Focus Management**: Proper focus handling in lightbox

## Performance Considerations

- **Lazy Loading**: Images use `loading="lazy"` attribute
- **Optimized Images**: Works with compressed images from PhotoUploadComponent
- **Efficient Rendering**: Only renders visible photos in grid

## Error Handling

- **Delete Errors**: Shows toast notification if deletion fails
- **Download Errors**: Shows toast notification if download fails
- **Missing Photos**: Shows "Nenhuma foto disponível" message

## Dependencies

- `@/components/ui/button`: Button component
- `@/components/ui/dialog`: Dialog/Modal component
- `@/components/ui/use-toast`: Toast notifications
- `lucide-react`: Icons
- `date-fns`: Date formatting
- `@/integrations/supabase/client`: Supabase client for storage operations

## Related Components

- **PhotoUploadComponent**: For uploading photos to stages
- **StageHistoryPanel**: Displays stage history with photos
- **ProductionStageTracker**: Shows production stages

## Notes

- Photos are stored in Supabase Storage under the `production-photos` bucket
- Delete functionality requires admin permissions
- The component automatically handles photo deletion from storage
- Lightbox closes automatically if the last photo is deleted
