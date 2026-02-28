# Frontend Integration Guide

## Using the Admin Create Collection Endpoint

### Prerequisites

1. User must be authenticated with admin role
2. Supabase client must be configured
3. JWT token must be included in requests

### React Hook Example

```typescript
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface CreateCollectionData {
  name: string;
  description: string;
  slug: string;
  rotation_type: 'fixed' | 'odd_months' | 'even_months';
  image_url?: string;
  character_revelation_date?: string;
  character_name?: string;
  character_image_url?: string;
  is_active?: boolean;
  display_order?: number;
}

export function useCreateCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCollectionData) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${supabase.supabaseUrl}/functions/v1/admin-create-collection`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'Failed to create collection');
      }

      return result.collection;
    },
    onSuccess: () => {
      // Invalidate collections query to refetch
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });
}
```

### Usage in Component

```typescript
import { useCreateCollection } from '@/hooks/useCreateCollection';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const collectionSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase with hyphens'),
  rotation_type: z.enum(['fixed', 'odd_months', 'even_months']),
  image_url: z.string().url().optional(),
  character_revelation_date: z.string().datetime().optional(),
  character_name: z.string().optional(),
  character_image_url: z.string().url().optional(),
  is_active: z.boolean().optional(),
  display_order: z.number().int().optional(),
});

type CollectionFormData = z.infer<typeof collectionSchema>;

export function CollectionForm() {
  const createCollection = useCreateCollection();
  
  const form = useForm<CollectionFormData>({
    resolver: zodResolver(collectionSchema),
    defaultValues: {
      rotation_type: 'fixed',
      is_active: true,
      display_order: 0,
    },
  });

  const onSubmit = async (data: CollectionFormData) => {
    try {
      await createCollection.mutateAsync(data);
      toast.success('Collection created successfully!');
      form.reset();
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
      <input {...form.register('name')} placeholder="Collection Name" />
      <textarea {...form.register('description')} placeholder="Description" />
      <input {...form.register('slug')} placeholder="collection-slug" />
      
      <select {...form.register('rotation_type')}>
        <option value="fixed">Fixed (Every Month)</option>
        <option value="odd_months">Odd Months (Jan, Mar, May...)</option>
        <option value="even_months">Even Months (Feb, Apr, Jun...)</option>
      </select>

      <input {...form.register('image_url')} placeholder="Image URL" />
      <input 
        type="datetime-local" 
        {...form.register('character_revelation_date')} 
        placeholder="Character Revelation Date" 
      />
      
      <button type="submit" disabled={createCollection.isPending}>
        {createCollection.isPending ? 'Creating...' : 'Create Collection'}
      </button>
    </form>
  );
}
```

### Image Upload Flow

Since the endpoint accepts image URLs (not file uploads), you need to upload images to Supabase Storage first:

```typescript
async function uploadCollectionImage(file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random()}.${fileExt}`;
  const filePath = `collections/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('collection-images')
    .upload(filePath, file);

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage
    .from('collection-images')
    .getPublicUrl(filePath);

  return data.publicUrl;
}

// Usage in form
const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    const imageUrl = await uploadCollectionImage(file);
    form.setValue('image_url', imageUrl);
    toast.success('Image uploaded successfully!');
  } catch (error) {
    toast.error('Failed to upload image');
  }
};
```

### Error Handling

```typescript
try {
  await createCollection.mutateAsync(data);
} catch (error) {
  if (error.message.includes('already exists')) {
    form.setError('slug', { message: 'This slug is already taken' });
  } else if (error.message.includes('Forbidden')) {
    toast.error('You do not have permission to create collections');
  } else if (error.message.includes('Unauthorized')) {
    toast.error('Please log in to continue');
  } else {
    toast.error('Failed to create collection. Please try again.');
  }
}
```

### Complete Example with Image Upload

```typescript
export function CollectionFormWithUpload() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const createCollection = useCreateCollection();
  const form = useForm<CollectionFormData>({
    resolver: zodResolver(collectionSchema),
  });

  const handleSubmit = async (data: CollectionFormData) => {
    try {
      // Upload image first if provided
      if (imageFile) {
        setUploading(true);
        const imageUrl = await uploadCollectionImage(imageFile);
        data.image_url = imageUrl;
      }

      // Create collection
      await createCollection.mutateAsync(data);
      
      toast.success('Collection created successfully!');
      form.reset();
      setImageFile(null);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)}>
      {/* ... other fields ... */}
      
      <div>
        <label>Collection Image</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files?.[0] || null)}
        />
      </div>

      <button 
        type="submit" 
        disabled={createCollection.isPending || uploading}
      >
        {uploading ? 'Uploading...' : createCollection.isPending ? 'Creating...' : 'Create Collection'}
      </button>
    </form>
  );
}
```

### Testing

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useCreateCollection } from './useCreateCollection';

describe('useCreateCollection', () => {
  it('should create collection successfully', async () => {
    const { result } = renderHook(() => useCreateCollection());

    await act(async () => {
      await result.current.mutateAsync({
        name: 'Test Collection',
        description: 'Test Description',
        slug: 'test-collection',
        rotation_type: 'fixed',
      });
    });

    expect(result.current.isSuccess).toBe(true);
  });

  it('should handle errors', async () => {
    const { result } = renderHook(() => useCreateCollection());

    await expect(
      result.current.mutateAsync({
        name: '',
        description: 'Test',
        slug: 'test',
        rotation_type: 'fixed',
      })
    ).rejects.toThrow();
  });
});
```

## Related Components

- `src/pages/admin/CollectionManagement.tsx` - Main collection management page
- `src/components/admin/CollectionForm.tsx` - Collection form component
- `src/services/collection-service.ts` - Collection service layer

## Notes

1. Always upload images to Supabase Storage before creating the collection
2. Validate slug format (lowercase, hyphens only) on the frontend
3. Use proper date-time picker for character revelation date
4. Show rotation schedule preview based on selected rotation_type
5. Implement proper error handling and user feedback
