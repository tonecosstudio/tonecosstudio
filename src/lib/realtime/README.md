# Realtime Broadcast System for Group Messages

This directory contains the Realtime broadcast functionality for the chat groups system.

## Overview

The Realtime broadcast system enables instant message delivery to all members of a group using Supabase Realtime channels. Messages are stored once in the database and broadcast to all online members via a single channel per group.

## Architecture

### Key Design Principles

1. **Single Message Storage**: Messages are stored ONCE in `chat_group_messages` table (not per-member)
2. **Channel Per Group**: Each group has one Realtime channel (`group:{group_id}`)
3. **Security Validation**: Membership is verified before allowing channel subscription
4. **Graceful Degradation**: If Realtime fails, email notifications still work
5. **No Per-Member Delivery Tracking**: Avoids table explosion with large groups

### Components

#### `groupBroadcast.ts`

Core utilities for broadcasting messages:

- `broadcastGroupMessage()`: Sends message to group channel
- `verifyGroupMembership()`: Validates user is a member before subscription

#### `useGroupMessages` Hook

React hook for subscribing to group messages:

- Loads paginated message history
- Subscribes to Realtime channel for new messages
- Updates `last_viewed_at` timestamp
- Handles sending messages (admin only)
- Provides graceful error handling

## Usage

### Basic Example

```typescript
import { useGroupMessages } from "@/hooks/useGroupMessages";

function GroupChat({ groupId }: { groupId: string }) {
  const {
    messages,
    loading,
    sendMessage,
    messagesEndRef,
  } = useGroupMessages({ groupId, autoScroll: true });

  const handleSend = async (text: string) => {
    await sendMessage(text);
  };

  return (
    <div>
      {messages.map((msg) => (
        <div key={msg.id}>
          <strong>{msg.sender_name}:</strong> {msg.message}
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
```

### Sending Messages with Attachments

```typescript
const { sendMessage } = useGroupMessages({ groupId });

// With attachments
const files: File[] = [/* selected files */];
await sendMessage("Check out these files!", files);
```

### Manual Broadcast (Backend)

```typescript
import { broadcastGroupMessage } from "@/lib/realtime/groupBroadcast";

// After creating a message in the database
const enrichedMessage = {
  ...messageData,
  sender_name: "Admin",
  sender_avatar: null,
  attachments: [],
};

await broadcastGroupMessage(groupId, enrichedMessage);
```

## Security

### Channel Security

**CRITICAL**: Without proper security, users could manually subscribe to any channel and leak messages.

#### Channel Naming Convention

- Format: `group:{group_id}`
- Example: `group:123e4567-e89b-12d3-a456-426614174000`

#### Security Measures

1. **Membership Verification**: `verifyGroupMembership()` checks if user is a member before subscription
2. **RLS Policies**: Database policies prevent unauthorized message reads
3. **Frontend Validation**: Hook validates membership on mount
4. **Error Handling**: Unauthorized access shows error and prevents subscription

#### Required RLS Policies

```sql
-- Only members can read group messages
CREATE POLICY "Members can read group messages"
ON chat_group_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM chat_group_members
    WHERE group_id = chat_group_messages.group_id
    AND user_id = auth.uid()
  )
);

-- Only members can read their membership
CREATE POLICY "Members can read their own membership"
ON chat_group_members FOR SELECT
USING (user_id = auth.uid());
```

**Without these policies**: A malicious user could subscribe to `group:{any_uuid}` and receive all messages.

## Message Flow

### 1. Admin Sends Message

```
Admin → sendMessage() → messageService.sendBroadcastMessage()
  ↓
  1. Validate message (1-5000 chars)
  2. Verify group exists and not deleted
  3. Insert message into chat_group_messages (ONCE)
  4. Upload attachments (if any)
  5. Return message data
  ↓
broadcastGroupMessage() → Supabase Realtime Channel
  ↓
All online members receive via subscription
```

### 2. Member Receives Message

```
Member opens group → useGroupMessages hook
  ↓
  1. Verify membership (security check)
  2. Subscribe to group:{group_id} channel
  3. Listen for 'new_message' events
  ↓
New message arrives → Add to local state → Scroll to bottom
  ↓
Update last_viewed_at timestamp
```

## Error Handling

### Graceful Degradation

If Realtime fails:
- Error is logged but not thrown
- Email notifications still sent via background job
- User sees error toast but can continue using the app
- Messages will appear on page refresh

### Common Errors

1. **"User is not a member of this group"**
   - Cause: User tried to access group they don't belong to
   - Solution: Verify membership before showing group

2. **"Erro ao conectar ao chat em tempo real"**
   - Cause: Realtime connection failed
   - Solution: Messages still work via email, refresh to see new messages

3. **"Apenas administradores podem enviar mensagens"**
   - Cause: Non-admin tried to send message
   - Solution: Only show send UI to admins

## Performance Considerations

### Scalability

- **1000+ members**: Single message row, single broadcast
- **No per-member rows**: Avoids table explosion
- **Async email delivery**: Background job handles offline members
- **Pagination**: 50 messages per page to reduce load

### Optimization Tips

1. **Lazy Loading**: Load messages on demand with pagination
2. **Debounce Scroll**: Avoid excessive scroll event handlers
3. **Memoization**: Use React.memo for message components
4. **Virtual Scrolling**: For groups with 1000+ messages

## Testing

### Unit Tests

```typescript
// Test membership verification
test('verifyGroupMembership returns true for valid member', async () => {
  const isMember = await verifyGroupMembership(groupId, userId);
  expect(isMember).toBe(true);
});

// Test broadcast function
test('broadcastGroupMessage sends to correct channel', async () => {
  await broadcastGroupMessage(groupId, message);
  // Verify channel.send was called
});
```

### Integration Tests

```typescript
// Test end-to-end message flow
test('message is received by all online members', async () => {
  // 1. Admin sends message
  // 2. Verify all members receive via Realtime
  // 3. Verify message stored once in database
});
```

## Troubleshooting

### Messages Not Appearing in Real-Time

1. Check browser console for subscription errors
2. Verify RLS policies are enabled
3. Confirm user is a member of the group
4. Check Supabase Realtime is enabled in project settings

### Duplicate Messages

- Cause: Multiple subscriptions to same channel
- Solution: Ensure cleanup in useEffect return function

### Memory Leaks

- Cause: Channels not removed on unmount
- Solution: Always call `supabase.removeChannel(channel)` in cleanup

## Requirements Validation

This implementation satisfies the following requirements:

- **10.1**: Realtime delivery to all group members
- **10.2**: Delivery only to active members
- **10.3**: Includes sender info, content, timestamp
- **10.4**: Includes attachment URLs in notification
- **Channel Security**: Membership verification before subscription
- **Graceful Degradation**: Continues working if Realtime fails

## Future Enhancements (V2)

- Typing indicators
- Read receipts per message
- Message reactions
- Thread replies
- Voice messages
- Video attachments
