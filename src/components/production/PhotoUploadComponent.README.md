# PhotoUploadComponent

A reusable component for uploading photos to production stages with drag-and-drop support, image compression, and Supabase Storage integration.

## Features

- ✅ **Drag-and-drop file upload** - Intuitive drag-and-drop interface
- ✅ **Image preview before upload** - See images before they're uploaded
- ✅ **Automatic image compression** - Reduces file size before upload using browser-image-compression
- ✅ **Upload to Supabase Storage** - Stores images in Supabase Storage buckets
- ✅ **Multiple file support** - Upload multiple images at once
- ✅ **File validation** - Validates file type and size
- ✅ **Error handling** - Graceful error handling with retry functionality
- ✅ **Progress indication** - Shows upload progress for each image
- ✅ **Remove functionality** - Remove uploaded images
- ✅ **Max photos limit** - Configurable maximum number of photos

## Usage

### Basic Usage

```tsx
import { PhotoUploadComponent } from "@/components/production/PhotoUploadComponent";

function MyComponent() {
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  return (
    <PhotoUploadComponent
      onPhotosChange={setPhotoUrls}
      maxPhotos={5}
    />
  );
}
```

### With Existing Photos

```tsx
<PhotoUploadComponent
  currentPhotos={[
    "https://example.com/photo1.jpg",
    "https://example.com/photo2.jpg"
  ]}
  onPhotosChange={handlePhotosChange}
  maxPhotos={5}
/>
```

### Custom Configuration

```tsx
<PhotoUploadComponent
  onPhotosChange={handlePhotosChange}
  maxPhotos={10}
  bucket="custom-bucket"
  folder="custom-folder"
  label="Upload Product Images"
  showHelpText={true}
  disabled={false}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onPhotosChange` | `(urls: string[]) => void` | **Required** | Callback when photos are uploaded or removed |
| `maxPhotos` | `number` | `5` | Maximum number of photos allowed |
| `currentPhotos` | `string[]` | `[]` | Array of existing photo URLs |
| `bucket` | `string` | `"production-photos"` | Supabase Storage bucket name |
| `folder` | `string` | `"stages"` | Storage folder path |
| `disabled` | `boolean` | `false` | Whether the component is disabled |
| `className` | `string` | `undefined` | Optional CSS class name |
| `label` | `string` | `"Fotos"` | Label text |
| `showHelpText` | `boolean` | `true` | Show help text below upload area |

## File Validation

The component validates files before upload:

- **Allowed types**: JPEG, JPG, PNG, WEBP
- **Max file size**: 5MB (before compression)
- **Compression**: Images are compressed to max 1MB with max dimension of 1920px

## Image Compression

Images are automatically compressed before upload using `browser-image-compression`:

```typescript
{
  maxSizeMB: 1,              // Compress to max 1MB
  maxWidthOrHeight: 1920,    // Max dimension
  useWebWorker: true,        // Use web worker for better performance
  fileType: "image/jpeg"     // Output format
}
```

## Storage Structure

Photos are stored in Supabase Storage with the following structure:

```
bucket: production-photos
  └── folder: stages (or custom folder)
      └── {timestamp}-{randomId}.{extension}
```

Example: `stages/1704067200000-abc123def.jpg`

## Error Handling

The component handles various error scenarios:

1. **Invalid file type** - Shows error toast
2. **File too large** - Shows error toast
3. **Upload failure** - Shows error overlay with retry button
4. **Compression failure** - Falls back to original file
5. **Max photos exceeded** - Shows error toast

## Events

### onPhotosChange

Called whenever photos are added or removed. Receives an array of photo URLs:

```typescript
onPhotosChange(urls: string[]) => void
```

Example:
```typescript
const handlePhotosChange = (urls: string[]) => {
  console.log("Current photos:", urls);
  // Update your state or form
};
```

## Styling

The component uses Tailwind CSS and shadcn/ui components. It's fully responsive and supports dark mode.

### Custom Styling

You can customize the appearance using the `className` prop:

```tsx
<PhotoUploadComponent
  onPhotosChange={handlePhotosChange}
  className="my-custom-class"
/>
```

## Accessibility

- Proper ARIA labels for screen readers
- Keyboard navigation support
- Focus management
- Alt text for images

## Integration with StageTransitionModal

The component is designed to work seamlessly with the StageTransitionModal:

```tsx
import { PhotoUploadComponent } from "@/components/production/PhotoUploadComponent";
import { StageTransitionModal } from "@/components/production/StageTransitionModal";

function ProductionStage() {
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  return (
    <StageTransitionModal
      // ... other props
      onComplete={(stage) => {
        // Photos are already uploaded and URLs are in photoUrls
        completeStage(stage.id, notes, photoUrls);
      }}
    >
      <PhotoUploadComponent
        onPhotosChange={setPhotoUrls}
        maxPhotos={5}
      />
    </StageTransitionModal>
  );
}
```

## Performance Considerations

- **Web Workers**: Image compression uses web workers to avoid blocking the main thread
- **Lazy Loading**: Preview images are loaded on-demand
- **Memory Management**: Preview URLs are properly revoked to prevent memory leaks
- **Batch Uploads**: Multiple files can be uploaded simultaneously

## Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile browsers: ✅ Full support

## Testing

The component includes comprehensive tests covering:

- File validation
- Drag-and-drop functionality
- Image compression
- Upload to Supabase Storage
- Preview generation
- Error handling
- Remove functionality
- Max photos limit

Run tests:
```bash
npm test PhotoUploadComponent.test.tsx
```

## Dependencies

- `react` - React framework
- `browser-image-compression` - Image compression library
- `@supabase/supabase-js` - Supabase client
- `lucide-react` - Icons
- `@/components/ui/*` - shadcn/ui components

## Related Components

- `StageTransitionModal` - Modal for transitioning between production stages
- `ImageUpload` - Generic image upload component
- `PaymentVoucherUpload` - Payment voucher upload component

## Task Reference

This component implements task **4.4.1 Create PhotoUploadComponent** from the Production Management System spec.

## License

Part of the Production Management System - Internal use only.
