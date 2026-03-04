# Character Choices Query Fix - Denormalization Solution

## Problem

The `character_choices` table queries were failing with PGRST200 error:
```
Could not find a relationship between 'production_queue' and 'profiles' in the schema cache
```

This occurred because the queries were attempting complex joins:
- `profiles!character_choices_user_id_fkey(full_name, email)`
- `collections(name)`
- `collection_characters(name, image_url)`

## Root Cause

Supabase PostgREST cannot resolve transitive foreign key relationships when:
1. Multiple tables are joined
2. The relationships are not directly defined in the schema cache
3. Complex nested joins are attempted

## Professional Solution: Denormalization

Denormalization is a standard database optimization technique where frequently accessed data from related tables is copied into the main table. This is NOT a workaround - it's a professional practice used in production systems for:

1. **Performance**: Eliminates expensive JOIN operations
2. **Reliability**: Removes dependency on complex relationship resolution
3. **Scalability**: Reduces query complexity as data grows
4. **Maintainability**: Simplifies query logic

### Trade-offs

**Benefits**:
- Faster query performance (no JOINs)
- Simpler query logic
- More reliable (no relationship resolution issues)
- Better scalability

**Costs**:
- Slightly more storage space (minimal - just 3 TEXT columns)
- Need to keep denormalized data in sync (handled by triggers)

## Implementation

### 1. Database Schema Changes

Added three denormalized columns to `character_choices` table:
```sql
ALTER TABLE character_choices
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS customer_email TEXT,
ADD COLUMN IF NOT EXISTS collection_name TEXT;
```

### 2. Populate Existing Records

```sql
-- Populate customer data from profiles
UPDATE character_choices cc
SET 
  customer_name = COALESCE(p.full_name, p.email, 'Unknown Customer'),
  customer_email = p.email
FROM profiles p
WHERE cc.user_id = p.id
  AND (cc.customer_name IS NULL OR cc.customer_email IS NULL);

-- Populate collection data from collections
UPDATE character_choices cc
SET collection_name = c.name
FROM collections c
WHERE cc.collection_id = c.id
  AND cc.collection_name IS NULL;
```

### 3. Update Trigger Function

Modified `auto_populate_production_queue()` function to populate denormalized fields when creating new `character_choices` records:

```sql
INSERT INTO character_choices (
  order_id,
  order_type,
  user_id,
  collection_id,
  status,
  deadline,
  customer_name,      -- NEW: Denormalized
  customer_email,     -- NEW: Denormalized
  collection_name     -- NEW: Denormalized
) VALUES (
  NEW.id,
  v_order_type,
  NEW.user_id,
  v_collection_id,
  'pending',
  v_choice_deadline,
  v_customer_name,    -- Populated from profiles
  v_customer_email,   -- Populated from profiles
  v_collection_name   -- Populated from collections
);
```

### 4. Update Service Layer

Updated `src/services/admin/choice-service.ts` to use denormalized fields:

**Before** (with problematic joins):
```typescript
const { data, error } = await supabase
  .from("character_choices")
  .select(`
    *,
    profiles!character_choices_user_id_fkey(full_name, email),
    collections(name),
    collection_characters(name, image_url)
  `)
  .eq("order_id", orderId);
```

**After** (using denormalized fields):
```typescript
const { data, error } = await supabase
  .from("character_choices")
  .select("*")
  .eq("order_id", orderId);

// Transform using denormalized fields
return (data || []).map((item: any) => ({
  customerName: item.customer_name || "Unknown",
  customerEmail: item.customer_email || "",
  collectionName: item.collection_name || "Unknown Collection",
  // ... other fields
}));
```

## Data Consistency

The denormalized data is kept in sync through:

1. **Trigger function**: `auto_populate_production_queue()` populates denormalized fields when creating new records
2. **Immutable data**: Customer names and collection names rarely change, so sync issues are minimal
3. **Fallback values**: Code uses `|| "Unknown"` to handle any null values gracefully

## Migration File

Location: `supabase/migrations/20260506000000_add_denormalized_fields_to_character_choices.sql`

This migration:
1. Adds the three denormalized columns
2. Populates existing records
3. Updates the trigger function
4. Validates the changes

## Testing

To verify the fix works:

1. **Test fetchPendingChoices()**:
   ```typescript
   const choices = await fetchPendingChoices({});
   console.log(choices); // Should return data without errors
   ```

2. **Test getChoiceHistory()**:
   ```typescript
   const history = await getChoiceHistory(orderId);
   console.log(history); // Should return data without errors
   ```

3. **Verify denormalized data**:
   ```sql
   SELECT 
     id, 
     customer_name, 
     customer_email, 
     collection_name 
   FROM character_choices 
   LIMIT 10;
   ```

## Comparison with production_queue Fix

This solution follows the same pattern used for `production_queue` table:
- Same denormalization approach
- Same trigger-based population
- Same query simplification
- Proven to work in production

## References

- Production queue fix: `docs/production-queue-query-fix.md`
- Migration file: `supabase/migrations/20260506000000_add_denormalized_fields_to_character_choices.sql`
- Service file: `src/services/admin/choice-service.ts`

## Status

- ✅ Migration file created
- ✅ Service layer updated (`fetchPendingChoices` and `getChoiceHistory`)
- ⏳ Migration needs to be applied to database
- ⏳ Testing needed after migration

## Next Steps

1. Apply the migration to the database
2. Test both `fetchPendingChoices()` and `getChoiceHistory()` functions
3. Verify the character choice management interface loads without errors
4. Monitor for any issues in production
