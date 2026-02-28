# PaymentVoucherUpload Component

## Overview

The `PaymentVoucherUpload` component is a reusable React component for uploading payment vouchers (proof of payment) to Supabase Storage. It provides a user-friendly interface with drag-and-drop functionality, file validation, and visual feedback.

## Features

- ✅ Drag-and-drop file upload
- ✅ File type validation (JPG, PNG, PDF)
- ✅ File size validation (max 5MB)
- ✅ Upload to Supabase Storage
- ✅ Visual feedback (loading, success, error states)
- ✅ Image preview for uploaded files
- ✅ Remove uploaded file functionality
- ✅ Disabled state support
- ✅ Customizable labels and paths

## Requirements

### Supabase Storage Bucket

The component requires a Supabase Storage bucket named `payment-vouchers`. 

**To create the bucket:**

1. Go to your Supabase project dashboard
2. Navigate to Storage
3. Click "Create a new bucket"
4. Name: `payment-vouchers`
5. Public bucket: **Yes** (or configure RLS policies as needed)
6. Click "Create bucket"

**Alternative: SQL Migration**

You can also create the bucket using SQL:

```sql
-- Create payment-vouchers bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-vouchers', 'payment-vouchers', true);

-- Set up RLS policies (optional - adjust as needed)
CREATE POLICY "Allow authenticated users to upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'payment-vouchers');

CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'payment-vouchers');

CREATE POLICY "Allow users to delete their own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'payment-vouchers' AND auth.uid()::text = (storage.foldername(name))[1]);
```

## Usage

### Basic Usage

```tsx
import { PaymentVoucherUpload } from '@/components/PaymentVoucherUpload';

function MyComponent() {
  const handleUploadSuccess = (url: string, file: File) => {
    console.log('File uploaded successfully:', url);
    // Save the URL to your database or state
  };

  const handleUploadError = (error: string) => {
    console.error('Upload failed:', error);
  };

  return (
    <PaymentVoucherUpload
      onUploadSuccess={handleUploadSuccess}
      onUploadError={handleUploadError}
    />
  );
}
```

### With Custom Configuration

```tsx
<PaymentVoucherUpload
  onUploadSuccess={handleUploadSuccess}
  onUploadError={handleUploadError}
  userId="user-123"
  pathPrefix="deposits"
  label="Comprovante de Depósito"
  showPreview={true}
  disabled={false}
  className="my-custom-class"
/>
```

### In a Form

```tsx
import { useState } from 'react';
import { PaymentVoucherUpload } from '@/components/PaymentVoucherUpload';
import { Button } from '@/components/ui/button';

function PaymentForm() {
  const [voucherUrl, setVoucherUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!voucherUrl) {
      alert('Por favor, envie o comprovante de pagamento');
      return;
    }

    // Submit form with voucherUrl
    await submitPayment({ voucherUrl });
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentVoucherUpload
        onUploadSuccess={(url) => setVoucherUrl(url)}
        onUploadError={(error) => console.error(error)}
      />
      
      <Button type="submit" disabled={!voucherUrl}>
        Confirmar Pagamento
      </Button>
    </form>
  );
}
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `onUploadSuccess` | `(url: string, file: File) => void` | Yes | - | Callback when file is successfully uploaded |
| `onUploadError` | `(error: string) => void` | No | - | Callback when upload fails |
| `userId` | `string` | No | - | Optional user ID for organizing files |
| `pathPrefix` | `string` | No | `'vouchers'` | Optional prefix for file path in storage |
| `disabled` | `boolean` | No | `false` | Whether the component is disabled |
| `className` | `string` | No | - | Optional CSS class name |
| `label` | `string` | No | `'Comprovante de Pagamento'` | Label text |
| `showPreview` | `boolean` | No | `true` | Show preview of uploaded image files |

## File Validation

The component validates files based on:

- **File Type**: Only JPG, PNG, and PDF files are accepted
- **File Size**: Maximum 5MB
- **File Extension**: Must match the MIME type

Invalid files will trigger the `onUploadError` callback with an appropriate error message.

## File Storage Structure

Files are stored in Supabase Storage with the following structure:

```
payment-vouchers/
  └── {pathPrefix}/
      └── {userId}-{timestamp}-{randomId}.{ext}
```

Example:
```
payment-vouchers/vouchers/user123-1704067200000-abc123.jpg
```

## States

The component has the following visual states:

1. **Initial**: Shows upload area with drag-and-drop instructions
2. **Dragging**: Highlights the drop zone when dragging a file over it
3. **Uploading**: Shows loading spinner and "Enviando arquivo..." message
4. **Success**: Shows file name, size, and preview (for images)
5. **Error**: Shows error message with "Tentar novamente" button

## Accessibility

- File input has proper `aria-label` attribute
- Keyboard navigation supported
- Screen reader friendly
- Visual feedback for all states

## Testing

The component includes comprehensive unit tests covering:

- Rendering
- File validation (type, size, extension)
- Upload functionality
- Drag-and-drop
- Preview generation
- Remove file
- Disabled state
- Error handling

Run tests:
```bash
npm test -- src/components/__tests__/PaymentVoucherUpload.test.tsx
```

## Related Components

- Used in: `StandalonePurchase.tsx` (deposit voucher)
- Used in: Subscription creation flow (payment voucher)
- Used in: Balance payment page (balance voucher)

## Requirements Validation

This component satisfies the following requirements:

- **Requirement 25.1**: File input with drag-and-drop ✅
- **Requirement 25.1**: Validate file type (JPG, PNG, PDF) ✅
- **Requirement 25.1**: Validate file size (max 5MB) ✅
- **Requirement 25.1**: Upload to Supabase Storage ✅
- **Requirement 25.1**: Return URL of storage ✅
- **Requirement 25.1**: Visual feedback (loading, success, error) ✅

## Future Enhancements

Potential improvements for future versions:

- [ ] Multiple file upload support
- [ ] Progress bar for large files
- [ ] Image compression before upload
- [ ] Thumbnail generation
- [ ] File type icons for PDFs
- [ ] Retry mechanism for failed uploads
- [ ] Upload queue for multiple files
