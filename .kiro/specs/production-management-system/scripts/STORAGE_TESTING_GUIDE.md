# Storage Bucket Testing Guide

## Overview

This guide provides comprehensive testing procedures for the production-photos storage bucket in the Production Management System.

## Prerequisites

- [ ] Storage setup script has been run (`setup-storage.sql`)
- [ ] Production dashboard is deployed and accessible
- [ ] You have admin and customer test accounts
- [ ] Test images prepared (JPEG, PNG, WebP formats)

## Test Image Preparation

Create test images with the following specifications:

```bash
# Small image (< 1MB)
test-small.jpg - 500KB

# Medium image (2-3MB)
test-medium.jpg - 2.5MB

# Large image (4-5MB, at limit)
test-large.jpg - 4.8MB

# Oversized image (> 5MB, should fail)
test-oversized.jpg - 6MB

# Invalid format (should fail)
test-invalid.bmp - 1MB
```

## Test 1: Bucket Configuration Verification

### SQL Verification

```sql
-- Run in Supabase SQL Editor
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'production-photos';
```

### Expected Results
- [ ] Bucket ID: `production-photos`
- [ ] Public: `false`
- [ ] File size limit: `5242880` (5MB)
- [ ] Allowed MIME types: `{image/jpeg, image/jpg, image/png, image/webp}`

## Test 2: Admin Photo Upload

### Test Steps

**Step 1: Login as Admin**
```
Navigate to: /admin/production/[orderId]
```

**Step 2: Upload Small Image**
1. Click "Upload Photo" button
2. Select `test-small.jpg`
3. Choose stage: "Design"
4. Click "Upload"

**Expected Results:**
- [ ] Upload succeeds
- [ ] Success message displayed
- [ ] Photo appears in gallery
- [ ] Photo metadata saved to database
- [ ] File path format: `{order_id}/design/{timestamp}_test-small.jpg`

**Step 3: Upload Medium Image**
1. Upload `test-medium.jpg` to "Production" stage
2. Verify upload succeeds

**Expected Results:**
- [ ] Upload succeeds
- [ ] Photo appears in gallery

**Step 4: Upload Large Image (At Limit)**
1. Upload `test-large.jpg` (4.8MB) to "Quality Check" stage
2. Verify upload succeeds

**Expected Results:**
- [ ] Upload succeeds (just under 5MB limit)
- [ ] Photo appears in gallery

**Step 5: Upload Oversized Image (Should Fail)**
1. Attempt to upload `test-oversized.jpg` (6MB)
2. Verify upload fails

**Expected Results:**
- [ ] Upload fails
- [ ] Error message: "File size exceeds 5MB limit"
- [ ] No file created in storage

**Step 6: Upload Invalid Format (Should Fail)**
1. Attempt to upload `test-invalid.bmp`
2. Verify upload fails

**Expected Results:**
- [ ] Upload fails
- [ ] Error message: "Invalid file type. Only JPEG, PNG, and WebP allowed"
- [ ] No file created in storage

## Test 3: Admin Photo Viewing

### Test Steps

**Step 1: View Uploaded Photos**
```
Navigate to: /admin/production/[orderId]
Scroll to photo gallery section
```

**Expected Results:**
- [ ] All uploaded photos displayed
- [ ] Photos organized by stage
- [ ] Thumbnails load correctly
- [ ] Click to view full size works
- [ ] Download button works

**Step 2: View Photos in Different Orders**
```
Navigate to different order pages
```

**Expected Results:**
- [ ] Admin can view photos for all orders
- [ ] Photos are correctly associated with orders
- [ ] No permission errors

## Test 4: Customer Photo Viewing

### Test Steps

**Step 1: Login as Customer**
```
Login with customer account that owns the order
Navigate to: /orders/[orderId]
```

**Step 2: View Own Order Photos**
```
Scroll to photo gallery section
```

**Expected Results:**
- [ ] Customer can view photos for their own order
- [ ] Photos load correctly
- [ ] Full-size view works
- [ ] Download works (if enabled)

