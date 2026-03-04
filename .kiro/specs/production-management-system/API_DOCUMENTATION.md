# API Documentation: Production Management System

## Overview

This document provides comprehensive API documentation for the Production Management System. The system is built on Supabase (PostgreSQL + REST API) and provides TypeScript service layer functions for managing production workflows, character choices, stage tracking, and notifications.

## Table of Contents

1. [Authentication](#authentication)
2. [Production Service API](#production-service-api)
3. [Character Choice Service API](#character-choice-service-api)
4. [Stage Service API](#stage-service-api)
5. [Customer Choice Service API](#customer-choice-service-api)
6. [Notification Service API](#notification-service-api)
7. [Error Codes](#error-codes)
8. [TypeScript Types](#typescript-types)

---

## Authentication

All API endpoints require authentication via Supabase Auth. The system uses Row Level Security (RLS) policies to enforce access control.

### Authentication Requirements

- **Admin Endpoints**: Require user to have `admin` role
- **Customer Endpoints**: Require authenticated user, can only access own data
- **Public Endpoints**: None (all endpoints require authentication)

### Authentication Headers

```typescript
// Authentication is handled automatically by Supabase client
import { supabase } from "@/integrations/supabase/client";

// User must be logged in via Supabase Auth
const { data: { user } } = await supabase.auth.getUser();
```

---

## Production Service API

Service for managing the production queue, metrics, and production operations.

**Import Path**: `src/services/admin/production-service.ts`

**Access Level**: Admin only

### 1. Fetch Production Queue

Retrieves production queue items with filtering, sorting, and pagination.

**Function**: `fetchProductionQueue(filters, pagination)`

**Parameters**:

```typescript
interface ProductionFilters {
  collections?: string[];        // Filter by collection IDs
  priorities?: Priority[];        // Filter by priority levels
  stages?: ProductionStage[];     // Filter by production stages
  statuses?: ProductionStatus[];  // Filter by production statuses
  assignedTo?: string[];          // Filter by assigned user IDs
  dateFrom?: string;              // Filter by creation date (ISO format)
  dateTo?: string;                // Filter by creation date (ISO format)
  searchQuery?: string;           // Search by customer name or email
}

interface PaginationParams {
  page: number;                   // Page number (1-indexed)
  pageSize: number;               // Items per page
}
```

**Returns**:

```typescript
interface PaginatedResponse<ProductionQueueItem> {
  data: ProductionQueueItem[];    // Array of production items
  total: number;                  // Total count of items
  page: number;                   // Current page number
  pageSize: number;               // Items per page
  totalPages: number;             // Total number of pages
}
```

**Example Request**:

```typescript
import { fetchProductionQueue } from "@/services/admin/production-service";

const result = await fetchProductionQueue(
  {
    priorities: ["critical", "high"],
    stages: ["production", "quality_check"],
    searchQuery: "John Doe"
  },
  {
    page: 1,
    pageSize: 50
  }
);

console.log(`Found ${result.total} items`);
console.log(`Showing page ${result.page} of ${result.totalPages}`);
```

**Error Responses**:

- `Error: Erro ao buscar fila de produção: [message]` - Database query failed


### 2. Fetch Production Metrics

Retrieves aggregated production metrics including counts by stage, status, priority, and urgent alerts.

**Function**: `fetchProductionMetrics()`

**Parameters**: None

**Returns**:

```typescript
interface ProductionMetrics {
  stages: Record<ProductionStage, number>;           // Count per stage
  statuses: Record<ProductionStatus, number>;        // Count per status
  priorities: Record<Priority, number>;              // Count per priority
  choices: Record<ChoiceStatus, number>;             // Count per choice status
  urgent: {
    deadlineCritical: number;    // Items with deadline < 24h
    deadlineUrgent: number;      // Items with deadline < 72h
    blocked: number;             // Items on hold
    overdue: number;             // Overdue items
  };
  scheduled: {
    today: number;               // Items scheduled for today
    thisWeek: number;            // Items scheduled this week
    thisMonth: number;           // Items scheduled this month
  };
  avgStageDurations: Record<string, number>;         // Average hours per stage
  overall: {
    totalItems: number;          // Total items in queue
    avgProductionTimeHours: number;  // Average production time
    completionRate: number;      // Completion rate (0-1)
    avgPriorityScore: number;    // Average priority score
  };
  generatedAt: string;           // Timestamp (ISO format)
}
```

**Example Request**:

```typescript
import { fetchProductionMetrics } from "@/services/admin/production-service";

const metrics = await fetchProductionMetrics();

console.log(`Total items: ${metrics.overall.totalItems}`);
console.log(`Critical deadlines: ${metrics.urgent.deadlineCritical}`);
console.log(`Items in production: ${metrics.stages.production}`);
```

**Error Responses**:

- `Error: Erro ao buscar métricas de produção: [message]` - Failed to fetch metrics


### 3. Update Production Stage

Updates the production stage of an item and automatically updates the production status.

**Function**: `updateProductionStage(id, newStage)`

**Parameters**:

```typescript
id: string;                      // Production queue item ID
newStage: ProductionStage;       // New stage to transition to
```

**Returns**: `Promise<ProductionQueueItem>` - Updated production item

**Example Request**:

```typescript
import { updateProductionStage } from "@/services/admin/production-service";

const updated = await updateProductionStage(
  "550e8400-e29b-41d4-a716-446655440000",
  "production"
);

console.log(`Stage updated to: ${updated.currentStage}`);
console.log(`Status updated to: ${updated.productionStatus}`);
```

**Stage Transitions**:

- `awaiting_choice` → `design` → `production` → `quality_check` → `packaging` → `shipped`
- Status is automatically updated based on stage

**Error Responses**:

- `Error: Item não encontrado: [message]` - Item not found
- `Error: Erro ao atualizar estágio: [message]` - Update failed


### 4. Assign Production

Assigns a production item to a team member and logs the assignment.

**Function**: `assignProduction(id, userId, reason?)`

**Parameters**:

```typescript
id: string;                      // Production queue item ID
userId: string;                  // User ID to assign to
reason?: string;                 // Optional reason for assignment/reassignment
```

**Returns**: `Promise<ProductionQueueItem>` - Updated production item

**Example Request**:

```typescript
import { assignProduction } from "@/services/admin/production-service";

const assigned = await assignProduction(
  "550e8400-e29b-41d4-a716-446655440000",
  "user-123-456",
  "Specialist in this collection"
);

console.log(`Assigned to: ${assigned.assignedToName}`);
console.log(`Assigned at: ${assigned.assignedAt}`);
```

**Side Effects**:

- Creates entry in `production_assignment_logs` table
- Sends notification to assigned team member
- Updates `assigned_to`, `assigned_to_name`, and `assigned_at` fields

**Error Responses**:

- `Error: Erro ao buscar usuário: [message]` - User not found
- `Error: Erro ao atribuir produção: [message]` - Assignment failed


### 5. Block Production

Blocks a production item due to an issue and sends delay notification to customer.

**Function**: `blockProduction(id, reason)`

**Parameters**:

```typescript
id: string;                      // Production queue item ID
reason: string;                  // Reason for blocking (required)
```

**Returns**: `Promise<ProductionQueueItem>` - Updated production item

**Example Request**:

```typescript
import { blockProduction } from "@/services/admin/production-service";

const blocked = await blockProduction(
  "550e8400-e29b-41d4-a716-446655440000",
  "Waiting for materials to arrive"
);

console.log(`Status: ${blocked.productionStatus}`); // "on_hold"
console.log(`Notes: ${blocked.productionNotes}`);
```

**Side Effects**:

- Updates `production_stages` table: sets `is_blocked = true`, `status = 'blocked'`
- Updates `production_queue`: sets `production_status = 'on_hold'`
- Recalculates estimated completion date
- Sends delay notification to customer

**Error Responses**:

- `Error: Erro ao buscar item de produção: [message]` - Item not found
- `Error: Erro ao bloquear estágio: [message]` - Stage update failed
- `Error: Erro ao bloquear produção: [message]` - Production update failed


### 6. Unblock Production

Unblocks a production item and resumes normal workflow.

**Function**: `unblockProduction(id)`

**Parameters**:

```typescript
id: string;                      // Production queue item ID
```

**Returns**: `Promise<ProductionQueueItem>` - Updated production item

**Example Request**:

```typescript
import { unblockProduction } from "@/services/admin/production-service";

const unblocked = await unblockProduction(
  "550e8400-e29b-41d4-a716-446655440000"
);

console.log(`Status: ${unblocked.productionStatus}`); // Back to normal status
```

**Side Effects**:

- Updates `production_status` based on current stage
- Removes from urgent alerts

**Error Responses**:

- `Error: Item não encontrado: [message]` - Item not found
- `Error: Erro ao desbloquear produção: [message]` - Unblock failed

---

## Character Choice Service API

Service for managing character choices in the admin interface.

**Import Path**: `src/services/admin/choice-service.ts`

**Access Level**: Admin only


### 1. Fetch Pending Choices

Retrieves character choices with filtering options.

**Function**: `fetchPendingChoices(filters?)`

**Parameters**:

```typescript
interface ChoiceFilters {
  statuses?: ChoiceStatus[];     // Filter by choice status
  collections?: string[];        // Filter by collection IDs
  dateFrom?: string;             // Filter by deadline (ISO format)
  dateTo?: string;               // Filter by deadline (ISO format)
  searchQuery?: string;          // Search by customer name/email
}
```

**Returns**: `Promise<CharacterChoice[]>` - Array of character choices

**Example Request**:

```typescript
import { fetchPendingChoices } from "@/services/admin/choice-service";

const choices = await fetchPendingChoices({
  statuses: ["submitted", "pending"],
  collections: ["collection-123"]
});

console.log(`Found ${choices.length} pending choices`);
choices.forEach(choice => {
  console.log(`${choice.customerName}: ${choice.characterName || 'Not chosen'}`);
});
```

**Error Responses**:

- `Error: Error fetching character choices: [message]` - Query failed


### 2. Approve Choice

Approves a customer's character choice and updates production queue.

**Function**: `approveChoice(choiceId)`

**Parameters**:

```typescript
choiceId: string;                // Character choice ID
```

**Returns**: `Promise<CharacterChoice>` - Updated character choice

**Example Request**:

```typescript
import { approveChoice } from "@/services/admin/choice-service";

const approved = await approveChoice("choice-123-456");

console.log(`Approved by: ${approved.approvedByName}`);
console.log(`Approved at: ${approved.approvedAt}`);
console.log(`Status: ${approved.status}`); // "approved"
```

**Side Effects**:

- Updates `status` to "approved"
- Records `approved_at`, `approved_by`, and `approved_by_name`
- Should trigger notification to customer (TODO in code)

**Error Responses**:

- `Error: User not authenticated` - No authenticated user
- `Error: Error approving choice: [message]` - Approval failed
- `Error: Failed to fetch updated choice` - Post-update fetch failed

### 3. Reject Choice

Rejects a customer's character choice with a reason.

**Function**: `rejectChoice(choiceId, reason)`

**Parameters**:

```typescript
choiceId: string;                // Character choice ID
reason: string;                  // Reason for rejection (required)
```

**Returns**: `Promise<CharacterChoice>` - Updated character choice

**Example Request**:

```typescript
import { rejectChoice } from "@/services/admin/choice-service";

const rejected = await rejectChoice(
  "choice-123-456",
  "Character is out of stock"
);

console.log(`Status: ${rejected.status}`); // "rejected"
console.log(`Reason: ${rejected.rejectionReason}`);
```

**Error Responses**:

- `Error: Error rejecting choice: [message]` - Rejection failed


### 4. Extend Deadline

Extends the deadline for a character choice.

**Function**: `extendDeadline(choiceId, newDeadline)`

**Parameters**:

```typescript
choiceId: string;                // Character choice ID
newDeadline: string;             // New deadline (ISO format)
```

**Returns**: `Promise<CharacterChoice>` - Updated character choice

**Example Request**:

```typescript
import { extendDeadline } from "@/services/admin/choice-service";

const newDeadline = new Date();
newDeadline.setDate(newDeadline.getDate() + 7); // Add 7 days

const extended = await extendDeadline(
  "choice-123-456",
  newDeadline.toISOString()
);

console.log(`New deadline: ${extended.deadline}`);
```

**Error Responses**:

- `Error: Error extending deadline: [message]` - Extension failed

### 5. Get Choice History

Retrieves all character choices for an order (including changes).

**Function**: `getChoiceHistory(orderId)`

**Parameters**:

```typescript
orderId: string;                 // Order ID
```

**Returns**: `Promise<CharacterChoice[]>` - Array of choices (newest first)

**Example Request**:

```typescript
import { getChoiceHistory } from "@/services/admin/choice-service";

const history = await getChoiceHistory("order-123-456");

console.log(`Total choices: ${history.length}`);
history.forEach((choice, index) => {
  console.log(`${index + 1}. ${choice.characterName} - ${choice.status}`);
});
```

**Error Responses**:

- `Error: Error fetching choice history: [message]` - Query failed


---

## Stage Service API

Service for managing production stages, completion, photos, and time tracking.

**Import Path**: `src/services/admin/stage-service.ts`

**Access Level**: Admin only

### 1. Get Stage History

Retrieves the complete stage history for a production item.

**Function**: `getStageHistory(productionQueueId)`

**Parameters**:

```typescript
productionQueueId: string;       // Production queue item ID
```

**Returns**: `Promise<ProductionStageRecord[]>` - Array of stage records (ordered by stage_order)

**Example Request**:

```typescript
import { getStageHistory } from "@/services/admin/stage-service";

const stages = await getStageHistory("550e8400-e29b-41d4-a716-446655440000");

stages.forEach(stage => {
  console.log(`${stage.stageName}: ${stage.status}`);
  if (stage.completedAt) {
    console.log(`  Completed: ${stage.completedAt}`);
    console.log(`  Duration: ${stage.actualDuration} hours`);
  }
});
```

**Error Responses**:

- `Error: Erro ao buscar histórico de estágios: [message]` - Query failed


### 2. Complete Stage

Marks a production stage as complete with optional notes and photos.

**Function**: `completeStage(stageId, notes?, photos?, isOverride?, justification?)`

**Parameters**:

```typescript
stageId: string;                 // Production stage ID
notes?: string;                  // Optional completion notes
photos?: string[];               // Optional array of photo URLs (already uploaded)
isOverride?: boolean;            // Allow skipping validation (admin only)
justification?: string;          // Required if isOverride = true
```

**Returns**: `Promise<ProductionStageRecord>` - Updated stage record

**Example Request**:

```typescript
import { completeStage } from "@/services/admin/stage-service";

const completed = await completeStage(
  "stage-123-456",
  "Quality check passed. Minor adjustments made.",
  [
    "https://storage.example.com/photo1.jpg",
    "https://storage.example.com/photo2.jpg"
  ]
);

console.log(`Stage completed at: ${completed.completedAt}`);
console.log(`Duration: ${completed.actualDuration} hours`);
```

**Validation Rules**:

- Stage must not already be completed
- Stage must not be blocked
- Previous stages must be completed (unless `isOverride = true`)
- If override is used, justification is required and user must have admin permissions

**Side Effects**:

- Sets `status` to "completed"
- Records `completed_at` timestamp
- Calculates `actual_duration`
- Logs stage transition in audit table
- Triggers may update `production_queue.current_stage`

**Error Responses**:

- `Error: Estágio não encontrado: [message]` - Stage not found
- `Error: Este estágio já foi completado` - Already completed
- `Error: Não é possível completar um estágio bloqueado` - Stage is blocked
- `Error: Stage transition validation failed` - Validation failed
- `Error: Justification is required for admin override` - Missing justification
- `Error: User does not have permission to override` - Insufficient permissions


### 3. Upload Stage Photo

Uploads a photo to Supabase Storage and returns the public URL.

**Function**: `uploadStagePhoto(stageId, file)`

**Parameters**:

```typescript
stageId: string;                 // Production stage ID
file: File;                      // Image file object
```

**Returns**: `Promise<string>` - Public URL of uploaded photo

**Example Request**:

```typescript
import { uploadStagePhoto } from "@/services/admin/stage-service";

// From file input
const fileInput = document.querySelector('input[type="file"]');
const file = fileInput.files[0];

const photoUrl = await uploadStagePhoto("stage-123-456", file);

console.log(`Photo uploaded: ${photoUrl}`);

// Use this URL when completing the stage
await completeStage("stage-123-456", "Notes", [photoUrl]);
```

**Validation Rules**:

- File must be an image (MIME type starts with "image/")
- Maximum file size: 5MB
- File is stored in `production-photos` bucket
- Filename format: `{stageId}/{timestamp}-{random}.{extension}`

**Error Responses**:

- `Error: Apenas arquivos de imagem são permitidos` - Invalid file type
- `Error: Arquivo muito grande. Tamanho máximo: 5MB` - File too large
- `Error: Erro ao fazer upload da foto: [message]` - Upload failed


### 4. Calculate Estimated Completion

Calculates the estimated completion date based on remaining stages.

**Function**: `calculateEstimatedCompletion(productionQueueId)`

**Parameters**:

```typescript
productionQueueId: string;       // Production queue item ID
```

**Returns**: `Promise<Date>` - Estimated completion date

**Example Request**:

```typescript
import { calculateEstimatedCompletion } from "@/services/admin/stage-service";

const estimatedDate = await calculateEstimatedCompletion(
  "550e8400-e29b-41d4-a716-446655440000"
);

console.log(`Estimated completion: ${estimatedDate.toLocaleDateString()}`);
```

**Calculation Logic**:

1. Fetches all stages for the production item
2. For pending stages: adds full `estimatedDuration`
3. For in-progress stages: calculates remaining time
4. Skips completed and blocked stages
5. Considers only business days (Monday-Friday)
6. Assumes 8 working hours per day

**Error Responses**:

- Inherits errors from `getStageHistory()`

---

## Customer Choice Service API

Service for customers to submit and manage their character choices.

**Import Path**: `src/services/customer/choice-service.ts`

**Access Level**: Customer (authenticated user, own data only)


### 1. Get Available Characters

Retrieves available characters for a collection.

**Function**: `getAvailableCharacters(collectionId)`

**Parameters**:

```typescript
collectionId: string;            // Collection ID
```

**Returns**: `Promise<Character[]>` - Array of available characters

**Example Request**:

```typescript
import { getAvailableCharacters } from "@/services/customer/choice-service";

const characters = await getAvailableCharacters("collection-123");

characters.forEach(char => {
  console.log(`${char.name}: ${char.isAvailable ? 'Available' : 'Out of stock'}`);
});
```

**Error Responses**:

- `Error: Collection ID é obrigatório` - Missing collection ID
- `Error: Erro ao buscar personagens: [message]` - Query failed

### 2. Submit Character Choice

Submits a customer's character choice for an order.

**Function**: `submitCharacterChoice(orderId, characterId)`

**Parameters**:

```typescript
orderId: string;                 // Order ID
characterId: string;             // Character ID
```

**Returns**: `Promise<CharacterChoice>` - Created/updated character choice

**Example Request**:

```typescript
import { submitCharacterChoice } from "@/services/customer/choice-service";

const choice = await submitCharacterChoice(
  "order-123-456",
  "character-789"
);

console.log(`Choice submitted: ${choice.characterName}`);
console.log(`Status: ${choice.status}`); // "submitted"
console.log(`Deadline: ${choice.deadline}`);
```

**Validation Rules**:

- User must be authenticated
- Character must belong to the order's collection
- Deadline must not have expired
- If choice already exists and is approved/locked, cannot be modified
- Maximum 3 changes allowed per order

**Error Responses**:

- `Error: Order ID e Character ID são obrigatórios` - Missing parameters
- `Error: Usuário não autenticado` - Not authenticated
- `Error: Esta escolha já foi aprovada e não pode ser modificada` - Already approved
- `Error: O prazo para escolher o personagem expirou` - Deadline expired
- `Error: Você atingiu o limite de 3 mudanças` - Change limit reached
- `Error: Personagem não encontrado` - Character not found
- `Error: O personagem escolhido não pertence à coleção deste pedido` - Invalid character


### 3. Change Character Choice

Changes an existing character choice (before approval).

**Function**: `changeCharacterChoice(choiceId, newCharacterId, reason)`

**Parameters**:

```typescript
choiceId: string;                // Character choice ID
newCharacterId: string;          // New character ID
reason: string;                  // Reason for change (required)
```

**Returns**: `Promise<CharacterChoice>` - Updated character choice

**Example Request**:

```typescript
import { changeCharacterChoice } from "@/services/customer/choice-service";

const updated = await changeCharacterChoice(
  "choice-123-456",
  "character-999",
  "Changed my mind after seeing more photos"
);

console.log(`New character: ${updated.characterName}`);
console.log(`Change count: ${updated.changeCount}`);
console.log(`Reason: ${updated.changeReason}`);
```

**Validation Rules**:

- User must own the choice (RLS enforced)
- Choice must not be approved or locked
- Deadline must not have expired
- Maximum 3 changes allowed
- Reason is required
- New character must belong to same collection

**Error Responses**:

- `Error: Choice ID e Character ID são obrigatórios` - Missing parameters
- `Error: Motivo da mudança é obrigatório` - Missing reason
- `Error: Usuário não autenticado` - Not authenticated
- `Error: Escolha não encontrada ou você não tem permissão` - Not found or no permission
- `Error: Esta escolha já foi aprovada e não pode ser alterada` - Already approved
- `Error: O prazo para alterar a escolha expirou` - Deadline expired
- `Error: Você atingiu o limite de 3 mudanças` - Change limit reached


### 4. Get My Choice

Retrieves the customer's character choice for a specific order.

**Function**: `getMyChoice(orderId)`

**Parameters**:

```typescript
orderId: string;                 // Order ID
```

**Returns**: `Promise<CharacterChoice | null>` - Character choice or null if not found

**Example Request**:

```typescript
import { getMyChoice } from "@/services/customer/choice-service";

const choice = await getMyChoice("order-123-456");

if (choice) {
  console.log(`Your choice: ${choice.characterName}`);
  console.log(`Status: ${choice.status}`);
  console.log(`Deadline: ${new Date(choice.deadline).toLocaleDateString()}`);
} else {
  console.log("No choice made yet");
}
```

**Error Responses**:

- `Error: Order ID é obrigatório` - Missing order ID
- `Error: Usuário não autenticado` - Not authenticated
- `Error: Erro ao buscar escolha: [message]` - Query failed

---

## Notification Service API

Service for sending production-related notifications to customers and admins.

**Import Path**: `src/services/notifications/production-notification-service.ts`

**Access Level**: Internal service (called by other services)


### 1. Send Choice Reminder

Sends a reminder email to customer about pending character choice.

**Function**: `sendChoiceReminder(choiceId)`

**Parameters**:

```typescript
choiceId: string;                // Character choice ID
```

**Returns**: `Promise<void>`

**Example Request**:

```typescript
import { productionNotificationService } from "@/services/notifications/production-notification-service";

await productionNotificationService.sendChoiceReminder("choice-123-456");
```

**Reminder Types** (automatically determined by days remaining):

- **First reminder**: 5 days before deadline
- **Second reminder**: 2 days before deadline
- **Final reminder**: 1 day before deadline (high priority)

**Email Content**: Includes customer name, collection name, deadline, and link to make choice

**Error Responses**:

- `Error: Failed to fetch character choice: [message]` - Choice not found
- `Error: User email not found` - Customer has no email

### 2. Send Choice Approval

Sends notification when admin approves a character choice.

**Function**: `sendChoiceApproval(choiceId)`

**Parameters**:

```typescript
choiceId: string;                // Character choice ID
```

**Returns**: `Promise<void>`

**Example Request**:

```typescript
await productionNotificationService.sendChoiceApproval("choice-123-456");
```

**Email Content**: Includes character name, image, and confirmation that production will begin

**Error Responses**:

- `Error: Failed to fetch character choice: [message]` - Choice not found
- `Error: User email not found` - Customer has no email


### 3. Send Choice Rejection

Sends notification when admin rejects a character choice.

**Function**: `sendChoiceRejection(choiceId, rejectionReason)`

**Parameters**:

```typescript
choiceId: string;                // Character choice ID
rejectionReason: string;         // Reason for rejection
```

**Returns**: `Promise<void>`

**Example Request**:

```typescript
await productionNotificationService.sendChoiceRejection(
  "choice-123-456",
  "Character is currently out of stock"
);
```

**Email Content**: Includes rejection reason and link to choose another character

### 4. Send Stage Update

Sends notification when production stage changes.

**Function**: `sendStageUpdate(productionQueueId, stage)`

**Parameters**:

```typescript
productionQueueId: string;       // Production queue item ID
stage: string;                   // New stage name
```

**Returns**: `Promise<void>`

**Example Request**:

```typescript
await productionNotificationService.sendStageUpdate(
  "550e8400-e29b-41d4-a716-446655440000",
  "production"
);
```

**Notification Preferences**:

- Checks user's notification preferences before sending
- `stage_update` notifications can be opted out
- `shipped` stage has separate preference (`item_shipped`)

**Email Content**: Includes current stage, estimated completion date, and progress information


### 5. Send Delay Notification

Sends notification when production is delayed/blocked.

**Function**: `sendDelayNotification(productionQueueId, reason)`

**Parameters**:

```typescript
productionQueueId: string;       // Production queue item ID
reason: string;                  // Reason for delay
```

**Returns**: `Promise<void>`

**Example Request**:

```typescript
await productionNotificationService.sendDelayNotification(
  "550e8400-e29b-41d4-a716-446655440000",
  "Waiting for materials to arrive from supplier"
);
```

**Email Content**: Includes delay reason and new estimated completion date

**Priority**: High (always sent regardless of preferences)

### 6. Send Assignment Notification

Sends notification to team member when production item is assigned.

**Function**: `sendAssignmentNotification(productionQueueId, assignedUserId, isReassignment?)`

**Parameters**:

```typescript
productionQueueId: string;       // Production queue item ID
assignedUserId: string;          // User ID being assigned
isReassignment?: boolean;        // Whether this is a reassignment (default: false)
```

**Returns**: `Promise<void>`

**Example Request**:

```typescript
await productionNotificationService.sendAssignmentNotification(
  "550e8400-e29b-41d4-a716-446655440000",
  "user-123-456",
  false
);
```

**Email Content**: Includes customer name, collection, character, current stage, priority, and scheduled dates

**Error Responses**:

- `Error: Production item not found: [message]` - Item not found
- `Error: User profile not found: [message]` - Assigned user not found


### 7. Notification Queue Management

The notification service uses an internal queue for batch processing.

**Get Queue Status**:

```typescript
const status = productionNotificationService.getQueueStatus();

console.log(`Total: ${status.total}`);
console.log(`Pending: ${status.pending}`);
console.log(`Sent: ${status.sent}`);
console.log(`Failed: ${status.failed}`);
```

**Clear Queue** (for testing):

```typescript
productionNotificationService.clearQueue();
```

**Queue Behavior**:

- Notifications are queued and sent in batches
- Batch size: 10 notifications
- Delay between batches: 1 second
- Priority order: high → normal → low
- Failed notifications are retried up to 3 times with exponential backoff
- Retry delays: 1 minute, 2 minutes, 4 minutes

---

## Error Codes

The API uses descriptive error messages in Portuguese and English. Common error patterns:

### Database Errors

- `Erro ao buscar [resource]: [message]` - Failed to fetch resource
- `Erro ao atualizar [resource]: [message]` - Failed to update resource
- `Erro ao criar [resource]: [message]` - Failed to create resource

### Validation Errors

- `[Field] é obrigatório` - Required field missing
- `[Resource] não encontrado` - Resource not found
- `Usuário não autenticado` - User not authenticated
- `Você não tem permissão` - Insufficient permissions

### Business Logic Errors

- `O prazo expirou` - Deadline expired
- `Limite de mudanças atingido` - Change limit reached
- `Estágio já foi completado` - Stage already completed
- `Não é possível completar um estágio bloqueado` - Cannot complete blocked stage


---

## TypeScript Types

### Core Types

```typescript
// Production Status
type ProductionStatus =
  | "awaiting_choice"      // Waiting for customer to choose character
  | "ready_for_production" // Choice approved, ready to start
  | "in_production"        // Currently being produced
  | "completed"            // Production finished and shipped
  | "on_hold"              // Blocked due to issue
  | "cancelled";           // Order cancelled

// Production Stage
type ProductionStage =
  | "awaiting_choice"      // Waiting for character selection
  | "design"               // Design phase
  | "production"           // Manufacturing
  | "quality_check"        // Quality control
  | "packaging"            // Packaging
  | "shipped";             // Shipped to customer

// Priority Level
type Priority =
  | "critical"             // Deadline < 24h
  | "high"                 // Subscriber orders
  | "normal"               // Standalone purchases
  | "low";                 // Future orders

// Choice Status
type ChoiceStatus =
  | "pending"              // Customer hasn't chosen yet
  | "submitted"            // Customer submitted choice
  | "approved"             // Admin approved choice
  | "rejected"             // Admin rejected choice
  | "locked";              // Choice locked (production started)

// Stage Status
type StageStatus =
  | "pending"              // Not started
  | "in_progress"          // Currently working on
  | "completed"            // Finished
  | "blocked";             // Blocked by issue
```


### Data Models

```typescript
// Production Queue Item
interface ProductionQueueItem {
  id: string;
  orderId: string;
  orderType: "subscription_delivery" | "standalone_purchase";
  customerId: string;
  customerName: string;
  customerEmail: string;
  collectionId: string;
  collectionName: string;
  characterId: string | null;
  characterName: string | null;
  productionStatus: ProductionStatus;
  currentStage: ProductionStage;
  choiceStatus: ChoiceStatus;
  choiceDeadline: string | null;
  choiceMadeAt: string | null;
  priority: Priority;
  priorityScore: number;
  scheduledProductionDate: string | null;
  estimatedCompletionDate: string | null;
  assignedTo: string | null;
  assignedToName: string | null;
  assignedAt: string | null;
  productionStartedAt: string | null;
  productionCompletedAt: string | null;
  productionNotes: string | null;
  customerNotes: string | null;
  internalFlags: string[];
  createdAt: string;
  updatedAt: string;
}

// Character Choice
interface CharacterChoice {
  id: string;
  orderId: string;
  orderType: "subscription_delivery" | "standalone_purchase";
  userId: string;
  customerName: string;
  customerEmail: string;
  collectionId: string;
  collectionName: string;
  characterId: string | null;
  characterName: string | null;
  characterImageUrl: string | null;
  status: ChoiceStatus;
  submittedAt: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  approvedByName: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  deadline: string;
  remindersSent: number;
  lastReminderAt: string | null;
  previousChoiceId: string | null;
  changeReason: string | null;
  changeCount: number;
  createdAt: string;
  updatedAt: string;
}
```


```typescript
// Production Stage Record
interface ProductionStageRecord {
  id: string;
  productionQueueId: string;
  stageName: StageType;
  stageOrder: number;              // 1-6 for sequential stages
  status: StageStatus;
  startedAt: string | null;
  completedAt: string | null;
  estimatedDuration: number;       // hours
  actualDuration: number | null;   // hours
  assignedTo: string | null;
  assignedToName: string | null;
  assignedAt: string | null;
  notes: string | null;
  photos: string[];                // Array of storage URLs
  isBlocked: boolean;
  blockReason: string | null;
  blockedAt: string | null;
  unblockedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Character
interface Character {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  collectionId: string;
  isAvailable: boolean;
  stockLevel?: number;
}

// Production Metrics
interface ProductionMetrics {
  stages: Record<ProductionStage, number>;
  statuses: Record<ProductionStatus, number>;
  priorities: Record<Priority, number>;
  choices: Record<ChoiceStatus, number>;
  urgent: {
    deadlineCritical: number;
    deadlineUrgent: number;
    blocked: number;
    overdue: number;
  };
  scheduled: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  avgStageDurations: Record<string, number>;
  overall: {
    totalItems: number;
    avgProductionTimeHours: number;
    completionRate: number;
    avgPriorityScore: number;
  };
  generatedAt: string;
}
```


---

## Complete API Reference Summary

### Production Service (`src/services/admin/production-service.ts`)

| Function | Parameters | Returns | Access |
|----------|-----------|---------|--------|
| `fetchProductionQueue` | `filters, pagination` | `PaginatedResponse<ProductionQueueItem>` | Admin |
| `fetchProductionMetrics` | None | `ProductionMetrics` | Admin |
| `updateProductionStage` | `id, newStage` | `ProductionQueueItem` | Admin |
| `assignProduction` | `id, userId, reason?` | `ProductionQueueItem` | Admin |
| `blockProduction` | `id, reason` | `ProductionQueueItem` | Admin |
| `unblockProduction` | `id` | `ProductionQueueItem` | Admin |

### Character Choice Service - Admin (`src/services/admin/choice-service.ts`)

| Function | Parameters | Returns | Access |
|----------|-----------|---------|--------|
| `fetchPendingChoices` | `filters?` | `CharacterChoice[]` | Admin |
| `approveChoice` | `choiceId` | `CharacterChoice` | Admin |
| `rejectChoice` | `choiceId, reason` | `CharacterChoice` | Admin |
| `extendDeadline` | `choiceId, newDeadline` | `CharacterChoice` | Admin |
| `getChoiceHistory` | `orderId` | `CharacterChoice[]` | Admin |

### Stage Service (`src/services/admin/stage-service.ts`)

| Function | Parameters | Returns | Access |
|----------|-----------|---------|--------|
| `getStageHistory` | `productionQueueId` | `ProductionStageRecord[]` | Admin |
| `completeStage` | `stageId, notes?, photos?, isOverride?, justification?` | `ProductionStageRecord` | Admin |
| `uploadStagePhoto` | `stageId, file` | `string` (URL) | Admin |
| `calculateEstimatedCompletion` | `productionQueueId` | `Date` | Admin |

### Customer Choice Service (`src/services/customer/choice-service.ts`)

| Function | Parameters | Returns | Access |
|----------|-----------|---------|--------|
| `getAvailableCharacters` | `collectionId` | `Character[]` | Customer |
| `submitCharacterChoice` | `orderId, characterId` | `CharacterChoice` | Customer |
| `changeCharacterChoice` | `choiceId, newCharacterId, reason` | `CharacterChoice` | Customer |
| `getMyChoice` | `orderId` | `CharacterChoice \| null` | Customer |


### Notification Service (`src/services/notifications/production-notification-service.ts`)

| Function | Parameters | Returns | Access |
|----------|-----------|---------|--------|
| `sendChoiceReminder` | `choiceId` | `void` | Internal |
| `sendChoiceApproval` | `choiceId` | `void` | Internal |
| `sendChoiceRejection` | `choiceId, rejectionReason` | `void` | Internal |
| `sendStageUpdate` | `productionQueueId, stage` | `void` | Internal |
| `sendDelayNotification` | `productionQueueId, reason` | `void` | Internal |
| `sendAssignmentNotification` | `productionQueueId, assignedUserId, isReassignment?` | `void` | Internal |
| `getQueueStatus` | None | `QueueStatus` | Internal |
| `clearQueue` | None | `void` | Internal |

---

## Usage Examples

### Complete Workflow Example

```typescript
import { 
  fetchProductionQueue,
  updateProductionStage,
  assignProduction 
} from "@/services/admin/production-service";
import { 
  completeStage,
  uploadStagePhoto 
} from "@/services/admin/stage-service";

// 1. Fetch production queue
const queue = await fetchProductionQueue(
  { priorities: ["critical", "high"] },
  { page: 1, pageSize: 20 }
);

// 2. Assign item to team member
const item = queue.data[0];
await assignProduction(item.id, "user-123", "Expert in this collection");

// 3. Move to production stage
await updateProductionStage(item.id, "production");

// 4. Upload progress photo
const photoUrl = await uploadStagePhoto(
  "stage-123",
  photoFile
);

// 5. Complete stage
await completeStage(
  "stage-123",
  "Production completed successfully",
  [photoUrl]
);
```


### Customer Choice Workflow Example

```typescript
import {
  getAvailableCharacters,
  submitCharacterChoice,
  getMyChoice
} from "@/services/customer/choice-service";

// 1. Get available characters for collection
const characters = await getAvailableCharacters("collection-123");

// 2. Display characters to customer (UI logic)
console.log("Available characters:");
characters.forEach(char => {
  console.log(`- ${char.name}: ${char.description}`);
});

// 3. Customer selects character
const selectedCharacterId = "character-789";

// 4. Submit choice
const choice = await submitCharacterChoice(
  "order-123",
  selectedCharacterId
);

console.log(`Choice submitted: ${choice.characterName}`);
console.log(`Status: ${choice.status}`);
console.log(`Deadline: ${new Date(choice.deadline).toLocaleDateString()}`);

// 5. Later, retrieve choice
const myChoice = await getMyChoice("order-123");
if (myChoice) {
  console.log(`Your current choice: ${myChoice.characterName}`);
}
```

### Admin Choice Management Example

```typescript
import {
  fetchPendingChoices,
  approveChoice,
  rejectChoice
} from "@/services/admin/choice-service";

// 1. Fetch pending choices
const pendingChoices = await fetchPendingChoices({
  statuses: ["submitted"]
});

console.log(`${pendingChoices.length} choices awaiting approval`);

// 2. Review and approve/reject
for (const choice of pendingChoices) {
  console.log(`Customer: ${choice.customerName}`);
  console.log(`Character: ${choice.characterName}`);
  
  // Check if character is available
  const isAvailable = true; // Your availability check logic
  
  if (isAvailable) {
    await approveChoice(choice.id);
    console.log("✅ Approved");
  } else {
    await rejectChoice(
      choice.id,
      "Character is currently out of stock. Please choose another."
    );
    console.log("❌ Rejected");
  }
}
```

---

## Best Practices

### 1. Error Handling

Always wrap API calls in try-catch blocks:

```typescript
try {
  const result = await fetchProductionQueue(filters, pagination);
  // Handle success
} catch (error) {
  console.error("Failed to fetch production queue:", error);
  // Show user-friendly error message
  toast.error("Erro ao carregar fila de produção");
}
```


### 2. Pagination

Always use pagination for large datasets:

```typescript
const ITEMS_PER_PAGE = 50;

async function loadPage(pageNumber: number) {
  const result = await fetchProductionQueue(
    filters,
    { page: pageNumber, pageSize: ITEMS_PER_PAGE }
  );
  
  console.log(`Page ${result.page} of ${result.totalPages}`);
  console.log(`Showing ${result.data.length} of ${result.total} items`);
  
  return result;
}
```

### 3. Optimistic Updates

For better UX, update UI optimistically before API call completes:

```typescript
// Update UI immediately
setItems(items.map(item => 
  item.id === targetId 
    ? { ...item, currentStage: newStage }
    : item
));

try {
  // Make API call
  await updateProductionStage(targetId, newStage);
} catch (error) {
  // Rollback on error
  setItems(originalItems);
  toast.error("Falha ao atualizar estágio");
}
```

### 4. Real-time Updates

Use Supabase Realtime for live updates:

```typescript
import { supabase } from "@/integrations/supabase/client";

// Subscribe to production queue changes
const subscription = supabase
  .channel('production-updates')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'production_queue'
    },
    (payload) => {
      console.log('Production queue updated:', payload);
      // Refresh data
      refetchProductionQueue();
    }
  )
  .subscribe();

// Cleanup
return () => {
  subscription.unsubscribe();
};
```

### 5. Caching with TanStack Query

Use TanStack Query for automatic caching and refetching:

```typescript
import { useQuery } from '@tanstack/react-query';
import { fetchProductionMetrics } from '@/services/admin/production-service';

function useProductionMetrics() {
  return useQuery({
    queryKey: ['production-metrics'],
    queryFn: fetchProductionMetrics,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });
}

// Usage
const { data: metrics, isLoading, error } = useProductionMetrics();
```

---

## Database Schema Reference

For complete database schema details, see:
- `.kiro/specs/production-management-system/design.md` - Data models section
- `supabase/migrations/` - Migration files

### Key Tables

- `production_queue` - Main production queue with denormalized fields
- `character_choices` - Customer character selections
- `production_stages` - Stage tracking and history
- `production_assignment_logs` - Assignment audit trail
- `stage_transition_logs` - Stage transition audit trail

### Row Level Security (RLS)

All tables have RLS policies enforcing:
- Admin users can access all data
- Customers can only access their own data
- Proper authentication required for all operations

---

## Support and Maintenance

For questions or issues with the API:

1. Check this documentation first
2. Review the design document: `.kiro/specs/production-management-system/design.md`
3. Check the requirements: `.kiro/specs/production-management-system/requirements.md`
4. Review service layer code for implementation details

**Last Updated**: 2024
**Version**: 1.0
**Status**: Production Ready
