# Admin Update Collection Endpoint

> **Escopo e segurança (04/11/2026):** documentação técnica de módulo **comercial futuro**; não integra o MVP público somente leitura hospedado no Cloudflare Pages. Conteúdo histórico não autoriza deploy, acesso a Supabase, envio de e-mails, operações financeiras nem reutilização de domínios/credenciais da OrdaX. Validar código, identidade, configuração e autorização antes de ativar esta funcionalidade.


Edge Function for updating existing collections in the Tonecos Studio commercial module (not released in the readonly MVP).

## Requirements

- **14.6**: Admin panel allows editing existing collection details

## Task

- **20.4**: Implement collection update endpoint

## Endpoint

```
POST /functions/v1/admin-update-collection
```

## Authentication

Requires valid JWT token with admin role.

## Request Body

```typescript
{
  id: string;                    // Required: Collection ID to update
  name?: string;                 // Optional: Collection name
  description?: string;          // Optional: Collection description
  slug?: string;                 // Optional: URL-friendly slug (must be unique)
  image_url?: string;            // Optional: Main collection image URL
  rotation_type?: 'fixed' | 'odd_months' | 'even_months';  // Optional: Rotation pattern
  character_revelation_date?: string | null;  // Optional: ISO 8601 date or null
  character_name?: string | null;             // Optional: Character name or null
  character_image_url?: string | null;        // Optional: Character image URL or null
  revealed?: boolean;            // Optional: Whether character is revealed
  is_active?: boolean;           // Optional: Whether collection is active
  display_order?: number;        // Optional: Display order (for sorting)
}
```

## Response

### Success (200)

```json
{
  "ok": true,
  "collection": {
    "id": "uuid",
    "name": "Updated Collection Name",
    "description": "Updated description",
    "slug": "updated-slug",
    "image_url": "https://...",
    "rotation_type": "fixed",
    "character_revelation_date": "2026-06-15T10:00:00Z",
    "character_name": "Character Name",
    "character_image_url": "https://...",
    "revealed": false,
    "is_active": true,
    "display_order": 0,
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-15T12:00:00Z"
  }
}
```

### Errors

#### 400 Bad Request
```json
{
  "ok": false,
  "error": "id is required"
}
```

```json
{
  "ok": false,
  "error": "name cannot be empty"
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
  "error": "rotation_type must be 'fixed', 'odd_months', or 'even_months'"
}
```

```json
{
  "ok": false,
  "error": "character_revelation_date must be a valid ISO 8601 date or null"
}
```

```json
{
  "ok": false,
  "error": "No fields provided to update"
}
```

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
  "error": "Forbidden: Admin access required"
}
```

#### 404 Not Found
```json
{
  "ok": false,
  "error": "Collection with id 'uuid' not found"
}
```

#### 500 Internal Server Error
```json
{
  "ok": false,
  "error": "Failed to update collection: ..."
}
```

## Validation Rules

1. **ID**: Required, must be a valid UUID of an existing collection
2. **Name**: If provided, cannot be empty
3. **Slug**: If provided, cannot be empty and must be unique across all collections
4. **Rotation Type**: If provided, must be one of: 'fixed', 'odd_months', 'even_months'
5. **Character Revelation Date**: If provided, must be valid ISO 8601 date or null
6. **At least one field**: Must provide at least one field to update besides ID

## Features

### Partial Updates
Only fields provided in the request body are updated. Omitted fields remain unchanged.

### Slug Uniqueness Check
When updating slug, validates that no other collection is using the new slug.

### Image Updates
Supports updating both main collection image and character image URLs.

### Character Revelation Management
Allows updating revelation date, character name, image, and revealed status independently.

### Null Values
Supports setting character fields to null to clear them.

## Examples

### Update Collection Name
```bash
curl -X POST https://your-project.supabase.co/functions/v1/admin-update-collection \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "collection-uuid",
    "name": "New Collection Name"
  }'
```

### Update Rotation Type
```bash
curl -X POST https://your-project.supabase.co/functions/v1/admin-update-collection \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "collection-uuid",
    "rotation_type": "odd_months"
  }'
```

### Reveal Character
```bash
curl -X POST https://your-project.supabase.co/functions/v1/admin-update-collection \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "collection-uuid",
    "character_name": "Thunder Lion",
    "character_image_url": "https://example.com/thunder-lion.jpg",
    "revealed": true
  }'
```

### Deactivate Collection
```bash
curl -X POST https://your-project.supabase.co/functions/v1/admin-update-collection \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "collection-uuid",
    "is_active": false
  }'
```

### Clear Character Revelation Date
```bash
curl -X POST https://your-project.supabase.co/functions/v1/admin-update-collection \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "collection-uuid",
    "character_revelation_date": null
  }'
```

### Update Multiple Fields
```bash
curl -X POST https://your-project.supabase.co/functions/v1/admin-update-collection \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "collection-uuid",
    "name": "Updated Name",
    "description": "Updated description with more details",
    "rotation_type": "even_months",
    "display_order": 5,
    "is_active": true
  }'
```

## Testing

Run tests with:
```bash
deno test --allow-net --allow-env supabase/functions/admin-update-collection/admin-update-collection.test.ts
```

Note: Tests require a valid admin token and existing collection to fully execute.

## Related Endpoints

- `admin-create-collection`: Create new collections
- `admin-delete-collection`: Delete collections (if implemented)
- `get-collections`: Public endpoint to fetch collections

## Database Schema

Updates the `collections` table with the following fields:
- `id` (UUID, primary key)
- `name` (TEXT, not null)
- `description` (TEXT)
- `slug` (TEXT, unique, not null)
- `image_url` (TEXT)
- `rotation_type` (TEXT, default 'fixed')
- `character_revelation_date` (TIMESTAMPTZ)
- `character_name` (TEXT)
- `character_image_url` (TEXT)
- `revealed` (BOOLEAN, default false)
- `is_active` (BOOLEAN, default true)
- `display_order` (INTEGER, default 0)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ, auto-updated via trigger)