**Step 3: Attempt to View Other Customer's Photos**
```
Try to navigate to: /orders/[otherCustomerOrderId]
```

**Expected Results:**
- [ ] Access denied or 404 error
- [ ] Cannot view other customers' photos
- [ ] RLS policy blocks access

## Test 5: Anonymous User Access (Should Fail)

### Test Steps

**Step 1: Logout**
```
Logout from all accounts
```

**Step 2: Attempt Direct URL Access**
```
Try to access photo URL directly:
https://your-project.supabase.co/storage/v1/object/public/production-photos/...
```

**Expected Results:**
- [ ] Access denied (401 or 403 error)
- [ ] Photo does not load
- [ ] RLS policy blocks access

## Test 6: Photo Deletion

### Test Steps

**Step 1: Login as Admin**
```
Navigate to: /admin/production/[orderId]
```

**Step 2: Delete a Photo**
1. Click delete button on a photo
2. Confirm deletion

**Expected Results:**
- [ ] Photo removed from gallery
- [ ] Photo deleted from storage
- [ ] Metadata removed from database
- [ ] Success message displayed

**Step 3: Verify Deletion**
```sql
-- Check database
SELECT * FROM production_photo_metadata 
WHERE storage_path = 'deleted-photo-path';

-- Should return 0 rows
```

**Expected Results:**
- [ ] No database record
- [ ] File not accessible in storage

## Test 7: Multiple Photo Upload

### Test Steps

**Step 1: Upload Multiple Photos**
1. Select 5 photos at once
2. Upload to "Production" stage

**Expected Results:**
- [ ] All 5 photos upload successfully
- [ ] Progress indicator shows for each
- [ ] All photos appear in gallery
- [ ] Correct order maintained

**Step 2: Attempt to Upload More Than Limit**
1. Try to upload 6 photos (if limit is 5 per stage)

**Expected Results:**
- [ ] Upload blocked or warning shown
- [ ] Error message: "Maximum 5 photos per stage"

## Test 8: Storage Usage Statistics

### Test Steps

**Step 1: Check Storage Usage**
```sql
-- Run in SQL Editor
SELECT * FROM get_storage_usage_stats();
```

**Expected Results:**
- [ ] Returns total files count
- [ ] Returns total size in MB
- [ ] Returns average file size
- [ ] Returns oldest and newest file dates

**Step 2: Find Large Files**
```sql
SELECT * FROM find_large_production_photos();
```

**Expected Results:**
- [ ] Lists files > 4MB
- [ ] Shows file size in MB
- [ ] Shows creation date

## Test 9: Photo Metadata

### Test Steps

**Step 1: Check Photo Metadata**
```sql
SELECT 
  id,
  production_queue_id,
  stage_name,
  storage_path,
  file_name,
  file_size,
  mime_type,
  uploaded_by,
  created_at
FROM production_photo_metadata
ORDER BY created_at DESC
LIMIT 10;
```

**Expected Results:**
- [ ] All uploaded photos have metadata records
- [ ] File sizes are correct
- [ ] MIME types are correct
- [ ] Uploaded by user ID is correct
- [ ] Timestamps are accurate

## Test 10: Signed URLs

### Test Steps

**Step 1: Generate Signed URL**
```javascript
// In browser console or test script
const { data, error } = await supabase
  .storage
  .from('production-photos')
  .createSignedUrl('order-id/design/photo.jpg', 3600);

console.log(data.signedUrl);
```

**Expected Results:**
- [ ] Signed URL generated successfully
- [ ] URL includes expiration token
- [ ] URL is accessible before expiration
- [ ] URL expires after specified time (3600 seconds)

**Step 2: Test Expired URL**
```
Wait for URL to expire (or set short expiration)
Try to access expired URL
```

**Expected Results:**
- [ ] Expired URL returns 403 error
- [ ] Cannot access photo with expired URL

## Test 11: Concurrent Uploads

### Test Steps

**Step 1: Upload from Multiple Browsers**
1. Open dashboard in 3 browsers
2. Login as admin in all
3. Upload photos simultaneously

