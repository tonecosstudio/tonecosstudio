# Photo Permissions System

## Overview

The photo permissions system controls which photos customers can see versus admin-only photos. This is implemented through a `customer_visible` flag on each photo, with database-level RLS policies and component-level filtering.

## Task: 4.4.3 Implement photo permissions

### Requirements (from requirements.md 2.3.3)
- Photos are stored securely and accessible only to admins
- Customers can see selected photos (e.g., final product photo)
- Photos marked with "customer_visible" flag

### Implementation Components

#### 1. Database Layer (`supabase/migrations/20260429000007_add_production_photo_metadata.sql`)

**Table: `production_photo_metadata`**
- Stores metadata for each photo including `customer_visible` boolean flag
- Links photos to production stages via `production_stage_id`
- Tracks uploader, upload date, and optional caption

**RLS Policies:**
- **Admins**: Full access (SELECT, INSERT, UPDATE, DELETE) to all photo metadata
- **Customers**: Can only SELECT photos where `customer_visible = true` AND the photo belongs to their order

**Helper Function: `get_stage_photos_with_metadata()`**
- Automatically filters photos based on user role
- Admins see all photos
- Customers see only customer-visible photos
- Returns empty result for unauthorized users

#### 2. Service Layer (`src/services/admin/photo-metadata-service.ts`)

**Key Functions:**

```typescript
// Create photo metadata with visibility flag
createPhotoMetadata(metadata: {
  photoUrl: string;
  productionStageId: string;
  customerVisible: boolean;  // Controls visibility
  caption?: string;
})

// Update visibility flag
updatePhotoMetadata(photoUrl: string, updates: {
  customerVisible?: boolean;
  caption?: string;
})

// Get photos with automatic role-based filtering
getStagePhotosWithMetadata(stageId: string)
// Returns all photos for admins, only customer-visible for customers

// Bulk create with visibility control
bulkCreatePhotoMetadata(stageId: string, photos: Array<{
  url: string;
  customerVisible: boolean;
  caption?: string;
}>)
```

#### 3. Component Layer

**PhotoUploadComponent** (`src/components/production/PhotoUploadComponent.tsx`)

Props for permission control:
```typescript
{
  // Enable customer visibility toggle
  allowCustomerVisibleToggle?: boolean;
  
  // Default visibility for new photos
  defaultCustomerVisible?: boolean;
  
  // Callback with metadata including visibility
  onPhotosWithMetadataChange?: (photos: PhotoMetadata[]) => void;
}
```

Features:
- Eye icon toggle to mark photos as customer-visible
- Green eye = customer-visible, Gray eye = admin-only
- Visibility state persists with photo metadata

**PhotoGalleryComponent** (`src/components/production/PhotoGalleryComponent.tsx`)

Props for permission filtering:
```typescript
{
  // Whether current user is admin (sees all photos)
  isAdmin?: boolean;
  
  // Filter to show only customer-visible photos
  customerViewOnly?: boolean;
  
  // Whether user can delete photos (admin only)
  canDelete?: boolean;
}
```

Filtering logic:
```typescript
const filteredPhotos = useMemo(() => {
  if (isAdmin) {
    // Admins see all photos
    return photos;
  } else if (customerViewOnly) {
    // Customers see only customer-visible photos
    return photos.filter(photo => photo.customerVisible === true);
  }
  // Default: show all (backward compatibility)
  return photos;
}, [photos, isAdmin, customerViewOnly]);
```

## Usage Examples

### Admin View - Upload Photos with Visibility Control

```tsx
import { PhotoUploadComponent } from '@/components/production/PhotoUploadComponent';

function AdminStageEditor({ stageId }) {
  const [photos, setPhotos] = useState<PhotoMetadata[]>([]);
  
  return (
    <PhotoUploadComponent
      allowCustomerVisibleToggle={true}  // Show eye icon toggle
      defaultCustomerVisible={false}     // Default to admin-only
      onPhotosWithMetadataChange={(newPhotos) => {
        setPhotos(newPhotos);
        // Save to database with visibility flags
        bulkCreatePhotoMetadata(stageId, newPhotos);
      }}
    />
  );
}
```

### Admin View - See All Photos

```tsx
import { PhotoGalleryComponent } from '@/components/production/PhotoGalleryComponent';

function AdminPhotoGallery({ photos }) {
  return (
    <PhotoGalleryComponent
      photos={photos}
      isAdmin={true}           // See all photos
      canDelete={true}         // Can delete photos
      showMetadata={true}      // Show uploader and date
    />
  );
}
```

### Customer View - See Only Customer-Visible Photos

```tsx
import { PhotoGalleryComponent } from '@/components/production/PhotoGalleryComponent';

function CustomerOrderProgress({ orderId }) {
  const { data: photos } = useQuery({
    queryKey: ['stage-photos', stageId],
    queryFn: () => getStagePhotosWithMetadata(stageId)
    // Automatically filtered by RLS - customers only get customer-visible photos
  });
  
  return (
    <PhotoGalleryComponent
      photos={photos}
      isAdmin={false}          // Customer view
      customerViewOnly={true}  // Filter to customer-visible only
      canDelete={false}        // Cannot delete
    />
  );
}
```

## Security Model

### Defense in Depth

The system implements multiple layers of security:

1. **Database RLS Policies** (Primary Security)
   - Enforced at database level
   - Cannot be bypassed by client code
   - Customers physically cannot query admin-only photos

2. **Service Layer Filtering** (Secondary Security)
   - `get_stage_photos_with_metadata()` function checks user role
   - Returns filtered results based on permissions

3. **Component Layer Filtering** (UI Security)
   - Components filter photos based on `isAdmin` and `customerViewOnly` props
   - Prevents accidental display of admin-only photos
   - Provides user-friendly interface

