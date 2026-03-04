# Stage Validation System

## Overview

The Stage Validation System ensures that production stages are completed in the correct sequential order, preventing stage skipping and maintaining data integrity throughout the production workflow.

## Features

### 1. Sequential Stage Validation

Stages must be completed in order:
1. Awaiting Choice
2. Design
3. Production
4. Quality Check
5. Packaging
6. Shipped

**Validation Rules:**
- Cannot complete a stage if any earlier stages are incomplete
- Cannot complete an already completed stage
- Cannot complete a blocked stage

### 2. Admin Override

Admins can override validation rules when necessary:
- Override requires explicit checkbox confirmation
- Justification is mandatory for all overrides
- All overrides are logged in the audit trail

**Use Cases for Override:**
- Emergency production deadlines
- Special customer requests
- Process exceptions approved by management

### 3. Audit Trail

All stage transitions are logged with:
- Production queue ID
- From stage and to stage
- User ID and name
- Timestamp
- Override flag
- Justification (if override)

## API Reference

### `validateStageTransition(productionQueueId, targetStageId)`

Validates if a stage transition is allowed.

**Parameters:**
- `productionQueueId` (string): ID of the production queue item
- `targetStageId` (string): ID of the stage to transition to

**Returns:**
```typescript
{
  isValid: boolean;
  error?: string;
  canOverride: boolean;
  requiresJustification: boolean;
}
```

**Example:**
```typescript
const validation = await validateStageTransition("queue-123", "stage-456");

if (!validation.isValid) {
  if (validation.canOverride) {
    // Show admin override option
  } else {
    // Show error, no override possible
  }
}
```

### `canUserOverride(userId)`

Checks if a user has admin override permissions.

**Parameters:**
- `userId` (string): ID of the user

**Returns:**
- `boolean`: True if user has admin permissions

**Example:**
```typescript
const hasPermission = await canUserOverride(user.id);
if (hasPermission) {
  // Allow override option
}
```

### `logStageTransition(productionQueueId, fromStage, toStage, userId, userName, isOverride, justification)`

Logs a stage transition to the audit trail.

**Parameters:**
- `productionQueueId` (string): ID of the production queue item
- `fromStage` (StageType | null): Previous stage (null if starting)
- `toStage` (StageType): New stage
- `userId` (string): ID of the user making the transition
- `userName` (string): Name of the user
- `isOverride` (boolean): Whether this was an admin override
- `justification` (string | null): Justification for override

**Example:**
```typescript
await logStageTransition(
  "queue-123",
  "design",
  "production",
  user.id,
  user.name,
  false,
  null
);
```

### `getTransitionHistory(productionQueueId)`

Gets the complete transition history for a production item.

**Parameters:**
- `productionQueueId` (string): ID of the production queue item

**Returns:**
- `StageTransitionLog[]`: Array of transition logs

**Example:**
```typescript
const history = await getTransitionHistory("queue-123");
history.forEach(log => {
  console.log(`${log.fromStage} → ${log.toStage} by ${log.userName}`);
  if (log.isOverride) {
    console.log(`Override: ${log.justification}`);
  }
});
```

## UI Integration

### StageTransitionModal

The `StageTransitionModal` component integrates validation automatically:

1. **Validation Check**: When user clicks "Complete Stage", validation runs first
2. **Error Display**: If validation fails, an alert is shown with the error message
3. **Override Option**: If override is allowed, a checkbox appears
4. **Justification**: When override is enabled, a textarea for justification is required
5. **Button State**: Complete button is disabled until justification is provided

**User Flow:**
```
1. User clicks "Complete Stage"
2. Validation runs
3. If invalid:
   a. Error alert appears
   b. If override allowed:
      - "Enable Admin Override" checkbox appears
      - User checks the box
      - Justification textarea appears
      - User enters justification
      - Button changes to "Override & Complete Stage"
   c. If override not allowed:
      - User must fix the issue (complete previous stages)
4. Stage is completed with override flag and justification logged
```

## Database Schema

### stage_transition_logs Table

```sql
CREATE TABLE stage_transition_logs (
  id UUID PRIMARY KEY,
  production_queue_id UUID NOT NULL,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  is_override BOOLEAN NOT NULL DEFAULT false,
  justification TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT valid_override_justification CHECK (
    NOT is_override OR 
    (justification IS NOT NULL AND justification != '')
  )
);
```

**Indexes:**
- `idx_stage_transition_logs_queue`: For production queue lookups
- `idx_stage_transition_logs_timestamp`: For chronological queries
- `idx_stage_transition_logs_user`: For user activity queries
- `idx_stage_transition_logs_override`: For override audits

## Testing

### Unit Tests

Located in `src/services/admin/__tests__/stage-validation.test.ts`

**Test Coverage:**
- ✅ Allow completing first stage
- ✅ Allow completing stage when previous is completed
- ✅ Prevent completing stage when previous is not completed
- ✅ Prevent skipping stages
- ✅ Prevent completing already completed stage
- ✅ Prevent completing blocked stage
- ✅ Admin override permission check
- ✅ Stage navigation helpers

### Integration Tests

Located in `src/components/production/__tests__/StageTransitionModal-validation.test.tsx`

**Test Coverage:**
- ✅ Display validation error
- ✅ Show admin override checkbox
- ✅ Show justification textarea
- ✅ Disable button without justification
- ✅ Call completeStage with override parameters

## Security Considerations

1. **Permission Check**: Override permission is verified server-side
2. **Justification Required**: All overrides must have a justification
3. **Audit Trail**: All transitions are logged with user information
4. **RLS Policies**: Only admins can view and insert transition logs

## Best Practices

### For Developers

1. **Always validate**: Never skip validation unless explicitly overriding
2. **Log everything**: Use `logStageTransition` for all stage changes
3. **Check permissions**: Verify admin status before allowing override
4. **Handle errors**: Provide clear error messages to users

### For Admins

1. **Use override sparingly**: Only when absolutely necessary
2. **Provide clear justification**: Explain why the override is needed
3. **Review audit trail**: Regularly check for unusual patterns
4. **Document exceptions**: Keep records of override reasons

## Troubleshooting

### Common Issues

**Issue**: Validation fails but user should be able to proceed
- **Solution**: Check if previous stages are actually completed
- **Workaround**: Use admin override with justification

**Issue**: Override checkbox doesn't appear
- **Solution**: Verify user has admin role in `user_roles` table
- **Check**: `canUserOverride(userId)` returns true

**Issue**: Justification not being saved
- **Solution**: Check database constraint on `stage_transition_logs`
- **Verify**: Justification is not empty string

## Future Enhancements

1. **Configurable Rules**: Allow customizing validation rules per collection
2. **Approval Workflow**: Require manager approval for overrides
3. **Analytics Dashboard**: Visualize override patterns and reasons
4. **Automated Alerts**: Notify managers of frequent overrides
5. **Stage Dependencies**: Define custom stage dependencies beyond sequential order

## Related Documentation

- [Stage Service](./stage-service.ts)
- [Production Queue](./production-service.ts)
- [Stage Transition Modal](../../components/production/StageTransitionModal.tsx)
- [Database Migrations](../../../supabase/migrations/)