**Expected Results:**
- [ ] All uploads succeed
- [ ] No conflicts or race conditions
- [ ] All photos appear in all browsers
- [ ] No data corruption

## Test 12: Error Handling

### Test Steps

**Step 1: Network Interruption**
1. Start photo upload
2. Disable network mid-upload
3. Re-enable network

**Expected Results:**
- [ ] Upload fails gracefully
- [ ] Error message displayed
- [ ] Retry option available
- [ ] No partial files in storage

**Step 2: Invalid File Path**
```javascript
// Attempt to upload with invalid path
const { error } = await supabase
  .storage
  .from('production-photos')
  .upload('../../../etc/passwd', file);
```

**Expected Results:**
- [ ] Upload blocked
- [ ] Path traversal prevented
- [ ] Security error logged

## Test 13: Performance Testing

### Test Steps

**Step 1: Upload Speed**
1. Upload 10 photos (2MB each)
2. Measure total time

**Expected Results:**
- [ ] Average upload time < 5 seconds per photo
- [ ] No timeouts
- [ ] Progress indicators work smoothly

**Step 2: Gallery Load Speed**
1. Navigate to order with 20 photos
2. Measure gallery load time

**Expected Results:**
- [ ] Gallery loads in < 3 seconds
- [ ] Thumbnails load progressively
- [ ] No layout shifts

## Common Issues and Solutions

### Issue 1: Upload Fails with "Bucket not found"

**Solution:**
```sql
-- Verify bucket exists
SELECT * FROM storage.buckets WHERE id = 'production-photos';

-- If missing, run setup-storage.sql again
```

### Issue 2: RLS Policy Blocks Admin Upload

**Solution:**
```sql
-- Check if user has admin role
SELECT * FROM user_roles WHERE user_id = auth.uid();

-- Verify RLS policies exist
SELECT * FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname LIKE '%production photos%';
```

### Issue 3: Photos Not Appearing in Gallery

**Solution:**
1. Check browser console for errors
2. Verify photo metadata was saved:
   ```sql
   SELECT * FROM production_photo_metadata 
   ORDER BY created_at DESC LIMIT 10;
   ```
3. Check storage.objects table:
   ```sql
   SELECT * FROM storage.objects 
   WHERE bucket_id = 'production-photos'
   ORDER BY created_at DESC LIMIT 10;
   ```

### Issue 4: Slow Upload Speed

**Solution:**
1. Check network speed
2. Verify file size is reasonable (< 5MB)
3. Consider image compression
4. Check Supabase project region (closer is faster)

## Storage Configuration Checklist

- [ ] Bucket created: `production-photos`
- [ ] Bucket is private (public = false)
- [ ] File size limit: 5MB
- [ ] Allowed MIME types: JPEG, PNG, WebP
- [ ] RLS enabled on storage.objects
- [ ] Admin upload policy working
- [ ] Admin view policy working
- [ ] Admin delete policy working
- [ ] Customer view policy working (own orders only)
- [ ] Anonymous access blocked
- [ ] Test 1: Bucket configuration - PASSED
- [ ] Test 2: Admin upload - PASSED
- [ ] Test 3: Admin viewing - PASSED
- [ ] Test 4: Customer viewing - PASSED
- [ ] Test 5: Anonymous access blocked - PASSED
- [ ] Test 6: Photo deletion - PASSED
- [ ] Test 7: Multiple upload - PASSED
- [ ] Test 8: Storage stats - PASSED
- [ ] Test 9: Photo metadata - PASSED
- [ ] Test 10: Signed URLs - PASSED
- [ ] Test 11: Concurrent uploads - PASSED
- [ ] Test 12: Error handling - PASSED
- [ ] Test 13: Performance - PASSED

## Sign-Off

**Tested By:** _________________  
**Date:** _________________  
**Environment:** Staging / Production  
**Result:** PASS / FAIL  
**Notes:** _________________

## Next Steps

After storage testing is complete:
1. ✓ Configure email service (see configure-email.md)
2. ✓ Run full integration tests
3. ✓ Deploy to production
4. ✓ Monitor storage usage and costs
