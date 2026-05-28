# Admin Create Collection Endpoint

Edge Function for creating new collections in the ORDAX system.

## Requirements

- **14.1**: Admin panel allows creating new collections with all required fields
- **14.2**: Admin can set collection as Fixed or Rotating
- **14.3**: Admin can configure rotation pattern for rotating collections
- **14.4**: Admin can upload collection images and character details
- **14.5**: Admin can set character revelation date

## Task

**20.3**: Implement collection create endpoint

## Endpoint

```
POST /functions/v1/admin-create-collection
```

## Authorization

Requires admin role. The endpoint validates:
1. Valid JWT token in Authorization header
2. User has `admin` or `super_admin` in `profiles.role`

## Request Body

```typescript
{
  // Required fields
  name: string;              // Collection name
  description: string;       // Collection description
  slug: string;             // Unique URL-friendly identifier
  
  // Rotation configuration
  rotation_type: 'fixed' | 'odd_months' | 'even_months';
  
  // Optional fields
  image_url?: string;                    // Collection cover image URL
  character_revelation_date?: string;    // ISO 8601 date for character reveal
  character_name?: string;               // Character name (for pre-configuration)
  character_image_url?: string;          // Character image URL
  is_active?: boolean;                   // Active status (default: true)
  display_order?: number;                // Display order (default: 0)
}
```

## Rotation Types

- **fixed**: Collection available every month
- **odd_months**: Collection available in Jan, Mar, May, Jul, Sep, Nov
- **even_months**: Collection available in Feb, Apr, Jun, Aug, Oct, Dec

## Response

### Success (201 Created)

```json
{
  "ok": true,
  "collection": {
    "id": "uuid",
    "name": "Collection Name",
    "description": "Collection description",
    "slug": "collection-slug",
    "image_url": "https://...",
    "rotation_type": "fixed",
    "character_revelation_date": "2026-06-15T10:00:00Z",
    "revealed": false,
    "character_name": null,
    "character_image_url": null,
    "is_active": true,
    "display_order": 0,
    "created_at": "2026-03-27T...",
    "updated_at": "2026-03-27T..."
  }
}
```

### Errors

#### 401 Unauthorized
```json
{
  "ok": false,
  "error": "Unauthorized"
}
```

#### 403 Forbidden
```json
{
  "ok": false,
  "error": "Forbidden: admin only"
}
```

#### 400 Bad Request
```json
{
  "ok": false,
  "error": "name is required"
}
```

```json
{
  "ok": false,
  "error": "rotation_type must be 'fixed', 'odd_months', or 'even_months'"
}
```

```json
{
  "ok": false,
  "error": "Collection with slug 'existing-slug' already exists"
}
```

```json
{
  "ok": false,
  "error": "character_revelation_date must be a valid ISO 8601 date"
}
```

## Validation Rules

1. **name**: Required, non-empty string
2. **description**: Required, non-empty string
3. **slug**: Required, non-empty string, must be unique
4. **rotation_type**: Must be one of: 'fixed', 'odd_months', 'even_months'
5. **character_revelation_date**: If provided, must be valid ISO 8601 date
6. **is_active**: Boolean, defaults to true
7. **display_order**: Number, defaults to 0
8. **revealed**: Always set to false for new collections

## Database Schema

The endpoint inserts into the `collections` table with the following structure:

```sql
CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE NOT NULL,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  rotation_type TEXT DEFAULT 'fixed' CHECK (rotation_type IN ('fixed', 'odd_months', 'even_months')),
  character_revelation_date TIMESTAMPTZ,
  revealed BOOLEAN DEFAULT false,
  character_name TEXT,
  character_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

## Usage Example

### Create Fixed Collection

```bash
curl -X POST https://your-project.supabase.co/functions/v1/admin-create-collection \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Classic Heroes",
    "description": "Timeless hero characters available every month",
    "slug": "classic-heroes",
    "rotation_type": "fixed",
    "image_url": "https://storage.supabase.co/collections/classic-heroes.jpg",
    "is_active": true,
    "display_order": 1
  }'
```

### Create Rotating Collection with Character Revelation

```bash
curl -X POST https://your-project.supabase.co/functions/v1/admin-create-collection \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mystery Legends",
    "description": "Legendary characters revealed monthly, available in odd months",
    "slug": "mystery-legends",
    "rotation_type": "odd_months",
    "character_revelation_date": "2026-06-15T10:00:00Z",
    "image_url": "https://storage.supabase.co/collections/mystery-legends.jpg",
    "is_active": true
  }'
```

## Testing

Run tests with:

```bash
deno test --allow-net --allow-env supabase/functions/admin-create-collection/admin-create-collection.test.ts
```

Note: Tests require valid admin credentials to fully execute.

## Related Files

- **Frontend**: `src/pages/admin/CollectionManagement.tsx`
- **Form Component**: `src/components/admin/CollectionForm.tsx`
- **Service**: `src/services/collection-service.ts`
- **Migration**: `supabase/migrations/20260327110326_add_collection_rotation_fields.sql`

## Security

- Uses Row Level Security (RLS) policies
- Only users with 'admin' role can create collections
- Validates all input data before insertion
- Prevents duplicate slugs
- Uses service role client to bypass RLS for admin operations

## Notes

- New collections always start with `revealed: false`
- Character revelation is handled by the `cron-reveal-characters` function
- Image uploads should be handled separately via Supabase Storage
- The endpoint accepts image URLs, not file uploads directly
