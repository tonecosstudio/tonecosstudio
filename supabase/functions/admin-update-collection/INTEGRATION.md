# Admin Update Collection - Integration Guide

This document provides integration guidance for the admin-update-collection endpoint.

## Integration with Frontend

### React Query Hook Example

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface UpdateCollectionParams {
  id: string;
  name?: string;
  description?: string;
  slug?: string;
  image_url?: string;
  rotation_type?: 'fixed' | 'odd_months' | 'even_months';
  character_revelation_date?: string | null;
  character_name?: string | null;
  character_image_url?: string | null;
  revealed?: boolean;
  is_active?: boolean;
  display_order?: number;
}

export function useUpdateCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UpdateCollectionParams) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-update-collection`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(params),
        }
      );

      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.error || 'Failed to update collection');
      }

      return result.collection;
    },
    onSuccess: (collection) => {
      // Invalidate collections list
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      // Update specific collection in cache
      queryClient.setQueryData(['collection', collection.id], collection);
    },
  });
}
```

### Usage in Component

```typescript
import { useUpdateCollection } from '@/hooks/useUpdateCollection';
import { useState } from 'react';

export function CollectionEditForm({ collection }) {
  const updateCollection = useUpdateCollection();
  const [formData, setFormData] = useState({
    name: collection.name,
    description: collection.description,
    rotation_type: collection.rotation_type,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await updateCollection.mutateAsync({
        id: collection.id,
        ...formData,
      });
      
      alert('Collection updated successfully!');
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        placeholder="Collection Name"
      />
      
      <textarea
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        placeholder="Description"
      />
      
      <select
        value={formData.rotation_type}
        onChange={(e) => setFormData({ ...formData, rotation_type: e.target.value })}
      >
        <option value="fixed">Fixed (Every Month)</option>
        <option value="odd_months">Odd Months</option>
        <option value="even_months">Even Months</option>
      </select>
      
      <button 
        type="submit" 
        disabled={updateCollection.isPending}
      >
        {updateCollection.isPending ? 'Updating...' : 'Update Collection'}
      </button>
    </form>
  );
}
```

## Common Use Cases

### 1. Update Basic Information

```typescript
await updateCollection.mutateAsync({
  id: collectionId,
  name: 'New Collection Name',
  description: 'Updated description',
});
```

### 2. Change Rotation Pattern

```typescript
await updateCollection.mutateAsync({
  id: collectionId,
  rotation_type: 'odd_months',
});
```

### 3. Schedule Character Revelation

```typescript
await updateCollection.mutateAsync({
  id: collectionId,
  character_revelation_date: '2026-06-15T10:00:00Z',
  character_name: 'Mystery Character',
  character_image_url: 'https://example.com/character.jpg',
});
```

### 4. Reveal Character

```typescript
await updateCollection.mutateAsync({
  id: collectionId,
  revealed: true,
});
```

### 5. Deactivate Collection

```typescript
await updateCollection.mutateAsync({
  id: collectionId,
  is_active: false,
});
```

### 6. Update Display Order

```typescript
await updateCollection.mutateAsync({
  id: collectionId,
  display_order: 5,
});
```

### 7. Clear Character Revelation

```typescript
await updateCollection.mutateAsync({
  id: collectionId,
  character_revelation_date: null,
  character_name: null,
  character_image_url: null,
  revealed: false,
});
```

## Error Handling

```typescript
try {
  await updateCollection.mutateAsync(params);
} catch (error) {
  if (error.message.includes('not found')) {
    // Handle collection not found
    console.error('Collection does not exist');
  } else if (error.message.includes('already exists')) {
    // Handle duplicate slug
    console.error('Slug is already in use');
  } else if (error.message.includes('Forbidden')) {
    // Handle permission error
    console.error('Admin access required');
  } else {
    // Handle other errors
    console.error('Update failed:', error.message);
  }
}
```

## Validation Before Submission

```typescript
function validateCollectionUpdate(data: UpdateCollectionParams): string[] {
  const errors: string[] = [];

  if (data.name !== undefined && data.name.trim() === '') {
    errors.push('Name cannot be empty');
  }

  if (data.slug !== undefined && data.slug.trim() === '') {
    errors.push('Slug cannot be empty');
  }

  if (data.rotation_type !== undefined) {
    if (!['fixed', 'odd_months', 'even_months'].includes(data.rotation_type)) {
      errors.push('Invalid rotation type');
    }
  }

  if (data.character_revelation_date !== undefined && data.character_revelation_date !== null) {
    const date = new Date(data.character_revelation_date);
    if (isNaN(date.getTime())) {
      errors.push('Invalid revelation date');
    }
  }

  return errors;
}

// Usage
const errors = validateCollectionUpdate(formData);
if (errors.length > 0) {
  alert(errors.join('\n'));
  return;
}
```

## Integration with CollectionManagement Component

The endpoint integrates with the existing `CollectionManagement.tsx` component:

```typescript
// In CollectionManagement.tsx
import { useUpdateCollection } from '@/hooks/useUpdateCollection';

export function CollectionManagement() {
  const updateCollection = useUpdateCollection();
  
  const handleEdit = async (collectionId: string, updates: Partial<Collection>) => {
    try {
      await updateCollection.mutateAsync({
        id: collectionId,
        ...updates,
      });
      
      toast.success('Collection updated successfully');
    } catch (error) {
      toast.error(`Failed to update: ${error.message}`);
    }
  };

  // ... rest of component
}
```

## Testing Checklist

- [ ] Update collection name
- [ ] Update collection description
- [ ] Update collection slug (verify uniqueness check)
- [ ] Change rotation type (fixed → odd_months → even_months)
- [ ] Update image URL
- [ ] Schedule character revelation
- [ ] Reveal character
- [ ] Clear character revelation
- [ ] Activate/deactivate collection
- [ ] Update display order
- [ ] Update multiple fields at once
- [ ] Verify authorization (admin only)
- [ ] Verify collection existence check
- [ ] Verify validation errors
- [ ] Verify updated_at timestamp changes

## Performance Considerations

1. **Slug Uniqueness Check**: Performs additional database query when slug is updated
2. **Partial Updates**: Only updates provided fields, minimizing database operations
3. **Trigger Execution**: `updated_at` trigger fires on every update

## Security Notes

1. **Admin Only**: Endpoint requires admin role via `assertAdmin()`
2. **Input Validation**: All inputs are validated and sanitized
3. **SQL Injection**: Protected by Supabase parameterized queries
4. **XSS Prevention**: Frontend should sanitize display of user-provided content

## Related Files

- `supabase/functions/admin-create-collection/index.ts` - Create collections
- `src/pages/admin/CollectionManagement.tsx` - Admin UI
- `src/components/admin/CollectionForm.tsx` - Form component
- `supabase/migrations/20260327110326_add_collection_rotation_fields.sql` - Schema