### Permission Matrix

| User Role | Can See All Photos | Can See Customer-Visible | Can Upload | Can Toggle Visibility | Can Delete |
|-----------|-------------------|-------------------------|------------|----------------------|------------|
| Admin     | ✅ Yes            | ✅ Yes                  | ✅ Yes     | ✅ Yes               | ✅ Yes     |
| Customer  | ❌ No             | ✅ Yes                  | ❌ No      | ❌ No                | ❌ No      |

## Testing

### Component Tests (`__tests__/PhotoGalleryComponent-permissions.test.tsx`)

Tests cover:
- ✅ Admins can see all photos (customer-visible + admin-only)
- ✅ Customers can see only customer-visible photos
- ✅ Admin-only photos are hidden from customers
- ✅ Empty state when no customer-visible photos
- ✅ Lightbox navigation respects filtering
- ✅ Delete button only shown to admins
- ✅ Backward compatibility (default shows all)

### Service Tests (`__tests__/photo-metadata-service.test.ts`)

Tests cover:
- ✅ Creating photo metadata with visibility flag
- ✅ Updating visibility flag
- ✅ Role-based filtering in `getStagePhotosWithMetadata()`
- ✅ Bulk operations with visibility control
- ✅ Admin role checking

## Common Use Cases

### Use Case 1: Final Product Photos (Customer-Visible)

When production is complete, admins upload final product photos and mark them as customer-visible:

```tsx
<PhotoUploadComponent
  allowCustomerVisibleToggle={true}
  defaultCustomerVisible={true}  // Final photos default to visible
  onPhotosWithMetadataChange={(photos) => {
    // All photos marked as customer-visible
    bulkCreatePhotoMetadata(stageId, photos);
  }}
/>
```

### Use Case 2: Work-in-Progress Photos (Admin-Only)

During production, admins upload WIP photos that customers shouldn't see:

```tsx
<PhotoUploadComponent
  allowCustomerVisibleToggle={true}
  defaultCustomerVisible={false}  // WIP photos default to admin-only
  onPhotosWithMetadataChange={(photos) => {
    // Photos marked as admin-only
    bulkCreatePhotoMetadata(stageId, photos);
  }}
/>
```

### Use Case 3: Toggling Visibility After Upload

Admin can change visibility after upload by clicking the eye icon:

1. Upload photo (defaults to admin-only)
2. Click eye icon to toggle to customer-visible
3. `onPhotosWithMetadataChange` callback fires with updated metadata
4. Call `updatePhotoMetadata()` to persist change

## Database Schema

```sql
CREATE TABLE production_photo_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_url TEXT NOT NULL UNIQUE,
  production_stage_id UUID NOT NULL REFERENCES production_stages(id),
  customer_visible BOOLEAN NOT NULL DEFAULT false,  -- Key permission field
  caption TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_by_name TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for customer-visible photos (common query)
CREATE INDEX idx_production_photo_metadata_customer_visible 
  ON production_photo_metadata(customer_visible) 
  WHERE customer_visible = true;
```

## Best Practices

### For Admins

1. **Default to Admin-Only**: When uploading photos during production, default to `customerVisible: false`
2. **Mark Final Photos**: Only mark final product photos as customer-visible
3. **Review Before Sharing**: Double-check photos before toggling to customer-visible
4. **Use Captions**: Add captions to help identify which photos are customer-appropriate

### For Developers

1. **Always Use RLS**: Never bypass RLS policies - they're the primary security layer
2. **Component Props**: Always pass `isAdmin` and `customerViewOnly` props correctly
3. **Service Functions**: Use `getStagePhotosWithMetadata()` for automatic filtering
4. **Test Permissions**: Test both admin and customer views when implementing features
5. **Metadata Callbacks**: Use `onPhotosWithMetadataChange` instead of `onPhotosChange` when visibility control is needed

## Troubleshooting

### Problem: Customer sees admin-only photos

**Possible Causes:**
1. `customerViewOnly` prop not set to `true`
2. RLS policies not applied correctly
3. Photos have `customer_visible: true` when they shouldn't

**Solution:**
```tsx
// Ensure customerViewOnly is true for customer views
<PhotoGalleryComponent
  photos={photos}
  isAdmin={false}
  customerViewOnly={true}  // Must be true!
/>
```

### Problem: Admin cannot see any photos

**Possible Causes:**
1. `isAdmin` prop not set to `true`
2. User doesn't have admin role in database

**Solution:**
```tsx
// Ensure isAdmin is true for admin views
<PhotoGalleryComponent
  photos={photos}
  isAdmin={true}  // Must be true!
/>
```

### Problem: Eye icon toggle not working

**Possible Causes:**
1. `allowCustomerVisibleToggle` not set to `true`
2. `onPhotosWithMetadataChange` callback not provided
3. Not persisting changes to database

**Solution:**
```tsx
<PhotoUploadComponent
  allowCustomerVisibleToggle={true}  // Enable toggle
  onPhotosWithMetadataChange={(photos) => {
    // Persist to database
    photos.forEach(photo => {
      updatePhotoMetadata(photo.url, {
        customerVisible: photo.customerVisible
      });
    });
  }}
/>
```

## Summary

The photo permissions system provides secure, role-based access control for production photos:

- **Database-level security** via RLS policies (primary protection)
- **Service-level filtering** via helper functions (secondary protection)
- **Component-level filtering** via props (UI protection)
- **Simple API** for developers (`isAdmin`, `customerViewOnly`, `allowCustomerVisibleToggle`)
- **Flexible control** for admins (toggle visibility per photo)
- **Tested thoroughly** (17 component tests + service tests)

This ensures customers only see appropriate photos (final products) while admins maintain full visibility and control over all production photos.
